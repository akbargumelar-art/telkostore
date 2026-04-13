// POST /api/webhook/midtrans — Handle Midtrans payment callback
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders, payments, products } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { sendWhatsAppNotification, formatRupiahServer } from "@/lib/whatsapp";
import { verifySignature } from "@/lib/midtrans";

// GET /api/webhook/midtrans — Health check for Midtrans URL verification
export async function GET() {
  return NextResponse.json({ success: true, message: "Midtrans webhook endpoint is active" });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      order_id,
      transaction_id,
      transaction_status,
      status_code,
      gross_amount,
      payment_type,
      fraud_status,
      signature_key,
    } = body;

    console.log(`📬 Midtrans webhook: ${order_id} → ${transaction_status}`);

    // Idempotency check — skip if this transaction_id was already processed
    if (transaction_id) {
      const existingPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.transactionId, transaction_id))
        .limit(1);
      if (existingPayment.length > 0) {
        console.log(`⏭️ Webhook already processed for transaction: ${transaction_id}`);
        return NextResponse.json({ success: true, message: "Already processed" });
      }
    }

    // Verify signature
    if (!verifySignature(order_id, status_code, gross_amount, signature_key)) {
      console.error("❌ Invalid Midtrans signature");
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 403 }
      );
    }

    // Find order by midtrans_order_id
    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.midtransOrderId, order_id))
      .limit(1);

    if (orderResult.length === 0) {
      console.error(`❌ Order not found for midtrans_order_id: ${order_id}`);
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const order = orderResult[0];
    const now = new Date().toISOString();

    // Log payment
    await db.insert(payments).values({
      id: `PAY-${nanoid(12)}`,
      orderId: order.id,
      gateway: "midtrans",
      paymentType: payment_type,
      transactionId: transaction_id,
      transactionStatus: transaction_status,
      grossAmount: parseFloat(gross_amount),
      fraudStatus: fraud_status,
      rawResponse: JSON.stringify(body),
      createdAt: now,
    });

    // Determine new order status
    let newStatus = order.status;
    let statusUpdates = { updatedAt: now };

    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        newStatus = "paid";
        statusUpdates.paidAt = now;
        statusUpdates.paymentMethod = payment_type;

        // For virtual products, auto-complete (simulate fulfillment)
        // In production, this would call Digipos/provider API
        newStatus = "completed";
        statusUpdates.completedAt = now;
      }
    } else if (transaction_status === "pending") {
      newStatus = "pending";
    } else if (
      transaction_status === "deny" ||
      transaction_status === "cancel" ||
      transaction_status === "expire"
    ) {
      newStatus = "failed";

      // Rollback stock for failed/expired payments
      if (order.status !== "failed") {
        try {
          const productResult = await db
            .select()
            .from(products)
            .where(eq(products.id, order.productId))
            .limit(1);
          if (productResult.length > 0) {
            await db
              .update(products)
              .set({ stock: productResult[0].stock + 1 })
              .where(eq(products.id, order.productId));
            console.log(`📦 Stock restored for product: ${order.productId}`);
          }
        } catch (stockErr) {
          console.error("Stock rollback failed:", stockErr.message);
        }
      }
    }

    // Update order status
    await db
      .update(orders)
      .set({ status: newStatus, ...statusUpdates })
      .where(eq(orders.id, order.id));

    // Send WhatsApp notification based on status
    if (newStatus === "completed" && !order.whatsappSent) {
      sendWhatsAppNotification(
        order.guestPhone,
        `✅ *Pembayaran Berhasil — Telko.Store*\n\n` +
        `📦 Produk: ${order.productName}\n` +
        `📱 No. Tujuan: ${order.targetData}\n` +
        `💰 Total: ${formatRupiahServer(order.productPrice)}\n` +
        `💳 Pembayaran: ${payment_type}\n\n` +
        `✨ Produk sedang diproses dan akan segera masuk ke nomor tujuan.\n\n` +
        `📋 Invoice: ${order.id}\n` +
        `🔑 Lacak pesanan:\n${process.env.NEXT_PUBLIC_BASE_URL}/order/${order.id}?token=${order.guestToken}`
      );

      await db
        .update(orders)
        .set({ whatsappSent: true })
        .where(eq(orders.id, order.id));
    } else if (newStatus === "failed") {
      sendWhatsAppNotification(
        order.guestPhone,
        `❌ *Pembayaran Gagal — Telko.Store*\n\n` +
        `📦 Produk: ${order.productName}\n` +
        `📋 Invoice: ${order.id}\n\n` +
        `Status: ${transaction_status}\n` +
        `Silakan coba lagi atau hubungi customer service.`
      );
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("POST /api/webhook/midtrans error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
