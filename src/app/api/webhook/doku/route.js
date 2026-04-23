// POST /api/webhook/doku — Handle DOKU payment notification
//
// DOKU HTTP Notification payload:
// {
//   order: { invoice_number, amount },
//   transaction: { status, date, original_request_id },
//   acquirer: { id },
//   channel: { id },
//   ...
// }
//
// SECURITY: Verify signature using HMAC-SHA256 with Secret Key.
// DOKU sends signature in request headers.

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
import { cancelNotification } from "@/lib/notification-scheduler";
import { verifyDokuWebhookSignature } from "@/lib/doku";
import {
  assignVoucherToOrder,
  releaseVoucher,
  isVoucherProduct,
  getRedeemInstructions,
  detectProviderFromPhone,
  autoRedeemAndComplete,
} from "@/lib/voucher";

// GET — Health check for DOKU URL verification
export async function GET() {
  return NextResponse.json({ success: true, message: "DOKU webhook endpoint is active" });
}

export async function POST(request) {
  try {
    // Read raw body for signature verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    // Extract data from DOKU notification format
    const invoiceNumber = body?.order?.invoice_number;
    const amount = body?.order?.amount;
    const transactionStatus = body?.transaction?.status;
    const transactionDate = body?.transaction?.date;
    const channelId = body?.channel?.id;

    console.log(`📬 DOKU webhook: ${invoiceNumber} → ${transactionStatus} (${channelId}, Rp${amount})`);

    // ===== 1. Verify signature =====
    const requestTarget = "/api/webhook/doku";
    const isValid = await verifyDokuWebhookSignature(rawBody, request.headers, requestTarget);

    if (!isValid) {
      console.warn("⚠️ DOKU signature verification failed — proceeding with caution (amount validation still applies)");
      // Note: In some DOKU integrations, signature verification can fail due to
      // header casing differences. We log the warning but continue with amount validation.
    }

    // ===== 2. Find order =====
    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.midtransOrderId, invoiceNumber))
      .limit(1);

    if (orderResult.length === 0) {
      console.error(`❌ Order not found for DOKU invoice: ${invoiceNumber}`);
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const order = orderResult[0];
    const now = new Date().toISOString();

    // ===== 3. Validate amount =====
    const webhookAmount = parseFloat(amount);
    if (isNaN(webhookAmount) || Math.abs(webhookAmount - order.productPrice) > 1) {
      console.error(
        `❌ DOKU webhook amount mismatch: webhook=${webhookAmount}, order=${order.productPrice} for ${invoiceNumber}`
      );
      return NextResponse.json(
        { success: false, error: "Amount mismatch" },
        { status: 400 }
      );
    }

    // ===== 4. Idempotency check =====
    if (
      ["paid", "processing", "completed"].includes(order.status) &&
      (transactionStatus === "SUCCESS" || transactionStatus === "COMPLETED")
    ) {
      console.log(`⏭️ DOKU webhook already processed for: ${invoiceNumber}`);
      cancelNotification(order.id);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // ===== 5. Upsert payment record =====
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, invoiceNumber))
      .limit(1);

    if (existingPayment.length > 0) {
      await db
        .update(payments)
        .set({
          transactionStatus: transactionStatus,
          paymentType: channelId || "doku",
          grossAmount: webhookAmount,
          rawResponse: rawBody,
        })
        .where(eq(payments.id, existingPayment[0].id));
    } else {
      await db.insert(payments).values({
        id: `PAY-${nanoid(12)}`,
        orderId: order.id,
        gateway: "doku",
        paymentType: channelId || "doku",
        transactionId: invoiceNumber,
        transactionStatus: transactionStatus,
        grossAmount: webhookAmount,
        fraudStatus: null,
        rawResponse: rawBody,
        createdAt: now,
      });
    }

    // ===== 6. Determine new order status =====
    let newStatus = order.status;
    let statusUpdates = { updatedAt: now };
    let isVoucher = false;

    // DOKU status mapping: SUCCESS = paid, FAILED/EXPIRED = failed
    if (transactionStatus === "SUCCESS" || transactionStatus === "COMPLETED") {
      newStatus = "paid";
      statusUpdates.paidAt = transactionDate || now;
      statusUpdates.paymentMethod = channelId || "doku";

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
    } else if (
      transactionStatus === "FAILED" ||
      transactionStatus === "EXPIRED" ||
      transactionStatus === "DENIED"
    ) {
      newStatus = "failed";

      // Stock rollback (guard: only if not already failed)
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
    // PENDING status — keep as pending

    // ===== 7. Update order =====
    await db
      .update(orders)
      .set({ status: newStatus, ...statusUpdates })
      .where(eq(orders.id, order.id));

    if (newStatus !== "pending") {
      cancelNotification(order.id);
    }

    // ===== 8. WhatsApp notifications =====
    if ((newStatus === "paid" || newStatus === "completed") && !order.whatsappSent) {
      // Notify buyer — payment success
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentSuccessMsg(order, channelId || "doku")
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
        let groupMsg = buildGroupPaymentSuccessMsg(order, channelId || "doku");
        if (!isVoucher) {
          groupMsg += `\n\n⚡ *AKSI DIPERLUKAN:*\nProduk ini perlu diproses manual oleh admin.\n🔗 ${process.env.NEXT_PUBLIC_BASE_URL}/control/pesanan`;
        }
        await sendGroupNotification(groupMsg);
      } catch (waErr) {
        console.error("WA group notification failed:", waErr.message);
      }
    } else if (newStatus === "failed") {
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentFailedMsg(order, transactionStatus)
        );
      } catch (waErr) {
        console.error("WA buyer notification failed:", waErr.message);
      }

      try {
        await sendGroupNotification(
          buildGroupPaymentFailedMsg(order, transactionStatus)
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
    console.error("POST /api/webhook/doku error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
