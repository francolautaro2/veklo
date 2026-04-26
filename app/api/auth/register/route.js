// app/api/auth/register/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getTrialDates, normalizePlan } from "@/lib/subscription";
import { ensureUserOrganization } from "@/lib/organization";
import {
  createEmailCode,
  getCodeExpiration,
  hashEmailCode,
} from "@/lib/auth-codes";
import { sendEmailVerificationCode } from "@/lib/email";

export async function POST(req) {
  try {
    await dbConnect();

    const { name, email, password, plan } = await req.json();
    const normalizedName = name?.trim();
    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedPlan = normalizePlan(plan);

    if (!normalizedName || !normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 8 caracteres." },
        { status: 400 }
      );
    }

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const { trialStartsAt, trialEndsAt } = getTrialDates();
    const verificationCode = createEmailCode();

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      emailVerified: false,
      emailVerificationCodeHash: hashEmailCode(verificationCode),
      emailVerificationExpiresAt: getCodeExpiration(),
      passwordHash,
      role: "owner",
      plan: normalizedPlan,
      subscriptionStatus: "trialing",
      trialStartsAt,
      trialEndsAt,
    });

    const organizationId = await ensureUserOrganization(user);
    await sendEmailVerificationCode({ user, code: verificationCode });

    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      phone: user.phone || "",
      documentId: user.documentId || "",
      organizationId,
      role: user.role,
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      subscriptionProvider: user.subscriptionProvider || null,
      subscriptionExternalId: user.subscriptionExternalId || "",
      subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd || null,
      subscriptionLastWebhookAt: user.subscriptionLastWebhookAt || null,
      trialEndsAt: user.trialEndsAt,
    };

    return NextResponse.json(
      {
        user: safeUser,
        requiresEmailVerification: true,
        message: "Te enviamos un código para verificar tu email.",
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Error al registrar usuario." },
      { status: 500 }
    );
  }
}
