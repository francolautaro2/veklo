// app/api/dashboard/today/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getUserContextFromRequest } from "@/lib/auth";
import Booking from "@/models/Booking";
import Property from "@/models/Property";
import Room from "@/models/Room";
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
  const propertyId = searchParams.get("propertyId") || null;

  const { start, end } = getTodayRange();

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
  }

  const baseFilter = {
    ...buildBookingScope(user),
    ...(propertyId ? { propertyId } : {}),
  };

  // Check-ins de hoy
  const checkInsRaw = await Booking.find({
    ...baseFilter,
    status: { $ne: "cancelled" },
    checkIn: { $gte: start, $lt: end },
  }).lean();

  // Check-outs de hoy
  const checkOutsRaw = await Booking.find({
    ...baseFilter,
    status: { $ne: "cancelled" },
    checkOut: { $gte: start, $lt: end },
  }).lean();

  const allBookings = [...checkInsRaw, ...checkOutsRaw];

  if (allBookings.length === 0) {
    return NextResponse.json({
      checkIns: [],
      checkOuts: [],
    });
  }

  const propertyIds = [
    ...new Set(allBookings.map((b) => String(b.propertyId))),
  ];
  const roomIds = [...new Set(allBookings.map((b) => String(b.roomId)))];

  const properties = await Property.find({
    _id: { $in: propertyIds },
    ...buildPropertyScope(user),
  })
    .select("_id name")
    .lean();
  const rooms = await Room.find({
    _id: { $in: roomIds },
    propertyId: { $in: propertyIds },
  })
    .select("_id name")
    .lean();

  const propertyMap = new Map(
    properties.map((p) => [String(p._id), p.name])
  );
  const roomMap = new Map(rooms.map((r) => [String(r._id), r.name]));

  const mapBooking = (b) => ({
    id: String(b._id),
    guestName: b.guestName,
    status: b.status,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    propertyId: String(b.propertyId),
    roomId: String(b.roomId),
    propertyName: propertyMap.get(String(b.propertyId)) || "Propiedad",
    roomName: roomMap.get(String(b.roomId)) || "Habitación",
  });

  return NextResponse.json({
    checkIns: checkInsRaw.map(mapBooking),
    checkOuts: checkOutsRaw.map(mapBooking),
  });
}
