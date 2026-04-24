import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import db from "@/db/index.js";
import { orders, payments, products } from "@/db/schema.js";
import {
  buildGroupPaymentFailedMsg,
  buildGroupPaymentSuccessMsg,
  buildPaymentFailedMsg,
  buildPaymentSuccessMsg,
  sendGroupNotification,
  sendWhatsAppNotification,
} from "@/lib/whatsapp";
import { cancelNotification } from "@/lib/notification-scheduler";
import { checkPakasirTransaction } from "@/lib/pakasir";
import { ensurePostPaymentFulfillment } from "@/lib/order-fulfillment";
import { isVoucherProduct, releaseVoucher } from "@/lib/voucher";
import { syncReferralCommissionForOrder } from "@/lib/referral-commission";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Pakasir webhook endpoint is active",
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { order_id, amount, status, payment_method, completed_at } = body;

    console.log(`[pakasir webhook] ${order_id} -> ${status}`);

    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.midtransOrderId, order_id))
      .limit(1);

    if (orderResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const order = orderResult[0];
    const now = new Date().toISOString();
    const webhookAmount = Number(amount);

    if (Number.isNaN(webhookAmount) || Math.abs(webhookAmount - order.productPrice) > 1) {
      return NextResponse.json(
        { success: false, error: "Amount mismatch" },
        { status: 400 }
      );
    }

    let verifiedStatus = status;
    if (status === "completed" || status === "paid") {
      try {
        const txDetail = await checkPakasirTransaction(order_id, order.productPrice);
        const apiStatus = txDetail?.status || txDetail?.transaction_status;

        if (apiStatus !== "completed" && apiStatus !== "paid") {
          return NextResponse.json(
            { success: false, error: "Payment verification failed" },
            { status: 403 }
          );
        }

        verifiedStatus = apiStatus;
      } catch (verifyErr) {
        console.warn("[pakasir webhook] API verification skipped:", verifyErr.message);
      }
    }

    if (
      order.status !== "pending" &&
      (verifiedStatus === "completed" || verifiedStatus === "paid")
    ) {
      cancelNotification(order.id);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, order_id))
      .limit(1);

    if (existingPayment.length > 0) {
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
      await db.insert(payments).values({
        id: `PAY-${nanoid(12)}`,
        orderId: order.id,
        gateway: "pakasir",
        paymentType: payment_method || "pakasir",
        transactionId: order_id,
        transactionStatus: verifiedStatus,
        grossAmount: webhookAmount,
        rawResponse: JSON.stringify(body),
        createdAt: now,
      });
    }

    let newStatus = order.status;
    const statusUpdates = { updatedAt: now };
    let isVoucher = false;

    if (verifiedStatus === "completed" || verifiedStatus === "paid") {
      newStatus = "paid";
      statusUpdates.paidAt = completed_at || now;
      statusUpdates.paymentMethod = payment_method || "pakasir";

      try {
        isVoucher = await isVoucherProduct(order.productId);
      } catch {
        isVoucher = false;
      }
    } else if (["expired", "cancelled", "failed"].includes(verifiedStatus)) {
      newStatus = "failed";

      if (order.status !== "failed") {
        try {
          await db
            .update(products)
            .set({ stock: sql`stock + 1` })
            .where(eq(products.id, order.productId));
        } catch (stockErr) {
          console.error("[pakasir webhook] stock rollback failed:", stockErr.message);
        }
      }
    }

    await db
      .update(orders)
      .set({ status: newStatus, ...statusUpdates })
      .where(eq(orders.id, order.id));

    const currentOrder = {
      ...order,
      ...statusUpdates,
      status: newStatus,
    };
    await syncReferralCommissionForOrder(currentOrder);

    if (newStatus !== "pending") {
      cancelNotification(order.id);
    }

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
        currentOrder.whatsappSent = true;
      } catch (waErr) {
        console.error("[pakasir webhook] buyer WA failed:", waErr.message);
      }

      let fulfillmentResult = {
        type: isVoucher ? "voucher" : "manual",
        manualActionRequired: !isVoucher,
        orderStatus: currentOrder.status,
      };

      try {
        fulfillmentResult = await ensurePostPaymentFulfillment(
          currentOrder,
          {
            sendWA: sendWhatsAppNotification,
            sendGroup: sendGroupNotification,
          },
          {
            sendVoucherMessage: true,
            retryFailedAutoRedeem: true,
          }
        );
      } catch (fulfillmentErr) {
        console.error("[pakasir webhook] fulfillment failed:", fulfillmentErr.message);
      }

      try {
        let groupMsg = buildGroupPaymentSuccessMsg(order, payment_method || "pakasir");
        if (fulfillmentResult.type === "digiflazz") {
          const statusLabel =
            fulfillmentResult.orderStatus === "completed"
              ? "Berhasil"
              : fulfillmentResult.orderStatus === "failed"
                ? "Gagal"
                : "Sedang Diproses";
          groupMsg += `\n\nSupplier: Digiflazz\nStatus awal: ${statusLabel}`;
        } else if (fulfillmentResult.manualActionRequired) {
          groupMsg += `\n\nAksi diperlukan:\nProduk ini perlu diproses manual oleh admin.\n${process.env.NEXT_PUBLIC_BASE_URL}/control/pesanan`;
        }

        await sendGroupNotification(groupMsg);
      } catch (waErr) {
        console.error("[pakasir webhook] group WA failed:", waErr.message);
      }
    } else if (newStatus === "failed") {
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentFailedMsg(order, status)
        );
      } catch (waErr) {
        console.error("[pakasir webhook] buyer failure WA failed:", waErr.message);
      }

      try {
        await sendGroupNotification(buildGroupPaymentFailedMsg(order, status));
      } catch (waErr) {
        console.error("[pakasir webhook] group failure WA failed:", waErr.message);
      }

      try {
        await releaseVoucher(order.id);
      } catch (voucherErr) {
        console.error("[pakasir webhook] voucher release failed:", voucherErr.message);
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
