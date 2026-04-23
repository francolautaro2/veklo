// app/api/properties/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import User from "@/models/User";
import { getUserContextFromRequest } from "@/lib/auth";
import {
  getAccessDeniedMessage,
  getPlanConfig,
  getPropertyLimitMessage,
  hasAccountAccess,
} from "@/lib/subscription";

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

export async function GET(request) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const properties = await Property.find(buildPropertyScope(user)).sort({
    createdAt: -1,
  });

  return NextResponse.json({ properties });
}

export async function POST(request) {
  await dbConnect();

  const user = await getUserContextFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const account = await User.findById(user.id).select(
    "plan subscriptionStatus trialEndsAt"
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

  const planConfig = getPlanConfig(account.plan);
  if (planConfig.maxProperties != null) {
    const propertiesCount = await Property.countDocuments(buildPropertyScope(user));
    if (propertiesCount >= planConfig.maxProperties) {
      return NextResponse.json(
        { error: getPropertyLimitMessage(account.plan) },
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
  } catch {
    return NextResponse.json({ error: "Error al crear propiedad." }, { status: 400 });
  }
}
