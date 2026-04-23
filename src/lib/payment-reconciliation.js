import { asc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import db from "@/db/index.js";
import { orders, payments, products } from "@/db/schema.js";
import { createCoreClient } from "@/lib/midtrans";
import { checkPakasirTransaction } from "@/lib/pakasir";
import { cancelNotification } from "@/lib/notification-scheduler";
import {
  sendWhatsAppNotification,
  sendGroupNotification,
  buildPaymentFailedMsg,
  buildGroupPaymentFailedMsg,
} from "@/lib/whatsapp";
import { releaseVoucher } from "@/lib/voucher";

const POLLABLE_GATEWAYS = new Set(["midtrans", "pakasir"]);
const MIDTRANS_FAILURE_STATUSES = new Set(["deny", "cancel", "expire", "failure"]);
const PAKASIR_FAILURE_STATUSES = new Set(["expired", "cancelled", "failed"]);

const DEFAULT_MIN_ORDER_AGE_MS = 30_000;
const DEFAULT_MIN_RECHECK_MS = 20_000;
const reconcileAttemptCache = new Map();

function getNumericEnv(name, fallback) {
  const raw = process.env[name];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function getGatewayName(order) {
  return order?.paymentGateway || "midtrans";
}

export function isGatewayPollingSupported(gateway) {
  return POLLABLE_GATEWAYS.has(gateway || "midtrans");
}

export function shouldAttemptPaymentReconciliation(order) {
  return Boolean(order?.id && order?.status === "pending" && order?.midtransOrderId);
}

function isOrderFresh(order, minOrderAgeMs) {
  if (!order?.createdAt) return false;
  const createdAt = Date.parse(order.createdAt);
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt < minOrderAgeMs;
}

function isRecheckThrottled(orderId, minRecheckMs) {
  const lastAttempt = reconcileAttemptCache.get(orderId) || 0;
  const now = Date.now();

  if (now - lastAttempt < minRecheckMs) {
    return true;
  }

  reconcileAttemptCache.set(orderId, now);

  if (reconcileAttemptCache.size > 500) {
    const cutoff = now - Math.max(minRecheckMs * 3, 60_000);
    for (const [cachedOrderId, cachedAt] of reconcileAttemptCache.entries()) {
      if (cachedAt < cutoff) {
        reconcileAttemptCache.delete(cachedOrderId);
      }
    }
  }

  return false;
}

async function getOrderById(orderId) {
  const result = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  return result[0] || null;
}

async function upsertPaymentLog(order, paymentData) {
  const now = new Date().toISOString();
  const transactionId = paymentData.transactionId || order.midtransOrderId || order.id;

  const existingPayment = await db
    .select()
    .from(payments)
    .where(eq(payments.transactionId, transactionId))
    .limit(1);

  if (existingPayment.length > 0) {
    await db
      .update(payments)
      .set({
        gateway: paymentData.gateway,
        paymentType: paymentData.paymentType,
        transactionStatus: paymentData.transactionStatus,
        grossAmount: paymentData.grossAmount,
        fraudStatus: paymentData.fraudStatus || null,
        rawResponse: JSON.stringify(paymentData.rawResponse),
      })
      .where(eq(payments.id, existingPayment[0].id));

    return existingPayment[0].id;
  }

  const paymentId = `PAY-${nanoid(12)}`;
  await db.insert(payments).values({
    id: paymentId,
    orderId: order.id,
    gateway: paymentData.gateway,
    paymentType: paymentData.paymentType,
    transactionId,
    transactionStatus: paymentData.transactionStatus,
    grossAmount: paymentData.grossAmount,
    fraudStatus: paymentData.fraudStatus || null,
    rawResponse: JSON.stringify(paymentData.rawResponse),
    createdAt: now,
  });

  return paymentId;
}

async function markOrderAsFailed(order, paymentData, options = {}) {
  if (order.status === "failed") {
    return {
      changed: false,
      order,
      gateway: paymentData.gateway,
      externalStatus: paymentData.transactionStatus,
      skippedReason: "already_failed",
    };
  }

  const now = new Date().toISOString();

  try {
    await db
      .update(products)
      .set({ stock: sql`stock + 1` })
      .where(eq(products.id, order.productId));
  } catch (stockErr) {
    console.error(`[payment-sync] stock rollback failed for ${order.id}:`, stockErr.message);
  }

  await db
    .update(orders)
    .set({
      status: "failed",
      updatedAt: now,
    })
    .where(eq(orders.id, order.id));

  await upsertPaymentLog(order, paymentData);
  cancelNotification(order.id);

  if (!options.skipNotifications) {
    try {
      await sendWhatsAppNotification(
        order.guestPhone,
        buildPaymentFailedMsg(order, paymentData.transactionStatus)
      );
    } catch (waErr) {
      console.error(`[payment-sync] WA buyer notification failed for ${order.id}:`, waErr.message);
    }

    try {
      await sendGroupNotification(
        buildGroupPaymentFailedMsg(order, paymentData.transactionStatus)
      );
    } catch (waErr) {
      console.error(`[payment-sync] WA group notification failed for ${order.id}:`, waErr.message);
    }
  }

  try {
    await releaseVoucher(order.id);
  } catch (voucherErr) {
    console.error(`[payment-sync] voucher release failed for ${order.id}:`, voucherErr.message);
  }

  const updatedOrder = await getOrderById(order.id);

  return {
    changed: true,
    order: updatedOrder || { ...order, status: "failed", updatedAt: now },
    gateway: paymentData.gateway,
    externalStatus: paymentData.transactionStatus,
    action: "marked_failed",
  };
}

async function reconcileMidtransOrder(order, options) {
  const core = await createCoreClient();
  const statusResponse = await core.transaction.status(order.midtransOrderId);
  const transactionStatus = statusResponse?.transaction_status;

  if (!MIDTRANS_FAILURE_STATUSES.has(transactionStatus)) {
    return {
      changed: false,
      order,
      gateway: "midtrans",
      externalStatus: transactionStatus || null,
      skippedReason: "no_failure_status",
    };
  }

  return markOrderAsFailed(
    order,
    {
      gateway: "midtrans",
      paymentType: statusResponse?.payment_type || order.paymentMethod || "midtrans",
      transactionId: statusResponse?.transaction_id || order.midtransOrderId,
      transactionStatus,
      grossAmount: Number.parseFloat(statusResponse?.gross_amount || order.productPrice || 0),
      fraudStatus: statusResponse?.fraud_status || null,
      rawResponse: statusResponse,
    },
    options
  );
}

async function reconcilePakasirOrder(order, options) {
  const txDetail = await checkPakasirTransaction(order.midtransOrderId, order.productPrice);
  const transactionStatus = txDetail?.status;

  if (!PAKASIR_FAILURE_STATUSES.has(transactionStatus)) {
    return {
      changed: false,
      order,
      gateway: "pakasir",
      externalStatus: transactionStatus || null,
      skippedReason: "no_failure_status",
    };
  }

  return markOrderAsFailed(
    order,
    {
      gateway: "pakasir",
      paymentType: txDetail?.payment_method || order.paymentMethod || "pakasir",
      transactionId: order.midtransOrderId,
      transactionStatus,
      grossAmount: Number.parseFloat(order.productPrice || 0),
      fraudStatus: null,
      rawResponse: txDetail,
    },
    options
  );
}

export async function reconcileOrderPaymentStatus(order, options = {}) {
  if (!shouldAttemptPaymentReconciliation(order)) {
    return {
      changed: false,
      order,
      gateway: getGatewayName(order),
      skippedReason: "not_pending",
    };
  }

  const gateway = getGatewayName(order);

  if (!isGatewayPollingSupported(gateway)) {
    return {
      changed: false,
      order,
      gateway,
      skippedReason: "gateway_webhook_only",
    };
  }

  const minOrderAgeMs =
    options.minOrderAgeMs ??
    getNumericEnv("PAYMENT_RECONCILE_MIN_ORDER_AGE_MS", DEFAULT_MIN_ORDER_AGE_MS);
  const minRecheckMs =
    options.minRecheckMs ??
    getNumericEnv("PAYMENT_RECONCILE_MIN_RECHECK_MS", DEFAULT_MIN_RECHECK_MS);

  if (!options.ignoreFreshOrder && isOrderFresh(order, minOrderAgeMs)) {
    return {
      changed: false,
      order,
      gateway,
      skippedReason: "order_too_fresh",
    };
  }

  if (!options.ignoreThrottle && isRecheckThrottled(order.id, minRecheckMs)) {
    return {
      changed: false,
      order,
      gateway,
      skippedReason: "throttled",
    };
  }

  try {
    if (gateway === "pakasir") {
      return await reconcilePakasirOrder(order, options);
    }

    return await reconcileMidtransOrder(order, options);
  } catch (error) {
    console.warn(
      `[payment-sync] ${gateway} reconcile failed for ${order.id}: ${error.message}`
    );

    return {
      changed: false,
      order,
      gateway,
      skippedReason: "gateway_check_failed",
      error,
    };
  }
}

export async function reconcileVisiblePendingOrders(orderList, options = {}) {
  if (!Array.isArray(orderList) || orderList.length === 0) {
    return orderList || [];
  }

  const maxOrders = Math.max(0, Number(options.limit ?? 5));
  if (maxOrders === 0) {
    return orderList;
  }

  const updatedOrders = new Map();
  let processed = 0;

  for (const order of orderList) {
    if (processed >= maxOrders) break;
    if (!shouldAttemptPaymentReconciliation(order)) continue;

    processed += 1;
    const result = await reconcileOrderPaymentStatus(order, options);
    if (result?.order) {
      updatedOrders.set(order.id, result.order);
    }
  }

  return orderList.map((order) => updatedOrders.get(order.id) || order);
}

export async function reconcilePendingOrdersBatch(options = {}) {
  const limit = Math.min(Math.max(Number(options.limit ?? 25), 1), 100);
  const pendingOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.status, "pending"))
    .orderBy(asc(orders.createdAt))
    .limit(limit);

  const summary = {
    checked: 0,
    changed: 0,
    unchanged: 0,
    unsupported: 0,
    throttled: 0,
    tooFresh: 0,
    errors: 0,
    changedOrders: [],
  };

  for (const order of pendingOrders) {
    if (!order.midtransOrderId) {
      summary.unchanged += 1;
      continue;
    }

    const result = await reconcileOrderPaymentStatus(order, {
      ...options,
      ignoreThrottle: options.ignoreThrottle ?? true,
    });

    summary.checked += 1;

    if (result.changed) {
      summary.changed += 1;
      summary.changedOrders.push({
        id: order.id,
        gateway: result.gateway,
        externalStatus: result.externalStatus,
      });
      continue;
    }

    if (result.skippedReason === "gateway_webhook_only") {
      summary.unsupported += 1;
    } else if (result.skippedReason === "throttled") {
      summary.throttled += 1;
    } else if (result.skippedReason === "order_too_fresh") {
      summary.tooFresh += 1;
    } else if (result.error) {
      summary.errors += 1;
    } else {
      summary.unchanged += 1;
    }
  }

  return summary;
}
