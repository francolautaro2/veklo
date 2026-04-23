import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Room from "@/models/Room";
import Property from "@/models/Property";
import Booking from "@/models/Booking";
import { buildRoomIcal } from "@/lib/ical";

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function GET(_request, { params }) {
  await dbConnect();
  const { token } = await params;

  if (!token) {
    return new NextResponse("Token iCal inválido.", {
      status: 400,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const room = await Room.findOne({ icalExportToken: token })
    .select("_id name propertyId organizationId")
    .lean();

  if (!room) {
    return new NextResponse("Calendario no encontrado.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const property = await Property.findById(room.propertyId)
    .select("_id name ownerId organizationId")
    .lean();
  if (!property) {
    return new NextResponse("Propiedad no encontrada.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const bookingScope =
    room.organizationId || property.organizationId
      ? { organizationId: room.organizationId || property.organizationId }
      : { ownerId: property.ownerId };

  const bookings = await Booking.find({
    ...bookingScope,
    roomId: room._id,
    status: { $ne: "cancelled" },
  })
    .select("_id checkIn checkOut status origin")
    .sort({ checkIn: 1 })
    .lean();

  const ical = buildRoomIcal({
    roomName: room.name || "Habitación",
    propertyName: property.name || "Propiedad",
    bookings,
  });

  const roomSlug = slugify(room.name) || "habitacion";
  const propertySlug = slugify(property.name) || "propiedad";
  const filename = `veklo-${propertySlug}-${roomSlug}.ics`;

  return new NextResponse(ical, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
