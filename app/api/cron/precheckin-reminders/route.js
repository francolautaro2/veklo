import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import Property from "@/models/Property";
import Room from "@/models/Room";
import User from "@/models/User";
import { isAuthorizedCronRequest } from "@/lib/cron";
import { addDays, getAppTimeZone, todayDateOnly } from "@/lib/date-only";
import { resolveAppUrl } from "@/lib/ical";
import { sendPreCheckInReminder } from "@/lib/email";
import { hasAccountAccess } from "@/lib/subscription";

export const maxDuration = 60;

// Se recuerda el pre check-in a huéspedes que llegan en los próximos N días.
const REMINDER_DAYS_BEFORE = 2;
const MAX_REMINDERS_PER_RUN = 200;

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  await dbConnect();

  const today = todayDateOnly(getAppTimeZone());
  const bookings = await Booking.find({
    origin: "manual",
    status: "reserved",
    guestEmail: { $nin: ["", null] },
    "preCheckIn.status": "pending",
    "preCheckIn.token": { $exists: true, $ne: "" },
    "preCheckIn.reminderSentAt": null,
    checkIn: { $gte: today, $lt: addDays(today, REMINDER_DAYS_BEFORE + 1) },
  })
    .sort({ checkIn: 1 })
    .limit(MAX_REMINDERS_PER_RUN)
    .lean();

  const appUrl = resolveAppUrl(new URL(request.url).origin);
  const ownerCache = new Map();
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const booking of bookings) {
    const ownerId = String(booking.ownerId);
    if (!ownerCache.has(ownerId)) {
      ownerCache.set(
        ownerId,
        await User.findById(ownerId)
          .select("subscriptionStatus trialEndsAt subscriptionCurrentPeriodEnd")
          .lean()
      );
    }

    // Cuentas sin acceso (prueba vencida, suscripción inactiva) no envían emails.
    if (!hasAccountAccess(ownerCache.get(ownerId))) {
      skipped += 1;
      continue;
    }

    // Reservamos el envío de forma atómica para no mandar duplicados si dos
    // ejecuciones se superponen.
    const claimed = await Booking.updateOne(
      { _id: booking._id, "preCheckIn.reminderSentAt": null },
      { $set: { "preCheckIn.reminderSentAt": new Date() } }
    );
    if (claimed.modifiedCount === 0) {
      skipped += 1;
      continue;
    }

    const [property, room] = await Promise.all([
      Property.findById(booking.propertyId).select("name").lean(),
      Room.findById(booking.roomId).select("name").lean(),
    ]);

    const result = await sendPreCheckInReminder({
      booking,
      preCheckInUrl: `${appUrl}/precheckin/${booking.preCheckIn.token}`,
      propertyName: property?.name || "Propiedad",
      roomName: room?.name || "Habitación",
    });

    if (result?.ok) {
      sent += 1;
    } else {
      failed += 1;
      // Liberamos la marca para reintentar en la próxima ejecución.
      await Booking.updateOne(
        { _id: booking._id },
        { $set: { "preCheckIn.reminderSentAt": null } }
      );
    }
  }

  const summary = { candidates: bookings.length, sent, skipped, failed };
  console.info("[cron/precheckin-reminders]", JSON.stringify(summary));
  return NextResponse.json(summary);
}
