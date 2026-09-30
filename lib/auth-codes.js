import crypto from "node:crypto";
import User from "@/models/User";

// Intentos permitidos por código. El reset de contraseña valida el código dos
// veces (verificar + confirmar), así que con 5 quedan 3 errores posibles.
export const MAX_CODE_ATTEMPTS = 5;

const CODE_FIELDS = {
  emailVerification: {
    hash: "emailVerificationCodeHash",
    expiresAt: "emailVerificationExpiresAt",
    attempts: "emailVerificationAttempts",
  },
  passwordReset: {
    hash: "passwordResetTokenHash",
    expiresAt: "passwordResetExpiresAt",
    attempts: "passwordResetAttempts",
  },
};

export function createEmailCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export function hashEmailCode(code) {
  return crypto
    .createHash("sha256")
    .update(String(code || "").trim())
    .digest("hex");
}

export function getCodeExpiration(minutes = 15) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function isSameCodeHash(code, expectedHash) {
  const actual = Buffer.from(hashEmailCode(code), "hex");
  const expected = Buffer.from(String(expectedHash || ""), "hex");
  return (
    actual.length === expected.length && crypto.timingSafeEqual(actual, expected)
  );
}

// Campos a setear al emitir un código nuevo (reinicia el contador de intentos).
export function buildNewCodeFields(purpose, code) {
  const fields = CODE_FIELDS[purpose];
  return {
    [fields.hash]: hashEmailCode(code),
    [fields.expiresAt]: getCodeExpiration(),
    [fields.attempts]: 0,
  };
}

export function buildClearedCodeFields(purpose) {
  const fields = CODE_FIELDS[purpose];
  return {
    [fields.hash]: "",
    [fields.expiresAt]: null,
    [fields.attempts]: 0,
  };
}

// Consume un intento y devuelve el usuario si el código es correcto, o null.
// El intento se descuenta de forma atómica ANTES de comparar, así que ni con
// pedidos en paralelo se pueden probar más de MAX_CODE_ATTEMPTS códigos.
export async function consumeCodeAttempt({ email, code, purpose }) {
  const fields = CODE_FIELDS[purpose];
  if (!email || !code || !fields) return null;

  const user = await User.findOneAndUpdate(
    {
      email,
      [fields.hash]: { $nin: ["", null] },
      [fields.expiresAt]: { $gt: new Date() },
      [fields.attempts]: { $not: { $gte: MAX_CODE_ATTEMPTS } },
    },
    { $inc: { [fields.attempts]: 1 } },
    { new: true }
  ).select(`+${fields.hash} +${fields.expiresAt} +${fields.attempts}`);

  if (!user || !isSameCodeHash(code, user[fields.hash])) return null;
  return user;
}
