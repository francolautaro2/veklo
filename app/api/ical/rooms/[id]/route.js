import crypto from "node:crypto";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Property from "@/models/Property";
import Booking from "@/models/Booking";
import { getUserContextFromRequest } from "@/lib/auth";
import {
  createIcalToken,
  fetchIcalText,
  getIcalProviderLabel,
  isValidIcalUrl,
  normalizeIcalProvider,
  parseIcalEvents,
  resolveAppUrl,
} from "@/lib/ical";

function buildPropertyScope(user) {
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

function normalizeText(value) {
  return String(value || "").trim();
}

function getSyncGuestName(source, eventSummary) {
  const summary = normalizeText(eventSummary);
  if (summary) return `[iCal] ${summary}`;
  return `[iCal] Bloqueo ${getIcalProviderLabel(source.provider)}`;
}

function mapSource(source) {
  return {
    sourceId: source.sourceId,
    name: source.name || getIcalProviderLabel(source.provider),
    provider: normalizeIcalProvider(source.provider),
    providerLabel: getIcalProviderLabel(source.provider),
    url: source.url || "",
    enabled: source.enabled !== false,
    lastSyncedAt: source.lastSyncedAt || null,
    lastSyncStatus: source.lastSyncStatus || "idle",
    lastSyncMessage: source.lastSyncMessage || "",
    createdAt: source.createdAt || null,
  };
}

function buildIcalConfig(room, appUrl) {
  const sources = Array.isArray(room.icalSources)
    ? room.icalSources.map(mapSource)
    : [];

  return {
    roomId: room._id.toString(),
    roomName: room.name,
    exportUrl: room.icalExportToken
      ? `${appUrl}/api/ical/export/${room.icalExportToken}`
      : "",
    exportToken: room.icalExportToken || "",
    sources,
  };
}

async function getRoomContext(roomId, user) {
  const room = await Room.findById(roomId);
  if (!room) return null;

  const property = await Property.findOne({
    _id: room.propertyId,
    ...buildPropertyScope(user),
  }).select("_id name ownerId organizationId");

  if (!property) return null;

  return { room, property };
}

async function syncSource({ room, property, user, source }) {
  const rawIcal = await fetchIcalText(source.url);
  const events = parseIcalEvents(rawIcal);
  const syncedAt = new Date();
  const organizationId =
    room.organizationId || property.organizationId || user.organizationId || null;

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
      ownerId: property.ownerId || user.id,
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

export async function GET(request, { params }) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const context = await getRoomContext(id, user);
  if (!context) {
    return NextResponse.json(
      { error: "Habitación no encontrada o sin acceso." },
      { status: 404 }
    );
  }

  const { room, property } = context;
  let mustSave = false;

  if (!room.organizationId && user.organizationId) {
    room.organizationId = user.organizationId;
    mustSave = true;
  }

  if (!property.organizationId && user.organizationId) {
    property.organizationId = user.organizationId;
    await property.save();
  }

  if (!room.icalExportToken) {
    room.icalExportToken = createIcalToken();
    mustSave = true;
  }

  if (!Array.isArray(room.icalSources)) {
    room.icalSources = [];
    mustSave = true;
  }

  if (mustSave) {
    await room.save();
  }

  const appUrl = resolveAppUrl(new URL(request.url).origin);

  return NextResponse.json(
    { config: buildIcalConfig(room, appUrl) },
    { status: 200 }
  );
}

export async function POST(request, { params }) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const context = await getRoomContext(id, user);
  if (!context) {
    return NextResponse.json(
      { error: "Habitación no encontrada o sin acceso." },
      { status: 404 }
    );
  }

  const { room, property } = context;
  const body = await request.json().catch(() => ({}));
  const action = normalizeText(body.action).toLowerCase();

  if (!action) {
    return NextResponse.json(
      { error: "Acción inválida para iCal." },
      { status: 400 }
    );
  }

  if (!room.icalExportToken) {
    room.icalExportToken = createIcalToken();
  }
  if (!Array.isArray(room.icalSources)) {
    room.icalSources = [];
  }

  if (action === "regenerate_export_token") {
    room.icalExportToken = createIcalToken();
    await room.save();

    const appUrl = resolveAppUrl(new URL(request.url).origin);
    return NextResponse.json(
      {
        message: "Token de exportación regenerado.",
        config: buildIcalConfig(room, appUrl),
      },
      { status: 200 }
    );
  }

  if (action === "add_source") {
    const url = normalizeText(body.url);
    if (!isValidIcalUrl(url)) {
      return NextResponse.json(
        { error: "URL iCal inválida. Debe comenzar con http(s)." },
        { status: 400 }
      );
    }

    const provider = normalizeIcalProvider(body.provider);
    const name = normalizeText(body.name) || getIcalProviderLabel(provider);

    const exists = room.icalSources.some(
      (source) => normalizeText(source.url) === url
    );
    if (exists) {
      return NextResponse.json(
        { error: "Ese link iCal ya está agregado en esta habitación." },
        { status: 409 }
      );
    }

    room.icalSources.push({
      sourceId: crypto.randomUUID(),
      name,
      provider,
      url,
      enabled: true,
      lastSyncStatus: "idle",
      lastSyncMessage: "",
    });
    await room.save();

    const appUrl = resolveAppUrl(new URL(request.url).origin);
    return NextResponse.json(
      {
        message: "Fuente iCal agregada.",
        config: buildIcalConfig(room, appUrl),
      },
      { status: 201 }
    );
  }

  if (action === "delete_source") {
    const sourceId = normalizeText(body.sourceId);
    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId es obligatorio." },
        { status: 400 }
      );
    }

    const beforeCount = room.icalSources.length;
    room.icalSources = room.icalSources.filter(
      (source) => source.sourceId !== sourceId
    );

    if (room.icalSources.length === beforeCount) {
      return NextResponse.json(
        { error: "Fuente iCal no encontrada." },
        { status: 404 }
      );
    }

    await room.save();

    const cancelledResult = await Booking.updateMany(
      {
        roomId: room._id,
        origin: "ical",
        "externalSource.sourceId": sourceId,
        status: { $ne: "cancelled" },
      },
      { $set: { status: "cancelled" } }
    );

    const appUrl = resolveAppUrl(new URL(request.url).origin);
    return NextResponse.json(
      {
        message: "Fuente iCal eliminada.",
        cancelledBookings: cancelledResult.modifiedCount || 0,
        config: buildIcalConfig(room, appUrl),
      },
      { status: 200 }
    );
  }

  if (action === "sync") {
    const sourceId = normalizeText(body.sourceId);
    const targets = sourceId
      ? room.icalSources.filter((source) => source.sourceId === sourceId)
      : room.icalSources.filter((source) => source.enabled !== false);

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "No hay fuentes iCal para sincronizar." },
        { status: 400 }
      );
    }

    const results = [];
    for (const source of targets) {
      try {
        const syncResult = await syncSource({
          room,
          property,
          user,
          source,
        });

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

    await room.save();

    const appUrl = resolveAppUrl(new URL(request.url).origin);
    return NextResponse.json(
      {
        message: "Sincronización iCal finalizada.",
        results,
        config: buildIcalConfig(room, appUrl),
      },
      { status: 200 }
    );
  }

  return NextResponse.json(
    { error: "Acción iCal no soportada." },
    { status: 400 }
  );
}
