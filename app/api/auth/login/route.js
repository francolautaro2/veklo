// app/api/auth/login/route.js
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";

export async function POST(req) {
  await dbConnect();

  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y contraseña son obligatorios." },
      { status: 400 }
    );
  }

  const user = await User.findOne({ email });
  if (!user) {
    return NextResponse.json(
      { error: "Credenciales inválidas." },
      { status: 401 }
    );
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { error: "Credenciales inválidas." },
      { status: 401 }
    );
  }

  const payload = {
    sub: user._id.toString(),
    email: user.email,
    name: user.name,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  const safeUser = {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
  };

  const res = NextResponse.json({ user: safeUser }, { status: 200 });

  // Cookie HTTP-only con el token
  res.cookies.set("hotel_saas_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return res;
}
