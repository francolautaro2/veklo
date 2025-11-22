import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getUserFromRequest } from "@/lib/auth";
import Property from "@/models/Property";
import Room from "@/models/Room";
import Booking from "@/models/Booking";

function getRangeDays(days = 7) {
  const today = new Date();
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59
  );

  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  return { start, end };
}

export async function GET(request) {
  await dbConnect();
  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");

  const days = 7;
  const { start, end } = getRangeDays(days);

  // Propiedades a considerar
  let properties;
  if (propertyId) {
    const property = await Property.findOne({
      _id: propertyId,
      ownerId: user.id,
    }).select("_id");
    if (!property) {
      return NextResponse.json(
        { error: "Propiedad no encontrada." },
        { status: 404 }
      );
    }
    properties = [property];
  } else {
    properties = await Property.find({ ownerId: user.id }).select("_id");
  }

  const propertyIds = properties.map((p) => p._id);

  const roomFilter =
    propertyIds.length > 0 ? { propertyId: { $in: propertyIds } } : {};
  const totalRooms = await Room.countDocuments(roomFilter);

  // Filtro base de reservas
  const bookingBaseFilter = { ownerId: user.id };
  if (propertyIds.length > 0) {
    bookingBaseFilter.propertyId =
      propertyIds.length === 1 ? propertyIds[0] : { $in: propertyIds };
  }

  // Reservas que tocan el rango
  const bookings = await Booking.find({
    ...bookingBaseFilter,
    status: { $ne: "cancelled" },
    checkIn: { $lte: end },
    checkOut: { $gte: start },
  }).lean();

  const data = [];

  for (let i = 0; i < days; i++) {
    const dayStart = new Date(start);
    dayStart.setDate(start.getDate() + i);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);

    const label = dayStart.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
    });

    const roomsOccupiedSet = new Set();
    let checkIns = 0;
    let checkOuts = 0;

    for (const b of bookings) {
      const bIn = new Date(b.checkIn);
      const bOut = new Date(b.checkOut);

      if (bIn <= dayEnd && bOut >= dayStart) {
        roomsOccupiedSet.add(String(b.roomId));
      }

      if (bIn >= dayStart && bIn <= dayEnd) checkIns++;
      if (bOut >= dayStart && bOut <= dayEnd) checkOuts++;
    }

    const occupiedRooms = roomsOccupiedSet.size;
    const occupancyPercent =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

    data.push({
      date: label,
      occupiedRooms,
      occupancyPercent,
      checkIns,
      checkOuts,
    });
  }

  return NextResponse.json({
    totalRooms,
    days,
    data,
  });
}

