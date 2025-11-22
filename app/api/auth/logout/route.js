// app/api/auth/logout/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
  // Redirigimos al login después de cerrar sesión
  const response = NextResponse.redirect(new URL("/auth/login", request.url));

  // Borramos la cookie del JWT
  response.cookies.set("hotel_saas_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0, // expira ya
  });

  return response;
}
