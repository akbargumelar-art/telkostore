// GET /api/gateway/status — Check which payment gateways are available
// Public endpoint (no auth required) — only returns boolean availability
import { NextResponse } from "next/server";
import { isPakasirAvailable } from "@/lib/pakasir";

export async function GET() {
  try {
    const pakasir = await isPakasirAvailable();

    return NextResponse.json({
      midtrans: true, // Midtrans is always available (configured via env)
      pakasir,
    });
  } catch {
    return NextResponse.json({
      midtrans: true,
      pakasir: false,
    });
  }
}
