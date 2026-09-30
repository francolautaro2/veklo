import { after, NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Booking from "@/models/Booking";
import Property from "@/models/Property";
import Room from "@/models/Room";
import User from "@/models/User";
import { sendPreCheckInCompletedNotification } from "@/lib/email";

function isValidEmail(value) {
  if (!value) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function resolvePreCheckInExpiresAt(booking) {
  const explicit = booking?.preCheckIn?.expiresAt
    ? new Date(booking.preCheckIn.expiresAt)
    : null;
  if (explicit && !isNaN(explicit.getTime())) {
    return explicit;
  }

  const fallback = booking?.checkOut ? new Date(booking.checkOut) : null;
  if (fallback && !isNaN(fallback.getTime())) {
    return fallback;
  }

  return null;
}

function isPreCheckInExpired(booking) {
  const expiresAt = resolvePreCheckInExpiresAt(booking);
  if (!expiresAt) return false;
  return expiresAt.getTime() < Date.now();
}

async function findPropertyForTemplate(propertyId) {
  if (!mongoose.Types.ObjectId.isValid(propertyId)) return null;
  return Property.collection.findOne(
    { _id: new mongoose.Types.ObjectId(propertyId) },
    { projection: { name: 1, preCheckInTemplate: 1 } }
  );
}

function normalizeTemplateFields(property) {
  return (property?.preCheckInTemplate?.customFields || [])
    .filter((field) => field?.label)
    .map((field) => ({
      fieldId: String(field.fieldId || ""),
      label: field.label,
      type: field.type || "boolean",
      required: Boolean(field.required),
      hasCost: Boolean(field.hasCost),
      cost: field.hasCost ? Number(field.cost || 0) : 0,
    }));
}

function normalizeCustomAnswers(fields, rawAnswers = {}) {
  const answersById = rawAnswers && typeof rawAnswers === "object" ? rawAnswers : {};

  return fields.map((field) => {
    const rawValue = answersById[field.fieldId];
    let value = "";

    if (field.type === "boolean") {
      value = rawValue === true || rawValue === "true";
    } else {
      value = String(rawValue || "").trim().slice(0, 500);
    }

    return {
      fieldId: field.fieldId,
      label: field.label,
      type: field.type,
      value,
      hasCost: field.hasCost,
      cost: field.hasCost && value ? field.cost : 0,
    };
  });
}

function findMissingRequiredField(fields, answers) {
  return fields.find((field) => {
    if (!field.required || field.type === "boolean") return false;
    const answer = answers.find((item) => item.fieldId === field.fieldId);
    return !String(answer?.value || "").trim();
  });
}

export async function GET(_request, { params }) {
  await dbConnect();
  const { token } = await params;

  if (!token) {
    return NextResponse.json(
      { error: "Token de pre check-in inválido." },
      { status: 400 }
    );
  }

  const booking = await Booking.findOne({ "preCheckIn.token": token }).lean();
  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
  }

  if (booking.status === "cancelled" || booking.status === "checked_out") {
    return NextResponse.json(
      { error: "Esta reserva no permite pre check-in." },
      { status: 409 }
    );
  }

  if (isPreCheckInExpired(booking)) {
    return NextResponse.json(
      { error: "El link de pre check-in venció." },
      { status: 410 }
    );
  }

  const preCheckInExpiresAt = resolvePreCheckInExpiresAt(booking);

  const [property, room] = await Promise.all([
    findPropertyForTemplate(booking.propertyId),
    Room.findById(booking.roomId).select("name").lean(),
  ]);

  const templateFields = normalizeTemplateFields(property);

  return NextResponse.json({
    booking: {
      id: String(booking._id),
      guestName: booking.guestName || "",
      guestEmail: booking.guestEmail || "",
      guestPhone: booking.guestPhone || "",
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      status: booking.status,
      propertyName: property?.name || "Propiedad",
      roomName: room?.name || "Habitación",
      preCheckInStatus: booking.preCheckIn?.status || "pending",
      preCheckInCompletedAt: booking.preCheckIn?.completedAt || null,
      preCheckInExpiresAt,
      customFields: templateFields,
      customAnswers: booking.preCheckIn?.customAnswers || [],
      deposit: {
        amount: booking.deposit?.amount || 0,
        status: booking.deposit?.status || "not_required",
        paymentLink: booking.deposit?.paymentLink || "",
      },
    },
  });
}

export async function POST(request, { params }) {
  await dbConnect();
  const { token } = await params;

  if (!token) {
    return NextResponse.json(
      { error: "Token de pre check-in inválido." },
      { status: 400 }
    );
  }

  const booking = await Booking.findOne({ "preCheckIn.token": token });
  if (!booking) {
    return NextResponse.json({ error: "Reserva no encontrada." }, { status: 404 });
  }

  if (booking.status === "cancelled" || booking.status === "checked_out") {
    return NextResponse.json(
      { error: "Esta reserva no permite pre check-in." },
      { status: 409 }
    );
  }

  if (isPreCheckInExpired(booking)) {
    return NextResponse.json(
      { error: "El link de pre check-in venció." },
      { status: 410 }
    );
  }

  const { guestName, guestEmail, guestPhone, documentId, notes, customAnswers } =
    await request.json();

  const normalizedGuestName = guestName?.trim();
  const normalizedGuestEmail = guestEmail?.trim().toLowerCase() || "";
  const normalizedGuestPhone = guestPhone?.trim() || "";
  const normalizedDocumentId = documentId?.trim() || "";
  const normalizedNotes = notes?.trim() || "";

  if (!normalizedGuestName) {
    return NextResponse.json(
      { error: "Nombre del huésped obligatorio." },
      { status: 400 }
    );
  }

  if (normalizedGuestEmail && !isValidEmail(normalizedGuestEmail)) {
    return NextResponse.json(
      { error: "Email del huésped inválido." },
      { status: 400 }
    );
  }

  const bookingProperty = await findPropertyForTemplate(booking.propertyId);
  const templateFields = normalizeTemplateFields(bookingProperty);
  const normalizedCustomAnswers = normalizeCustomAnswers(
    templateFields,
    customAnswers
  );
  const missingField = findMissingRequiredField(
    templateFields,
    normalizedCustomAnswers
  );

  if (missingField) {
    return NextResponse.json(
      { error: `Completá el campo "${missingField.label}".` },
      { status: 400 }
    );
  }

  if (!booking.preCheckIn) {
    booking.preCheckIn = {
      status: "pending",
      token,
      expiresAt: resolvePreCheckInExpiresAt(booking),
    };
  } else if (!booking.preCheckIn.expiresAt) {
    booking.preCheckIn.expiresAt = resolvePreCheckInExpiresAt(booking);
  }

  booking.guestName = normalizedGuestName;
  booking.guestEmail = normalizedGuestEmail;
  booking.guestPhone = normalizedGuestPhone;
  booking.preCheckIn.status = "completed";
  booking.preCheckIn.completedAt = new Date();
  booking.preCheckIn.documentId = normalizedDocumentId;
  booking.preCheckIn.notes = normalizedNotes;
  booking.preCheckIn.customAnswers = normalizedCustomAnswers;

  await booking.save();

  const [owner, room] = await Promise.all([
    User.findById(booking.ownerId).select("email").lean(),
    Room.findById(booking.roomId).select("name").lean(),
  ]);

  after(() =>
    sendPreCheckInCompletedNotification({
      booking,
      ownerEmail: owner?.email,
      propertyName: bookingProperty?.name || "Propiedad",
      roomName: room?.name || "Habitación",
    })
  );

  return NextResponse.json(
    {
      success: true,
      preCheckInStatus: booking.preCheckIn.status,
      preCheckInCompletedAt: booking.preCheckIn.completedAt,
    },
    { status: 200 }
  );
}
