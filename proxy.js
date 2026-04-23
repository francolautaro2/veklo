import { NextResponse } from "next/server";

function decodeJwtPayload(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));
    return payload;
  } catch {
    return null;
  }
}

function hasActiveSession(token) {
  if (!token) return false;

  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (typeof payload.exp !== "number") return true;

  return payload.exp * 1000 > Date.now();
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("hotel_saas_token")?.value;
  const isSessionActive = hasActiveSession(token);

  if (!isSessionActive && pathname.startsWith("/dashboard")) {
    const response = NextResponse.redirect(new URL("/auth/login", request.url));
    response.cookies.set("hotel_saas_token", "", {
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
