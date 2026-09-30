import crypto from "node:crypto";
import {
  mapMercadoPagoStatusToSubscriptionStatus,
  normalizePlan,
} from "@/lib/subscription";

const MERCADOPAGO_API_BASE_URL = "https://api.mercadopago.com";
const PREAPPROVAL_START_DELAY_MINUTES = 10;

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

function getPreapprovalStartDate() {
  const startDate = new Date();
  startDate.setMinutes(
    startDate.getMinutes() + PREAPPROVAL_START_DELAY_MINUTES,
    0,
    0
  );
  return startDate.toISOString();
}

export function getMercadoPagoWebhookToken() {
  return process.env.MERCADOPAGO_WEBHOOK_TOKEN?.trim() || "";
}

export function resolveAppUrl(fallbackOrigin = "") {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return String(fallbackOrigin || "").trim().replace(/\/+$/, "");
}

function getMercadoPagoAccessToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!token) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN no está configurado.");
  }
  return token;
}

async function parseJsonSafe(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function mercadopagoRequest(
  path,
  { method = "GET", body, idempotencyKey } = {}
) {
  const accessToken = getMercadoPagoAccessToken();
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  if (idempotencyKey) {
    headers["X-Idempotency-Key"] = idempotencyKey;
  }

  const response = await fetch(`${MERCADOPAGO_API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const parsed = await parseJsonSafe(response);
  if (!response.ok) {
    const message =
      parsed?.message ||
      parsed?.error ||
      parsed?.cause?.[0]?.description ||
      "Error en API de MercadoPago.";
    throw new Error(`MercadoPago ${response.status}: ${message}`);
  }

  return parsed;
}

export function buildSubscriptionExternalReference(userId, plan) {
  return `user:${userId}|plan:${normalizePlan(plan)}`;
}

export function parseSubscriptionExternalReference(externalReference) {
  const raw = String(externalReference || "");
  const segments = raw.split("|");
  const data = { userId: "", plan: "" };

  for (const segment of segments) {
    const [key, value] = segment.split(":");
    if (key === "user" && value) {
      data.userId = value;
    }
    if (key === "plan" && value) {
      data.plan = normalizePlan(value);
    }
  }

  return data;
}

export async function createMercadoPagoPreapproval({
  userId,
  userEmail,
  plan,
  amount,
  reason,
  backUrl,
  notificationUrl,
}) {
  const payload = {
    reason,
    external_reference: buildSubscriptionExternalReference(userId, plan),
    payer_email: userEmail,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: amount,
      currency_id: "ARS",
      start_date: getPreapprovalStartDate(),
    },
    back_url: backUrl,
    notification_url: notificationUrl,
    status: "pending",
  };

  return mercadopagoRequest("/preapproval", {
    method: "POST",
    body: payload,
    idempotencyKey: crypto.randomUUID(),
  });
}

export async function getMercadoPagoPreapproval(id) {
  return mercadopagoRequest(`/preapproval/${id}`, { method: "GET" });
}

export async function cancelMercadoPagoPreapproval(id) {
  return mercadopagoRequest(`/preapproval/${id}`, {
    method: "PUT",
    body: { status: "cancelled" },
  });
}

export function syncUserSubscriptionFromPreapproval(
  user,
  preapproval,
  fallbackPlan
) {
  if (!user || !preapproval) return user;

  const parsedRef = parseSubscriptionExternalReference(
    preapproval.external_reference
  );
  const nextPlan = normalizePlan(parsedRef.plan || fallbackPlan || user.plan);
  const nextStatus = mapMercadoPagoStatusToSubscriptionStatus(
    preapproval.status,
    user.subscriptionStatus
  );

  user.plan = nextPlan;
  user.subscriptionStatus = nextStatus;
  user.subscriptionProvider = "mercadopago";
  user.subscriptionExternalId =
    preapproval.id || user.subscriptionExternalId || "";
  // Si se cancela y MercadoPago ya no informa próxima fecha, conservamos la
  // que teníamos: el usuario mantiene acceso hasta el final del período pagado.
  user.subscriptionCurrentPeriodEnd =
    toDate(preapproval.next_payment_date) ||
    toDate(preapproval.auto_recurring?.end_date) ||
    (nextStatus === "paused" ? user.subscriptionCurrentPeriodEnd : null) ||
    null;
  user.subscriptionLastWebhookAt = new Date();

  return user;
}
