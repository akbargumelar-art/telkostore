import {
  and,
  count,
  desc,
  eq,
  inArray,
  like,
  or,
  sql,
} from "drizzle-orm";

import db from "@/db/index.js";
import {
  downlineProfiles,
  orders,
  referralClicks,
  referralCommissions,
  users,
} from "@/db/schema.js";
import { buildReferralShareVariants } from "@/lib/referral";

function normalizeNumber(value) {
  return Number(value || 0);
}

export function maskPhoneNumber(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length < 7) {
    return value || "-";
  }

  return `${digits.slice(0, 4)}****${digits.slice(-3)}`;
}

export function maskTargetValue(value) {
  const raw = String(value || "");
  if (!raw) {
    return "-";
  }

  if (/^\d{7,}$/.test(raw.replace(/\D/g, ""))) {
    return maskPhoneNumber(raw);
  }

  if (raw.length <= 6) {
    return `${raw.slice(0, 1)}***${raw.slice(-1)}`;
  }

  return `${raw.slice(0, 3)}***${raw.slice(-2)}`;
}

function enrichProfile(profile, summary = {}) {
  const share = buildReferralShareVariants(profile);

  return {
    ...profile,
    links: share.links,
    promoTheme: share.theme,
    promoDefaults: {
      headline: share.defaultHeadline,
      subtitle: share.defaultSubtitle,
      redirectUrl: share.redirectUrl,
      preferredUrl: share.preferredUrl,
    },
    stats: {
      totalOrders: normalizeNumber(summary.totalOrders),
      totalRevenue: normalizeNumber(summary.totalRevenue),
      totalClicks: normalizeNumber(summary.totalClicks),
      pendingOrders: normalizeNumber(summary.pendingOrders),
      completedOrders: normalizeNumber(summary.completedOrders),
      pendingCommission: normalizeNumber(summary.pendingCommission),
      approvedCommission: normalizeNumber(summary.approvedCommission),
      processingCommission: normalizeNumber(summary.processingCommission),
      paidCommission: normalizeNumber(summary.paidCommission),
    },
  };
}

async function getProfileSummaryMap(profileIds, database = db) {
  if (!profileIds.length) {
    return new Map();
  }

  const orderRows = await database
    .select({
      profileId: orders.downlineProfileId,
      totalOrders: count(),
      totalRevenue: sql`COALESCE(SUM(${orders.productPrice}), 0)`,
      pendingOrders: sql`COALESCE(SUM(CASE WHEN ${orders.status} = 'pending' THEN 1 ELSE 0 END), 0)`,
      completedOrders: sql`COALESCE(SUM(CASE WHEN ${orders.status} = 'completed' THEN 1 ELSE 0 END), 0)`,
    })
    .from(orders)
    .where(inArray(orders.downlineProfileId, profileIds))
    .groupBy(orders.downlineProfileId);

  const commissionRows = await database
    .select({
      profileId: referralCommissions.downlineProfileId,
      pendingCommission: sql`COALESCE(SUM(CASE WHEN ${referralCommissions.status} = 'pending' THEN ${referralCommissions.commissionAmount} ELSE 0 END), 0)`,
      approvedCommission: sql`COALESCE(SUM(CASE WHEN ${referralCommissions.status} = 'approved' THEN ${referralCommissions.commissionAmount} ELSE 0 END), 0)`,
      processingCommission: sql`COALESCE(SUM(CASE WHEN ${referralCommissions.status} = 'processing' THEN ${referralCommissions.commissionAmount} ELSE 0 END), 0)`,
      paidCommission: sql`COALESCE(SUM(CASE WHEN ${referralCommissions.status} = 'paid' THEN ${referralCommissions.commissionAmount} ELSE 0 END), 0)`,
    })
    .from(referralCommissions)
    .where(inArray(referralCommissions.downlineProfileId, profileIds))
    .groupBy(referralCommissions.downlineProfileId);

  const clickRows = await database
    .select({
      profileId: referralClicks.downlineProfileId,
      totalClicks: count(),
    })
    .from(referralClicks)
    .where(inArray(referralClicks.downlineProfileId, profileIds))
    .groupBy(referralClicks.downlineProfileId);

  const summaryMap = new Map();

  for (const row of orderRows) {
    summaryMap.set(row.profileId, {
      ...(summaryMap.get(row.profileId) || {}),
      totalOrders: row.totalOrders,
      totalRevenue: row.totalRevenue,
      pendingOrders: row.pendingOrders,
      completedOrders: row.completedOrders,
    });
  }

  for (const row of commissionRows) {
    summaryMap.set(row.profileId, {
      ...(summaryMap.get(row.profileId) || {}),
      pendingCommission: row.pendingCommission,
      approvedCommission: row.approvedCommission,
      processingCommission: row.processingCommission,
      paidCommission: row.paidCommission,
    });
  }

  for (const row of clickRows) {
    summaryMap.set(row.profileId, {
      ...(summaryMap.get(row.profileId) || {}),
      totalClicks: row.totalClicks,
    });
  }

  return summaryMap;
}

