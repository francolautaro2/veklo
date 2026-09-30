// app/api/properties/route.js
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import { getAccessDeniedResponse, getUserContextFromRequest } from "@/lib/auth";
import {
  getPlanConfig,
  getPropertyLimitMessage,
} from "@/lib/subscription";

function toObjectId(value) {
  if (!mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function buildPropertyScope(user) {
  const ownerId = toObjectId(user.id);
  const organizationId = user.organizationId ? toObjectId(user.organizationId) : null;

  if (!user.organizationId) {
    return { ownerId };
  }

  return {
    $or: [
      { organizationId },
      { organizationId: { $exists: false }, ownerId },
    ],
  };
}

export async function GET(request) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const properties = await Property.collection
    .find(buildPropertyScope(user))
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ properties });
}

export async function POST(request) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const denied = getAccessDeniedResponse(user);
  if (denied) return denied;

  const planConfig = getPlanConfig(user.plan);
  if (planConfig.maxProperties != null) {
    const propertiesCount = await Property.countDocuments(buildPropertyScope(user));
    if (propertiesCount >= planConfig.maxProperties) {
      return NextResponse.json(
        { error: getPropertyLimitMessage(user.plan) },
        { status: 403 }
      );
    }
  }

  const { name, type, address, description } = await request.json();

  if (!name || !type) {
    return NextResponse.json(
      { error: "Nombre y tipo son obligatorios." },
      { status: 400 }
    );
  }

  try {
    const property = await Property.create({
      organizationId: user.organizationId || null,
      ownerId: user.id,
      name,
      type,
      address,
      description,
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error("[properties]", error);
    return NextResponse.json({ error: "Error al crear propiedad." }, { status: 400 });
  }
}
