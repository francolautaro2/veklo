import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import { getUserContextFromRequest } from "@/lib/auth";

const FIELD_TYPES = new Set(["text", "textarea", "boolean"]);
const MAX_FIELDS = 20;

function toObjectId(value) {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function buildPropertyScope(user, id) {
  const ownerId = toObjectId(user.id);
  const organizationId = user.organizationId ? toObjectId(user.organizationId) : null;

  if (!user.organizationId) {
    return { _id: id, ownerId };
  }

  return {
    _id: id,
    $or: [
      { organizationId },
      { organizationId: { $exists: false }, ownerId },
    ],
  };
}

function normalizeField(field, index) {
  const label = String(field?.label || "").trim().slice(0, 80);

  const type = FIELD_TYPES.has(field?.type) ? field.type : "boolean";
  const hasCost = Boolean(field?.hasCost);
  const parsedCost = Number(field?.cost || 0);
  const cost = hasCost && Number.isFinite(parsedCost) ? Math.max(parsedCost, 0) : 0;

  return {
    fieldId:
      String(field?.fieldId || "").trim() ||
      `field_${Date.now().toString(36)}_${index}`,
    label,
    type,
    required: Boolean(field?.required),
    hasCost,
    cost,
  };
}

export async function PUT(request, { params }) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const rawFields = Array.isArray(body.customFields) ? body.customFields : [];

  if (rawFields.length > MAX_FIELDS) {
    return NextResponse.json(
      { error: `La plantilla puede tener hasta ${MAX_FIELDS} campos.` },
      { status: 400 }
    );
  }

  const emptyFieldIndex = rawFields.findIndex(
    (field) => !String(field?.label || "").trim()
  );

  if (emptyFieldIndex >= 0) {
    return NextResponse.json(
      { error: `Completá el nombre del campo ${emptyFieldIndex + 1}.` },
      { status: 400 }
    );
  }

  const customFields = rawFields.map((field, index) =>
    normalizeField(field, index)
  );

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Propiedad no encontrada." }, { status: 404 });
  }

  const now = new Date();
  const result = await Property.collection.findOneAndUpdate(
    buildPropertyScope(user, new mongoose.Types.ObjectId(id)),
    {
      $set: {
        preCheckInTemplate: { customFields },
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );
  const property = result?.value || result;

  if (!property) {
    return NextResponse.json({ error: "Propiedad no encontrada." }, { status: 404 });
  }

  return NextResponse.json({
    property,
    customFields,
  });
}
