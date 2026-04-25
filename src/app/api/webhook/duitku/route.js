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
import { verifyDuitkuCallbackSignature } from "@/lib/duitku";
import { ensurePostPaymentFulfillment } from "@/lib/order-fulfillment";
import { isVoucherProduct, releaseVoucher } from "@/lib/voucher";
import { syncReferralCommissionForOrder } from "@/lib/referral-commission";

function resolveDuitkuOrderStatus(resultCode) {
  if (resultCode === "00") return "paid";
  if (resultCode === "01") return "failed";
  return "pending";
}

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Duitku webhook endpoint is active",
  });
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const params = new URLSearchParams(rawBody);

    const merchantCode = params.get("merchantCode");
    const amount = params.get("amount");
    const merchantOrderId = params.get("merchantOrderId");
    const paymentCode = params.get("paymentCode");
    const resultCode = params.get("resultCode");
    const reference = params.get("reference");
    const signature = params.get("signature");
    const publisherOrderId = params.get("publisherOrderId");
    const settlementDate = params.get("settlementDate");
    const transactionState = params.get("transactionState");
    const transactionStateStatus = params.get("transactionStateStatus");

    console.log(`[duitku webhook] ${merchantOrderId} -> ${resultCode}`);

    const isValidSignature = await verifyDuitkuCallbackSignature({
      merchantCode,
      amount,
      merchantOrderId,
      signature,
    });

    if (!isValidSignature) {
      return NextResponse.json(
        { success: false, error: "Invalid callback signature" },
        { status: 401 }
      );
    }

    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.midtransOrderId, merchantOrderId))
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

    if (order.status !== "pending" && resultCode === "00") {
      cancelNotification(order.id);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    const paymentTransactionId = reference || publisherOrderId || merchantOrderId;
    const existingPayment = paymentTransactionId
      ? await db
          .select()
          .from(payments)
          .where(eq(payments.transactionId, paymentTransactionId))
          .limit(1)
      : [];

    const paymentLogData = {
      gateway: "duitku",
      transactionId: paymentTransactionId,
      transactionStatus: resultCode || transactionStateStatus || "pending",
      paymentType: paymentCode || "duitku",
      grossAmount: webhookAmount,
      fraudStatus: transactionState || null,
      rawResponse: rawBody,
    };

    if (existingPayment.length > 0) {
      await db
        .update(payments)
        .set(paymentLogData)
        .where(eq(payments.id, existingPayment[0].id));
    } else {
      await db.insert(payments).values({
        id: `PAY-${nanoid(12)}`,
        orderId: order.id,
        gateway: "duitku",
        paymentType: paymentCode || "duitku",
        transactionId: paymentTransactionId,
        transactionStatus: resultCode || transactionStateStatus || "pending",
        grossAmount: webhookAmount,
        fraudStatus: transactionState || null,
        rawResponse: rawBody,
        createdAt: now,
      });
    }

    let newStatus = order.status;
    const statusUpdates = { updatedAt: now };
    let isVoucher = false;

    const duitkuStatus = resolveDuitkuOrderStatus(resultCode);
    if (duitkuStatus === "paid") {
      newStatus = "paid";
      statusUpdates.paidAt = settlementDate || now;
      statusUpdates.paymentMethod = paymentCode || "duitku";

      try {
        isVoucher = await isVoucherProduct(order.productId);
      } catch {
        isVoucher = false;
      }
    } else if (duitkuStatus === "failed") {
      newStatus = "failed";

      if (order.status !== "failed") {
        try {
          await db
            .update(products)
            .set({ stock: sql`stock + 1` })
            .where(eq(products.id, order.productId));
        } catch (stockErr) {
          console.error("[duitku webhook] stock rollback failed:", stockErr.message);
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
          buildPaymentSuccessMsg(order, paymentCode || "duitku")
        );
        await db
          .update(orders)
          .set({ whatsappSent: true })
          .where(eq(orders.id, order.id));
        currentOrder.whatsappSent = true;
      } catch (waErr) {
        console.error("[duitku webhook] buyer WA failed:", waErr.message);
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
        console.error("[duitku webhook] fulfillment failed:", fulfillmentErr.message);
      }

      try {
        let groupMsg = buildGroupPaymentSuccessMsg(order, paymentCode || "duitku");
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
        console.error("[duitku webhook] group WA failed:", waErr.message);
      }
    } else if (newStatus === "failed") {
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentFailedMsg(order, resultCode || "01")
        );
      } catch (waErr) {
        console.error("[duitku webhook] buyer failure WA failed:", waErr.message);
      }

      try {
        await sendGroupNotification(
          buildGroupPaymentFailedMsg(order, resultCode || "01")
        );
      } catch (waErr) {
        console.error("[duitku webhook] group failure WA failed:", waErr.message);
      }

      try {
        await releaseVoucher(order.id);
      } catch (voucherErr) {
        console.error("[duitku webhook] voucher release failed:", voucherErr.message);
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("POST /api/webhook/duitku error:", error);
    return NextResponse.json(
      { success: false, error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
