// PUT /api/admin/orders/[id] — Update order status, add tracking, send WA
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import {
  sendWhatsAppNotification,
  sendGroupNotification,
  buildOrderCompletedMsg,
  buildOrderProcessingMsg,
  formatRupiahServer,
} from "@/lib/whatsapp";
import { ensurePostPaymentFulfillment } from "@/lib/order-fulfillment";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const result = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: result[0] });
  } catch (error) {
    console.error("GET /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data pesanan" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    const existing = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
    if (existing.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    const order = existing[0];
    const now = new Date().toISOString();
    const updateData = { updatedAt: now };

    if (status) {
      updateData.status = status;
      if (status === "paid") updateData.paidAt = now;
      if (status === "completed") updateData.completedAt = now;
    }

    if (notes !== undefined) updateData.notes = notes;

    await db.update(orders).set(updateData).where(eq(orders.id, id));

    const [updatedOrder] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    // Send WhatsApp notifications based on status change
    if (status === "completed" && order.status !== "completed") {
      // Notify buyer — order completed (Notif #3 untuk pelanggan)
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildOrderCompletedMsg(order)
        );
        updateData.whatsappSent = true;
      } catch (waErr) {
        console.error("WA buyer (completed) notification failed:", waErr.message);
      }

      // Notify admin group — order completed
      try {
        await sendGroupNotification(
          `✅ *PESANAN SELESAI — Telko.Store*\n\n` +
          `📋 Invoice: ${order.id}\n` +
          `📦 Produk: ${order.productName}\n` +
          `💰 Total: ${formatRupiahServer(order.productPrice)}\n` +
          `📱 Pembeli: ${order.guestPhone}\n\n` +
          `✅ Status telah diubah ke *Selesai* oleh admin.`
        );
      } catch (waErr) {
        console.error("WA group (completed) notification failed:", waErr.message);
      }
    }

    if (status === "processing" && order.status !== "processing") {
      // Notify buyer — order processing
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildOrderProcessingMsg(order)
        );
      } catch (waErr) {
        console.error("WA buyer (processing) notification failed:", waErr.message);
      }

      // Notify admin group — order being processed
      try {
        await sendGroupNotification(
          `📦 *PESANAN DIPROSES — Telko.Store*\n\n` +
          `📋 Invoice: ${order.id}\n` +
          `📦 Produk: ${order.productName}\n` +
          `💰 Total: ${formatRupiahServer(order.productPrice)}\n` +
          `📱 Pembeli: ${order.guestPhone}\n\n` +
          `⏳ Status telah diubah ke *Diproses* oleh admin.`
        );
      } catch (waErr) {
        console.error("WA group (processing) notification failed:", waErr.message);
      }
    }

    if (
      updatedOrder &&
      status &&
      status !== order.status &&
      ["paid", "processing", "completed"].includes(status)
    ) {
      try {
        await ensurePostPaymentFulfillment(
          updatedOrder,
          {
            sendWA: sendWhatsAppNotification,
            sendGroup: sendGroupNotification,
          },
          {
            sendVoucherMessage: true,
            retryFailedAutoRedeem: true,
            forceAutoRedeem: status === "processing" || status === "completed",
          }
        );
      } catch (voucherErr) {
        console.error("Voucher fulfillment failed:", voucherErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Pesanan berhasil diperbarui",
    });
  } catch (error) {
    console.error("PUT /api/admin/orders/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui pesanan" },
      { status: 500 }
    );
  }
}
