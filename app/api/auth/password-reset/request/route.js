import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { sendPasswordResetCodeEmail } from "@/lib/email";
import {
  createEmailCode,
  getCodeExpiration,
  hashEmailCode,
} from "@/lib/auth-codes";

export async function POST(request) {
  try {
    await dbConnect();

    const { email } = await request.json();
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Ingresá tu email para restablecer la contraseña." },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email: normalizedEmail }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt"
    );

    if (user) {
      const code = createEmailCode();

      user.passwordResetTokenHash = hashEmailCode(code);
      user.passwordResetExpiresAt = getCodeExpiration();
      await user.save();

      await sendPasswordResetCodeEmail({ user, code });
    }

    return NextResponse.json({
      message:
        "Si existe una cuenta con ese email, te enviamos un código para restablecer la contraseña.",
    });
  } catch (error) {
    console.error("[password-reset/request]", error);
    return NextResponse.json(
      { error: "No se pudo iniciar la recuperación de contraseña." },
      { status: 500 }
    );
  }
}
