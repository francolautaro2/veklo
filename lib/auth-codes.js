import crypto from "node:crypto";

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