function buildProfileConditions({ search = "", status = "all" } = {}) {
  const conditions = [eq(users.role, "downline")];

  if (search) {
    conditions.push(
      or(
        like(downlineProfiles.displayName, `%${search}%`),
        like(users.email, `%${search}%`),
        like(downlineProfiles.slug, `%${search}%`),
        like(downlineProfiles.customReferralAlias, `%${search}%`)
      )
    );
  }

  if (status === "active") {
    conditions.push(eq(downlineProfiles.isReferralActive, true));
  } else if (status === "inactive") {
    conditions.push(eq(downlineProfiles.isReferralActive, false));
  }

  return conditions;
}

const profileSelect = {
  profileId: downlineProfiles.id,
  userId: downlineProfiles.userId,
  slug: downlineProfiles.slug,
  customReferralAlias: downlineProfiles.customReferralAlias,
  isCustomReferralActive: downlineProfiles.isCustomReferralActive,
  displayName: downlineProfiles.displayName,
  marginPerTransaction: downlineProfiles.marginPerTransaction,
  isReferralActive: downlineProfiles.isReferralActive,
  bannerTitle: downlineProfiles.bannerTitle,
  bannerSubtitle: downlineProfiles.bannerSubtitle,
  bannerImageUrl: downlineProfiles.bannerImageUrl,
  themeKey: downlineProfiles.themeKey,
  promoRedirectPath: downlineProfiles.promoRedirectPath,
  createdAt: downlineProfiles.createdAt,
  updatedAt: downlineProfiles.updatedAt,
  name: users.name,
  email: users.email,
  phone: users.phone,
  role: users.role,
};

export async function listDownlines(filters = {}, database = db) {
  const conditions = buildProfileConditions(filters);
  const rows = await database
    .select(profileSelect)
    .from(downlineProfiles)
    .innerJoin(users, eq(downlineProfiles.userId, users.id))
    .where(and(...conditions))
    .orderBy(desc(downlineProfiles.createdAt));

  const summaryMap = await getProfileSummaryMap(
    rows.map((row) => row.profileId),
    database
  );

  return rows.map((row) => enrichProfile(row, summaryMap.get(row.profileId)));
}

export async function getDownlineByProfileId(profileId, database = db) {
  if (!profileId) {
    return null;
  }

  const [profile] = await database
    .select(profileSelect)
    .from(downlineProfiles)
    .innerJoin(users, eq(downlineProfiles.userId, users.id))
    .where(and(eq(downlineProfiles.id, profileId), eq(users.role, "downline")))
    .limit(1);

  if (!profile) {
    return null;
  }

  const summaryMap = await getProfileSummaryMap([profileId], database);
  return enrichProfile(profile, summaryMap.get(profileId));
}

