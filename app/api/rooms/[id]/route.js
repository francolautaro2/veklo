import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Property from "@/models/Property";
import User from "@/models/User";
import { getUserContextFromRequest } from "@/lib/auth";
import { getAccessDeniedMessage, hasAccountAccess } from "@/lib/subscription";

function parseBasePrice(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0) return null;
  return Math.round(num * 100) / 100;
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

export async function PUT(request, { params }) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const account = await User.findById(user.id).select(
    "subscriptionStatus trialEndsAt"
  );
  if (!account) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }

  if (!hasAccountAccess(account)) {
    return NextResponse.json(
      { error: getAccessDeniedMessage() },
      { status: 402 }
    );
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { error: "ID de habitación inválido." },
      { status: 400 }
    );
  }

  const { basePrice } = await request.json();
  const normalizedBasePrice = parseBasePrice(basePrice);

  if (normalizedBasePrice === null) {
    return NextResponse.json(
      { error: "Precio base inválido." },
      { status: 400 }
    );
  }

  try {
    const room = await Room.findById(id);
    if (!room) {
      return NextResponse.json(
        { error: "Habitación no encontrada." },
        { status: 404 }
      );
    }

    const property = await Property.findOne({
      _id: room.propertyId,
      ...buildPropertyScope(user),
    }).select("_id organizationId");

    if (!property) {
      return NextResponse.json(
        { error: "No tenés permiso para editar esta habitación." },
        { status: 403 }
      );
    }

    if (!property.organizationId && user.organizationId) {
      property.organizationId = user.organizationId;
      await property.save();
    }

    if (!room.organizationId && user.organizationId) {
      room.organizationId = user.organizationId;
    }

    room.basePrice = normalizedBasePrice;
    await room.save();

    return NextResponse.json({ room }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar el precio de la habitación." },
      { status: 400 }
    );
  }
}
