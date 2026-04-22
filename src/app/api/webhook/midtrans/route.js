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

    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        newStatus = "paid";
        statusUpdates.paidAt = now;
        statusUpdates.paymentMethod = payment_type;

        // [FIX 2.2] Separate flow for virtual vs fisik products
        // Fetch product to check type
        const productResult = await db
          .select()
          .from(products)
          .where(eq(products.id, order.productId))
          .limit(1);
        const productType = productResult[0]?.type || "virtual";

        if (productType === "virtual") {
          // Virtual products: auto-complete (simulate fulfillment)
          // In production, this would call Digipos/provider API
          newStatus = "completed";
          statusUpdates.completedAt = now;
        } else {
          // Fisik products: stay at "paid", admin will process manually
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

      // ===== VOUCHER AUTO-ASSIGN =====
      try {
        const isVoucher = await isVoucherProduct(order.productId);
        if (isVoucher) {
          const detectedProvider = detectProviderFromPhone(order.targetData || order.guestPhone);
          const voucher = await assignVoucherToOrder(
            order.id, order.productId, order.guestPhone, detectedProvider
          );
          if (voucher) {
            // Send voucher code + redeem instructions to buyer
            const instructions = getRedeemInstructions(
              voucher.provider, voucher.code, order.targetData || order.guestPhone
            );
            await sendWhatsAppNotification(
              order.guestPhone,
              buildVoucherDeliveryMsg(order, voucher, instructions)
            );
            // Notify admin group for semi-auto redeem
            await sendGroupNotification(
              buildGroupVoucherRedeemMsg(order, voucher)
            );
            console.log(`🎫 Voucher ${voucher.code} assigned to order ${order.id}`);
          } else {
            console.warn(`⚠️ No available voucher for product ${order.productId}`);
            await sendGroupNotification(
              `⚠️ *STOK VOUCHER HABIS*\n\nProduk: ${order.productName}\nOrder: ${order.id}\nPembeli: ${order.guestPhone}\n\nSegera tambah kode voucher di Admin!`
            );
          }
        }
      } catch (voucherErr) {
        console.error("Voucher auto-assign failed:", voucherErr.message);
      }

      // Notify internal group
      try {
        await sendGroupNotification(
          buildGroupPaymentSuccessMsg(order, payment_type)
        );
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
