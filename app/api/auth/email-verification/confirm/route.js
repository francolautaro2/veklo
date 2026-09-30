import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { buildClearedCodeFields, consumeCodeAttempt } from "@/lib/auth-codes";
import { enforceRateLimits, getClientIp, MINUTE_MS } from "@/lib/rate-limit";

export async function POST(request) {
  try {
    await dbConnect();

    const { email, code } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const normalizedCode = String(code || "").trim();

    if (!normalizedEmail || !normalizedCode) {
      return NextResponse.json(
        { error: "Email y código son obligatorios." },
        { status: 400 }
      );
    }

    const limited = await enforceRateLimits([
      {
        key: `email-verify:ip:${getClientIp(request)}`,
        limit: 30,
        windowMs: 15 * MINUTE_MS,
      },
    ]);
    if (limited) return limited;

    const existing = await User.findOne({ email: normalizedEmail }).select(
      "emailVerified"
    );
    if (existing?.emailVerified) {
      return NextResponse.json({ message: "Email ya verificado." });
    }

    const user = await consumeCodeAttempt({
      email: normalizedEmail,
      code: normalizedCode,
      purpose: "emailVerification",
    });

    if (!user) {
      return NextResponse.json(
        {
          error:
            "Código inválido o vencido. Si fallaste varias veces, pedí un código nuevo.",
        },
        { status: 400 }
      );
    }

    user.set({
      emailVerified: true,
      ...buildClearedCodeFields("emailVerification"),
    });
    await user.save();

    return NextResponse.json({
      message: "Email verificado. Ya podés iniciar sesión.",
    });
  } catch (error) {
    console.error("[auth/email-verification/confirm]", error);
    return NextResponse.json(
      { error: "No se pudo verificar el email." },
      { status: 500 }
    );
  }
}
