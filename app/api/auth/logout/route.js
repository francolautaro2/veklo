// app/api/auth/logout/route.js
import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

function logout(request, status) {
  const response = NextResponse.redirect(new URL("/auth/login", request.url), {
    status,
  });
  clearSessionCookie(response);
  return response;
}

// Botón "Cerrar sesión".
export async function POST(request) {
  return logout(request, 303);
}

// Sesión revocada o inválida: el dashboard redirige acá para limpiar la cookie.
export async function GET(request) {
  return logout(request, 307);
}
