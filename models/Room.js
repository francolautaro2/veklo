// models/Room.js
import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      index: true,
      required: true,
    },
    name: { type: String, required: true }, // "Habitación 101"
    capacity: { type: Number, default: 2 },
    basePrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Room || mongoose.model("Room", RoomSchema);
