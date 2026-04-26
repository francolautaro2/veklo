import { NextResponse } from "next/server";

function decodeBase64Url(value) {
  const base64 = String(value || "")
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  try {
    return atob(base64 + padding);
  } catch {
    return null;
  }
}

function decodeJwtPart(part) {
  const decoded = decodeBase64Url(part);
  if (!decoded) return null;

  try {
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function base64UrlToBytes(value) {
  const decoded = decodeBase64Url(value);
  if (!decoded) return null;

  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes;
}

const encoder = new TextEncoder();
let cachedSecret = "";
let cachedKeyPromise = null;

function getSecretKey(secret) {
  if (!secret) return null;

  if (!cachedKeyPromise || cachedSecret !== secret) {
    cachedSecret = secret;
    cachedKeyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
  }

  return cachedKeyPromise;
}

async function verifyJwt(token, secret) {
  if (!token || !secret) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJwtPart(encodedHeader);
  const payload = decodeJwtPart(encodedPayload);
  const signature = base64UrlToBytes(encodedSignature);
  if (!header || !payload || !signature) return null;

  if (header.alg !== "HS256") return null;

  const key = await getSecretKey(secret);
  if (!key) return null;

  const signedContent = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const isValid = await crypto.subtle.verify(
    "HMAC",
    key,
    signature,
    signedContent
  );
  if (!isValid) return null;

  return payload;
}

function hasActiveSession(payload) {
  if (!payload) return false;
  if (typeof payload.exp !== "number") return true;

  return payload.exp * 1000 > Date.now();
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("hotel_saas_token")?.value;
  const jwtSecret = process.env.JWT_SECRET?.trim() || "";
  const payload = await verifyJwt(token, jwtSecret);
  const isSessionActive = hasActiveSession(payload);

  if (!isSessionActive && pathname.startsWith("/dashboard")) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    response.cookies.set("hotel_saas_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  if (
    isSessionActive &&
    (pathname === "/auth/login" || pathname === "/auth/register")
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/:path*", "/dashboard/:path*"],
};
