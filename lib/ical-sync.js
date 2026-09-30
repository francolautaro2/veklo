// lib/ical-sync.js
// Importa los calendarios iCal externos de una habitación como bloqueos.
// Lo usan el botón "Sincronizar" y la tarea automática (/api/cron/ical-sync).
import Booking from "@/models/Booking";
import {
  fetchIcalText,
  getIcalProviderLabel,
  parseIcalEvents,
} from "@/lib/ical";

function normalizeText(value) {
  return String(value || "").trim();
}

function getSyncGuestName(source, eventSummary) {
  const summary = normalizeText(eventSummary);
  if (summary) return `[iCal] ${summary}`;
  return `[iCal] Bloqueo ${getIcalProviderLabel(source.provider)}`;
}

async function syncSource({ room, property, source }) {
  const rawIcal = await fetchIcalText(source.url);
  const events = parseIcalEvents(rawIcal);
  const syncedAt = new Date();
  const organizationId =
    room.organizationId || property.organizationId || null;

  const existingBlocks = await Booking.find({
    roomId: room._id,
    origin: "ical",
    "externalSource.sourceId": source.sourceId,
  });
  const existingByUid = new Map(
    existingBlocks.map((booking) => [booking.externalSource?.eventUid || "", booking])
  );
  const seenUids = new Set();

  let created = 0;
  let updated = 0;
  let cancelled = 0;
  let skipped = 0;

  for (const event of events) {
    const eventUid = event.uid;
    if (!eventUid || seenUids.has(eventUid)) continue;
    seenUids.add(eventUid);

    const existing = existingByUid.get(eventUid) || null;
    const conflictFilter = {
      roomId: room._id,
      status: { $ne: "cancelled" },
      checkIn: { $lt: event.checkOut },
      checkOut: { $gt: event.checkIn },
    };

    if (existing) {
      conflictFilter._id = { $ne: existing._id };
    }

    const conflict = await Booking.findOne(conflictFilter).select("_id");
    if (conflict) {
      skipped += 1;
      continue;
    }

    const guestName = getSyncGuestName(source, event.summary);

    if (existing) {
      let hasChanges = false;

      if (existing.status !== "reserved") {
        existing.status = "reserved";
        hasChanges = true;
      }

      if (existing.checkIn.getTime() !== event.checkIn.getTime()) {
        existing.checkIn = event.checkIn;
        hasChanges = true;
      }

      if (existing.checkOut.getTime() !== event.checkOut.getTime()) {
        existing.checkOut = event.checkOut;
        hasChanges = true;
      }

      if (existing.guestName !== guestName) {
        existing.guestName = guestName;
        hasChanges = true;
      }

      existing.externalSource = {
        provider: source.provider,
        sourceId: source.sourceId,
        eventUid: eventUid,
        calendarName: source.name || "",
        eventSummary: normalizeText(event.summary),
        lastImportedAt: syncedAt,
      };

      await existing.save();
      if (hasChanges) {
        updated += 1;
      }
      continue;
    }

    await Booking.create({
      organizationId,
      propertyId: room.propertyId,
      roomId: room._id,
      ownerId: property.ownerId,
      guestName,
      guestEmail: "",
      guestPhone: "",
      checkIn: event.checkIn,
      checkOut: event.checkOut,
      status: "reserved",
      origin: "ical",
      externalSource: {
        provider: source.provider,
        sourceId: source.sourceId,
        eventUid: eventUid,
        calendarName: source.name || "",
        eventSummary: normalizeText(event.summary),
        lastImportedAt: syncedAt,
      },
      preCheckIn: {
        status: "completed",
      },
      deposit: {
        amount: 0,
        paymentLink: "",
        status: "not_required",
      },
    });

    created += 1;
  }

  for (const existing of existingBlocks) {
    const eventUid = existing.externalSource?.eventUid || "";
    if (!eventUid || seenUids.has(eventUid)) continue;
    if (existing.status === "cancelled") continue;

    existing.status = "cancelled";
    existing.externalSource = {
      ...existing.externalSource,
      lastImportedAt: syncedAt,
    };
    await existing.save();
    cancelled += 1;
  }

  return {
    sourceId: source.sourceId,
    provider: source.provider,
    providerLabel: getIcalProviderLabel(source.provider),
    totalEvents: events.length,
    created,
    updated,
    cancelled,
    skipped,
  };
}

// Sincroniza las fuentes de la habitación (una sola si se pasa sourceId, si no
// todas las habilitadas), guarda el estado de cada una y devuelve los resultados.
export async function syncRoomSources({ room, property, sourceId = "" }) {
  const sources = Array.isArray(room.icalSources) ? room.icalSources : [];
  const targets = sourceId
    ? sources.filter((source) => source.sourceId === sourceId)
    : sources.filter((source) => source.enabled !== false);

  const results = [];
  for (const source of targets) {
    try {
      const syncResult = await syncSource({ room, property, source });

      source.lastSyncedAt = new Date();
      source.lastSyncStatus = "ok";
      source.lastSyncMessage = `Importados ${syncResult.created + syncResult.updated} evento(s), cancelados ${syncResult.cancelled}, omitidos ${syncResult.skipped}.`;
      results.push({ ok: true, ...syncResult });
    } catch (error) {
      source.lastSyncedAt = new Date();
      source.lastSyncStatus = "error";
      source.lastSyncMessage =
        error instanceof Error
          ? error.message.slice(0, 220)
          : "Error de sincronización iCal.";
      results.push({
        ok: false,
        sourceId: source.sourceId,
        provider: source.provider,
        providerLabel: getIcalProviderLabel(source.provider),
        error: source.lastSyncMessage,
      });
    }
  }

  if (targets.length > 0) {
    await room.save();
  }

  return { targets: targets.length, results };
}
