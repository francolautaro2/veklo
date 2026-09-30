// Fuente única de planes y precios: la usan el cobro, los límites, la landing,
// el registro, el perfil y los términos.
export const PLAN_LIMITS = {
  pro: {
    key: "pro",
    label: "Pro",
    description: "1 propiedad con habitaciones ilimitadas",
    maxProperties: 1,
    maxRoomsPerProperty: null,
    icalSync: false,
    bookingsExport: false,
    monthlyPriceArs: 49900,
  },
  plus: {
    key: "plus",
    label: "Plus",
    description:
      "Hasta 5 propiedades, sync iCal con Booking y Airbnb y exportación de reservas",
    maxProperties: 5,
    maxRoomsPerProperty: null,
    icalSync: true,
    bookingsExport: true,
    monthlyPriceArs: 89000,
  },
};

// Planes viejos que ya no se venden y a qué plan se asimilan.
const LEGACY_PLANS = {
  inicio: "pro",
};

export const DEFAULT_PLAN = "pro";
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
  if (PLAN_LIMITS[plan]) return plan;
  return LEGACY_PLANS[plan] || DEFAULT_PLAN;
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
    // Suscripción cancelada: mantiene acceso hasta el final del período pagado.
    const paidUntil = toDate(user.subscriptionCurrentPeriodEnd);
    return Boolean(paidUntil && paidUntil >= new Date());
  }

  if (user.subscriptionStatus === "trialing" || !user.subscriptionStatus) {
    const trialEndsAt = toDate(user.trialEndsAt);
    if (!trialEndsAt) return true;
    return trialEndsAt >= new Date();
  }

  return false;
}

export function getAccessDeniedMessage(user) {
  if (user?.subscriptionStatus === "paused") {
    return "Tu suscripción no está activa. Reactivala desde tu perfil para seguir operando.";
  }
  return "Tu prueba gratuita venció. Elegí un plan para seguir operando.";
}

export function formatPlanPrice(plan) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(getPlanConfig(plan).monthlyPriceArs);
}

export function canUseIcalSync(plan) {
  return Boolean(getPlanConfig(plan).icalSync);
}

export function canExportBookings(plan) {
  return Boolean(getPlanConfig(plan).bookingsExport);
}

export function getPlanFeatureMessage(featureLabel) {
  return `${featureLabel} está disponible en el plan ${PLAN_LIMITS.plus.label}. Podés cambiar de plan desde tu perfil.`;
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
