import crypto from "node:crypto";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Property from "@/models/Property";
import Booking from "@/models/Booking";
import { getAccessDeniedResponse, getUserContextFromRequest } from "@/lib/auth";
import {
  createIcalToken,
  getIcalProviderLabel,
  isValidIcalUrl,
  normalizeIcalProvider,
  resolveAppUrl,
  validateIcalSourceUrl,
} from "@/lib/ical";
import { syncRoomSources } from "@/lib/ical-sync";
import { canUseIcalSync, getPlanFeatureMessage } from "@/lib/subscription";

function getPlanRequiredResponse(user) {
  if (canUseIcalSync(user.plan)) return null;
  return NextResponse.json(
    {
      error: getPlanFeatureMessage("La sincronización iCal"),
      code: "PLAN_REQUIRED",
    },
    { status: 403 }
  );
}

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

export async function GET(request, { params }) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const planRequired = getPlanRequiredResponse(user);
  if (planRequired) return planRequired;

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

  const planRequired = getPlanRequiredResponse(user);
  if (planRequired) return planRequired;

  const denied = getAccessDeniedResponse(user);
  if (denied) return denied;

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

    try {
      await validateIcalSourceUrl(url);
    } catch (error) {
      console.error("[ical/rooms/[id]]", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
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
    const { targets, results } = await syncRoomSources({
      room,
      property,
      sourceId: normalizeText(body.sourceId),
    });

    if (targets === 0) {
      return NextResponse.json(
        { error: "No hay fuentes iCal para sincronizar." },
        { status: 400 }
      );
    }

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
