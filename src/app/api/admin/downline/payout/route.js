import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-session";
import { markReferralCommissionPaid } from "@/lib/referral-commission";
import { getApprovedReferralPayoutQueue } from "@/lib/referral-service";

export async function GET() {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: "Hanya superadmin yang dapat mengakses payout referral.",
  });
  if (!auth.ok) return auth.response;

  try {
    const queue = await getApprovedReferralPayoutQueue();
    const summary = queue.reduce(
      (acc, item) => {
        acc.totalItems += 1;
        acc.totalAmount += Number(item.commissionAmount || 0);
        return acc;
      },
      { totalItems: 0, totalAmount: 0 }
    );

    return NextResponse.json({
      success: true,
      data: queue,
      summary,
    });
  } catch (error) {
    console.error("GET /api/admin/downline/payout error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil antrean payout referral." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: "Hanya superadmin yang dapat menandai payout referral.",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const commissionIds = Array.isArray(body.commissionIds)
      ? body.commissionIds.map((value) => String(value || "").trim()).filter(Boolean)
      : [];

    if (commissionIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pilih minimal satu komisi untuk payout." },
        { status: 400 }
      );
    }

    for (const commissionId of commissionIds) {
      await markReferralCommissionPaid(commissionId);
    }

    return NextResponse.json({
      success: true,
      message: `${commissionIds.length} komisi referral ditandai paid.`,
    });
  } catch (error) {
    console.error("POST /api/admin/downline/payout error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memproses payout referral." },
      { status: 500 }
    );
  }
}
