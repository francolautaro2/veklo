// models/RevocationRequest.js
// Pedidos del "botón de arrepentimiento" (Res. 424/2020 de Defensa del Consumidor).
import mongoose from "mongoose";

const RevocationRequestSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    details: { type: String, default: "", trim: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      enum: ["received", "processed"],
      default: "received",
    },
  },
  { timestamps: true }
);

export default mongoose.models.RevocationRequest ||
  mongoose.model("RevocationRequest", RevocationRequestSchema);
