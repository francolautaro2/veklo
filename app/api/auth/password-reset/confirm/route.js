import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { hashEmailCode } from "@/lib/auth-codes";

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

    const user = await User.findOne({
      email: normalizedEmail,
      passwordResetTokenHash: hashEmailCode(normalizedCode),
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
      return NextResponse.json(
        { error: "El link es inválido o venció. Pedí uno nuevo." },
        { status: 400 }
      );
    }

    user.passwordHash = await bcrypt.hash(normalizedPassword, 10);
    user.passwordResetTokenHash = "";
    user.passwordResetExpiresAt = null;
    await user.save();

    return NextResponse.json({
      message: "Contraseña actualizada. Ya podés iniciar sesión.",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo actualizar la contraseña." },
      { status: 500 }
    );
  }
}
