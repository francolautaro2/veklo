import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import Property from "@/models/Property";
import Room from "@/models/Room";
import { getUserContextFromRequest } from "@/lib/auth";
import { buildPropertyScope } from "@/lib/tenancy";
import { formatDateOnly, getAppTimeZone, todayKey } from "@/lib/date-only";
import { canExportBookings, getPlanFeatureMessage } from "@/lib/subscription";

const STATUS_LABEL = {
  reserved: "Reservada",
  checked_in: "Check-in hecho",
  checked_out: "Check-out hecho",
  cancelled: "Cancelada",
};

const DAY_MS = 24 * 60 * 60 * 1000;

// Separador ";" y BOM para que Excel en español lo abra con columnas y acentos.
const SEPARATOR = ";";

function csvCell(value) {
  let text = String(value ?? "");
  // Evita inyección de fórmulas al abrir el archivo en Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function formatDate(value) {
  return value ? formatDateOnly(value) : "";
}

export async function GET(request) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  if (!canExportBookings(user.plan)) {
    return NextResponse.json(
      {
        error: getPlanFeatureMessage("La exportación de reservas"),
        code: "PLAN_REQUIRED",
      },
      { status: 403 }
    );
  }

  const properties = await Property.find(buildPropertyScope(user))
    .select("_id name")
    .lean();
  const propertyIds = properties.map((property) => property._id);

  const [rooms, bookings] = await Promise.all([
    Room.find({ propertyId: { $in: propertyIds } }).select("_id name").lean(),
    Booking.find({ propertyId: { $in: propertyIds } })
      .sort({ checkIn: -1 })
      .lean(),
  ]);

  const propertyNames = new Map(properties.map((p) => [String(p._id), p.name]));
  const roomNames = new Map(rooms.map((r) => [String(r._id), r.name]));

  const header = [
    "Propiedad",
    "Habitación",
    "Huésped",
    "Email",
    "Teléfono",
    "Check-in",
    "Check-out",
    "Noches",
    "Estado",
    "Origen",
    "Total",
    "Pagado",
    "Saldo",
    "Estado de pago",
    "Fecha de pago",
    "Vencimiento de pago",
    "Pre check-in",
    "Documento",
  ];

  const rows = bookings.map((booking) => {
    const total = Number(booking.monto_total) || 0;
    const paid = Number(booking.monto_pagado) || 0;
    const nights = Math.max(
      0,
      Math.round(
        (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) /
          DAY_MS
      )
    );

    return [
      propertyNames.get(String(booking.propertyId)) || "",
      roomNames.get(String(booking.roomId)) || "",
      booking.guestName,
      booking.guestEmail,
      booking.guestPhone,
      formatDate(booking.checkIn),
      formatDate(booking.checkOut),
      nights,
      STATUS_LABEL[booking.status] || booking.status,
      booking.origin === "ical" ? "iCal" : "Manual",
      total,
      paid,
      Math.max(total - paid, 0),
      booking.estado_pago,
      formatDate(booking.fecha_pago),
      formatDate(booking.fecha_vencimiento_pago),
      booking.preCheckIn?.status === "completed" ? "Completado" : "Pendiente",
      booking.preCheckIn?.documentId || "",
    ];
  });

  const csv =
    "\uFEFF" +
    [header, ...rows]
      .map((row) => row.map(csvCell).join(SEPARATOR))
      .join("\r\n");

  const filename = `veklo-reservas-${todayKey(getAppTimeZone())}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
