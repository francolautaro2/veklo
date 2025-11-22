// middleware.js
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register"];

export function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("hotel_saas_token")?.value || null;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p);

  if (!token && pathname.startsWith("/dashboard")) {
    const loginUrl = new URL("/auth/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Si ya está logueado y quiere ir a login/register → mandarlo al dashboard
  if (token && (pathname === "/auth/login" || pathname === "/auth/register")) {
    const dashboardUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/auth/:path*", "/dashboard/:path*"],
};