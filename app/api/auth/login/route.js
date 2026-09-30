// app/api/auth/login/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { ensureUserOrganization } from "@/lib/organization";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { enforceRateLimits, getClientIp, MINUTE_MS } from "@/lib/rate-limit";

export async function POST(req) {
  try {
    await dbConnect();

    const { email, password } = await req.json();
    const normalizedEmail = email?.trim().toLowerCase();
    const jwtSecret = process.env.JWT_SECRET;

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    if (!jwtSecret) {
      return NextResponse.json(
        { error: "Configuracion de autenticacion incompleta." },
        { status: 500 }
      );
    }

    const limited = await enforceRateLimits([
      {
        key: `login:email:${normalizedEmail}`,
        limit: 10,
        windowMs: 15 * MINUTE_MS,
      },
      {
        key: `login:ip:${getClientIp(req)}`,
        limit: 30,
        windowMs: 15 * MINUTE_MS,
      },
    ]);
    if (limited) return limited;

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json(
        { error: "Credenciales invalidas." },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Credenciales invalidas." },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: "Tenés que verificar tu email antes de iniciar sesión.",
          code: "EMAIL_NOT_VERIFIED",
          email: user.email,
        },
        { status: 403 }
      );
    }

    const organizationId = await ensureUserOrganization(user);

    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
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

    const res = NextResponse.json({ user: safeUser }, { status: 200 });

    setSessionCookie(res, createSessionToken(user, organizationId));

    return res;
  } catch (error) {
    console.error("[auth/login]", error);
    return NextResponse.json(
      { error: "Error al iniciar sesion." },
      { status: 500 }
    );
  }
}
