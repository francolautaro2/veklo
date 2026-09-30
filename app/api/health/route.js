import mongoose from "mongoose";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";

export const dynamic = "force-dynamic";

// Para monitoreo externo (UptimeRobot, Better Stack, etc.).
export async function GET() {
  try {
    await dbConnect();
    await mongoose.connection.db.admin().ping();
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("[health]", error);
    return NextResponse.json({ status: "error" }, { status: 503 });
  }
}
