// POST /api/orders/[id]/check — Check payment status & sync order
// Supports Midtrans, Pakasir, and DOKU gateways
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { orders, payments, products } from "@/db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { createCoreClient } from "@/lib/midtrans";
import { checkPakasirTransaction } from "@/lib/pakasir";
import { isDigiflazzEnabledProduct } from "@/lib/digiflazz";
import {
  sendWhatsAppNotification,
  sendGroupNotification,
  buildPaymentSuccessMsg,
  buildPaymentFailedMsg,
  buildGroupPaymentSuccessMsg,
  buildGroupPaymentFailedMsg,
} from "@/lib/whatsapp";
import { cancelNotification } from "@/lib/notification-scheduler";
import { isVoucherProduct } from "@/lib/voucher";
import { ensurePostPaymentFulfillment } from "@/lib/order-fulfillment";

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token required" },
        { status: 400 }
      );
    }

    // Find order
    const result = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), eq(orders.guestToken, token)))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    const order = result[0];

    // Only check if order is still pending
    if (order.status !== "pending") {
      cancelNotification(order.id);
      return NextResponse.json({
        success: true,
        data: order,
        message: "Order already updated",
      });
    }

    // Check external order ID
    if (!order.midtransOrderId) {
      return NextResponse.json({
        success: true,
        data: order,
        message: "No external order ID",
      });
    }

    // ===== Route to correct gateway =====
    const gateway = order.paymentGateway || "midtrans";

    try {
      if (gateway === "pakasir") {
        return await checkPakasirStatus(order);
      } else if (gateway === "doku") {
        return await checkDokuStatus(order);
      } else {
        return await checkMidtransStatus(order);
      }
    } catch (gwErr) {
      console.warn(`${gateway} status check failed:`, gwErr.message);
      return NextResponse.json({
        success: true,
        data: order,
        message: `${gateway} check failed, returning cached status`,
      });
    }
  } catch (error) {
    console.error("POST /api/orders/[id]/check error:", error);
    return NextResponse.json(
      { success: false, error: "Check failed" },
      { status: 500 }
    );
  }
}

// ===== Midtrans Status Check =====
async function checkMidtransStatus(order) {
  const core = await createCoreClient();
  const statusResponse = await core.transaction.status(order.midtransOrderId);

  const { transaction_status, payment_type, fraud_status } = statusResponse;
  const now = new Date().toISOString();

  let newStatus = order.status;
  const statusUpdates = { updatedAt: now };

  if (transaction_status === "capture" || transaction_status === "settlement") {
    if (fraud_status === "accept" || !fraud_status) {
      const productResult = await db
        .select()
        .from(products)
        .where(eq(products.id, order.productId))
        .limit(1);
      const product = productResult[0];
      const productType = product?.type || "virtual";
      const voucherProduct = await isVoucherProduct(order.productId);
      const digiflazzProduct = isDigiflazzEnabledProduct(product);

      statusUpdates.paidAt = now;
      statusUpdates.paymentMethod = payment_type;

      if (voucherProduct) {
        newStatus = "paid";
      } else if (digiflazzProduct) {
        newStatus = "paid";
      } else if (productType === "virtual") {
        newStatus = "completed";
        statusUpdates.completedAt = now;
      } else {
        newStatus = "paid";
      }
    }
  } else if (
    transaction_status === "deny" ||
    transaction_status === "cancel" ||
    transaction_status === "expire"
  ) {
    newStatus = "failed";

    // Atomic stock rollback
    if (order.status !== "failed") {
      try {
        await db
          .update(products)
          .set({ stock: sql`stock + 1` })
          .where(eq(products.id, order.productId));
      } catch (stockErr) {
        console.error("Stock rollback failed:", stockErr.message);
      }
    }
  }

  if (newStatus !== order.status) {
    return await applyStatusUpdate(order, newStatus, statusUpdates, {
      gateway: "midtrans",
      paymentType: payment_type,
      transactionId: statusResponse.transaction_id,
      transactionStatus: transaction_status,
      grossAmount: parseFloat(statusResponse.gross_amount),
      fraudStatus: fraud_status,
      rawResponse: statusResponse,
    });
  }

  return NextResponse.json({
    success: true,
    data: order,
    message: "No status change",
  });
}

