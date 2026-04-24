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
import { verifyDokuWebhookSignature } from "@/lib/doku";
import { ensurePostPaymentFulfillment } from "@/lib/order-fulfillment";
import { isVoucherProduct, releaseVoucher } from "@/lib/voucher";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "DOKU webhook endpoint is active",
  });
}

export async function POST(request) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    const invoiceNumber = body?.order?.invoice_number;
    const amount = body?.order?.amount;
    const transactionStatus = body?.transaction?.status;
    const transactionDate = body?.transaction?.date;
    const channelId = body?.channel?.id;

    console.log(`[doku webhook] ${invoiceNumber} -> ${transactionStatus}`);

    const requestTarget = "/api/webhook/doku";
    const isValidSignature = await verifyDokuWebhookSignature(
      rawBody,
      request.headers,
      requestTarget
    );

    if (!isValidSignature) {
      console.warn("[doku webhook] signature verification warning");
    }

    const orderResult = await db
      .select()
      .from(orders)
      .where(eq(orders.midtransOrderId, invoiceNumber))
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

    if (
      order.status !== "pending" &&
      ["SUCCESS", "COMPLETED"].includes(transactionStatus)
    ) {
      cancelNotification(order.id);
      return NextResponse.json({ success: true, message: "Already processed" });
    }

    const existingPayment = await db
      .select()
      .from(payments)
      .where(eq(payments.transactionId, invoiceNumber))
      .limit(1);

    if (existingPayment.length > 0) {
      await db
        .update(payments)
        .set({
          transactionStatus,
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
        transactionStatus,
        grossAmount: webhookAmount,
        rawResponse: rawBody,
        createdAt: now,
      });
    }

    let newStatus = order.status;
    const statusUpdates = { updatedAt: now };
    let isVoucher = false;

    if (transactionStatus === "SUCCESS" || transactionStatus === "COMPLETED") {
      newStatus = "paid";
      statusUpdates.paidAt = transactionDate || now;
      statusUpdates.paymentMethod = channelId || "doku";

      try {
        isVoucher = await isVoucherProduct(order.productId);
      } catch {
        isVoucher = false;
      }
    } else if (["FAILED", "EXPIRED", "DENIED"].includes(transactionStatus)) {
      newStatus = "failed";

      if (order.status !== "failed") {
        try {
          await db
            .update(products)
            .set({ stock: sql`stock + 1` })
            .where(eq(products.id, order.productId));
        } catch (stockErr) {
          console.error("[doku webhook] stock rollback failed:", stockErr.message);
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
          buildPaymentSuccessMsg(order, channelId || "doku")
        );
        await db
          .update(orders)
          .set({ whatsappSent: true })
          .where(eq(orders.id, order.id));
        currentOrder.whatsappSent = true;
      } catch (waErr) {
        console.error("[doku webhook] buyer WA failed:", waErr.message);
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
        console.error("[doku webhook] fulfillment failed:", fulfillmentErr.message);
      }

      try {
        let groupMsg = buildGroupPaymentSuccessMsg(order, channelId || "doku");
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
        console.error("[doku webhook] group WA failed:", waErr.message);
      }
    } else if (newStatus === "failed") {
      try {
        await sendWhatsAppNotification(
          order.guestPhone,
          buildPaymentFailedMsg(order, transactionStatus)
        );
      } catch (waErr) {
        console.error("[doku webhook] buyer failure WA failed:", waErr.message);
      }

      try {
        await sendGroupNotification(
          buildGroupPaymentFailedMsg(order, transactionStatus)
        );
      } catch (waErr) {
        console.error("[doku webhook] group failure WA failed:", waErr.message);
      }

      try {
        await releaseVoucher(order.id);
      } catch (voucherErr) {
        console.error("[doku webhook] voucher release failed:", voucherErr.message);
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
