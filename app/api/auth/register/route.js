// app/api/auth/register/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function POST(req) {
  await dbConnect();

  const { name, email, password } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json(
      { error: "Nombre, email y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return NextResponse.json(
      { error: "Ya existe un usuario con ese email." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    passwordHash,
  });

  const safeUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };

  return NextResponse.json({ user: safeUser }, { status: 201 });
}