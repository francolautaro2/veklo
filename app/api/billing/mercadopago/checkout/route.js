import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getUserContextFromRequest } from "@/lib/auth";
import {
  getPlanAmount,
  getPlanConfig,
  normalizePlan,
} from "@/lib/subscription";
import {
  createMercadoPagoPreapproval,
  getMercadoPagoWebhookToken,
  resolveAppUrl,
  syncUserSubscriptionFromPreapproval,
} from "@/lib/mercadopago";

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function isTestUserEmail(email) {
  return /@testuser\.com$/i.test(String(email || ""));
}

export async function POST(request) {
  await dbConnect();

  const sessionUser = await getUserContextFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const user = await User.findById(sessionUser.id).select(
    "email plan subscriptionStatus subscriptionProvider subscriptionExternalId subscriptionCurrentPeriodEnd subscriptionLastWebhookAt"
  );
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (!user.email) {
    return NextResponse.json(
      { error: "Tu cuenta no tiene email configurado." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const plan = normalizePlan(body?.plan || user.plan);
  const planConfig = getPlanConfig(plan);
  const amount = getPlanAmount(plan);
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || "";
  const isTestAccessToken = accessToken.startsWith("TEST-");

  const requestedPayerEmail = normalizeEmail(body?.payerEmail);
  const configuredTestPayerEmail = normalizeEmail(
    process.env.MERCADOPAGO_TEST_PAYER_EMAIL
  );
  const payerEmail =
    requestedPayerEmail ||
    (isTestAccessToken && configuredTestPayerEmail
      ? configuredTestPayerEmail
      : normalizeEmail(user.email));

  if (!payerEmail) {
    return NextResponse.json(
      { error: "No se pudo resolver el email pagador para MercadoPago." },
      { status: 400 }
    );
  }

  if (isTestAccessToken && !isTestUserEmail(payerEmail)) {
    return NextResponse.json(
      {
        error:
          "Token TEST detectado. Usá un pagador test (@testuser.com) o configurá MERCADOPAGO_TEST_PAYER_EMAIL.",
      },
      { status: 400 }
    );
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json(
      { error: "El plan seleccionado no tiene precio válido." },
      { status: 400 }
    );
  }

  const origin = new URL(request.url).origin;
  const appUrl = resolveAppUrl(origin);
  if (!appUrl) {
    return NextResponse.json(
      {
        error:
          "No se pudo resolver APP_URL. Configurá APP_URL para habilitar cobros.",
      },
      { status: 500 }
    );
  }

  const webhookToken = getMercadoPagoWebhookToken();
  const notificationUrl = `${appUrl}/api/billing/mercadopago/webhook${
    webhookToken ? `?token=${encodeURIComponent(webhookToken)}` : ""
  }`;
  const backUrl = `${appUrl}/dashboard/profile?billing=mercadopago`;
  const reason = `veklo - Plan ${planConfig.label} (mensual)`;

  try {
    const preapproval = await createMercadoPagoPreapproval({
      userId: user._id.toString(),
      userEmail: payerEmail,
      plan,
      amount,
      reason,
      backUrl,
      notificationUrl,
    });

    syncUserSubscriptionFromPreapproval(user, preapproval, plan);
    await user.save();

    const checkoutUrl = isTestAccessToken
      ? preapproval.sandbox_init_point || preapproval.init_point
      : preapproval.init_point || preapproval.sandbox_init_point;
    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "MercadoPago no devolvió URL de checkout." },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        checkoutUrl,
        subscription: {
          id: preapproval.id || "",
          status: preapproval.status || "pending",
          plan,
          amount,
          payerEmail,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[billing/mercadopago/checkout]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo iniciar la suscripción en MercadoPago.",
      },
      { status: 502 }
    );
  }
}