// ===== Pakasir Status Check =====
async function checkPakasirStatus(order) {
  const txDetail = await checkPakasirTransaction(
    order.midtransOrderId,
    order.productPrice
  );

  const status = txDetail.status;
  const paymentMethod = txDetail.payment_method || "pakasir";
  const now = new Date().toISOString();

  let newStatus = order.status;
  const statusUpdates = { updatedAt: now };

  if (status === "completed" || status === "paid") {
    const productResult = await db
      .select()
      .from(products)
      .where(eq(products.id, order.productId))
      .limit(1);
    const product = productResult[0];
    const productType = product?.type || "virtual";
    const voucherProduct = await isVoucherProduct(order.productId);
    const digiflazzProduct = isDigiflazzEnabledProduct(product);

    statusUpdates.paidAt = txDetail.completed_at || now;
    statusUpdates.paymentMethod = paymentMethod;

    if (voucherProduct) {
      newStatus = "paid";
    } else if (digiflazzProduct) {
      newStatus = "paid";
    } else if (productType === "virtual") {
      newStatus = "completed";
      statusUpdates.completedAt = now;
    } else {
      newStatus = "paid";
    }
  } else if (status === "expired" || status === "cancelled" || status === "failed") {
    newStatus = "failed";

    if (order.status !== "failed") {
      try {
        await db
          .update(products)
          .set({ stock: sql`stock + 1` })
          .where(eq(products.id, order.productId));
      } catch (stockErr) {
        console.error("Stock rollback failed:", stockErr.message);
      }
    }
  }

  if (newStatus !== order.status) {
    return await applyStatusUpdate(order, newStatus, statusUpdates, {
      gateway: "pakasir",
      paymentType: paymentMethod,
      transactionId: order.midtransOrderId,
      transactionStatus: status,
      grossAmount: order.productPrice,
      fraudStatus: null,
      rawResponse: txDetail,
    });
  }

  return NextResponse.json({
    success: true,
    data: order,
    message: "No status change",
  });
}

// ===== DOKU Status Check =====
// DOKU does not support manual status polling via API.
// Status updates are delivered via webhook (/api/webhook/doku).
// When user clicks "Cek Status", we return the current cached order.
async function checkDokuStatus(order) {
  return NextResponse.json({
    success: true,
    data: order,
    message: "DOKU: status akan diperbarui otomatis via notifikasi",
  });
}

// ===== Shared: Apply status update + log payment + send WA =====
async function applyStatusUpdate(order, newStatus, statusUpdates, paymentData) {
  const now = new Date().toISOString();

  // Update order
  await db
    .update(orders)
    .set({ status: newStatus, ...statusUpdates })
    .where(eq(orders.id, order.id));

  // Log payment
  await db.insert(payments).values({
    id: `PAY-${nanoid(12)}`,
    orderId: order.id,
    gateway: paymentData.gateway,
    paymentType: paymentData.paymentType,
    transactionId: paymentData.transactionId,
    transactionStatus: paymentData.transactionStatus,
    grossAmount: paymentData.grossAmount,
    fraudStatus: paymentData.fraudStatus,
    rawResponse: JSON.stringify(paymentData.rawResponse),
    createdAt: now,
  });

  const [updatedOrder] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, order.id))
    .limit(1);

  const currentOrder = updatedOrder || { ...order, status: newStatus, ...statusUpdates };

  if (newStatus !== "pending") {
    cancelNotification(order.id);
  }

  // WhatsApp notifications
  if ((newStatus === "completed" || newStatus === "paid") && !order.whatsappSent) {
    try {
      await sendWhatsAppNotification(
        order.guestPhone,
        buildPaymentSuccessMsg(order, paymentData.paymentType)
      );
      await db
        .update(orders)
        .set({ whatsappSent: true })
        .where(eq(orders.id, order.id));
    } catch (waErr) {
      console.error("WA notification failed:", waErr.message);
    }

    try {
      await sendGroupNotification(
        buildGroupPaymentSuccessMsg(order, paymentData.paymentType)
      );
    } catch (waErr) {
      console.error("WA group notification failed:", waErr.message);
    }

    if (updatedOrder) {
      currentOrder.whatsappSent = true;
    }

    try {
      await ensurePostPaymentFulfillment(
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
    } catch (voucherErr) {
      console.error("Voucher fulfillment failed:", voucherErr.message);
    }
  } else if (newStatus === "failed") {
    try {
      await sendWhatsAppNotification(
        order.guestPhone,
        buildPaymentFailedMsg(order, paymentData.transactionStatus)
      );
    } catch (waErr) {
      console.error("WA notification failed:", waErr.message);
    }

    try {
      await sendGroupNotification(
        buildGroupPaymentFailedMsg(order, paymentData.transactionStatus)
      );
    } catch (waErr) {
      console.error("WA group notification failed:", waErr.message);
    }
  } else if (newStatus === "completed" || newStatus === "paid") {
    try {
      await ensurePostPaymentFulfillment(
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
    } catch (voucherErr) {
      console.error("Voucher fulfillment failed:", voucherErr.message);
    }
  }

  return NextResponse.json({
    success: true,
    data: currentOrder,
    message: `Status updated: ${order.status} → ${newStatus}`,
  });
}
