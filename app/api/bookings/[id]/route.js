// app/api/bookings/[id]/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import User from "@/models/User";
import { getUserContextFromRequest } from "@/lib/auth";
import { getAccessDeniedMessage, hasAccountAccess } from "@/lib/subscription";

const ALLOWED_STATUS = new Set([
  "reserved",
  "checked_in",
  "checked_out",
  "cancelled",
]);
const ALLOWED_DEPOSIT_STATUS = new Set(["not_required", "pending", "paid"]);
const ALLOWED_PAYMENT_STATUS = new Set(["pendiente", "pagado", "parcial"]);
const ALLOWED_PAYMENT_METHOD = new Set([
  "efectivo",
  "transferencia",
  "mercadopago",
  "otro",
]);

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
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

function parseDateTime(value) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) return null;
  return date;
}

function canAccessBooking(booking, user) {
  if (!booking || !user) return false;

  if (booking.organizationId && user.organizationId) {
    return booking.organizationId.toString() === user.organizationId;
  }

  return booking.ownerId.toString() === user.id;
}

function buildBookingScopeForOverlap(booking) {
  if (booking?.organizationId) {
    return { organizationId: booking.organizationId };
  }

  return { ownerId: booking.ownerId };
}

async function getWritableBooking(request, params) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return {
      response: NextResponse.json({ error: "No autenticado." }, { status: 401 }),
    };
  }

  const account = await User.findById(user.id).select(
    "subscriptionStatus trialEndsAt"
  );
  if (!account) {
    return {
      response: NextResponse.json(
        { error: "Usuario no encontrado." },
        { status: 404 }
      ),
    };
  }

  if (!hasAccountAccess(account)) {
    return {
      response: NextResponse.json(
        { error: getAccessDeniedMessage() },
        { status: 402 }
      ),
    };
  }

  const { id } = await params;
  const booking = await Booking.findById(id);

  if (!booking) {
    return {
      response: NextResponse.json(
        { error: "Reserva no encontrada." },
        { status: 404 }
      ),
    };
  }

  if (!canAccessBooking(booking, user)) {
    return {
      response: NextResponse.json(
        { error: "No tenés permiso para modificar esta reserva." },
        { status: 403 }
      ),
    };
  }

  if (booking.origin === "ical") {
    return {
      response: NextResponse.json(
        {
          error:
            "Esta reserva fue importada por iCal. Editá o sincronizá su fuente externa desde Habitaciones.",
        },
        { status: 409 }
      ),
    };
  }

  return { user, booking };
}

export async function PUT(request, { params }) {
  const body = await request.json();
  const updateCheckIn = body.checkIn ? parseLocalDate(body.checkIn) : null;
  const updateCheckOut = body.checkOut ? parseLocalDate(body.checkOut) : null;
  const updateStatus = body.status || null;
  const updateDepositStatus = body.depositStatus || null;
  const hasDepositAmount = Object.prototype.hasOwnProperty.call(
    body,
    "depositAmount"
  );
  const hasDepositPaymentLink = Object.prototype.hasOwnProperty.call(
    body,
    "depositPaymentLink"
  );
  const updateDepositAmount = hasDepositAmount
    ? parseDepositAmount(body.depositAmount)
    : null;
  const updateDepositPaymentLink = hasDepositPaymentLink
    ? body.depositPaymentLink?.trim() || ""
    : null;

  if (body.checkIn && (!updateCheckIn || isNaN(updateCheckIn.getTime()))) {
    return NextResponse.json({ error: "Fecha de check-in inválida." }, { status: 400 });
  }

  if (body.checkOut && (!updateCheckOut || isNaN(updateCheckOut.getTime()))) {
    return NextResponse.json({ error: "Fecha de check-out inválida." }, { status: 400 });
  }

  if (updateStatus && !ALLOWED_STATUS.has(updateStatus)) {
    return NextResponse.json({ error: "Estado de reserva inválido." }, { status: 400 });
  }

  if (updateDepositStatus && !ALLOWED_DEPOSIT_STATUS.has(updateDepositStatus)) {
    return NextResponse.json({ error: "Estado de seña inválido." }, { status: 400 });
  }

  if (hasDepositAmount && updateDepositAmount === null) {
    return NextResponse.json({ error: "Monto de seña inválido." }, { status: 400 });
  }

  if (
    hasDepositPaymentLink &&
    updateDepositPaymentLink &&
    !isValidHttpUrl(updateDepositPaymentLink)
  ) {
    return NextResponse.json(
      { error: "Link de cobro inválido. Debe comenzar con http(s)." },
      { status: 400 }
    );
  }

  try {
    const { user, booking, response } = await getWritableBooking(request, params);
    if (response) return response;

    const nextCheckIn = updateCheckIn || booking.checkIn;
    const nextCheckOut = updateCheckOut || booking.checkOut;
    const nextStatus = updateStatus || booking.status;

    if (nextCheckOut <= nextCheckIn) {
      return NextResponse.json(
        { error: "El check-out debe ser posterior al check-in." },
        { status: 400 }
      );
    }

    if (nextStatus !== "cancelled") {
      const overlapping = await Booking.findOne({
        ...buildBookingScopeForOverlap(booking),
        _id: { $ne: booking._id },
        roomId: booking.roomId,
        status: { $ne: "cancelled" },
        checkIn: { $lt: nextCheckOut },
        checkOut: { $gt: nextCheckIn },
      }).select("_id");

      if (overlapping) {
        return NextResponse.json(
          {
            error:
              "La edición genera conflicto: ya existe otra reserva en ese rango.",
          },
          { status: 409 }
        );
      }
    }

    if (updateCheckIn) booking.checkIn = updateCheckIn;
    if (updateCheckOut) booking.checkOut = updateCheckOut;
    if (updateStatus) booking.status = updateStatus;

    if (!booking.organizationId && user.organizationId) {
      booking.organizationId = user.organizationId;
    }

    if (!booking.deposit) {
      booking.deposit = {
        amount: 0,
        paymentLink: "",
        status: "not_required",
        paidAt: null,
      };
    }

    if (hasDepositAmount) booking.deposit.amount = updateDepositAmount;
    if (hasDepositPaymentLink) booking.deposit.paymentLink = updateDepositPaymentLink;

    const hasDepositConfig =
      (booking.deposit.amount || 0) > 0 || Boolean(booking.deposit.paymentLink);

    if (updateDepositStatus) {
      booking.deposit.status = updateDepositStatus;
      booking.deposit.paidAt =
        updateDepositStatus === "paid" ? new Date() : null;
      if (updateDepositStatus === "paid") {
        const amount = booking.deposit.amount || booking.monto_total || 0;
        booking.monto_total = booking.monto_total || amount;
        booking.monto_pagado = Math.max(booking.monto_pagado || 0, amount);
        booking.estado_pago = "pagado";
        booking.fecha_pago = booking.deposit.paidAt;
        booking.metodo_pago = booking.metodo_pago || "otro";
      }
    } else if (!hasDepositConfig) {
      booking.deposit.status = "not_required";
      booking.deposit.paidAt = null;
    } else if (booking.deposit.status === "not_required") {
      booking.deposit.status = "pending";
      booking.deposit.paidAt = null;
    }

    await booking.save();

    return NextResponse.json({ booking }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar reserva." },
      { status: 400 }
    );
  }
}

