import { NextResponse } from "next/server";

import { requireDownlineSession } from "@/lib/downline-auth";
import { getDownlineOrders } from "@/lib/referral-service";

export async function GET(request) {
  const auth = await requireDownlineSession();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get("status") || "all");
    const search = String(searchParams.get("search") || "").trim();
    const rows = await getDownlineOrders(auth.profile.profileId, {
      status,
      search,
      limit: 100,
    });

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/mitra/orders error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil transaksi referral." },
      { status: 500 }
    );
  }
}