export async function getDownlineOrders(profileId, filters = {}, database = db) {
  if (!profileId) {
    return [];
  }

  const { status = "all", search = "", limit = 50 } = filters;
  const conditions = [eq(orders.downlineProfileId, profileId)];

  if (status !== "all") {
    conditions.push(eq(orders.status, status));
  }

  if (search) {
    conditions.push(
      or(
        like(orders.id, `%${search}%`),
        like(orders.productName, `%${search}%`),
        like(orders.guestPhone, `%${search}%`)
      )
    );
  }

  const rows = await database
    .select({
      id: orders.id,
      productId: orders.productId,
      productName: orders.productName,
      productPrice: orders.productPrice,
      guestPhone: orders.guestPhone,
      targetData: orders.targetData,
      status: orders.status,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      completedAt: orders.completedAt,
      downlineMarginSnapshot: orders.downlineMarginSnapshot,
      referralSource: orders.referralSource,
      downlineSlug: orders.downlineSlug,
      downlineCustomAlias: orders.downlineCustomAlias,
    })
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    ...row,
    guestPhoneMasked: maskPhoneNumber(row.guestPhone),
    targetDataMasked: maskTargetValue(row.targetData),
  }));
}

export async function getDownlineCommissions(
  profileId,
  filters = {},
  database = db
) {
  if (!profileId) {
    return [];
  }

  const { status = "all", limit = 50 } = filters;
  const conditions = [eq(referralCommissions.downlineProfileId, profileId)];

  if (status !== "all") {
    conditions.push(eq(referralCommissions.status, status));
  }

  const rows = await database
    .select({
      id: referralCommissions.id,
      orderId: referralCommissions.orderId,
      commissionAmount: referralCommissions.commissionAmount,
      status: referralCommissions.status,
      statusReason: referralCommissions.statusReason,
      trackedAt: referralCommissions.trackedAt,
      approvedAt: referralCommissions.approvedAt,
      paidAt: referralCommissions.paidAt,
      createdAt: referralCommissions.createdAt,
      productName: orders.productName,
      productPrice: orders.productPrice,
      createdOrderAt: orders.createdAt,
    })
    .from(referralCommissions)
    .innerJoin(orders, eq(referralCommissions.orderId, orders.id))
    .where(and(...conditions))
    .orderBy(desc(referralCommissions.createdAt))
    .limit(limit);

  return rows;
}

export async function getDownlineClicks(profileId, limit = 30, database = db) {
  if (!profileId) {
    return [];
  }

  return database
    .select({
      id: referralClicks.id,
      slug: referralClicks.slug,
      customAlias: referralClicks.customAlias,
      landingPath: referralClicks.landingPath,
      createdAt: referralClicks.createdAt,
    })
    .from(referralClicks)
    .where(eq(referralClicks.downlineProfileId, profileId))
    .orderBy(desc(referralClicks.createdAt))
    .limit(limit);
}

export async function getDownlineDetail(profileId, database = db) {
  const profile = await getDownlineByProfileId(profileId, database);
  if (!profile) {
    return null;
  }

  const [recentOrders, commissions, recentClicks] = await Promise.all([
    getDownlineOrders(profileId, { limit: 20 }, database),
    getDownlineCommissions(profileId, { limit: 20 }, database),
    getDownlineClicks(profileId, 20, database),
  ]);

  return {
    profile,
    recentOrders,
    commissions,
    recentClicks,
  };
}

export async function getApprovedReferralPayoutQueue(database = db) {
  const rows = await database
    .select({
      id: referralCommissions.id,
      orderId: referralCommissions.orderId,
      commissionAmount: referralCommissions.commissionAmount,
      trackedAt: referralCommissions.trackedAt,
      approvedAt: referralCommissions.approvedAt,
      displayName: referralCommissions.downlineDisplayNameSnapshot,
      slug: referralCommissions.downlineSlugSnapshot,
      customAlias: referralCommissions.downlineCustomAliasSnapshot,
      productName: orders.productName,
      productPrice: orders.productPrice,
    })
    .from(referralCommissions)
    .innerJoin(orders, eq(referralCommissions.orderId, orders.id))
    .where(eq(referralCommissions.status, "approved"))
    .orderBy(desc(referralCommissions.approvedAt), desc(referralCommissions.createdAt));

  return rows;
}