export async function PATCH(request, { params }) {
  const body = await request.json();

  const hasTotal = Object.prototype.hasOwnProperty.call(body, "monto_total");
  const hasPaid = Object.prototype.hasOwnProperty.call(body, "monto_pagado");
  const hasStatus = Object.prototype.hasOwnProperty.call(body, "estado_pago");
  const hasPaidAt = Object.prototype.hasOwnProperty.call(body, "fecha_pago");
  const hasMethod = Object.prototype.hasOwnProperty.call(body, "metodo_pago");
  const hasDueAt = Object.prototype.hasOwnProperty.call(
    body,
    "fecha_vencimiento_pago"
  );
  const hasNotes = Object.prototype.hasOwnProperty.call(body, "notas_pago");

  const nextTotal = hasTotal ? parseMoney(body.monto_total) : null;
  const nextPaid = hasPaid ? parseMoney(body.monto_pagado) : null;
  const nextStatus = hasStatus ? body.estado_pago : null;
  const nextPaidAt = hasPaidAt ? parseDateTime(body.fecha_pago) : null;
  const nextDueAt = hasDueAt ? parseDateTime(body.fecha_vencimiento_pago) : null;
  const nextMethod = hasMethod ? body.metodo_pago : null;

  if (hasTotal && nextTotal === null) {
    return NextResponse.json({ error: "Monto total inválido." }, { status: 400 });
  }

  if (hasPaid && nextPaid === null) {
    return NextResponse.json({ error: "Monto pagado inválido." }, { status: 400 });
  }

  if (hasStatus && !ALLOWED_PAYMENT_STATUS.has(nextStatus)) {
    return NextResponse.json({ error: "Estado de pago inválido." }, { status: 400 });
  }

  if (hasMethod && nextMethod && !ALLOWED_PAYMENT_METHOD.has(nextMethod)) {
    return NextResponse.json({ error: "Método de pago inválido." }, { status: 400 });
  }

  if (hasPaidAt && !nextPaidAt) {
    return NextResponse.json({ error: "Fecha de pago inválida." }, { status: 400 });
  }

  if (hasDueAt && body.fecha_vencimiento_pago && !nextDueAt) {
    return NextResponse.json(
      { error: "Fecha de vencimiento de pago inválida." },
      { status: 400 }
    );
  }

  try {
    const { booking, response } = await getWritableBooking(request, params);
    if (response) return response;

    if (hasTotal) booking.monto_total = nextTotal;
    if (hasPaid) booking.monto_pagado = Math.min(nextPaid, booking.monto_total || nextPaid);
    if (hasPaidAt) booking.fecha_pago = nextPaidAt;
    if (hasMethod) booking.metodo_pago = nextMethod || null;
    if (hasDueAt) booking.fecha_vencimiento_pago = nextDueAt;
    if (hasNotes) booking.notas_pago = String(body.notas_pago || "").trim();

    const total = booking.monto_total || booking.deposit?.amount || 0;
    const paid = booking.monto_pagado || 0;

    if (hasStatus) {
      booking.estado_pago = nextStatus;
    } else if (total <= 0 || paid >= total) {
      booking.estado_pago = "pagado";
    } else if (paid > 0) {
      booking.estado_pago = "parcial";
    } else {
      booking.estado_pago = "pendiente";
    }

    if (booking.estado_pago === "pagado" && !booking.fecha_pago) {
      booking.fecha_pago = new Date();
    }

    if (booking.deposit) {
      booking.deposit.amount = booking.deposit.amount || total;
      booking.deposit.status =
        booking.estado_pago === "pagado"
          ? "paid"
          : total > 0
            ? "pending"
            : "not_required";
      booking.deposit.paidAt =
        booking.estado_pago === "pagado" ? booking.fecha_pago || new Date() : null;
    }

    await booking.save();

    return NextResponse.json({ booking }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar pago." },
      { status: 400 }
    );
  }
}
