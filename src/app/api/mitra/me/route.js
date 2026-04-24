import { NextResponse } from "next/server";

import { requireDownlineSession } from "@/lib/downline-auth";
import { getDownlineByProfileId } from "@/lib/referral-service";

export async function GET() {
  const auth = await requireDownlineSession();
  if (!auth.ok) return auth.response;

  try {
    const profile = await getDownlineByProfileId(auth.profile.profileId);

    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("GET /api/mitra/me error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil sesi mitra." },
      { status: 500 }
    );
  }
}
