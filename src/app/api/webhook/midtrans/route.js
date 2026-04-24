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
import { verifySignature } from "@/lib/midtrans";
import { cancelNotification } from "@/lib/notification-scheduler";
import { ensurePostPaymentFulfillment } from "@/lib/order-fulfillment";
import { isVoucherProduct, releaseVoucher } from "@/lib/voucher";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Midtrans webhook endpoint is active",
  });
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

    console.log(`[midtrans webhook] ${order_id} -> ${transaction_status}`);

    let existingPaymentRecord = null;
    if (transaction_id) {
      const existingPayment = await db
        .select()
        .from(payments)
        .where(eq(payments.transactionId, transaction_id))
        .limit(1);

      existingPaymentRecord = existingPayment[0] || null;
    }

    if (!(await verifySignature(order_id, status_code, gross_amount, signature_key))) {
      return NextResponse.json(
        { success: false, error: "Invalid signature" },
        { status: 403 }
      );
    }

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

    if (
      existingPaymentRecord &&
      ["settlement", "capture"].includes(existingPaymentRecord.transactionStatus) &&
      order.status !== "pending"
    ) {
      cancelNotification(order.id);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    if (existingPaymentRecord) {
      await db
        .update(payments)
        .set({
          transactionStatus: transaction_status,
          paymentType: payment_type,
          grossAmount: Number(gross_amount),
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
        grossAmount: Number(gross_amount),
        fraudStatus: fraud_status,
        rawResponse: JSON.stringify(body),
        createdAt: now,
      });
    }

    let newStatus = order.status;
    const statusUpdates = { updatedAt: now };
    let isVoucher = false;

    if (transaction_status === "capture" || transaction_status === "settlement") {
      if (fraud_status === "accept" || !fraud_status) {
        newStatus = "paid";
        statusUpdates.paidAt = now;
        statusUpdates.paymentMethod = payment_type;

        try {
          isVoucher = await isVoucherProduct(order.productId);
        } catch {
          isVoucher = false;
        }
      }
    } else if (transaction_status === "pending") {
      newStatus = "pending";
    } else if (["deny", "cancel", "expire"].includes(transaction_status)) {
      newStatus = "failed";

      if (order.status !== "failed") {
        try {
          await db
            .update(products)
            .set({ stock: sql`stock + 1` })
            .where(eq(products.id, order.productId));
        } catch (stockErr) {
          console.error("[midtrans webhook] stock rollback failed:", stockErr.message);
        }
      }
    }

    await db
      .update(orders)
      .set({ status: newStatus, ...statusUpdates })
      .where(eq(orders.id, order.id));

    if (newStatus !== "pending") {
      cancelNotification(order.id);
    }

    if ((newStatus === "paid" || newStatus === "completed") && !order.whatsappSent) {
      const currentOrder = {
        ...order,
        ...statusUpdates,
        status: newStatus,
      };

      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentSuccessMsg(order, payment_type)
        );
        await db
          .update(orders)
          .set({ whatsappSent: true })
          .where(eq(orders.id, order.id));
        currentOrder.whatsappSent = true;
      } catch (waErr) {
        console.error("[midtrans webhook] buyer WA failed:", waErr.message);
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
        console.error("[midtrans webhook] fulfillment failed:", fulfillmentErr.message);
      }

      try {
        let groupMsg = buildGroupPaymentSuccessMsg(order, payment_type);
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
        console.error("[midtrans webhook] group WA failed:", waErr.message);
      }
    } else if (newStatus === "failed") {
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentFailedMsg(order, transaction_status)
        );
      } catch (waErr) {
        console.error("[midtrans webhook] buyer failure WA failed:", waErr.message);
      }

      try {
        await sendGroupNotification(
          buildGroupPaymentFailedMsg(order, transaction_status)
        );
      } catch (waErr) {
        console.error("[midtrans webhook] group failure WA failed:", waErr.message);
      }

      try {
        await releaseVoucher(order.id);
      } catch (voucherErr) {
        console.error("[midtrans webhook] voucher release failed:", voucherErr.message);
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
