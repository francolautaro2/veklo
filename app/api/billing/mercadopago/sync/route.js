import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getUserContextFromRequest } from "@/lib/auth";
import {
  getMercadoPagoPreapproval,
  syncUserSubscriptionFromPreapproval,
} from "@/lib/mercadopago";

function buildSafeBilling(user) {
  return {
    plan: user.plan,
    subscriptionStatus: user.subscriptionStatus,
    subscriptionProvider: user.subscriptionProvider || null,
    subscriptionExternalId: user.subscriptionExternalId || "",
    subscriptionCurrentPeriodEnd: user.subscriptionCurrentPeriodEnd || null,
    subscriptionLastWebhookAt: user.subscriptionLastWebhookAt || null,
    trialEndsAt: user.trialEndsAt || null,
  };
}

export async function POST(request) {
  await dbConnect();

  const sessionUser = await getUserContextFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const user = await User.findById(sessionUser.id).select(
    "plan trialEndsAt subscriptionStatus subscriptionProvider subscriptionExternalId subscriptionCurrentPeriodEnd subscriptionLastWebhookAt"
  );
  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (!user.subscriptionExternalId) {
    return NextResponse.json(
      { error: "No hay suscripción de MercadoPago vinculada a la cuenta." },
      { status: 400 }
    );
  }

  try {
    const preapproval = await getMercadoPagoPreapproval(user.subscriptionExternalId);
    syncUserSubscriptionFromPreapproval(user, preapproval, user.plan);
    await user.save();

    return NextResponse.json({ billing: buildSafeBilling(user) }, { status: 200 });
  } catch (error) {
    console.error("[billing/mercadopago/sync]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo sincronizar la suscripción.",
      },
      { status: 502 }
    );
  }
}
