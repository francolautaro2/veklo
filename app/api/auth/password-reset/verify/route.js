import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { consumeCodeAttempt } from "@/lib/auth-codes";
import { enforceRateLimits, getClientIp, MINUTE_MS } from "@/lib/rate-limit";

export async function POST(request) {
  try {
    await dbConnect();

    const { email, code } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedCode = String(code || "").trim();

    if (!normalizedEmail || !normalizedCode) {
      return NextResponse.json(
        { error: "Ingresá el código que te enviamos por email." },
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
        {
          error:
            "El código es inválido o venció. Si fallaste varias veces, pedí uno nuevo.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Código verificado. Ahora creá tu nueva contraseña.",
    });
  } catch (error) {
    console.error("[auth/password-reset/verify]", error);
    return NextResponse.json(
      { error: "No se pudo verificar el código." },
      { status: 500 }
    );
  }
}
