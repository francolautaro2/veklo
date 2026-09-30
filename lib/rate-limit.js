// lib/rate-limit.js
// Límite de pedidos por ventana fija, guardado en Mongo para que funcione con
// varias instancias / serverless (un contador en memoria no alcanza).
import { NextResponse } from "next/server";
import RateLimit from "@/models/RateLimit";

export function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return (
    forwarded.split(",")[0].trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

async function hit(key, windowMs) {
  const now = new Date();
  const isActive = { $gt: ["$expiresAt", now] };

  // Update atómico: suma 1 si la ventana sigue vigente, si no la reinicia.
  const result = await RateLimit.collection.findOneAndUpdate(
    { key },
    [
      {
        $set: {
          count: { $cond: [isActive, { $add: ["$count", 1] }, 1] },
          expiresAt: {
            $cond: [isActive, "$expiresAt", new Date(now.getTime() + windowMs)],
          },
        },
      },
    ],
    { upsert: true, returnDocument: "after" }
  );

  return result?.value || result;
}

// Registra un intento para cada regla y devuelve una respuesta 429 si alguna
// se pasó del límite, o null si el pedido puede seguir.
// rules: [{ key: "login:ip:1.2.3.4", limit: 20, windowMs: 15 * 60 * 1000 }]
export async function enforceRateLimits(rules) {
  let retryAfterMs = 0;

  for (const rule of rules) {
    let doc;
    try {
      doc = await hit(rule.key, rule.windowMs);
    } catch (error) {
      // Dos upserts simultáneos sobre la misma key: el segundo reintenta.
      if (error?.code !== 11000) throw error;
      doc = await hit(rule.key, rule.windowMs);
    }

    if (doc && doc.count > rule.limit) {
      retryAfterMs = Math.max(
        retryAfterMs,
        new Date(doc.expiresAt).getTime() - Date.now()
      );
    }
  }

  if (!retryAfterMs) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
  const minutes = Math.ceil(retryAfterSeconds / 60);

  return NextResponse.json(
    {
      error: `Demasiados intentos. Probá de nuevo en ${minutes} minuto${
        minutes === 1 ? "" : "s"
      }.`,
    },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
  );
}

export const MINUTE_MS = 60 * 1000;
