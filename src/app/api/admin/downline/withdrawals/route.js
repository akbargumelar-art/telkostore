import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";

import db from "@/db/index.js";
import { referralWithdrawals, downlineProfiles } from "@/db/schema.js";

export async function GET() {
  try {
    const rows = await db
      .select({
        id: referralWithdrawals.id,
        amount: referralWithdrawals.amount,
        bankName: referralWithdrawals.bankName,
        accountNumber: referralWithdrawals.accountNumber,
        accountName: referralWithdrawals.accountName,
        status: referralWithdrawals.status,
        createdAt: referralWithdrawals.createdAt,
        processedAt: referralWithdrawals.processedAt,
        adminNotes: referralWithdrawals.adminNotes,
        displayName: downlineProfiles.displayName,
        slug: downlineProfiles.slug,
      })
      .from(referralWithdrawals)
      .innerJoin(downlineProfiles, eq(referralWithdrawals.downlineProfileId, downlineProfiles.id))
      .orderBy(desc(referralWithdrawals.createdAt));

    return NextResponse.json({
      success: true,
      data: rows,
    });
  } catch (error) {
    console.error("GET /api/admin/downline/withdrawals error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil daftar penarikan." },
      { status: 500 }
    );
  }
}
