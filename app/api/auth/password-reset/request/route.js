import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { sendPasswordResetCodeEmail } from "@/lib/email";
import { buildNewCodeFields, createEmailCode } from "@/lib/auth-codes";
import { enforceRateLimits, getClientIp, MINUTE_MS } from "@/lib/rate-limit";

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

    const limited = await enforceRateLimits([
      {
        key: `password-reset-request:email:${normalizedEmail}`,
        limit: 3,
        windowMs: 15 * MINUTE_MS,
      },
      {
        key: `password-reset-request:ip:${getClientIp(request)}`,
        limit: 10,
        windowMs: 15 * MINUTE_MS,
      },
    ]);
    if (limited) return limited;

    const user = await User.findOne({ email: normalizedEmail });

    if (user) {
      const code = createEmailCode();
      await User.updateOne(
        { _id: user._id },
        { $set: buildNewCodeFields("passwordReset", code) }
      );
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
