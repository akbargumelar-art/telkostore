import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import db from "@/db/index.js";
import { orders, referralCommissions } from "@/db/schema.js";

const COMMISSION_VOID_ORDER_STATUSES = new Set([
  "failed",
  "cancel",
  "cancelled",
  "expired",
]);

export function mapOrderStatusToCommissionStatus(orderStatus, currentStatus = "") {
  if (!orderStatus) {
    return currentStatus || null;
  }

  if (orderStatus === "completed") {
    return currentStatus === "paid" ? "paid" : "approved";
  }

  if (orderStatus === "paid" || orderStatus === "processing") {
    if (currentStatus === "approved" || currentStatus === "paid") {
      return currentStatus;
    }
    return currentStatus === "paid" ? "paid" : "pending";
  }

  if (COMMISSION_VOID_ORDER_STATUSES.has(orderStatus)) {
    return currentStatus === "paid" ? "paid" : "void";
  }

  return currentStatus || null;
}

async function getOrderSnapshot(orderOrId, database = db) {
  if (orderOrId && typeof orderOrId === "object" && orderOrId.id) {
    return orderOrId;
  }

  if (!orderOrId) {
    return null;
  }

  const [order] = await database
    .select()
    .from(orders)
    .where(eq(orders.id, orderOrId))
    .limit(1);

  return order || null;
}

export async function syncReferralCommissionForOrder(orderOrId, database = db) {
  const order = await getOrderSnapshot(orderOrId, database);

  if (!order?.id || !order.downlineProfileId) {
    return null;
  }

  const commissionAmount = Number(order.downlineMarginSnapshot || 0);
  if (commissionAmount < 0) {
    return null;
  }

  const [existing] = await database
    .select()
    .from(referralCommissions)
    .where(eq(referralCommissions.orderId, order.id))
    .limit(1);

  const nextStatus = mapOrderStatusToCommissionStatus(order.status, existing?.status || "");
  if (!nextStatus) {
    return existing || null;
  }

  const now = new Date().toISOString();

  if (!existing) {
    if (nextStatus === "void") {
      return null;
    }

    const payload = {
      id: `RFC-${nanoid(12)}`,
      orderId: order.id,
      downlineUserId: order.downlineUserId,
      downlineProfileId: order.downlineProfileId,
      downlineSlugSnapshot: order.downlineSlug,
      downlineCustomAliasSnapshot: order.downlineCustomAlias || null,
      downlineDisplayNameSnapshot: order.downlineDisplayName || null,
      commissionAmount,
      status: nextStatus,
      statusReason: `Sinkron dari status order: ${order.status}`,
      trackedAt: now,
      approvedAt: nextStatus === "approved" ? now : null,
      paidAt: nextStatus === "paid" ? now : null,
      createdAt: now,
      updatedAt: now,
    };

    await database.insert(referralCommissions).values(payload);
    return payload;
  }

  const updateData = {
    commissionAmount,
    status: nextStatus,
    statusReason: `Sinkron dari status order: ${order.status}`,
    updatedAt: now,
  };

  if (!existing.trackedAt) {
    updateData.trackedAt = now;
  }
  if (nextStatus === "approved" && !existing.approvedAt) {
    updateData.approvedAt = now;
  }
  if (nextStatus === "paid" && !existing.paidAt) {
    updateData.paidAt = now;
  }
  if (nextStatus === "void" && existing.status !== "paid") {
    updateData.approvedAt = existing.approvedAt || null;
  }

  await database
    .update(referralCommissions)
    .set(updateData)
    .where(eq(referralCommissions.id, existing.id));

  return { ...existing, ...updateData };
}

export async function markReferralCommissionPaid(commissionId, database = db) {
  const [existing] = await database
    .select()
    .from(referralCommissions)
    .where(eq(referralCommissions.id, commissionId))
    .limit(1);

  if (!existing) {
    throw new Error("Komisi referral tidak ditemukan.");
  }

  if (existing.status !== "approved" && existing.status !== "paid") {
    throw new Error("Hanya komisi approved yang bisa ditandai paid.");
  }

  const now = new Date().toISOString();
  await database
    .update(referralCommissions)
    .set({
      status: "paid",
      paidAt: existing.paidAt || now,
      updatedAt: now,
      statusReason: "Ditandai paid oleh superadmin",
    })
    .where(eq(referralCommissions.id, commissionId));

  return {
    ...existing,
    status: "paid",
    paidAt: existing.paidAt || now,
    updatedAt: now,
  };
}
