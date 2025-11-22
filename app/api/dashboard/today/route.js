// app/api/dashboard/today/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getUserFromRequest } from "@/lib/auth";
import Booking from "@/models/Booking";
import Property from "@/models/Property";
import Room from "@/models/Room";

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
  const propertyId = searchParams.get("propertyId") || null;

  const { start, end } = getTodayRange();

  const baseFilter = { ownerId: user.id };
  if (propertyId) {
    baseFilter.propertyId = propertyId;
  }

  // Check-ins de hoy
  const checkInsRaw = await Booking.find({
    ...baseFilter,
    status: { $ne: "cancelled" },
    checkIn: { $gte: start, $lte: end },
  }).lean();

  // Check-outs de hoy
  const checkOutsRaw = await Booking.find({
    ...baseFilter,
    status: { $ne: "cancelled" },
    checkOut: { $gte: start, $lte: end },
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

  const properties = await Property.find({ _id: { $in: propertyIds } })
    .select("_id name")
    .lean();
  const rooms = await Room.find({ _id: { $in: roomIds } })
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
