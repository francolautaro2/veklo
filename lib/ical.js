import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";
import {
  addDays,
  dateKeyInTimeZone,
  getAppTimeZone,
  parseDateOnly,
  toDateOnly,
} from "@/lib/date-only";

const ICAL_LINE_BREAK = "\r\n";
const ICAL_PROD_ID = "-//veklo//Calendar Sync//ES";
const ICAL_PROVIDER_LABEL = {
  airbnb: "Airbnb",
  booking: "Booking.com",
  other: "iCal externo",
};

function pad(value) {
  return String(value).padStart(2, "0");
}

function escapeIcalText(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function unescapeIcalText(value) {
  return String(value || "")
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function toIcalDate(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
}

function dateOnlyFromParts(year, month, day) {
  return parseDateOnly(`${year}-${pad(month)}-${pad(day)}`);
}

function toIcalDateTimeUtc(date) {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`;
}

function unfoldIcalLines(rawText) {
  const text = String(rawText || "").replace(/\r\n/g, "\n");
  const inputLines = text.split("\n");
  const output = [];

  for (const line of inputLines) {
    if (
      (line.startsWith(" ") || line.startsWith("\t")) &&
      output.length > 0
    ) {
      output[output.length - 1] += line.slice(1);
      continue;
    }

    output.push(line.trimEnd());
  }

  return output;
}

function parseIcalProperty(line) {
  const separatorIndex = line.indexOf(":");
  if (separatorIndex === -1) return null;

  const left = line.slice(0, separatorIndex);
  const value = line.slice(separatorIndex + 1);
  const [name, ...paramParts] = left.split(";");
  const params = {};

  for (const paramPart of paramParts) {
    const [paramName, paramValue] = paramPart.split("=");
    if (!paramName || !paramValue) continue;
    params[paramName.toUpperCase()] = paramValue.toUpperCase();
  }

  return {
    name: name.toUpperCase(),
    params,
    value,
  };
}

function parseIcalDate(value, params = {}) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  // Devuelve siempre una fecha de calendario (medianoche UTC).
  if (params.VALUE === "DATE" || /^\d{8}$/.test(raw)) {
    return dateOnlyFromParts(raw.slice(0, 4), raw.slice(4, 6), raw.slice(6, 8));
  }

  const dateTimeMatch = raw.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/
  );
  if (!dateTimeMatch) return null;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, zulu] =
    dateTimeMatch;

  if (zulu === "Z") {
    // Instante UTC: tomamos el día que corresponde en la zona del negocio.
    const instant = new Date(
      Date.UTC(
        Number(yearRaw),
        Number(monthRaw) - 1,
        Number(dayRaw),
        Number(hourRaw),
        Number(minuteRaw),
        Number(secondRaw || "0")
      )
    );
    if (isNaN(instant.getTime())) return null;
    return parseDateOnly(dateKeyInTimeZone(instant, getAppTimeZone()));
  }

  // Hora "flotante" (sin zona): el día es el que figura en el valor.
  return dateOnlyFromParts(yearRaw, monthRaw, dayRaw);
}

function buildEventUid(rawUid, checkIn, checkOut, summary) {
  const source =
    String(rawUid || "").trim() ||
    `${toIcalDate(checkIn)}|${toIcalDate(checkOut)}|${String(summary || "").trim()}`;

  return crypto.createHash("sha1").update(source).digest("hex");
}

export function normalizeIcalProvider(rawProvider) {
  const provider = String(rawProvider || "").trim().toLowerCase();
  if (provider === "airbnb" || provider === "booking") return provider;
  return "other";
}

export function getIcalProviderLabel(provider) {
  return ICAL_PROVIDER_LABEL[normalizeIcalProvider(provider)] || "iCal externo";
}

export function isValidIcalUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

// --- Protección SSRF: el servidor solo descarga calendarios de hosts públicos.

const MAX_ICAL_BYTES = 5 * 1024 * 1024;
const MAX_ICAL_REDIRECTS = 3;

const BLOCKED_IPV4_RANGES = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 3],
];

function ipv4ToInt(ip) {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isBlockedIpv4(ip) {
  const value = ipv4ToInt(ip);
  return BLOCKED_IPV4_RANGES.some(([base, bits]) => {
    const mask = (~0 << (32 - bits)) >>> 0;
    return (value & mask) === (ipv4ToInt(base) & mask);
  });
}

function isBlockedIpv6(ip) {
  const lower = ip.toLowerCase();
  const mappedV4 = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedV4) return isBlockedIpv4(mappedV4[1]);
  if (lower === "::" || lower === "::1") return true;
  // IPv4 mapeada en hex, NAT64, unique local, link local y multicast.
  return /^(::ffff:|64:ff9b:|f[cd]|fe[89ab]|ff)/.test(lower);
}

function isBlockedAddress(address) {
  const version = net.isIP(address);
  if (version === 4) return isBlockedIpv4(address);
  if (version === 6) return isBlockedIpv6(address);
  return true;
}

async function assertPublicUrl(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("URL iCal inválida.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("URL iCal inválida. Debe comenzar con http(s).");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = net.isIP(hostname)
    ? [hostname]
    : (await dns.lookup(hostname, { all: true }).catch(() => [])).map(
        (entry) => entry.address
      );

  if (addresses.length === 0) {
    throw new Error("No se pudo encontrar el servidor del calendario.");
  }

  if (addresses.some(isBlockedAddress)) {
    throw new Error("La URL iCal apunta a una dirección no permitida.");
  }

  return url;
}

// Valida que la URL sea http(s) y apunte a un host público.
export async function validateIcalSourceUrl(value) {
  await assertPublicUrl(String(value || "").trim());
}

async function readTextWithLimit(response, maxBytes) {
  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error("El calendario es demasiado grande.");
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks).toString("utf8");
}

export function createIcalToken() {
  return crypto.randomBytes(18).toString("hex");
}

export function resolveAppUrl(fallbackOrigin = "") {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return String(fallbackOrigin || "").trim().replace(/\/+$/, "");
}

export function parseIcalEvents(rawText) {
  const lines = unfoldIcalLines(rawText);
  const events = [];

  let inEvent = false;
  let current = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      inEvent = true;
      current = {
        uid: "",
        summary: "",
        dtStartValue: "",
        dtStartParams: {},
        dtEndValue: "",
        dtEndParams: {},
      };
      continue;
    }

    if (line === "END:VEVENT") {
      if (inEvent && current?.dtStartValue) {
        const startDate = parseIcalDate(
          current.dtStartValue,
          current.dtStartParams
        );
        const endDate =
          parseIcalDate(current.dtEndValue, current.dtEndParams) ||
          (startDate ? addDays(startDate, 1) : null);

        const checkIn = startDate;
        let checkOut = endDate;

        if (checkIn && checkOut && checkOut <= checkIn) {
          checkOut = addDays(checkIn, 1);
        }

        if (checkIn && checkOut) {
          events.push({
            uid: buildEventUid(
              current.uid,
              checkIn,
              checkOut,
              current.summary || ""
            ),
            summary: current.summary || "",
            checkIn,
            checkOut,
          });
        }
      }

      inEvent = false;
      current = null;
      continue;
    }

    if (!inEvent || !current) continue;

    const parsed = parseIcalProperty(line);
    if (!parsed) continue;

    if (parsed.name === "UID") {
      current.uid = parsed.value.trim();
      continue;
    }

    if (parsed.name === "SUMMARY") {
      current.summary = unescapeIcalText(parsed.value).trim();
      continue;
    }

    if (parsed.name === "DTSTART") {
      current.dtStartValue = parsed.value.trim();
      current.dtStartParams = parsed.params || {};
      continue;
    }

    if (parsed.name === "DTEND") {
      current.dtEndValue = parsed.value.trim();
      current.dtEndParams = parsed.params || {};
    }
  }

  const uniqueByUid = new Map();
  for (const event of events) {
    if (!uniqueByUid.has(event.uid)) {
      uniqueByUid.set(event.uid, event);
    }
  }

  return [...uniqueByUid.values()].sort(
    (a, b) => a.checkIn.getTime() - b.checkIn.getTime()
  );
}

export async function fetchIcalText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Seguimos las redirecciones a mano para validar cada destino.
    let currentUrl = await assertPublicUrl(url);
    let response;

    for (let hop = 0; ; hop += 1) {
      response = await fetch(currentUrl, {
        method: "GET",
        cache: "no-store",
        redirect: "manual",
        signal: controller.signal,
      });

      const location = response.headers.get("location");
      if (response.status < 300 || response.status >= 400 || !location) break;

      if (hop >= MAX_ICAL_REDIRECTS) {
        throw new Error("El calendario redirige demasiadas veces.");
      }
      currentUrl = await assertPublicUrl(new URL(location, currentUrl).toString());
    }

    if (!response.ok) {
      throw new Error(`No se pudo leer el calendario (${response.status}).`);
    }

    const text = await readTextWithLimit(response, MAX_ICAL_BYTES);
    if (!/BEGIN:VCALENDAR/i.test(text)) {
      throw new Error("El link no devolvió un calendario iCal válido.");
    }

    return text;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("Tiempo de espera agotado al consultar el calendario.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function buildRoomIcal({
  roomName,
  propertyName,
  bookings,
  generatedAt = new Date(),
}) {
  const title = propertyName
    ? `${propertyName} - ${roomName || "Habitación"}`
    : roomName || "Calendario";
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${ICAL_PROD_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcalText(`veklo · ${title}`)}`,
  ];

  for (const booking of bookings || []) {
    const checkIn = toDateOnly(booking.checkIn);
    const checkOut = toDateOnly(booking.checkOut);
    if (!checkIn || !checkOut || checkOut <= checkIn) continue;
    if (booking.status === "cancelled") continue;

    const summary = booking.origin === "ical" ? "Bloqueado (iCal)" : "Reservado";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:veklo-booking-${booking._id}@veklo.app`);
    lines.push(`DTSTAMP:${toIcalDateTimeUtc(generatedAt)}`);
    lines.push(`DTSTART;VALUE=DATE:${toIcalDate(checkIn)}`);
    lines.push(`DTEND;VALUE=DATE:${toIcalDate(checkOut)}`);
    lines.push(`SUMMARY:${escapeIcalText(summary)}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return `${lines.join(ICAL_LINE_BREAK)}${ICAL_LINE_BREAK}`;
}
