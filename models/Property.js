// models/Property.js
import mongoose from "mongoose";

const PreCheckInTemplateFieldSchema = new mongoose.Schema(
  {
    fieldId: {
      type: String,
      required: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    type: {
      type: String,
      enum: ["text", "textarea", "boolean"],
      default: "boolean",
    },
    required: {
      type: Boolean,
      default: false,
    },
    hasCost: {
      type: Boolean,
      default: false,
    },
    cost: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { _id: false }
);

const PropertySchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["hotel", "cabana", "casa"],
      required: true,
    },
    address: { type: String },
    description: { type: String },
    preCheckInTemplate: {
      customFields: {
        type: [PreCheckInTemplateFieldSchema],
        default: [],
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Property ||
  mongoose.model("Property", PropertySchema);
