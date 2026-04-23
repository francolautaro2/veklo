// models/Property.js
import mongoose from "mongoose";

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
  },
  { timestamps: true }
);

export default mongoose.models.Property ||
  mongoose.model("Property", PropertySchema);
