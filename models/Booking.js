// models/Booking.js
import mongoose from "mongoose";

const BookingSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      index: true,
      default: null,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      index: true,
      required: true,
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      index: true,
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      required: true,
    },
    guestName: { type: String, required: true },
    guestEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    guestPhone: {
      type: String,
      trim: true,
      default: "",
    },
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    status: {
      type: String,
      enum: ["reserved", "checked_in", "checked_out", "cancelled"],
      default: "reserved",
    },
    origin: {
      type: String,
      enum: ["manual", "ical"],
      default: "manual",
      index: true,
    },
    externalSource: {
      provider: {
        type: String,
        enum: ["airbnb", "booking", "other", ""],
        default: "",
      },
      sourceId: {
        type: String,
        default: "",
        trim: true,
        index: true,
      },
      eventUid: {
        type: String,
        default: "",
        trim: true,
        index: true,
      },
      calendarName: {
        type: String,
        default: "",
        trim: true,
      },
      eventSummary: {
        type: String,
        default: "",
        trim: true,
      },
      lastImportedAt: {
        type: Date,
        default: null,
      },
    },
    preCheckIn: {
      status: {
        type: String,
        enum: ["pending", "completed"],
        default: "pending",
      },
      token: {
        type: String,
        index: true,
        unique: true,
        sparse: true,
      },
      completedAt: {
        type: Date,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
      documentId: {
        type: String,
        default: "",
      },
      notes: {
        type: String,
        default: "",
      },
    },
    deposit: {
      amount: {
        type: Number,
        default: 0,
      },
      paymentLink: {
        type: String,
        default: "",
      },
      status: {
        type: String,
        enum: ["not_required", "pending", "paid"],
        default: "not_required",
      },
      paidAt: {
        type: Date,
        default: null,
      },
    },
  },
  { timestamps: true }
);

BookingSchema.index({ roomId: 1, "externalSource.sourceId": 1 });
BookingSchema.index({ roomId: 1, "externalSource.eventUid": 1 });

export default mongoose.models.Booking ||
  mongoose.model("Booking", BookingSchema);
