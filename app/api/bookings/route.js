// app/api/bookings/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import Property from "@/models/Property";
import Room from "@/models/Room";
import { getUserFromRequest } from "@/lib/auth";

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export async function GET(request) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");
  const roomId = searchParams.get("roomId");

  const filter = { ownerId: user.id };

  if (propertyId) filter.propertyId = propertyId;
  if (roomId) filter.roomId = roomId;

  const bookings = await Booking.find(filter)
    .sort({ checkIn: 1 })
    .lean();

  return NextResponse.json({ bookings });
}

export async function POST(request) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { propertyId, roomId, guestName, checkIn, checkOut } =
    await request.json();

  if (!propertyId || !roomId || !guestName || !checkIn || !checkOut) {
    return NextResponse.json(
      {
        error:
          "Propiedad, habitación, huésped, check-in y check-out son obligatorios.",
      },
      { status: 400 }
    );
  }

  const ci = parseLocalDate(checkIn);
  const co = parseLocalDate(checkOut);

  // 1) Validar que las fechas tengan sentido
  if (isNaN(ci.getTime()) || isNaN(co.getTime())) {
    return NextResponse.json(
      { error: "Fechas inválidas." },
      { status: 400 }
    );
  }

  if (co <= ci) {
    return NextResponse.json(
      { error: "El check-out debe ser posterior al check-in." },
      { status: 400 }
    );
  }

  // 2) Validar propiedad del usuario
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

  // 3) Validar que la habitación pertenezca a esa propiedad
  const room = await Room.findOne({
    _id: roomId,
    propertyId: propertyId,
  });
  if (!room) {
    return NextResponse.json(
      { error: "Habitación no encontrada para esa propiedad." },
      { status: 404 }
    );
  }

  // 4) Evitar solapamientos de reservas en la misma habitación
  // Regla: si el rango [ci, co) se cruza con una reserva existente de ese roomId que no esté cancelada
  const overlapping = await Booking.findOne({
    roomId,
    status: { $ne: "cancelled" },
    $or: [
      // reserva existente empieza dentro del nuevo rango
      { checkIn: { $lt: co }, checkOut: { $gt: ci } },
    ],
  });

  if (overlapping) {
    return NextResponse.json(
      {
        error:
          "Ya existe una reserva para esa habitación en el rango seleccionado.",
      },
      { status: 409 }
    );
  }

  // 5) Crear la reserva
  try {
    const booking = await Booking.create({
      propertyId,
      roomId,
      ownerId: user.id,
      guestName,
      checkIn: ci,
      checkOut: co,
      status: "reserved",
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Error al crear reserva.", details: err.message },
      { status: 400 }
    );
  }
}
