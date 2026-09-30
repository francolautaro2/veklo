import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import Room from "@/models/Room";
import User from "@/models/User";
import { isAuthorizedCronRequest } from "@/lib/cron";
import { syncRoomSources } from "@/lib/ical-sync";
import { canUseIcalSync, hasAccountAccess } from "@/lib/subscription";

export const maxDuration = 60;

// Margen para cortar antes del límite de ejecución de la plataforma. Las
// habitaciones que no entren quedan para la próxima corrida (se procesan
// primero las sincronizadas hace más tiempo).
const TIME_BUDGET_MS = 45 * 1000;
const CONCURRENCY = 5;

export async function GET(request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const startedAt = Date.now();
  await dbConnect();

  const rooms = await Room.find({
    icalSources: { $elemMatch: { enabled: { $ne: false } } },
  }).sort({ "icalSources.lastSyncedAt": 1 });

  const ownerCache = new Map();
  async function ownerCanSync(ownerId) {
    const key = String(ownerId);
    if (!ownerCache.has(key)) {
      const owner = await User.findById(key)
        .select("plan subscriptionStatus trialEndsAt subscriptionCurrentPeriodEnd")
        .lean();
      ownerCache.set(
        key,
        Boolean(owner && canUseIcalSync(owner.plan) && hasAccountAccess(owner))
      );
    }
    return ownerCache.get(key);
  }

  const summary = { rooms: rooms.length, synced: 0, skipped: 0, errors: 0, pending: 0 };

  async function processRoom(room) {
    const property = await Property.findById(room.propertyId).select(
      "_id name ownerId organizationId"
    );
    if (!property || !(await ownerCanSync(property.ownerId))) {
      summary.skipped += 1;
      return;
    }

    const { results } = await syncRoomSources({ room, property });
    summary.synced += 1;
    summary.errors += results.filter((result) => !result.ok).length;
  }

  for (let index = 0; index < rooms.length; index += CONCURRENCY) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      summary.pending = rooms.length - index;
      break;
    }

    await Promise.all(
      rooms.slice(index, index + CONCURRENCY).map((room) =>
        processRoom(room).catch((error) => {
          summary.errors += 1;
          console.error("[cron/ical-sync] room", String(room._id), error);
        })
      )
    );
  }

  console.info("[cron/ical-sync]", JSON.stringify(summary));
  return NextResponse.json(summary);
}
