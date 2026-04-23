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

export async function PUT(request, { params }) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const account = await User.findById(user.id).select(
    "subscriptionStatus trialEndsAt"
  );
  if (!account) {
    return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  }
  if (!hasAccountAccess(account)) {
    return NextResponse.json(
      { error: getAccessDeniedMessage() },
      { status: 402 }
    );
  }

  const { id } = await params;

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
    const booking = await Booking.findById(id);

    if (!booking) {
      return NextResponse.json(
        { error: "Reserva no encontrada." },
        { status: 404 }
      );
    }

    if (!canAccessBooking(booking, user)) {
      return NextResponse.json(
        { error: "No tenés permiso para modificar esta reserva." },
        { status: 403 }
      );
    }

    if (booking.origin === "ical") {
      return NextResponse.json(
        {
          error:
            "Esta reserva fue importada por iCal. Editá o sincronizá su fuente externa desde Habitaciones.",
        },
        { status: 409 }
      );
    }

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
