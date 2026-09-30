// instrumentation.js
// Next.js lo ejecuta una vez al iniciar el servidor. Avisa en los logs si falta
// configuración de producción (no corta el arranque).

const REQUIRED = ["MONGODB_URI", "JWT_SECRET", "APP_URL"];
const RECOMMENDED = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_WEBHOOK_TOKEN",
  "CRON_SECRET",
  "GOOGLE_CLIENT_ID",
  "NEXT_PUBLIC_GOOGLE_CLIENT_ID",
];

export function register() {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") return;

  const isMissing = (name) => !process.env[name]?.trim();
  const missingRequired = REQUIRED.filter(isMissing);
  const missingRecommended = RECOMMENDED.filter(isMissing);

  if (missingRequired.length) {
    console.error(
      `[config] Faltan variables obligatorias: ${missingRequired.join(", ")}`
    );
  }

  if (missingRecommended.length) {
    console.warn(
      `[config] Faltan variables (hay funciones que no van a andar): ${missingRecommended.join(", ")}`
    );
  }

  if ((process.env.JWT_SECRET?.trim().length || 0) < 32) {
    console.error("[config] JWT_SECRET es demasiado corto: usá al menos 32 caracteres aleatorios.");
  }

  if (process.env.MERCADOPAGO_ACCESS_TOKEN?.trim().startsWith("TEST-")) {
    console.warn("[config] MERCADOPAGO_ACCESS_TOKEN es de prueba (TEST-): no se van a cobrar pagos reales.");
  }

  if (process.env.APP_URL && !process.env.APP_URL.startsWith("https://")) {
    console.warn("[config] APP_URL debería usar https:// en producción.");
  }
}
