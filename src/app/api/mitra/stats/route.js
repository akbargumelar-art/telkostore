import { NextResponse } from "next/server";

import { requireDownlineSession } from "@/lib/downline-auth";
import { getDownlineDetail } from "@/lib/referral-service";

export async function GET() {
  const auth = await requireDownlineSession();
  if (!auth.ok) return auth.response;

  try {
    const detail = await getDownlineDetail(auth.profile.profileId);

    return NextResponse.json({
      success: true,
      data: {
        profile: detail.profile,
        stats: detail.profile.stats,
        recentOrders: detail.recentOrders.slice(0, 8),
        recentClicks: detail.recentClicks.slice(0, 8),
      },
    });
  } catch (error) {
    console.error("GET /api/mitra/stats error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil statistik mitra." },
      { status: 500 }
    );
  }
}
