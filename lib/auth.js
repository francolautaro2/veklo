// lib/auth.js
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getAccessDeniedMessage, hasAccountAccess, normalizePlan } from "@/lib/subscription";

export const SESSION_COOKIE = "hotel_saas_token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const SESSION_USER_FIELDS =
  "name email organizationId role plan sessionVersion subscriptionStatus trialEndsAt subscriptionCurrentPeriodEnd";

function getJwtSecret() {
  return process.env.JWT_SECRET?.trim() || "";
}

function getSessionCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

// Firma el JWT de sesión. `sv` (sessionVersion) permite invalidar todas las
// sesiones de un usuario incrementando user.sessionVersion.
export function createSessionToken(user, organizationId) {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    throw new Error("JWT_SECRET no está configurado.");
  }

  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      organizationId:
        organizationId ?? user.organizationId?.toString() ?? null,
      role: user.role || "owner",
      plan: user.plan,
      sv: user.sessionVersion || 0,
    },
    jwtSecret,
    { expiresIn: SESSION_MAX_AGE_SECONDS }
  );
}

export function setSessionCookie(response, token) {
  response.cookies.set(
    SESSION_COOKIE,
    token,
    getSessionCookieOptions(SESSION_MAX_AGE_SECONDS)
  );
}

export function clearSessionCookie(response) {
  response.cookies.set(SESSION_COOKIE, "", getSessionCookieOptions(0));
}

function verifySessionToken(token) {
  const jwtSecret = getJwtSecret();
  if (!token || !jwtSecret) return null;

  try {
    return jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }
}

// Valida el token contra la base: el usuario tiene que existir y la sesión no
// puede haber sido revocada (cambio o reseteo de contraseña).
async function loadSessionUser(token) {
  const payload = verifySessionToken(token);
  if (!payload?.sub) return null;

  await dbConnect();
  const user = await User.findById(payload.sub).select(SESSION_USER_FIELDS);
  if (!user) return null;
  if ((payload.sv || 0) !== (user.sessionVersion || 0)) return null;

  return {
    id: user._id.toString(),
    name: user.name || "",
    email: user.email,
    organizationId: user.organizationId?.toString() || null,
    role: user.role || "owner",
    plan: normalizePlan(user.plan),
    subscriptionStatus: user.subscriptionStatus,
    trialEndsAt: user.trialEndsAt || null,
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd || null,
  };
}

// Para route handlers.
export async function getUserContextFromRequest(request) {
  return loadSessionUser(request.cookies.get(SESSION_COOKIE)?.value);
}

// Para server components (usa next/headers).
export async function getSessionUserFromCookies(cookieStore) {
  return loadSessionUser(cookieStore.get(SESSION_COOKIE)?.value);
}

// Devuelve una respuesta 402 si la cuenta no puede operar (prueba vencida o
// suscripción inactiva), o null si puede seguir.
export function getAccessDeniedResponse(user) {
  if (hasAccountAccess(user)) return null;
  return NextResponse.json(
    { error: getAccessDeniedMessage(user) },
    { status: 402 }
  );
}
