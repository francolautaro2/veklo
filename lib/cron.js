// lib/cron.js
import crypto from "node:crypto";

// Las tareas programadas se autentican con `Authorization: Bearer <CRON_SECRET>`.
// Vercel Cron manda ese header solo si CRON_SECRET está configurado; cualquier
// otro programador (cron-job.org, GitHub Actions, etc.) tiene que enviarlo.
export function isAuthorizedCronRequest(request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(request.headers.get("authorization") || "");
  return (
    expected.length === received.length &&
    crypto.timingSafeEqual(expected, received)
  );
}
