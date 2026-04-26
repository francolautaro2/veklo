import crypto from "node:crypto";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { ensureUserOrganization } from "@/lib/organization";
import { getTrialDates, normalizePlan } from "@/lib/subscription";

const googleClient = new OAuth2Client();

function getGoogleClientIds() {
  const serverId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  const publicId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || "";
  const source = serverId || publicId;
  if (!source) return [];

  return source
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function buildSafeUser(user, organizationId) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    documentId: user.documentId || "",
    organizationId,
    role: user.role || "owner",
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionProvider: user.subscriptionProvider || null,
    subscriptionExternalId: user.subscriptionExternalId || "",
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd || null,
    subscriptionLastWebhookAt: user.subscriptionLastWebhookAt || null,
    trialEndsAt: user.trialEndsAt || null,
  };
}

function setSessionCookie(response, token) {
  response.cookies.set("hotel_saas_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function POST(request) {
  try {
    await dbConnect();

    const jwtSecret = process.env.JWT_SECRET?.trim() || "";
    if (!jwtSecret) {
      return NextResponse.json(
        { error: "Configuracion de autenticacion incompleta." },
        { status: 500 }
      );
    }

    const allowedAudiences = getGoogleClientIds();
    if (allowedAudiences.length === 0) {
      return NextResponse.json(
        { error: "Google Sign-In no está configurado en el servidor." },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const credential = String(body?.credential || "").trim();
    const selectedPlan = normalizePlan(body?.plan);
    const expectedNonce = String(body?.nonce || "").trim();

    if (!credential) {
      return NextResponse.json(
        { error: "Credencial de Google inválida." },
        { status: 400 }
      );
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: allowedAudiences,
    });
    const payload = ticket.getPayload();

    const email = String(payload?.email || "")
      .trim()
      .toLowerCase();
    const emailVerified = payload?.email_verified === true;
    const nameFromGoogle = String(payload?.name || "").trim();
    const payloadNonce = String(payload?.nonce || "").trim();

    if (!email || !emailVerified) {
      return NextResponse.json(
        { error: "La cuenta de Google no tiene un email verificado." },
        { status: 401 }
      );
    }

    if (expectedNonce && payloadNonce !== expectedNonce) {
      return NextResponse.json(
        { error: "No se pudo validar el nonce de Google OAuth." },
        { status: 401 }
      );
    }

    let user = await User.findOne({ email });
    let isNewUser = false;

    if (!user) {
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const passwordHash = await bcrypt.hash(randomPassword, 10);
      const { trialStartsAt, trialEndsAt } = getTrialDates();

      user = await User.create({
        name: nameFromGoogle || email.split("@")[0] || "Usuario",
        email,
        emailVerified: true,
        passwordHash,
        role: "owner",
        plan: selectedPlan,
        subscriptionStatus: "trialing",
        trialStartsAt,
        trialEndsAt,
      });
      isNewUser = true;
    } else if (!user.name && nameFromGoogle) {
      user.name = nameFromGoogle;
      user.emailVerified = true;
      await user.save();
    } else if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }

    const organizationId = await ensureUserOrganization(user);

    const appPayload = {
      sub: user._id.toString(),
      email: user.email,
      name: user.name,
      organizationId,
      role: user.role || "owner",
      plan: user.plan,
    };

    const token = jwt.sign(appPayload, jwtSecret, { expiresIn: "7d" });
    const response = NextResponse.json(
      {
        user: buildSafeUser(user, organizationId),
        isNewUser,
      },
      { status: 200 }
    );

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    const isCredentialError =
      error instanceof Error &&
      /Wrong number of segments|Invalid token|audience|Token used too late/i.test(
        error.message
      );

    return NextResponse.json(
      {
        error: isCredentialError
          ? "No se pudo validar la credencial de Google."
          : "Error al autenticar con Google.",
      },
      { status: isCredentialError ? 401 : 500 }
    );
  }
}
