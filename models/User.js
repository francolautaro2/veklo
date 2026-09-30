// models/User.js
import mongoose from "mongoose";

function defaultTrialEndsAt() {
  const now = new Date();
  now.setDate(now.getDate() + 14);
  return now;
}

const UserSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    role: {
      type: String,
      enum: ["owner", "admin", "staff"],
      default: "owner",
    },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    emailVerified: {
      type: Boolean,
      default: true,
      index: true,
    },
    emailVerificationCodeHash: {
      type: String,
      default: "",
      select: false,
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    emailVerificationAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    documentId: {
      type: String,
      trim: true,
      default: "",
    },
    passwordHash: { type: String, required: true },
    // Se incrementa para invalidar todas las sesiones abiertas (ver lib/auth.js).
    sessionVersion: {
      type: Number,
      default: 0,
    },
    plan: {
      type: String,
      // "inicio" es un plan viejo: se conserva para no romper cuentas existentes.
      enum: ["inicio", "pro", "plus"],
      default: "pro",
    },
    subscriptionStatus: {
      type: String,
      enum: ["trialing", "active", "paused"],
      default: "trialing",
    },
    subscriptionProvider: {
      type: String,
      enum: ["mercadopago", null],
      default: null,
    },
    subscriptionExternalId: {
      type: String,
      default: "",
      trim: true,
    },
    subscriptionCurrentPeriodEnd: {
      type: Date,
      default: null,
    },
    subscriptionLastWebhookAt: {
      type: Date,
      default: null,
    },
    trialStartsAt: {
      type: Date,
      default: Date.now,
    },
    trialEndsAt: {
      type: Date,
      default: defaultTrialEndsAt,
    },
    passwordResetTokenHash: {
      type: String,
      default: "",
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },
    passwordResetAttempts: {
      type: Number,
      default: 0,
      select: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
