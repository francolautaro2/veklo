import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { buildNewCodeFields, createEmailCode } from "@/lib/auth-codes";
import { sendEmailVerificationCode } from "@/lib/email";
import { enforceRateLimits, getClientIp, MINUTE_MS } from "@/lib/rate-limit";

export async function POST(request) {
  try {
    await dbConnect();

    const { email } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Ingresá tu email para enviar el código." },
        { status: 400 }
      );
    }

    const limited = await enforceRateLimits([
      {
        key: `email-verify-request:email:${normalizedEmail}`,
        limit: 3,
        windowMs: 15 * MINUTE_MS,
      },
      {
        key: `email-verify-request:ip:${getClientIp(request)}`,
        limit: 10,
        windowMs: 15 * MINUTE_MS,
      },
    ]);
    if (limited) return limited;

    const user = await User.findOne({ email: normalizedEmail });

    if (user && !user.emailVerified) {
      const code = createEmailCode();
      await User.updateOne(
        { _id: user._id },
        { $set: buildNewCodeFields("emailVerification", code) }
      );
      await sendEmailVerificationCode({ user, code });
    }

    return NextResponse.json({
      message:
        "Si la cuenta existe y todavía no está verificada, te enviamos un código.",
    });
  } catch (error) {
    console.error("[auth/email-verification/request]", error);
    return NextResponse.json(
      { error: "No se pudo enviar el código de verificación." },
      { status: 500 }
    );
  }
}
