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
    plan: {
      type: String,
      enum: ["inicio", "pro", "plus"],
      default: "inicio",
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
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
