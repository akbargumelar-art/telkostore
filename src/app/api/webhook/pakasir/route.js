// POST /api/webhook/pakasir — Handle Pakasir payment callback
//
// Pakasir webhook payload (from docs):
// { amount, order_id, project, status, payment_method, completed_at }
//
// PENTING: Docs Pakasir mewajibkan validasi amount dan order_id
// terhadap data transaksi di sistem kita.
//
// SECURITY: Pakasir tidak menyediakan signature key, sehingga kita
// memverifikasi setiap webhook dengan memanggil checkPakasirTransaction()
// untuk cross-check status langsung ke API Pakasir.

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
import { checkPakasirTransaction } from "@/lib/pakasir";
import {
  assignVoucherToOrder,
  releaseVoucher,
  isVoucherProduct,
  getRedeemInstructions,
  detectProviderFromPhone,
  autoRedeemAndComplete,
} from "@/lib/voucher";

// GET — Health check
export async function GET() {
  return NextResponse.json({ success: true, message: "Pakasir webhook endpoint is active" });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      order_id,
      amount,
      status,
      payment_method,
      completed_at,
      project,
    } = body;

    console.log(`📬 Pakasir webhook: ${order_id} → ${status} (${payment_method}, Rp${amount})`);

    // ===== 1. Find order by midtrans_order_id (reused for pakasir order_id) =====
    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.midtransOrderId, order_id))
      .limit(1);

    if (orderResult.length === 0) {
      console.error(`❌ Order not found for pakasir order_id: ${order_id}`);
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const order = orderResult[0];
    const now = new Date().toISOString();

    // ===== 2. Validasi amount — WAJIB per dokumentasi Pakasir =====
    // "Pastikan amount dan order_id sesuai dengan transaksi di sistem Anda"
    const webhookAmount = parseFloat(amount);
    if (isNaN(webhookAmount) || Math.abs(webhookAmount - order.productPrice) > 1) {
      console.error(
        `❌ Pakasir webhook amount mismatch: webhook=${webhookAmount}, order=${order.productPrice} for ${order_id}`
      );
      return NextResponse.json(
        { success: false, error: "Amount mismatch" },
        { status: 400 }
      );
    }

    // ===== 2.5 SECURITY: Verify webhook with Pakasir API =====
    // Pakasir doesn't provide signature keys, so we cross-check the
    // transaction status directly via their API before trusting the webhook.
    let verifiedStatus = status;
    if (status === "completed" || status === "paid") {
      try {
        const txDetail = await checkPakasirTransaction(order_id, order.productPrice);
        const apiStatus = txDetail?.status || txDetail?.transaction_status;
        
        if (apiStatus !== "completed" && apiStatus !== "paid") {
          console.error(
            `❌ Pakasir verification FAILED: webhook says "${status}" but API says "${apiStatus}" for ${order_id}`
          );
          return NextResponse.json(
            { success: false, error: "Payment verification failed" },
            { status: 403 }
          );
        }
        
        // Use the API-verified status
        verifiedStatus = apiStatus;
        console.log(`✅ Pakasir payment verified via API: ${order_id} → ${verifiedStatus}`);
      } catch (verifyErr) {
        // If API check fails (network error, etc.), log but don't block
        // This prevents legitimate webhooks from being dropped due to API downtime
        console.warn(`⚠️ Pakasir API verification failed for ${order_id}: ${verifyErr.message}`);
        console.warn(`⚠️ Proceeding with webhook data (amount already validated)`);
      }
    }

    // ===== 3. Idempotency — skip if already processed =====
    if (["paid", "processing", "completed"].includes(order.status) && (verifiedStatus === "completed" || verifiedStatus === "paid")) {
      console.log(`⏭️ Pakasir webhook already processed for: ${order_id}`);
      cancelNotification(order.id);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    // ===== 4. Upsert payment record =====
    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, order_id))
      .limit(1);

    if (existingPayment.length > 0) {
      // Update existing payment record
      await db
        .update(payments)
        .set({
          transactionStatus: verifiedStatus,
          paymentType: payment_method || "pakasir",
          grossAmount: webhookAmount,
          rawResponse: JSON.stringify(body),
        })
        .where(eq(payments.id, existingPayment[0].id));
    } else {
      // Create new payment record
      await db.insert(payments).values({
        id: `PAY-${nanoid(12)}`,
        orderId: order.id,
        gateway: "pakasir",
        paymentType: payment_method || "pakasir",
        transactionId: order_id,
        transactionStatus: verifiedStatus,
        grossAmount: webhookAmount,
        fraudStatus: null,
        rawResponse: JSON.stringify(body),
        createdAt: now,
      });
    }

    // ===== 5. Determine new order status =====
    let newStatus = order.status;
    let statusUpdates = { updatedAt: now };
    let isVoucher = false;

    if (verifiedStatus === "completed" || verifiedStatus === "paid") {
      newStatus = "paid";
      statusUpdates.paidAt = completed_at || now;
      statusUpdates.paymentMethod = payment_method || "pakasir";

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
    } else if (verifiedStatus === "expired" || verifiedStatus === "cancelled" || verifiedStatus === "failed") {
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

    // ===== 6. Update order =====
    await db
      .update(orders)
      .set({ status: newStatus, ...statusUpdates })
      .where(eq(orders.id, order.id));

    if (newStatus !== "pending") {
      cancelNotification(order.id);
    }

    // ===== 7. WhatsApp notifications =====
    if ((newStatus === "paid" || newStatus === "completed") && !order.whatsappSent) {
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentSuccessMsg(order, payment_method || "pakasir")
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
        let groupMsg = buildGroupPaymentSuccessMsg(order, payment_method || "pakasir");
        if (!isVoucher) {
          groupMsg += `\n\n⚡ *AKSI DIPERLUKAN:*\nProduk ini perlu diproses manual oleh admin.\n🔗 ${process.env.NEXT_PUBLIC_BASE_URL}/admin/pesanan`;
        }
        await sendGroupNotification(groupMsg);
      } catch (waErr) {
        console.error("WA group notification failed:", waErr.message);
      }
    } else if (newStatus === "failed") {
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentFailedMsg(order, status)
        );
      } catch (waErr) {
        console.error("WA buyer notification failed:", waErr.message);
      }

      try {
        await sendGroupNotification(
          buildGroupPaymentFailedMsg(order, status)
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
    console.error("POST /api/webhook/pakasir error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
