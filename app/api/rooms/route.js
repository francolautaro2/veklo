// app/api/rooms/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Property from "@/models/Property";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");

  // Propiedades del usuario
  const userProperties = await Property.find({ ownerId: user.id }).select("_id");
  const allowedPropertyIds = userProperties.map((p) => p._id.toString());

  const filter = {
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
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

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
    ownerId: user.id,
  });

  if (!property) {
    return NextResponse.json(
      { error: "Propiedad no encontrada o no pertenece al usuario." },
      { status: 404 }
    );
  }

  try {
    const room = await Room.create({
      propertyId,
      name,
      capacity: capacity || 2,
      basePrice: basePrice || 0,
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Error al crear habitación.", details: err.message },
      { status: 400 }
    );
  }
}
