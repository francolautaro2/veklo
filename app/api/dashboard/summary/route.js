import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getUserFromRequest } from "@/lib/auth";
import Property from "@/models/Property";
import Room from "@/models/Room";
import Booking from "@/models/Booking";

function getTodayRange() {
  const now = new Date();
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0
  );
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    23,
    59,
    59,
    999
  );
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

  const { start, end } = getTodayRange();

  // Obtener propiedades a considerar
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
  const propertiesCount = properties.length;

  // Habitaciones
  const roomFilter =
    propertyIds.length > 0 ? { propertyId: { $in: propertyIds } } : {};
  const roomsCount = await Room.countDocuments(roomFilter);

  // Filtro base para reservas
  const bookingBaseFilter = { ownerId: user.id };
  if (propertyIds.length > 0) {
    bookingBaseFilter.propertyId =
      propertyIds.length === 1 ? propertyIds[0] : { $in: propertyIds };
  }

  const bookingsCount = await Booking.countDocuments(bookingBaseFilter);

  // Check-ins hoy
  const todayCheckins = await Booking.countDocuments({
    ...bookingBaseFilter,
    checkIn: { $gte: start, $lte: end },
    status: { $ne: "cancelled" },
  });

  // Check-outs hoy
  const todayCheckouts = await Booking.countDocuments({
    ...bookingBaseFilter,
    checkOut: { $gte: start, $lte: end },
    status: { $ne: "cancelled" },
  });

  // Ocupación actual (habitaciones ocupadas hoy, aprox por reservas activas)
  const todayOccupiedRooms = await Booking.countDocuments({
    ...bookingBaseFilter,
    status: { $in: ["reserved", "checked_in"] },
    checkIn: { $lte: end },
    checkOut: { $gte: start },
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
