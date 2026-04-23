import crypto from "node:crypto";

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

function toDateOnly(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toIcalDate(date) {
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
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

  if (params.VALUE === "DATE" || /^\d{8}$/.test(raw)) {
    const year = Number(raw.slice(0, 4));
    const month = Number(raw.slice(4, 6));
    const day = Number(raw.slice(6, 8));
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
  }

  const dateTimeMatch = raw.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/
  );
  if (!dateTimeMatch) return null;

  const [, yearRaw, monthRaw, dayRaw, hourRaw, minuteRaw, secondRaw, zulu] =
    dateTimeMatch;
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  const second = Number(secondRaw || "0");

  if (zulu === "Z") {
    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  }

  return new Date(year, month - 1, day, hour, minute, second);
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

        const checkIn = toDateOnly(startDate);
        let checkOut = toDateOnly(endDate);

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
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`No se pudo leer el calendario (${response.status}).`);
    }

    const text = await response.text();
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
    const checkIn = toDateOnly(new Date(booking.checkIn));
    const checkOut = toDateOnly(new Date(booking.checkOut));
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
