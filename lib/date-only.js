// lib/date-only.js
// Fechas "de calendario" (check-in, check-out, vencimientos, fecha de pago).
// Se guardan siempre como medianoche UTC (ej: 2026-10-05T00:00:00.000Z) y se
// leen/formatean con getters UTC, así el día no cambia según la zona horaria
// del servidor o del navegador. Sirve tanto en el server como en el cliente.

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_APP_TIMEZONE = "America/Argentina/Buenos_Aires";

export function getAppTimeZone() {
  return (
    (typeof process !== "undefined" && process.env?.APP_TIMEZONE?.trim()) ||
    DEFAULT_APP_TIMEZONE
  );
}

function pad(value) {
  return String(value).padStart(2, "0");
}

// "YYYY-MM-DD" -> Date (medianoche UTC) o null si es inválida.
export function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
}

// Date | ISO string -> Date normalizada a medianoche UTC de su día UTC.
export function toDateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

// Date | ISO string -> "YYYY-MM-DD" (según el día UTC).
export function toDateKey(value) {
  const date = toDateOnly(value);
  if (!date) return "";
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
}

// Instante -> "YYYY-MM-DD" del día que corresponde en la zona horaria indicada.
// Sin timeZone usa la zona del entorno (en el navegador: la del usuario).
export function dateKeyInTimeZone(instant, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function todayKey(timeZone) {
  return dateKeyInTimeZone(new Date(), timeZone);
}

// Hoy como fecha de calendario (medianoche UTC).
export function todayDateOnly(timeZone) {
  return parseDateOnly(todayKey(timeZone));
}

export function addDays(value, days) {
  const date = toDateOnly(value);
  if (!date) return null;
  return new Date(date.getTime() + days * DAY_MS);
}

export function isSameDateOnly(a, b) {
  const keyA = toDateKey(a);
  return Boolean(keyA) && keyA === toDateKey(b);
}

export function formatDateOnly(value, options) {
  const date = toDateOnly(value);
  if (!date) return "-";
  return date.toLocaleDateString("es-AR", { ...options, timeZone: "UTC" });
}
