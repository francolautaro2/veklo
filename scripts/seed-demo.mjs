import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const DEMO_EMAIL = "demo@veklo.app";
const DEMO_PASSWORD = "Demo1234!";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const index = trimmed.indexOf("=");
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

// Fechas de calendario como medianoche UTC (igual que lib/date-only.js).
function addDays(days) {
  const now = new Date();
  return new Date(
    Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + days)
  );
}

function checkoutFrom(checkIn, nights) {
  return new Date(checkIn.getTime() + nights * 24 * 60 * 60 * 1000);
}

function randomToken() {
  return crypto.randomBytes(16).toString("hex");
}

function pick(items, index) {
  return items[index % items.length];
}

loadEnvLocal();

if (!process.env.MONGODB_URI) {
  console.error("Falta MONGODB_URI en .env.local");
  process.exit(1);
}

const [{ default: User }, { default: Organization }, { default: Property }, { default: Room }, { default: Booking }] =
  await Promise.all([
    import("../models/User.js"),
    import("../models/Organization.js"),
    import("../models/Property.js"),
    import("../models/Room.js"),
    import("../models/Booking.js"),
  ]);

await mongoose.connect(process.env.MONGODB_URI);

try {
  const existingUser = await User.findOne({ email: DEMO_EMAIL });
  if (existingUser) {
    const properties = await Property.find({ ownerId: existingUser._id }).select("_id");
    const propertyIds = properties.map((property) => property._id);

    await Promise.all([
      Booking.deleteMany({ ownerId: existingUser._id }),
      Room.deleteMany({ propertyId: { $in: propertyIds } }),
      Property.deleteMany({ ownerId: existingUser._id }),
      Organization.deleteMany({ ownerUserId: existingUser._id }),
      User.deleteOne({ _id: existingUser._id }),
    ]);
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const trialStartsAt = addDays(-18);
  const trialEndsAt = addDays(45);

  const user = await User.create({
    name: "Sofia Demo",
    email: DEMO_EMAIL,
    emailVerified: true,
    phone: "+54 9 11 5555-0198",
    documentId: "32.481.902",
    passwordHash,
    role: "owner",
    plan: "plus",
    subscriptionStatus: "active",
    subscriptionProvider: "mercadopago",
    subscriptionExternalId: "demo-subscription-veklo",
    subscriptionCurrentPeriodEnd: addDays(28),
    subscriptionLastWebhookAt: addDays(-1),
    trialStartsAt,
    trialEndsAt,
  });

  const organization = await Organization.create({
    name: "Grupo Costa Serena",
    ownerUserId: user._id,
  });

  user.organizationId = organization._id;
  await user.save();

  const propertyDocs = await Property.insertMany([
    {
      organizationId: organization._id,
      ownerId: user._id,
      name: "Hotel Costa Serena",
      type: "hotel",
      address: "Av. del Mar 1450, Mar de las Pampas",
      description: "Hotel boutique frente al bosque, con desayuno y spa.",
    },
    {
      organizationId: organization._id,
      ownerId: user._id,
      name: "Cabanas del Bosque",
      type: "cabana",
      address: "Los Pinos 824, Villa General Belgrano",
      description: "Complejo de cabañas familiares con pileta climatizada.",
    },
    {
      organizationId: organization._id,
      ownerId: user._id,
      name: "Casa Terraza Norte",
      type: "casa",
      address: "Pasaje Las Moras 212, San Rafael",
      description: "Casa completa para grupos, con parrilla y terraza.",
    },
  ]);

  const roomBlueprints = [
    ["Standard 101", 2, 52000],
    ["Standard 102", 2, 52000],
    ["Superior 201", 3, 69000],
    ["Suite Vista Bosque", 4, 92000],
    ["Cabana Cipres", 4, 84000],
    ["Cabana Arrayan", 5, 91000],
    ["Cabana Maiten", 6, 108000],
    ["Casa Completa", 8, 156000],
  ];

  const roomDocs = [];
  for (const [index, blueprint] of roomBlueprints.entries()) {
    const property =
      index < 4 ? propertyDocs[0] : index < 7 ? propertyDocs[1] : propertyDocs[2];
    const [name, capacity, basePrice] = blueprint;
    roomDocs.push({
      organizationId: organization._id,
      propertyId: property._id,
      name,
      capacity,
      basePrice,
      icalExportToken: randomToken(),
      icalSources:
        index % 3 === 0
          ? [
              {
                sourceId: `airbnb-${index + 1}`,
                name: "Airbnb",
                provider: "airbnb",
                url: `https://example.com/demo/airbnb-${index + 1}.ics`,
                enabled: true,
                lastSyncedAt: addDays(-1),
                lastSyncStatus: "ok",
                lastSyncMessage: "Sincronizado correctamente",
              },
            ]
          : [],
    });
  }

  const rooms = await Room.insertMany(roomDocs);
  const guestNames = [
    "Martina Lopez",
    "Agustin Rojas",
    "Carla Mendoza",
    "Federico Sosa",
    "Valentina Acuna",
    "Ignacio Peralta",
    "Julieta Romero",
    "Tomas Alvarez",
    "Natalia Cabrera",
    "Diego Ferreyra",
    "Camila Silva",
    "Lucas Herrera",
  ];
  const paymentMethods = ["efectivo", "transferencia", "mercadopago", "otro"];
  const statuses = ["reserved", "checked_in", "checked_out", "cancelled"];

  const bookings = [];
  for (let index = 0; index < 72; index += 1) {
    const room = pick(rooms, index);
    const property = propertyDocs.find((item) => item._id.equals(room.propertyId));
    const dayOffset = -55 + index * 2;
    const checkIn = addDays(dayOffset);
    const nights = 1 + (index % 5);
    const checkOut = checkoutFrom(checkIn, nights);
    const total = room.basePrice * nights;
    const isPast = checkOut < new Date();
    const cancelled = index % 17 === 0;
    const partial = index % 6 === 0;
    const unpaid = index % 9 === 0;
    const paid = isPast && !cancelled && !partial && !unpaid;
    const guestName = pick(guestNames, index);
    const status = cancelled
      ? "cancelled"
      : isPast
        ? "checked_out"
        : dayOffset <= 0 && dayOffset + nights >= 0
          ? "checked_in"
          : pick(statuses, index);
    const estadoPago = cancelled
      ? "pendiente"
      : paid
        ? "pagado"
        : partial
          ? "parcial"
          : "pendiente";
    const paidAmount =
      estadoPago === "pagado" ? total : estadoPago === "parcial" ? Math.round(total * 0.35) : 0;
    const depositAmount = Math.round(total * 0.25);

    bookings.push({
      organizationId: organization._id,
      ownerId: user._id,
      propertyId: property._id,
      roomId: room._id,
      guestName,
      guestEmail: `${guestName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      guestPhone: `+54 9 11 6${String(1000000 + index).slice(1)}`,
      checkIn,
      checkOut,
      status,
      monto_total: total,
      estado_pago: estadoPago,
      fecha_pago: paidAmount > 0 ? addDays(dayOffset - 5) : null,
      metodo_pago: paidAmount > 0 ? pick(paymentMethods, index) : null,
      monto_pagado: paidAmount,
      fecha_vencimiento_pago: estadoPago !== "pagado" ? addDays(dayOffset - 3) : null,
      notas_pago:
        estadoPago === "parcial"
          ? "Pago parcial registrado. Falta cancelar saldo al check-in."
          : "",
      origin: index % 4 === 0 ? "ical" : "manual",
      externalSource:
        index % 4 === 0
          ? {
              provider: index % 8 === 0 ? "airbnb" : "booking",
              sourceId: `demo-source-${index % 3}`,
              eventUid: `demo-event-${index}`,
              calendarName: index % 8 === 0 ? "Airbnb" : "Booking.com",
              eventSummary: `Reserva importada ${guestName}`,
              lastImportedAt: addDays(-1),
            }
          : undefined,
      preCheckIn: {
        status: index % 3 === 0 ? "completed" : "pending",
        token: randomToken(),
        completedAt: index % 3 === 0 ? addDays(dayOffset - 2) : null,
        expiresAt: addDays(dayOffset + 1),
        documentId: index % 3 === 0 ? `${28 + index}.456.${100 + index}` : "",
        notes: index % 3 === 0 ? "Prefiere check-in temprano si hay disponibilidad." : "",
      },
      deposit: {
        amount: depositAmount,
        paymentLink: index % 5 === 0 ? `https://mpago.la/demo-${index}` : "",
        status: paidAmount > 0 ? "paid" : index % 5 === 0 ? "pending" : "not_required",
        paidAt: paidAmount > 0 ? addDays(dayOffset - 8) : null,
      },
    });
  }

  await Booking.insertMany(bookings);

  console.log("Usuario demo creado correctamente.");
  console.log(`Email: ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
  console.log(`Propiedades: ${propertyDocs.length}`);
  console.log(`Habitaciones: ${rooms.length}`);
  console.log(`Reservas: ${bookings.length}`);
} finally {
  await mongoose.disconnect();
}
