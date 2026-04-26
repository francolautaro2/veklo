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
        { error: "Ingresá el código que te enviamos por email." },
        { status: 400 }
      );
    }

    const user = await User.findOne({
      email: normalizedEmail,
      passwordResetTokenHash: hashEmailCode(normalizedCode),
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("_id");

    if (!user) {
      return NextResponse.json(
        { error: "El código es inválido o venció. Pedí uno nuevo." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Código verificado. Ahora creá tu nueva contraseña.",
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo verificar el código." },
      { status: 500 }
    );
  }
}
