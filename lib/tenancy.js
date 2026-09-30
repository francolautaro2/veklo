// lib/tenancy.js
import mongoose from "mongoose";
import Booking from "@/models/Booking";
import { getAppTimeZone, todayDateOnly } from "@/lib/date-only";

// Filtro de propiedades a las que el usuario tiene acceso (su organización, o
// las propiedades viejas sin organización que creó él).
export function buildPropertyScope(user) {
  if (!user.organizationId) {
    return { ownerId: user.id };
  }

  return {
    $or: [
      { organizationId: user.organizationId },
      { organizationId: { $exists: false }, ownerId: user.id },
    ],
  };
}

export function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ""));
}

// Reservas no canceladas que todavía no terminaron (en curso o futuras).
export function countActiveBookings(filter) {
  return Booking.countDocuments({
    ...filter,
    status: { $in: ["reserved", "checked_in"] },
    checkOut: { $gt: todayDateOnly(getAppTimeZone()) },
  });
}
