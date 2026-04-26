import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { hashEmailCode } from "@/lib/auth-codes";

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

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+emailVerificationCodeHash +emailVerificationExpiresAt"
    );

    if (!user) {
      return NextResponse.json(
        { error: "Código inválido o vencido." },
        { status: 400 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json({ message: "Email ya verificado." });
    }

    const codeMatches =
      user.emailVerificationCodeHash === hashEmailCode(normalizedCode);
    const notExpired =
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt > new Date();

    if (!codeMatches || !notExpired) {
      return NextResponse.json(
        { error: "Código inválido o vencido." },
        { status: 400 }
      );
    }

    user.emailVerified = true;
    user.emailVerificationCodeHash = "";
    user.emailVerificationExpiresAt = null;
    await user.save();

    return NextResponse.json({
      message: "Email verificado. Ya podés iniciar sesión.",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo verificar el email." },
      { status: 500 }
    );
  }
}
