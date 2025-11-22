// app/api/properties/route.js
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Property from "@/models/Property";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const properties = await Property.find({ ownerId: user.id }).sort({
    createdAt: -1,
  });

  return NextResponse.json({ properties });
}

export async function POST(request) {
  await dbConnect();

  const user = getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
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
      ownerId: user.id,
      name,
      type,
      address,
      description,
    });

    return NextResponse.json({ property }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Error al crear propiedad.", details: err.message },
      { status: 400 }
    );
  }
}
