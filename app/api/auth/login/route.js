// app/api/auth/login/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { ensureUserOrganization } from "@/lib/organization";

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

    const organizationId = await ensureUserOrganization(user);

    const payload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      organizationId,
      role: user.role,
      plan: user.plan,
    };

    const token = jwt.sign(payload, jwtSecret, {
      expiresIn: "7d",
    });

    const safeUser = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
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

    res.cookies.set("hotel_saas_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return res;
  } catch {
    return NextResponse.json(
      { error: "Error al iniciar sesion." },
      { status: 500 }
    );
  }
}
