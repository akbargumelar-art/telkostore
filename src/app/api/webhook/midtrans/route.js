// POST /api/webhook/midtrans — Handle Midtrans payment callback
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders, payments, products } from "@/db/schema.js";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import {
  sendWhatsAppNotification,
  sendGroupNotification,
  buildPaymentSuccessMsg,
  buildPaymentFailedMsg,
  buildGroupPaymentSuccessMsg,
  buildGroupPaymentFailedMsg,
  buildVoucherDeliveryMsg,
  buildGroupVoucherRedeemMsg,
} from "@/lib/whatsapp";
import { verifySignature } from "@/lib/midtrans";
import { cancelNotification } from "@/lib/notification-scheduler";
import {
  assignVoucherToOrder,
  releaseVoucher,
  isVoucherProduct,
  getRedeemInstructions,
  detectProviderFromPhone,
  autoRedeemAndComplete,
} from "@/lib/voucher";

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

    // Idempotency check — skip only if this transaction was already settled/captured
    let existingPaymentRecord = null;
    if (transaction_id) {
      const existingPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.transactionId, transaction_id))
        .limit(1);
      if (existingPayment.length > 0) {
        existingPaymentRecord = existingPayment[0];
        const existingStatus = existingPaymentRecord.transactionStatus;
        console.log(`🔄 Existing transaction ${transaction_id}: ${existingStatus} → ${transaction_status}`);
      }
    }

    // Verify signature
    if (!(await verifySignature(order_id, status_code, gross_amount, signature_key))) {
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

    if (
      existingPaymentRecord &&
      (existingPaymentRecord.transactionStatus === "settlement" ||
        existingPaymentRecord.transactionStatus === "capture") &&
      ["paid", "processing", "completed"].includes(order.status)
    ) {
      console.log(`⏭️ Webhook already processed for transaction: ${transaction_id}`);
      cancelNotification(order.id);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // [FIX 2.1] Upsert payment — update existing record if transaction_id already exists
    if (existingPaymentRecord) {
      await db
        .update(payments)
        .set({
          transactionStatus: transaction_status,
          paymentType: payment_type,
          grossAmount: parseFloat(gross_amount),
          fraudStatus: fraud_status,
          rawResponse: JSON.stringify(body),
        })
        .where(eq(payments.id, existingPaymentRecord.id));
    } else {
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
    }

    // Determine new order status
    let newStatus = order.status;
    let statusUpdates = { updatedAt: now };
    let isVoucher = false;

    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        newStatus = "paid";
        statusUpdates.paidAt = now;
        statusUpdates.paymentMethod = payment_type;

        // Check if this is a voucher product (auto-complete only for voucher)
        try {
          isVoucher = await isVoucherProduct(order.productId);
        } catch { isVoucher = false; }

        if (isVoucher) {
          // Voucher products: stay at "paid", auto-redeem will complete if successful
          // If auto-redeem fails, admin can manually redeem via /admin/voucher
          newStatus = "paid";
        } else {
          // Non-voucher products (virtual & fisik): stay at "paid"
          // Admin will manually process -> completed via dashboard
          newStatus = "paid";
        }
      }
    } else if (transaction_status === "pending") {
      newStatus = "pending";
    } else if (
      transaction_status === "deny" ||
      transaction_status === "cancel" ||
      transaction_status === "expire"
    ) {
      newStatus = "failed";

      // [FIX 2.3] Atomic stock rollback for failed/expired payments
      if (order.status !== "failed") {
        try {
          await db
            .update(products)
            .set({ stock: sql`stock + 1` })
            .where(eq(products.id, order.productId));
          console.log(`📦 Stock restored for product: ${order.productId}`);
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

    if (newStatus !== "pending") {
      cancelNotification(order.id);
    }

    // [FIX 8.1/8.2] Send WhatsApp notifications with enriched templates
    if ((newStatus === "paid" || newStatus === "completed") && !order.whatsappSent) {
      // Notify buyer — payment success
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentSuccessMsg(order, payment_type)
        );
        await db
          .update(orders)
          .set({ whatsappSent: true })
          .where(eq(orders.id, order.id));
      } catch (waErr) {
        console.error("WA buyer notification failed:", waErr.message);
      }

      // ===== VOUCHER AUTO-ASSIGN + AUTO-REDEEM (only for voucher products) =====
      if (isVoucher) {
        try {
          const detectedProvider = detectProviderFromPhone(order.targetData || order.guestPhone);
          const voucher = await assignVoucherToOrder(
            order.id, order.productId, order.guestPhone, detectedProvider
          );
          if (voucher) {
            // Send voucher code + instructions to buyer immediately
            const instructions = getRedeemInstructions(
              voucher.provider, voucher.code, order.targetData || order.guestPhone
            );
            await sendWhatsAppNotification(
              order.guestPhone,
              buildVoucherDeliveryMsg(order, voucher, instructions)
            );
            console.log(`🎫 Voucher ${voucher.code} assigned to order ${order.id}`);

            // Fire-and-forget: attempt auto-redeem via Puppeteer
            // If auto-redeem succeeds → order auto-completes + buyer gets notified
            // If auto-redeem fails → falls back to semi-auto (admin dashboard)
            autoRedeemAndComplete(order, voucher, {
              sendWA: sendWhatsAppNotification,
              sendGroup: sendGroupNotification,
            }).catch((err) => {
              console.error("Auto-redeem background error:", err.message);
            });
          } else {
            console.warn(`⚠️ No available voucher for product ${order.productId}`);
            await sendGroupNotification(
              `⚠️ *STOK VOUCHER HABIS*\n\nProduk: ${order.productName}\nOrder: ${order.id}\nPembeli: ${order.guestPhone}\n\nSegera tambah kode voucher di Admin!`
            );
          }
        } catch (voucherErr) {
          console.error("Voucher auto-assign failed:", voucherErr.message);
        }
      }

      // Notify internal group — with action prompt for non-voucher
      try {
        let groupMsg = buildGroupPaymentSuccessMsg(order, payment_type);
        if (!isVoucher) {
          groupMsg += `\n\n⚡ *AKSI DIPERLUKAN:*\nProduk ini perlu diproses manual oleh admin.\n🔗 ${process.env.NEXT_PUBLIC_BASE_URL}/control/pesanan`;
        }
        await sendGroupNotification(groupMsg);
      } catch (waErr) {
        console.error("WA group notification failed:", waErr.message);
      }
    } else if (newStatus === "failed") {
      // Notify buyer
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentFailedMsg(order, transaction_status)
        );
      } catch (waErr) {
        console.error("WA buyer notification failed:", waErr.message);
      }

      // Notify internal group
      try {
        await sendGroupNotification(
          buildGroupPaymentFailedMsg(order, transaction_status)
        );
      } catch (waErr) {
        console.error("WA group notification failed:", waErr.message);
      }

      // Release any reserved voucher back to available
      try {
        await releaseVoucher(order.id);
      } catch (vErr) {
        console.error("Voucher release failed:", vErr.message);
      }
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
