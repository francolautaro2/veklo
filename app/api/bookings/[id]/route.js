// app/api/bookings/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import { getUserFromRequest } from "@/lib/auth";


function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

export async function PUT(request, { params }) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  // 👇 acá está el cambio importante
  const { id } = await params;

  const body = await request.json();
  const update = {};

  if (body.checkIn) update.checkIn = parseLocalDate(body.checkIn);
  if (body.checkOut) update.checkOut = parseLocalDate(body.checkOut);
  if (body.status) update.status = body.status;

  try {
    // 1) Buscar la reserva por id
    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json(
        { error: "Reserva no encontrada." },
        { status: 404 }
      );
    }

    // 2) Verificar que sea del usuario logueado
    if (booking.ownerId.toString() !== user.id) {
      return NextResponse.json(
        { error: "No tenés permiso para modificar esta reserva." },
        { status: 403 }
      );
    }

    // 3) Aplicar cambios
    if (update.checkIn) booking.checkIn = update.checkIn;
    if (update.checkOut) booking.checkOut = update.checkOut;
    if (update.status) booking.status = update.status;

    await booking.save();

    return NextResponse.json({ booking }, { status: 200 });
  } catch (err) {
    console.error("Error al actualizar reserva:", err);
    return NextResponse.json(
      { error: "Error al actualizar reserva.", details: err.message },
      { status: 400 }
    );
  }
}


