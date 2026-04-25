import crypto from "crypto";
import { and, asc, inArray, sql } from "drizzle-orm";

import db from "@/db/index.js";
import {
  orders,
  referralLevelRules,
  referralMonthlyLevels,
} from "@/db/schema.js";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";
const REFERRAL_SUCCESS_STATUSES = ["paid", "processing", "completed"];

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBoolean(value, fallback = false) {
  if (value === undefined || value === null) {
    return fallback;
  }

  return value === true || value === 1 || value === "true";
}

function formatJakartaParts(dateInput = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(dateInput));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

export function getJakartaMonthKey(dateInput = new Date()) {
  const { year, month } = formatJakartaParts(dateInput);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function shiftJakartaMonth(monthKey, delta = 0) {
  const [yearPart, monthPart] = String(monthKey || "").split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Format period month tidak valid.");
  }

  const shifted = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function getJakartaMonthRange(monthKey) {
  const [yearPart, monthPart] = String(monthKey || "").split("-");
  const year = Number(yearPart);
  const month = Number(monthPart);

  if (!year || !month || month < 1 || month > 12) {
    throw new Error("Format period month tidak valid.");
  }

  const nextMonthKey = shiftJakartaMonth(monthKey, 1);
  const [nextYearPart, nextMonthPart] = nextMonthKey.split("-");

  return {
    startIso: new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00+07:00`).toISOString(),
    endIso: new Date(
      `${nextYearPart}-${String(nextMonthPart).padStart(2, "0")}-01T00:00:00+07:00`
    ).toISOString(),
  };
}

function normalizeRule(rule) {
  return {
    ...rule,
    minTransactions: normalizeNumber(rule.minTransactions),
    maxTransactions: normalizeNullableNumber(rule.maxTransactions),
    commissionAmount: normalizeNumber(rule.commissionAmount),
    sortOrder: normalizeNumber(rule.sortOrder),
    isActive: normalizeBoolean(rule.isActive, true),
  };
}

function sortRules(rules) {
  return [...rules].sort((left, right) => {
    if (left.sortOrder !== right.sortOrder) {
      return left.sortOrder - right.sortOrder;
    }
    if (left.minTransactions !== right.minTransactions) {
      return left.minTransactions - right.minTransactions;
    }
    return String(left.name || "").localeCompare(String(right.name || ""));
  });
}

export function validateReferralLevelRules(inputRules = []) {
  const normalizedRules = sortRules(
    inputRules.map((rule, index) => {
      const normalized = normalizeRule({
        ...rule,
        sortOrder: rule.sortOrder ?? index + 1,
      });

      if (!String(normalized.name || "").trim()) {
        throw new Error("Nama level referral wajib diisi.");
      }

      if (normalized.minTransactions < 0) {
        throw new Error(`Min transaksi untuk level ${normalized.name} tidak boleh negatif.`);
      }

      if (
        normalized.maxTransactions !== null &&
        normalized.maxTransactions < normalized.minTransactions
      ) {
        throw new Error(`Max transaksi untuk level ${normalized.name} tidak valid.`);
      }

      if (normalized.commissionAmount < 0) {
        throw new Error(`Komisi level ${normalized.name} tidak boleh negatif.`);
      }

      return {
        ...normalized,
        name: String(normalized.name).trim(),
      };
    })
  );

  const activeRules = normalizedRules.filter((rule) => rule.isActive);
  if (activeRules.length === 0) {
    return normalizedRules.map((rule, index) => ({
      ...rule,
      sortOrder: index + 1,
    }));
  }

  let expectedMinTransactions = 0;

  for (let index = 0; index < activeRules.length; index += 1) {
    const rule = activeRules[index];

    if (rule.minTransactions !== expectedMinTransactions) {
      throw new Error(
        `Rule aktif harus berurutan tanpa celah. Level ${rule.name} seharusnya mulai dari ${expectedMinTransactions} transaksi.`
      );
    }

    if (rule.maxTransactions === null) {
      if (index !== activeRules.length - 1) {
        throw new Error("Hanya level aktif terakhir yang boleh memiliki batas maksimum kosong.");
      }
      expectedMinTransactions = null;
      continue;
    }

    expectedMinTransactions = rule.maxTransactions + 1;
  }

  return normalizedRules.map((rule, index) => ({
    ...rule,
    sortOrder: index + 1,
  }));
}

export async function listReferralLevelRules(database = db) {
  const rows = await database
    .select()
    .from(referralLevelRules)
    .orderBy(
      asc(referralLevelRules.sortOrder),
      asc(referralLevelRules.minTransactions),
      asc(referralLevelRules.createdAt)
    );

  return rows.map(normalizeRule);
}

export function selectReferralLevelRule(rules, totalTransactions) {
  const successfulTransactions = normalizeNumber(totalTransactions);
  const orderedRules = sortRules(
    (rules || []).map(normalizeRule).filter((rule) => rule.isActive)
  );

  return (
    orderedRules.find((rule) => {
      const matchesMin = successfulTransactions >= rule.minTransactions;
      const matchesMax =
        rule.maxTransactions === null || successfulTransactions <= rule.maxTransactions;

      return matchesMin && matchesMax;
    }) || null
  );
}

export function getNextReferralLevelRule(rules, totalTransactions) {
  const successfulTransactions = normalizeNumber(totalTransactions);
  const orderedRules = sortRules(
    (rules || []).map(normalizeRule).filter((rule) => rule.isActive)
  );

  return (
    orderedRules.find((rule) => rule.minTransactions > successfulTransactions) || null
  );
}

function getSuccessfulOrderTimeExpression() {
  return sql`COALESCE(
    NULLIF(${orders.paidAt}, ''),
    NULLIF(${orders.completedAt}, ''),
    NULLIF(${orders.updatedAt}, ''),
    ${orders.createdAt}
  )`;
}

async function getSuccessfulTransactionCountMap(
  profileIds,
  periodMonth,
  database = db
) {
  if (!profileIds.length) {
    return new Map();
  }

  const { startIso, endIso } = getJakartaMonthRange(periodMonth);
  const successTime = getSuccessfulOrderTimeExpression();

  const rows = await database
    .select({
      profileId: orders.downlineProfileId,
      totalTransactions: sql`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        inArray(orders.downlineProfileId, profileIds),
        inArray(orders.status, REFERRAL_SUCCESS_STATUSES),
        sql`${successTime} >= ${startIso}`,
        sql`${successTime} < ${endIso}`
      )
    )
    .groupBy(orders.downlineProfileId);

  return new Map(
    rows.map((row) => [row.profileId, normalizeNumber(row.totalTransactions)])
  );
}

