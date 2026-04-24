import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

import db from "@/db/index.js";
import { downlineProfiles, referralCommissions, referralWithdrawals } from "@/db/schema.js";
import { requireDownlineSession } from "@/lib/downline-auth";
import { sendWhatsAppNotification, formatRupiahServer } from "@/lib/whatsapp";

export async function POST(request) {
  const auth = await requireDownlineSession();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { bankName, accountNumber, accountName } = body;

    if (!bankName || !accountNumber || !accountName) {
      return NextResponse.json(
        { success: false, error: "Semua field bank wajib diisi." },
        { status: 400 }
      );
    }

    const profileId = auth.profile.profileId;
    const userId = auth.profile.userId;

    return await db.transaction(async (tx) => {
      // Find all approved commissions
      const approvedRows = await tx
        .select({
          id: referralCommissions.id,
          amount: referralCommissions.commissionAmount,
        })
        .from(referralCommissions)
        .where(
          and(
            eq(referralCommissions.downlineProfileId, profileId),
            eq(referralCommissions.status, "approved")
          )
        );

      if (approvedRows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Tidak ada saldo komisi yang bisa ditarik." },
          { status: 400 }
        );
      }

      const totalAmount = approvedRows.reduce((sum, row) => sum + row.amount, 0);
      const withdrawalId = `WDW-${nanoid(8).toUpperCase()}`;
      const now = new Date().toISOString();

      // Insert into referral_withdrawals
      await tx.insert(referralWithdrawals).values({
        id: withdrawalId,
        downlineProfileId: profileId,
        amount: totalAmount,
        bankName,
        accountNumber,
        accountName,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      });

      // Update commissions
      await tx
        .update(referralCommissions)
        .set({
          status: "processing",
          withdrawalId: withdrawalId,
          updatedAt: now,
        })
        .where(
          and(
            eq(referralCommissions.downlineProfileId, profileId),
            eq(referralCommissions.status, "approved")
          )
        );

      // Save bank account info to downline profile for future withdrawals
      await tx
        .update(downlineProfiles)
        .set({
          bankName: bankName,
          bankAccountNumber: accountNumber,
          bankAccountName: accountName,
          updatedAt: now,
        })
        .where(eq(downlineProfiles.id, profileId));

      // Send WA verification/confirmation to mitra
      const phone = auth.profile.phone;
      if (phone) {
        const waMsg = `✅ *Pengajuan Withdraw Berhasil — Telko.Store*\n\n` +
          `📋 ID Withdraw: ${withdrawalId}\n` +
          `💰 Jumlah: ${formatRupiahServer(totalAmount)}\n\n` +
          `🏦 *Rekening Tujuan:*\n` +
          `Bank: ${bankName}\n` +
          `No. Rek: ${accountNumber}\n` +
          `Nama: ${accountName}\n\n` +
          `⏳ Status: Menunggu Approval Admin\n` +
          `Kami akan mengirim notifikasi saat pencairan diproses.\n\n` +
          `—————————————————\n` +
          `Telko.Store — Mitra Referral`;

        sendWhatsAppNotification(phone, waMsg).catch((err) => {
          console.error("WA withdraw notification failed:", err.message);
        });
      }

      return NextResponse.json({
        success: true,
        message: "Pengajuan withdraw berhasil dibuat. Detail telah dikirim ke WhatsApp Anda.",
      });
    });
  } catch (error) {
    console.error("POST /api/mitra/withdraw error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengajukan penarikan." },
      { status: 500 }
    );
  }
}
