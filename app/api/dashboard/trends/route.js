import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getUserContextFromRequest } from "@/lib/auth";
import Property from "@/models/Property";
import Room from "@/models/Room";
import Booking from "@/models/Booking";
import {
  addDays,
  formatDateOnly,
  getAppTimeZone,
  todayDateOnly,
} from "@/lib/date-only";

// [start, end): los últimos `days` días incluyendo hoy (zona horaria del negocio).
function getRangeDays(days = 7) {
  const end = addDays(todayDateOnly(getAppTimeZone()), 1);
  const start = addDays(end, -days);

  return { start, end };
}

function parseDays(value) {
  const parsed = Number(value);
  return [7, 30, 90].includes(parsed) ? parsed : 7;
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

function buildBookingScope(user) {
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

export async function GET(request) {
  await dbConnect();
  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("propertyId");

  const days = parseDays(searchParams.get("days"));
  const { start, end } = getRangeDays(days);

  // Propiedades a considerar
  let properties;
  if (propertyId) {
    const property = await Property.findOne({
      _id: propertyId,
      ...buildPropertyScope(user),
    }).select("_id");
    if (!property) {
      return NextResponse.json(
        { error: "Propiedad no encontrada." },
        { status: 404 }
      );
    }
    properties = [property];
  } else {
    properties = await Property.find(buildPropertyScope(user)).select("_id");
  }

  const propertyIds = properties.map((p) => p._id);

  const roomFilter =
    propertyIds.length > 0 ? { propertyId: { $in: propertyIds } } : null;
  const totalRooms = roomFilter ? await Room.countDocuments(roomFilter) : 0;

  // Filtro base de reservas
  const bookingBaseFilter = {
    ...buildBookingScope(user),
    ...(propertyIds.length > 0
      ? { propertyId: propertyIds.length === 1 ? propertyIds[0] : { $in: propertyIds } }
      : { propertyId: null }),
  };

  // Reservas que tocan el rango
  const bookings = await Booking.find({
    ...bookingBaseFilter,
    status: { $ne: "cancelled" },
    checkIn: { $lt: end },
    checkOut: { $gt: start },
  }).lean();

  const data = [];

  for (let i = 0; i < days; i++) {
    const dayStart = addDays(start, i);
    const dayEnd = addDays(dayStart, 1);

    const label = formatDateOnly(dayStart, {
      day: "2-digit",
      month: "2-digit",
    });

    const roomsOccupiedSet = new Set();
    let checkIns = 0;
    let checkOuts = 0;

    for (const b of bookings) {
      const bIn = new Date(b.checkIn);
      const bOut = new Date(b.checkOut);

      // Ocupada si el huésped pasa la noche de ese día
      if (bIn < dayEnd && bOut >= dayEnd) {
        roomsOccupiedSet.add(String(b.roomId));
      }

      if (bIn >= dayStart && bIn < dayEnd) checkIns++;
      if (bOut >= dayStart && bOut < dayEnd) checkOuts++;
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