function buildMonthlySnapshotId(profileId, periodMonth) {
  const digest = crypto
    .createHash("sha1")
    .update(`${profileId}:${periodMonth}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();

  return `RML-${digest}`;
}

function buildLevelSummary(profile, rules, previousMonthCount, currentMonthCount, periodMonth) {
  const orderedRules = sortRules((rules || []).map(normalizeRule));
  const activeRule = selectReferralLevelRule(orderedRules, previousMonthCount);
  const nextRule = getNextReferralLevelRule(orderedRules, previousMonthCount);
  const legacyMargin = normalizeNumber(profile?.marginPerTransaction);
  const commissionAmount = activeRule
    ? normalizeNumber(activeRule.commissionAmount)
    : legacyMargin;

  return {
    periodMonth,
    basisPeriodMonth: shiftJakartaMonth(periodMonth, -1),
    previousMonthSuccessfulTransactions: normalizeNumber(previousMonthCount),
    currentMonthSuccessfulTransactions: normalizeNumber(currentMonthCount),
    activeLevelRuleId: activeRule?.id || null,
    activeLevelName: activeRule?.name || "Legacy",
    activeCommissionAmount: commissionAmount,
    usesLegacyMargin: !activeRule,
    legacyMarginPerTransaction: legacyMargin,
    nextLevelRuleId: nextRule?.id || null,
    nextLevelName: nextRule?.name || null,
    nextLevelMinTransactions: nextRule?.minTransactions ?? null,
    transactionsToNextLevel: nextRule
      ? Math.max(nextRule.minTransactions - normalizeNumber(previousMonthCount), 0)
      : 0,
  };
}

async function upsertReferralMonthlyLevel(profile, summary, database = db) {
  if (!profile?.profileId || !summary?.periodMonth) {
    return;
  }

  const now = new Date().toISOString();
  const snapshotId = buildMonthlySnapshotId(profile.profileId, summary.periodMonth);

  await database.execute(sql`
    INSERT INTO referral_monthly_levels (
      id,
      downline_profile_id,
      period_month,
      basis_period_month,
      total_transactions,
      current_month_transactions,
      applied_level_rule_id,
      applied_level_name,
      applied_commission_amount,
      uses_legacy_margin,
      created_at,
      updated_at
    )
    VALUES (
      ${snapshotId},
      ${profile.profileId},
      ${summary.periodMonth},
      ${summary.basisPeriodMonth},
      ${summary.previousMonthSuccessfulTransactions},
      ${summary.currentMonthSuccessfulTransactions},
      ${summary.activeLevelRuleId},
      ${summary.activeLevelName},
      ${summary.activeCommissionAmount},
      ${summary.usesLegacyMargin ? 1 : 0},
      ${now},
      ${now}
    )
    ON DUPLICATE KEY UPDATE
      basis_period_month = VALUES(basis_period_month),
      total_transactions = VALUES(total_transactions),
      current_month_transactions = VALUES(current_month_transactions),
      applied_level_rule_id = VALUES(applied_level_rule_id),
      applied_level_name = VALUES(applied_level_name),
      applied_commission_amount = VALUES(applied_commission_amount),
      uses_legacy_margin = VALUES(uses_legacy_margin),
      updated_at = VALUES(updated_at)
  `);
}

export async function getReferralLevelSummaryMap(
  profiles,
  options = {},
  database = db
) {
  const profileRows = (Array.isArray(profiles) ? profiles : [profiles]).filter(
    (profile) => profile?.profileId
  );

  if (!profileRows.length) {
    return new Map();
  }

  const periodMonth = options.periodMonth || getJakartaMonthKey();
  const previousPeriodMonth = shiftJakartaMonth(periodMonth, -1);
  const rules = options.rules || (await listReferralLevelRules(database));
  const profileIds = profileRows.map((profile) => profile.profileId);

  const [previousCounts, currentCounts] = await Promise.all([
    getSuccessfulTransactionCountMap(profileIds, previousPeriodMonth, database),
    getSuccessfulTransactionCountMap(profileIds, periodMonth, database),
  ]);

  const summaryMap = new Map();

  for (const profile of profileRows) {
    const summary = buildLevelSummary(
      profile,
      rules,
      previousCounts.get(profile.profileId) || 0,
      currentCounts.get(profile.profileId) || 0,
      periodMonth
    );

    summaryMap.set(profile.profileId, summary);
  }

  if (options.persist) {
    for (const profile of profileRows) {
      await upsertReferralMonthlyLevel(
        profile,
        summaryMap.get(profile.profileId),
        database
      );
    }
  }

  return summaryMap;
}

export async function resolveActiveReferralLevelForProfile(
  profile,
  database = db,
  options = {}
) {
  if (!profile?.profileId) {
    return null;
  }

  const summaryMap = await getReferralLevelSummaryMap(
    [profile],
    {
      ...options,
      persist: options.persist ?? true,
    },
    database
  );

  return summaryMap.get(profile.profileId) || null;
}

export async function resolveReferralCommissionSnapshot(
  profile,
  database = db,
  options = {}
) {
  const levelSummary = await resolveActiveReferralLevelForProfile(
    profile,
    database,
    options
  );

  return {
    levelSummary,
    commissionAmount: normalizeNumber(
      levelSummary?.activeCommissionAmount,
      normalizeNumber(profile?.marginPerTransaction)
    ),
  };
}

export function getReferralSuccessStatuses() {
  return [...REFERRAL_SUCCESS_STATUSES];
}
