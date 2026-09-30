import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getUserContextFromRequest } from "@/lib/auth";
import Property from "@/models/Property";
import Room from "@/models/Room";
import Booking from "@/models/Booking";
import { addDays, getAppTimeZone, todayDateOnly } from "@/lib/date-only";

// [start, end): el día de hoy en la zona horaria del negocio.
function getTodayRange() {
  const start = todayDateOnly(getAppTimeZone());
  return { start, end: addDays(start, 1) };
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

  const { start, end } = getTodayRange();

  // Obtener propiedades a considerar
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
  const propertiesCount = properties.length;

  if (propertyIds.length === 0) {
    return NextResponse.json({
      propertiesCount,
      roomsCount: 0,
      bookingsCount: 0,
      todayCheckins: 0,
      todayCheckouts: 0,
      todayOccupiedRooms: 0,
      totalRooms: 0,
      bookingsByStatus: {
        reserved: 0,
        checked_in: 0,
        checked_out: 0,
        cancelled: 0,
      },
    });
  }

  // Habitaciones
  const roomFilter = { propertyId: { $in: propertyIds } };
  const roomsCount = await Room.countDocuments(roomFilter);

  // Filtro base para reservas
  const bookingBaseFilter = {
    ...buildBookingScope(user),
    propertyId: propertyIds.length === 1 ? propertyIds[0] : { $in: propertyIds },
  };

  const bookingsCount = await Booking.countDocuments(bookingBaseFilter);

  // Check-ins hoy
  const todayCheckins = await Booking.countDocuments({
    ...bookingBaseFilter,
    checkIn: { $gte: start, $lt: end },
    status: { $ne: "cancelled" },
  });

  // Check-outs hoy
  const todayCheckouts = await Booking.countDocuments({
    ...bookingBaseFilter,
    checkOut: { $gte: start, $lt: end },
    status: { $ne: "cancelled" },
  });

  // Ocupación de esta noche: entraron hoy o antes y salen mañana o después
  const todayOccupiedRooms = await Booking.countDocuments({
    ...bookingBaseFilter,
    status: { $in: ["reserved", "checked_in"] },
    checkIn: { $lt: end },
    checkOut: { $gte: end },
  });

  // Reservas por estado
  const reservedCount = await Booking.countDocuments({
    ...bookingBaseFilter,
    status: "reserved",
  });
  const checkedInCount = await Booking.countDocuments({
    ...bookingBaseFilter,
    status: "checked_in",
  });
  const checkedOutCount = await Booking.countDocuments({
    ...bookingBaseFilter,
    status: "checked_out",
  });
  const cancelledCount = await Booking.countDocuments({
    ...bookingBaseFilter,
    status: "cancelled",
  });

  return NextResponse.json({
    propertiesCount,
    roomsCount,
    bookingsCount,
    todayCheckins,
    todayCheckouts,
    todayOccupiedRooms,
    totalRooms: roomsCount,
    bookingsByStatus: {
      reserved: reservedCount,
      checked_in: checkedInCount,
      checked_out: checkedOutCount,
      cancelled: cancelledCount,
    },
  });
}
