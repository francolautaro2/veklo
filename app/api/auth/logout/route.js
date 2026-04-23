// app/api/auth/logout/route.js
import { NextResponse } from "next/server";

export async function POST(request) {
  // Redirigimos al login despues de cerrar sesion
  const response = NextResponse.redirect(
    new URL("/auth/login", request.url),
    { status: 303 }
  );

  // Borramos la cookie del JWT
  response.cookies.set("hotel_saas_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
