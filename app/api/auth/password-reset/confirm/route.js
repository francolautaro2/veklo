import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { buildClearedCodeFields, consumeCodeAttempt } from "@/lib/auth-codes";
import { enforceRateLimits, getClientIp, MINUTE_MS } from "@/lib/rate-limit";

export async function POST(request) {
  try {
    await dbConnect();

    const { email, code, password } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedCode = String(code || "").trim();
    const normalizedPassword = String(password || "");

    if (!normalizedEmail || !normalizedCode || !normalizedPassword) {
      return NextResponse.json(
        { error: "Email, código y nueva contraseña son obligatorios." },
        { status: 400 }
      );
    }

    if (normalizedPassword.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const limited = await enforceRateLimits([
      {
        key: `password-reset-code:ip:${getClientIp(request)}`,
        limit: 30,
        windowMs: 15 * MINUTE_MS,
      },
    ]);
    if (limited) return limited;

    const user = await consumeCodeAttempt({
      email: normalizedEmail,
      code: normalizedCode,
      purpose: "passwordReset",
    });

    if (!user) {
      return NextResponse.json(
        { error: "El código es inválido o venció. Pedí uno nuevo." },
        { status: 400 }
      );
    }

    user.set({
      passwordHash: await bcrypt.hash(normalizedPassword, 10),
      sessionVersion: (user.sessionVersion || 0) + 1,
      ...buildClearedCodeFields("passwordReset"),
    });
    await user.save();

    return NextResponse.json({
      message: "Contraseña actualizada. Ya podés iniciar sesión.",
    });
  } catch (error) {
    console.error("[auth/password-reset/confirm]", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la contraseña." },
      { status: 500 }
    );
  }
}
