import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import {
  createEmailCode,
  getCodeExpiration,
  hashEmailCode,
} from "@/lib/auth-codes";
import { sendEmailVerificationCode } from "@/lib/email";

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

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+emailVerificationCodeHash +emailVerificationExpiresAt"
    );

    if (user && !user.emailVerified) {
      const code = createEmailCode();
      user.emailVerificationCodeHash = hashEmailCode(code);
      user.emailVerificationExpiresAt = getCodeExpiration();
      await user.save();
      await sendEmailVerificationCode({ user, code });
    }

    return NextResponse.json({
      message:
        "Si la cuenta existe y todavía no está verificada, te enviamos un código.",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo enviar el código de verificación." },
      { status: 500 }
    );
  }
}
