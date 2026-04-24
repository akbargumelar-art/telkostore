import { NextResponse } from "next/server";

import { requireDownlineSession } from "@/lib/downline-auth";
import { getDownlineCommissions } from "@/lib/referral-service";

export async function GET(request) {
  const auth = await requireDownlineSession();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "all");
    const rows = await getDownlineCommissions(auth.profile.profileId, {
      status,
      limit: 100,
    });

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/mitra/commissions error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil profit referral." },
      { status: 500 }
    );
  }
}
