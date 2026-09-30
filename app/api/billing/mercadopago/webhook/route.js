import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import {
  getMercadoPagoPreapproval,
  getMercadoPagoWebhookToken,
  parseSubscriptionExternalReference,
  syncUserSubscriptionFromPreapproval,
} from "@/lib/mercadopago";

function parseJsonSafe(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function parseIdFromResource(resource) {
  const raw = String(resource || "");
  if (!raw) return "";
  const parts = raw.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function getPreapprovalIdFromPayload(payload, searchParams) {
  const directId =
    payload?.data?.id ||
    payload?.id ||
    payload?.resource_id ||
    parseIdFromResource(payload?.resource) ||
    searchParams.get("id") ||
    searchParams.get("data.id");

  return String(directId || "").trim();
}

function hasValidWebhookToken(request) {
  const expected = getMercadoPagoWebhookToken();
  if (!expected) return true;

  const token = new URL(request.url).searchParams.get("token") || "";
  return token === expected;
}

async function processPreapprovalUpdate(preapprovalId) {
  await dbConnect();

  const preapproval = await getMercadoPagoPreapproval(preapprovalId);
  const parsedReference = parseSubscriptionExternalReference(
    preapproval.external_reference
  );

  let user = null;
  if (parsedReference.userId) {
    user = await User.findById(parsedReference.userId).select(
      "plan subscriptionStatus subscriptionProvider subscriptionExternalId subscriptionCurrentPeriodEnd subscriptionLastWebhookAt"
    );
  }

  if (!user) {
    user = await User.findOne({ subscriptionExternalId: preapprovalId }).select(
      "plan subscriptionStatus subscriptionProvider subscriptionExternalId subscriptionCurrentPeriodEnd subscriptionLastWebhookAt"
    );
  }

  if (!user) {
    return { ignored: true, reason: "user_not_found" };
  }

  syncUserSubscriptionFromPreapproval(user, preapproval, user.plan);
  await user.save();

  return {
    ignored: false,
    userId: user._id.toString(),
    subscriptionStatus: user.subscriptionStatus,
    externalId: user.subscriptionExternalId || "",
  };
}

async function parseWebhookPayload(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json().catch(() => ({}));
  }

  const text = await request.text();
  if (!text) return {};

  const asJson = parseJsonSafe(text);
  if (Object.keys(asJson).length > 0) return asJson;

  const formData = new URLSearchParams(text);
  return {
    id: formData.get("id"),
    topic: formData.get("topic"),
    type: formData.get("type"),
    resource: formData.get("resource"),
  };
}

export async function POST(request) {
  if (!hasValidWebhookToken(request)) {
    return NextResponse.json({ error: "Webhook no autorizado." }, { status: 401 });
  }

  const payload = await parseWebhookPayload(request);
  const searchParams = new URL(request.url).searchParams;
  const preapprovalId = getPreapprovalIdFromPayload(payload, searchParams);

  if (!preapprovalId) {
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  try {
    const result = await processPreapprovalUpdate(preapprovalId);
    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("[billing/mercadopago/webhook]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar webhook de MercadoPago.",
      },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  if (!hasValidWebhookToken(request)) {
    return NextResponse.json({ error: "Webhook no autorizado." }, { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const preapprovalId = getPreapprovalIdFromPayload({}, searchParams);

  if (!preapprovalId) {
    return NextResponse.json({ received: true, ignored: true }, { status: 200 });
  }

  try {
    const result = await processPreapprovalUpdate(preapprovalId);
    return NextResponse.json({ received: true, ...result }, { status: 200 });
  } catch (error) {
    console.error("[billing/mercadopago/webhook]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo procesar notificación de MercadoPago.",
      },
      { status: 500 }
    );
  }
}
