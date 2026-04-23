export const PLAN_LIMITS = {
  inicio: {
    key: "inicio",
    label: "Inicio",
    maxProperties: 1,
    maxRoomsPerProperty: 25,
    monthlyPriceArs: 24900,
  },
  pro: {
    key: "pro",
    label: "Pro",
    maxProperties: 5,
    maxRoomsPerProperty: null,
    monthlyPriceArs: 49900,
  },
  plus: {
    key: "plus",
    label: "Plus",
    maxProperties: null,
    maxRoomsPerProperty: null,
    monthlyPriceArs: 89900,
  },
};

export const DEFAULT_PLAN = "inicio";
export const TRIAL_DAYS = 14;

function toDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

export function normalizePlan(rawPlan) {
  if (!rawPlan) return DEFAULT_PLAN;
  const plan = String(rawPlan).trim().toLowerCase();
  return PLAN_LIMITS[plan] ? plan : DEFAULT_PLAN;
}

export function getPlanConfig(plan) {
  return PLAN_LIMITS[normalizePlan(plan)];
}

export function getPlanAmount(plan) {
  const config = getPlanConfig(plan);
  return config.monthlyPriceArs;
}

export function getTrialDates(days = TRIAL_DAYS) {
  const trialStartsAt = new Date();
  const trialEndsAt = new Date(trialStartsAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + days);
  return { trialStartsAt, trialEndsAt };
}

export function hasAccountAccess(user) {
  if (!user) return false;

  if (user.subscriptionStatus === "active") {
    return true;
  }

  if (user.subscriptionStatus === "paused") {
    return false;
  }

  if (user.subscriptionStatus === "trialing" || !user.subscriptionStatus) {
    const trialEndsAt = toDate(user.trialEndsAt);
    if (!trialEndsAt) return true;
    return trialEndsAt >= new Date();
  }

  return false;
}

export function getAccessDeniedMessage() {
  return "Tu prueba gratuita venció. Elegí un plan para seguir operando.";
}

export function getPropertyLimitMessage(plan) {
  const config = getPlanConfig(plan);
  if (config.maxProperties == null) return null;
  return `Tu plan ${config.label} permite hasta ${config.maxProperties} propiedad(es).`;
}

export function getRoomLimitMessage(plan) {
  const config = getPlanConfig(plan);
  if (config.maxRoomsPerProperty == null) return null;
  return `Tu plan ${config.label} permite hasta ${config.maxRoomsPerProperty} habitaciones por propiedad.`;
}

export function mapMercadoPagoStatusToSubscriptionStatus(
  mercadoPagoStatus,
  currentStatus = "trialing"
) {
  const normalized = String(mercadoPagoStatus || "").trim().toLowerCase();

  if (normalized === "authorized") return "active";
  if (normalized === "paused") return "paused";
  if (normalized === "cancelled") return "paused";
  if (normalized === "rejected") return "paused";

  if (normalized === "pending") {
    return currentStatus === "active" ? "active" : "trialing";
  }

  return currentStatus || "trialing";
}
