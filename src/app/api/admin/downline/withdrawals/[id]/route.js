import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import db from "@/db/index.js";
import { referralWithdrawals, referralCommissions } from "@/db/schema.js";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, adminNotes } = body;

    if (!["processing", "completed", "rejected"].includes(status)) {
      return NextResponse.json(
        { success: false, error: "Status tidak valid." },
        { status: 400 }
      );
    }

    const [withdrawal] = await db
      .select()
      .from(referralWithdrawals)
      .where(eq(referralWithdrawals.id, id))
      .limit(1);

    if (!withdrawal) {
      return NextResponse.json(
        { success: false, error: "Penarikan tidak ditemukan." },
        { status: 404 }
      );
    }

    if (withdrawal.status === "completed" || withdrawal.status === "rejected") {
      return NextResponse.json(
        { success: false, error: "Status penarikan final tidak bisa diubah." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      // Update withdrawal
      await tx
        .update(referralWithdrawals)
        .set({
          status,
          adminNotes: adminNotes || withdrawal.adminNotes,
          processedAt: ["completed", "rejected"].includes(status) ? now : withdrawal.processedAt,
          updatedAt: now,
        })
        .where(eq(referralWithdrawals.id, id));

      // Update linked commissions
      if (status === "completed") {
        await tx
          .update(referralCommissions)
          .set({
            status: "paid",
            paidAt: now,
            updatedAt: now,
          })
          .where(eq(referralCommissions.withdrawalId, id));
      } else if (status === "rejected") {
        await tx
          .update(referralCommissions)
          .set({
            status: "approved", // Revert back to approved so they can withdraw again
            withdrawalId: null,
            updatedAt: now,
          })
          .where(eq(referralCommissions.withdrawalId, id));
      }
    });

    return NextResponse.json({
      success: true,
      message: "Status penarikan berhasil diubah.",
    });
  } catch (error) {
    console.error("PUT /api/admin/downline/withdrawals/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengubah status penarikan." },
      { status: 500 }
    );
  }
}
