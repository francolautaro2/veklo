// models/Room.js
import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      index: true,
      required: true,
    },
    name: { type: String, required: true }, // "Habitación 101"
    capacity: { type: Number, default: 2 },
    basePrice: { type: Number, default: 0 },
    icalExportToken: {
      type: String,
      default: undefined,
      trim: true,
      index: true,
      unique: true,
      sparse: true,
    },
    icalSources: [
      {
        sourceId: {
          type: String,
          required: true,
          trim: true,
        },
        name: {
          type: String,
          default: "",
          trim: true,
        },
        provider: {
          type: String,
          enum: ["airbnb", "booking", "other"],
          default: "other",
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
        enabled: {
          type: Boolean,
          default: true,
        },
        lastSyncedAt: {
          type: Date,
          default: null,
        },
        lastSyncStatus: {
          type: String,
          enum: ["idle", "ok", "error"],
          default: "idle",
        },
        lastSyncMessage: {
          type: String,
          default: "",
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.Room || mongoose.model("Room", RoomSchema);
