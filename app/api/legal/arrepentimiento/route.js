import crypto from "node:crypto";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import RevocationRequest from "@/models/RevocationRequest";
import { sendRevocationRequestEmails } from "@/lib/email";
import { enforceRateLimits, getClientIp, MINUTE_MS } from "@/lib/rate-limit";

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function createRevocationCode() {
  return `ARR-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

export async function POST(request) {
  try {
    await dbConnect();

    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim().slice(0, 120);
    const email = String(body.email || "").trim().toLowerCase().slice(0, 200);
    const details = String(body.details || "").trim().slice(0, 2000);

    if (!name || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Ingresá tu nombre y el email de tu cuenta." },
        { status: 400 }
      );
    }

    const limited = await enforceRateLimits([
      {
        key: `revocation:ip:${getClientIp(request)}`,
        limit: 5,
        windowMs: 60 * MINUTE_MS,
      },
    ]);
    if (limited) return limited;

    const user = await User.findOne({ email }).select("_id");
    const revocation = await RevocationRequest.create({
      code: createRevocationCode(),
      name,
      email,
      details,
      userId: user?._id || null,
    });

    const { userResult, supportResult } = await sendRevocationRequestEmails({
      request: revocation,
    });
    if (!supportResult?.ok) {
      console.error(
        "[arrepentimiento] No se pudo avisar al equipo del pedido",
        revocation.code
      );
    }

    return NextResponse.json(
      {
        code: revocation.code,
        emailSent: Boolean(userResult?.ok),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[arrepentimiento]", error);
    return NextResponse.json(
      { error: "No se pudo registrar el pedido. Escribinos por email." },
      { status: 500 }
    );
  }
}
