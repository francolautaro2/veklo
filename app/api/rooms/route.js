// app/api/rooms/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Property from "@/models/Property";
import { getAccessDeniedResponse, getUserContextFromRequest } from "@/lib/auth";
import {
  getPlanConfig,
  getRoomLimitMessage,
} from "@/lib/subscription";

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

function buildRoomScope(user) {
  if (!user.organizationId) {
    return {};
  }

  return {
    $or: [
      { organizationId: user.organizationId },
      { organizationId: { $exists: false } },
    ],
  };
}

export async function GET(request) {
  await dbConnect();
  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");

  // Propiedades del usuario
  const userProperties = await Property.find(buildPropertyScope(user)).select("_id");
  const allowedPropertyIds = userProperties.map((p) => p._id.toString());

  const filter = {
    ...buildRoomScope(user),
    propertyId: { $in: allowedPropertyIds },
  };

  if (propertyId) {
    filter.propertyId = propertyId;
    if (!allowedPropertyIds.includes(propertyId)) {
      return NextResponse.json(
        { error: "No tenés acceso a esa propiedad." },
        { status: 403 }
      );
    }
  }

  const rooms = await Room.find(filter).sort({ createdAt: -1 });
  return NextResponse.json({ rooms });
}

export async function POST(request) {
  await dbConnect();
  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const denied = getAccessDeniedResponse(user);
  if (denied) return denied;

  const { propertyId, name, capacity, basePrice } = await request.json();

  if (!propertyId || !name) {
    return NextResponse.json(
      { error: "Propiedad y nombre son obligatorios." },
      { status: 400 }
    );
  }

  // Validar que la propiedad sea del usuario
  const property = await Property.findOne({
    _id: propertyId,
    ...buildPropertyScope(user),
  });

  if (!property) {
    return NextResponse.json(
      { error: "Propiedad no encontrada o no pertenece al usuario." },
      { status: 404 }
    );
  }

  const planConfig = getPlanConfig(user.plan);
  if (planConfig.maxRoomsPerProperty != null) {
    const roomCount = await Room.countDocuments({ propertyId });
    if (roomCount >= planConfig.maxRoomsPerProperty) {
      return NextResponse.json(
        { error: getRoomLimitMessage(user.plan) },
        { status: 403 }
      );
    }
  }

  try {
    if (!property.organizationId && user.organizationId) {
      property.organizationId = user.organizationId;
      await property.save();
    }

    const room = await Room.create({
      organizationId:
        user.organizationId || property.organizationId?.toString() || null,
      propertyId,
      name,
      capacity: capacity || 2,
      basePrice: basePrice || 0,
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (error) {
    console.error("[rooms]", error);
    return NextResponse.json({ error: "Error al crear habitación." }, { status: 400 });
  }
}
