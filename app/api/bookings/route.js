// app/api/bookings/route.js
import crypto from "node:crypto";
import { after, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import Property from "@/models/Property";
import Room from "@/models/Room";
import { getAccessDeniedResponse, getUserContextFromRequest } from "@/lib/auth";
import { sendBookingConfirmation } from "@/lib/email";
import { getAppTimeZone, parseDateOnly, todayDateOnly } from "@/lib/date-only";

function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseDepositAmount(value) {
  if (value === undefined || value === null || value === "") return 0;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < 0) return null;
  return Math.round(num * 100) / 100;
}

function parseMoney(value) {
  if (value === undefined || value === null || value === "") return 0;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num * 100) / 100;
}

function createPreCheckInToken() {
  return crypto.randomBytes(16).toString("hex");
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

function buildRoomScope(user) {
  if (!user.organizationId) {
    return {};
  }

  return {
    $or: [
      { organizationId: user.organizationId },
      { organizationId: { $exists: false } },
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
  const roomId = searchParams.get("roomId");

  const filter = { ...buildBookingScope(user) };

  if (propertyId) filter.propertyId = propertyId;
  if (roomId) filter.roomId = roomId;

  const bookings = await Booking.find(filter)
    .sort({ checkIn: 1 })
    .lean();

  return NextResponse.json({ bookings });
}

export async function POST(request) {
  await dbConnect();
  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const denied = getAccessDeniedResponse(user);
  if (denied) return denied;

  const {
    propertyId,
    roomId,
    guestName,
    guestEmail,
    guestPhone,
    checkIn,
    checkOut,
    depositAmount,
    depositPaymentLink,
    monto_total,
    monto_pagado,
    fecha_vencimiento_pago,
  } = await request.json();

  const normalizedGuestName = guestName?.trim();
  const normalizedGuestEmail = guestEmail?.trim().toLowerCase() || "";
  const normalizedGuestPhone = guestPhone?.trim() || "";
  const normalizedDepositPaymentLink = depositPaymentLink?.trim() || "";
  const normalizedDepositAmount = parseDepositAmount(depositAmount);
  const normalizedTotalAmount = parseMoney(monto_total ?? depositAmount);
  const normalizedPaidAmount = parseMoney(monto_pagado);

  if (!propertyId || !roomId || !normalizedGuestName || !checkIn || !checkOut) {
    return NextResponse.json(
      {
        error:
          "Propiedad, habitación, huésped, check-in y check-out son obligatorios.",
      },
      { status: 400 }
    );
  }

  if (normalizedGuestEmail && !isValidEmail(normalizedGuestEmail)) {
    return NextResponse.json({ error: "Email de huésped inválido." }, { status: 400 });
  }

  if (normalizedDepositAmount === null) {
    return NextResponse.json({ error: "Monto de seña inválido." }, { status: 400 });
  }

  if (normalizedTotalAmount === null || normalizedPaidAmount === null) {
    return NextResponse.json({ error: "Monto de pago inválido." }, { status: 400 });
  }

  if (
    normalizedDepositPaymentLink &&
    !isValidHttpUrl(normalizedDepositPaymentLink)
  ) {
    return NextResponse.json(
      { error: "Link de cobro inválido. Debe comenzar con http(s)." },
      { status: 400 }
    );
  }

  const ci = parseDateOnly(checkIn);
  const co = parseDateOnly(checkOut);
  const paymentDueAt = parseDateOnly(fecha_vencimiento_pago) || ci;

  // 1) Validar que las fechas tengan sentido
  if (!ci || !co || isNaN(ci.getTime()) || isNaN(co.getTime())) {
    return NextResponse.json(
      { error: "Fechas inválidas." },
      { status: 400 }
    );
  }

  if (co <= ci) {
    return NextResponse.json(
      { error: "El check-out debe ser posterior al check-in." },
      { status: 400 }
    );
  }

  // 2) Validar propiedad del usuario
  const property = await Property.findOne({
    _id: propertyId,
    ...buildPropertyScope(user),
  });
  if (!property) {
    return NextResponse.json(
      { error: "Propiedad no encontrada o no pertenece al usuario." },
      { status: 404 }
    );
  }

  if (!property.organizationId && user.organizationId) {
    property.organizationId = user.organizationId;
    await property.save();
  }

  // 3) Validar que la habitación pertenezca a esa propiedad
  const room = await Room.findOne({
    _id: roomId,
    propertyId: propertyId,
    ...buildRoomScope(user),
  });
  if (!room) {
    return NextResponse.json(
      { error: "Habitación no encontrada para esa propiedad." },
      { status: 404 }
    );
  }

  if (!room.organizationId && user.organizationId) {
    room.organizationId = user.organizationId;
    await room.save();
  }

  // 4) Evitar solapamientos de reservas en la misma habitación
  // Regla: si el rango [ci, co) se cruza con una reserva existente de ese roomId que no esté cancelada
  const overlapping = await Booking.findOne({
    ...buildBookingScope(user),
    roomId,
    status: { $ne: "cancelled" },
    checkIn: { $lt: co },
    checkOut: { $gt: ci },
  });

  if (overlapping) {
    return NextResponse.json(
      {
        error:
          "Ya existe una reserva para esa habitación en el rango seleccionado.",
      },
      { status: 409 }
    );
  }

  // 5) Crear la reserva
  try {
    const token = createPreCheckInToken();
    const hasDeposit = normalizedDepositAmount > 0 || normalizedDepositPaymentLink;
    const paidAmount = Math.min(normalizedPaidAmount, normalizedTotalAmount);
    const paymentStatus =
      normalizedTotalAmount <= 0
        ? "pagado"
        : paidAmount >= normalizedTotalAmount
          ? "pagado"
          : paidAmount > 0
            ? "parcial"
            : "pendiente";

    const booking = await Booking.create({
      organizationId:
        user.organizationId || property.organizationId?.toString() || null,
      propertyId,
      roomId,
      ownerId: user.id,
      guestName: normalizedGuestName,
      guestEmail: normalizedGuestEmail,
      guestPhone: normalizedGuestPhone,
      checkIn: ci,
      checkOut: co,
      status: "reserved",
      monto_total: normalizedTotalAmount,
      monto_pagado: paidAmount,
      estado_pago: paymentStatus,
      fecha_pago: paidAmount > 0 ? todayDateOnly(getAppTimeZone()) : null,
      metodo_pago: paidAmount > 0 ? "otro" : null,
      fecha_vencimiento_pago: paymentDueAt,
      preCheckIn: {
        status: "pending",
        token,
        expiresAt: co,
      },
      deposit: {
        amount: normalizedDepositAmount,
        paymentLink: normalizedDepositPaymentLink,
        status: hasDeposit ? "pending" : "not_required",
      },
    });

    const appUrl = process.env.APP_URL || new URL(request.url).origin;
    const preCheckInUrl = `${appUrl}/precheckin/${token}`;

    // after(): el email se envía después de responder, sin que la plataforma
    // corte la función antes de terminar.
    after(() =>
      sendBookingConfirmation({
        booking,
        preCheckInUrl,
        propertyName: property.name,
        roomName: room.name,
      })
    );

    return NextResponse.json(
      {
        booking,
        links: {
          preCheckInUrl,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[bookings]", error);
    return NextResponse.json({ error: "Error al crear reserva." }, { status: 400 });
  }
}
