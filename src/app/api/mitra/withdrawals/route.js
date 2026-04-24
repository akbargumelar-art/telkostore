import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";

import db from "@/db/index.js";
import { referralWithdrawals } from "@/db/schema.js";
import { requireDownlineSession } from "@/lib/downline-auth";

export async function GET() {
  const auth = await requireDownlineSession();
  if (!auth.ok) return auth.response;

  try {
    const profileId = auth.profile.profileId;

    const rows = await db
      .select()
      .from(referralWithdrawals)
      .where(eq(referralWithdrawals.downlineProfileId, profileId))
      .orderBy(desc(referralWithdrawals.createdAt));

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/mitra/withdrawals error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil riwayat penarikan." },
      { status: 500 }
    );
  }
}
