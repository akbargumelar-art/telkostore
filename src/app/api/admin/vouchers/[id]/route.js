// PUT/DELETE /api/admin/vouchers/[id] — Update/Delete a voucher code
// Also handles redeem actions (mark redeemed/failed)
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { voucherCodes, orders } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { markVoucherRedeemed, markVoucherFailed, getRedeemUrl } from "@/lib/voucher";
import {
  sendWhatsAppNotification,
  sendGroupNotification,
  buildOrderCompletedMsg,
} from "@/lib/whatsapp";

// PUT — Update voucher status (redeem / fail / release)
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, response } = body;

    // Find voucher
    const [voucher] = await db
      .select()
      .from(voucherCodes)
      .where(eq(voucherCodes.id, id))
      .limit(1);

    if (!voucher) {
      return NextResponse.json(
        { success: false, error: "Voucher tidak ditemukan" },
        { status: 404 }
      );
    }

    if (action === "redeem") {
      // Mark as redeemed
      await markVoucherRedeemed(id, response);

      // If linked to an order, update order status to completed
      if (voucher.orderId) {
        const [order] = await db
          .select()
          .from(orders)
          .where(eq(orders.id, voucher.orderId))
          .limit(1);

        if (order && order.status !== "completed") {
          const now = new Date().toISOString();
          await db
            .update(orders)
            .set({
              status: "completed",
              completedAt: now,
              updatedAt: now,
              notes: `Voucher ${voucher.code} berhasil di-redeem`,
            })
            .where(eq(orders.id, order.id));

          // Send completion notification to buyer
          try {
            await sendWhatsAppNotification(
              order.guestPhone,
              buildOrderCompletedMsg(order)
            );
          } catch (waErr) {
            console.error("WA notification failed:", waErr.message);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: "Voucher berhasil ditandai sebagai redeemed",
      });
    }

    if (action === "fail") {
      // Mark as failed
      await markVoucherFailed(id, response);

      return NextResponse.json({
        success: true,
        message: "Voucher ditandai sebagai gagal",
      });
    }

    if (action === "release") {
      // Release back to available
      const now = new Date().toISOString();
      await db
        .update(voucherCodes)
        .set({
          status: "available",
          orderId: null,
          customerPhone: null,
          redeemResponse: null,
          updatedAt: now,
        })
        .where(eq(voucherCodes.id, id));

      return NextResponse.json({
        success: true,
        message: "Voucher dikembalikan ke status tersedia",
      });
    }

    if (action === "getRedeemInfo") {
      // Return redeem URL and voucher info for 1-click redeem
      const redeemUrl = getRedeemUrl(voucher.provider);
      return NextResponse.json({
        success: true,
        data: {
          code: voucher.code,
          provider: voucher.provider,
          customerPhone: voucher.customerPhone,
          redeemUrl,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: "Action tidak valid. Gunakan: redeem, fail, release, getRedeemInfo" },
      { status: 400 }
    );
  } catch (error) {
    console.error("PUT /api/admin/vouchers/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengupdate voucher" },
      { status: 500 }
    );
  }
}

// DELETE — Delete a voucher code (only if available)
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const [voucher] = await db
      .select()
      .from(voucherCodes)
      .where(eq(voucherCodes.id, id))
      .limit(1);

    if (!voucher) {
      return NextResponse.json(
        { success: false, error: "Voucher tidak ditemukan" },
        { status: 404 }
      );
    }

    if (voucher.status !== "available") {
      return NextResponse.json(
        { success: false, error: "Hanya voucher dengan status 'available' yang bisa dihapus" },
        { status: 400 }
      );
    }

    await db.delete(voucherCodes).where(eq(voucherCodes.id, id));

    return NextResponse.json({
      success: true,
      message: "Voucher berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE /api/admin/vouchers/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus voucher" },
      { status: 500 }
    );
  }
}
