// models/RateLimit.js
import mongoose from "mongoose";

const RateLimitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  count: { type: Number, default: 0 },
  // Mongo borra el documento solo cuando vence la ventana (índice TTL).
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
});

export default mongoose.models.RateLimit ||
  mongoose.model("RateLimit", RateLimitSchema);
