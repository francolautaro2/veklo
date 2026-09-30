import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { getUserContextFromRequest } from "@/lib/auth";
import Property from "@/models/Property";
import Booking from "@/models/Booking";
import {
  addDays,
  formatDateOnly,
  getAppTimeZone,
  toDateKey,
  todayDateOnly,
} from "@/lib/date-only";

function parseDays(value) {
  const parsed = Number(value);
  return [7, 30, 90].includes(parsed) ? parsed : 30;
}

// [start, end): los últimos `days` días incluyendo hoy (zona horaria del negocio).
function getRangeDays(days = 30) {
  const end = addDays(todayDateOnly(getAppTimeZone()), 1);
  const start = addDays(end, -days);

  return { start, end };
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
  const days = parseDays(searchParams.get("days"));
  const propertyId = searchParams.get("propertyId");
  const { start, end } = getRangeDays(days);

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

  const propertyIds = properties.map((property) => property._id);
  const bookingBaseFilter = {
    ...buildBookingScope(user),
    ...(propertyIds.length > 0
      ? { propertyId: propertyIds.length === 1 ? propertyIds[0] : { $in: propertyIds } }
      : { propertyId: null }),
  };

  const bookings = await Booking.find({
    ...bookingBaseFilter,
    status: { $ne: "cancelled" },
    $or: [
      {
        estado_pago: { $in: ["pagado", "parcial"] },
        fecha_pago: { $gte: start, $lt: end },
      },
      {
        checkIn: { $gte: start, $lt: end },
        estado_pago: { $ne: "pagado" },
      },
    ],
  })
    .select("fecha_pago checkIn monto_pagado monto_total estado_pago")
    .lean();

  const data = [];
  for (let i = 0; i < days; i += 1) {
    const dayStart = addDays(start, i);
    const dayKey = toDateKey(dayStart);

    const revenue = bookings.reduce((sum, booking) => {
      if (toDateKey(booking.fecha_pago) !== dayKey) return sum;
      return sum + (Number(booking.monto_pagado) || 0);
    }, 0);
    const pending = bookings.reduce((sum, booking) => {
      if (toDateKey(booking.checkIn) !== dayKey) return sum;
      const total = Number(booking.monto_total) || 0;
      const paid = Number(booking.monto_pagado) || 0;
      return sum + Math.max(total - paid, 0);
    }, 0);

    data.push({
      date: formatDateOnly(dayStart, {
        day: "2-digit",
        month: "2-digit",
      }),
      revenue,
      pending,
    });
  }

  return NextResponse.json({ days, data });
}
