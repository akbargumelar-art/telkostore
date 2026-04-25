import crypto from "crypto";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import db from "@/db/index.js";
import {
  downlineProfiles,
  referralClicks,
  users,
} from "@/db/schema.js";
import {
  buildCanonicalReferralPath,
  buildCustomReferralPath,
  getReferralTheme,
  isReservedReferralSegment,
  isValidReferralAliasFormat,
  isValidReferralSlugFormat,
  normalizeRedirectPath,
  slugifyReferralSegment,
} from "@/lib/referral-config";
import { resolveReferralCommissionSnapshot } from "@/lib/referral-levels";

export const REFERRAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 30;
export const REFERRAL_COOKIE_KEYS = [
  "ref_slug",
  "ref_alias",
  "ref_profile_id",
  "ref_downline_user_id",
  "ref_source",
  "ref_set_at",
];

const referralSelect = {
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

function getSecureCookieFlag() {
  return process.env.NODE_ENV === "production";
}

function getBaseUrl() {
  return String(process.env.NEXT_PUBLIC_BASE_URL || "").replace(/\/+$/, "");
}

export function buildReferralLinks(profile, baseUrl = getBaseUrl()) {
  const canonicalPath = buildCanonicalReferralPath(profile.slug);
  const customPath =
    profile.customReferralAlias && profile.isCustomReferralActive
      ? buildCustomReferralPath(profile.customReferralAlias)
      : null;

  return {
    canonicalPath,
    customPath,
    canonicalUrl: baseUrl ? `${baseUrl}${canonicalPath}` : canonicalPath,
    customUrl: customPath && baseUrl ? `${baseUrl}${customPath}` : customPath,
  };
}

export function buildReferralShareVariants(profile) {
  const theme = getReferralTheme(profile.themeKey);
  const links = buildReferralLinks(profile);
  const preferredUrl = links.customUrl || links.canonicalUrl;
  const redirectUrl =
    profile.promoRedirectPath && profile.promoRedirectPath !== "/"
      ? `${preferredUrl}?to=${encodeURIComponent(profile.promoRedirectPath)}`
      : preferredUrl;

  return {
    theme,
    links,
    preferredUrl,
    redirectUrl,
    defaultHeadline:
      profile.bannerTitle ||
      `Paket data & voucher hemat bareng ${profile.displayName || "Mitra Telko.Store"}`,
    defaultSubtitle:
      profile.bannerSubtitle ||
      "Klik link ini untuk checkout cepat, aman, dan langsung terhubung ke katalog Telko.Store.",
  };
}

function mapReferralRow(row, source = "slug") {
  if (!row) return null;

  return {
    ...row,
    source,
    links: buildReferralLinks(row),
  };
}

async function isSlugTaken(slug, database = db, excludeProfileId = null) {
  let query = database
    .select({ id: downlineProfiles.id })
    .from(downlineProfiles)
    .where(eq(downlineProfiles.slug, slug))
    .limit(1);

  const rows = await query;
  return rows.some((row) => row.id !== excludeProfileId);
}

async function isAliasTaken(alias, database = db, excludeProfileId = null) {
  let query = database
    .select({ id: downlineProfiles.id })
    .from(downlineProfiles)
    .where(eq(downlineProfiles.customReferralAlias, alias))
    .limit(1);

  const rows = await query;
  return rows.some((row) => row.id !== excludeProfileId);
}

export async function generateUniqueCanonicalSlug(
  input,
  database = db,
  excludeProfileId = null
) {
  const normalizedInput = slugifyReferralSegment(input) || "mitra";
  const baseSegment = normalizedInput.startsWith("dl-")
    ? normalizedInput.slice(3)
    : normalizedInput;
  const root = `dl-${(baseSegment || "mitra").slice(0, 40)}`;

  let attempt = root;
  let counter = 1;

  while (
    !isValidReferralSlugFormat(attempt) ||
    isReservedReferralSegment(attempt) ||
    (await isSlugTaken(attempt, database, excludeProfileId))
  ) {
    counter += 1;
    attempt = `${root.slice(0, 50)}-${counter}`;
  }

  return attempt;
}

export async function ensureUniqueCustomAlias(
  input,
  database = db,
  excludeProfileId = null
) {
  const alias = slugifyReferralSegment(input);

  if (!alias) {
    return "";
  }

  if (!isValidReferralAliasFormat(alias)) {
    throw new Error("Format custom link hanya boleh huruf kecil, angka, dan dash.");
  }

  if (isReservedReferralSegment(alias)) {
    throw new Error("Custom link bentrok dengan route website yang sudah dipakai.");
  }

  if (await isAliasTaken(alias, database, excludeProfileId)) {
    throw new Error("Custom link sudah dipakai mitra lain.");
  }

  return alias;
}

export async function getDownlineProfileByUserId(userId, database = db) {
  const rows = await database
    .select(referralSelect)
    .from(downlineProfiles)
    .innerJoin(users, eq(downlineProfiles.userId, users.id))
    .where(and(eq(downlineProfiles.userId, userId), eq(users.role, "downline")))
    .limit(1);

  return mapReferralRow(rows[0] || null, "slug");
}

export async function resolveReferralBySlug(slug, database = db) {
  if (!isValidReferralSlugFormat(slug)) {
    return null;
  }

  const rows = await database
    .select(referralSelect)
    .from(downlineProfiles)
    .innerJoin(users, eq(downlineProfiles.userId, users.id))
    .where(
      and(
        eq(downlineProfiles.slug, slug),
        eq(downlineProfiles.isReferralActive, true),
        eq(users.role, "downline")
      )
    )
    .limit(1);

  return mapReferralRow(rows[0] || null, "slug");
}

export async function resolveReferralByAlias(alias, database = db) {
  if (!isValidReferralAliasFormat(alias) || isReservedReferralSegment(alias)) {
    return null;
  }

  const rows = await database
    .select(referralSelect)
    .from(downlineProfiles)
    .innerJoin(users, eq(downlineProfiles.userId, users.id))
    .where(
      and(
        eq(downlineProfiles.customReferralAlias, alias),
        eq(downlineProfiles.isCustomReferralActive, true),
        eq(downlineProfiles.isReferralActive, true),
        eq(users.role, "downline")
      )
    )
    .limit(1);

  return mapReferralRow(rows[0] || null, "custom_alias");
}

export async function resolveReferralByProfileId(profileId, database = db) {
  if (!profileId) return null;

  const rows = await database
    .select(referralSelect)
    .from(downlineProfiles)
    .innerJoin(users, eq(downlineProfiles.userId, users.id))
    .where(
      and(
        eq(downlineProfiles.id, profileId),
        eq(downlineProfiles.isReferralActive, true),
        eq(users.role, "downline")
      )
    )
    .limit(1);

  return mapReferralRow(rows[0] || null, "slug");
}

function getCookieAccessor(source) {
  if (!source) return null;
  if (typeof source.get === "function") return source;
  if (source.cookies && typeof source.cookies.get === "function") {
    return source.cookies;
  }
  return null;
}

export function getReferralCookieValues(source) {
  const accessor = getCookieAccessor(source);
  if (!accessor) {
    return {
      slug: "",
      alias: "",
      profileId: "",
      downlineUserId: "",
      source: "",
      setAt: "",
    };
  }

  return {
    slug: accessor.get("ref_slug")?.value || "",
    alias: accessor.get("ref_alias")?.value || "",
    profileId: accessor.get("ref_profile_id")?.value || "",
    downlineUserId: accessor.get("ref_downline_user_id")?.value || "",
    source: accessor.get("ref_source")?.value || "",
    setAt: accessor.get("ref_set_at")?.value || "",
  };
}

export async function getReferralCookieValuesFromHeaders() {
  const cookieStore = await cookies();
  return getReferralCookieValues(cookieStore);
}

export async function resolveReferralFromRequest(source, database = db) {
  const cookieValues = getReferralCookieValues(source);

  if (cookieValues.profileId) {
    const byProfileId = await resolveReferralByProfileId(cookieValues.profileId, database);
    if (byProfileId) {
      return {
        ...byProfileId,
        source: cookieValues.source || byProfileId.source,
        cookieValues,
      };
    }
  }

  if (cookieValues.alias) {
    const byAlias = await resolveReferralByAlias(cookieValues.alias, database);
    if (byAlias) {
      return {
        ...byAlias,
        source: "custom_alias",
        cookieValues,
      };
    }
  }

  if (cookieValues.slug) {
    const bySlug = await resolveReferralBySlug(cookieValues.slug, database);
    if (bySlug) {
      return {
        ...bySlug,
        source: "slug",
        cookieValues,
      };
    }
  }

  return null;
}

export function applyReferralCookies(response, profile, source = "slug") {
  const now = new Date().toISOString();
  const cookieOptions = {
    httpOnly: true,
    secure: getSecureCookieFlag(),
    sameSite: "lax",
    path: "/",
    maxAge: REFERRAL_COOKIE_MAX_AGE,
  };

  response.cookies.set("ref_slug", profile.slug, cookieOptions);
  response.cookies.set("ref_profile_id", profile.profileId, cookieOptions);
  response.cookies.set("ref_downline_user_id", profile.userId, cookieOptions);
  response.cookies.set("ref_source", source, cookieOptions);
  response.cookies.set("ref_set_at", now, cookieOptions);
  response.cookies.set(
    "ref_alias",
    source === "custom_alias" ? profile.customReferralAlias || "" : "",
    cookieOptions
  );
}

export function clearReferralCookies(response) {
  for (const key of REFERRAL_COOKIE_KEYS) {
    response.cookies.set(key, "", {
      httpOnly: true,
      secure: getSecureCookieFlag(),
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
  }
}

export async function buildOrderReferralSnapshot(profile, source = "slug", database = db) {
  if (!profile) {
    return {};
  }

  const { commissionAmount } = await resolveReferralCommissionSnapshot(
    profile,
    database,
    { persist: true }
  );

  return {
    downlineUserId: profile.userId,
    downlineProfileId: profile.profileId,
    downlineSlug: profile.slug,
    downlineCustomAlias: profile.customReferralAlias || null,
    downlineDisplayName: profile.displayName || profile.name || null,
    downlineMarginSnapshot: Number(commissionAmount || 0),
    referralSource: source,
    referralAttributedAt: new Date().toISOString(),
  };
}

export function resolveReferralRedirectTarget(requestUrl, profile) {
  const url = requestUrl instanceof URL ? requestUrl : new URL(requestUrl);
  const queryTarget = normalizeRedirectPath(url.searchParams.get("to"));
  const profileTarget = normalizeRedirectPath(profile?.promoRedirectPath);

  return queryTarget || profileTarget || "/";
}

function inferClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function hashIp(value) {
  return crypto.createHash("sha256").update(String(value || "unknown")).digest("hex");
}

export async function recordReferralClick(
  profile,
  request,
  source,
  landingPath,
  database = db
) {
  if (!profile?.profileId) {
    return;
  }

  try {
    await database.insert(referralClicks).values({
      id: `RCLK-${nanoid(12)}`,
      downlineProfileId: profile.profileId,
      slug: profile.slug,
      customAlias:
        source === "custom_alias" ? profile.customReferralAlias || null : null,
      ipHash: hashIp(inferClientIp(request)),
      userAgent: request.headers.get("user-agent") || null,
      landingPath: landingPath || "/",
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to store referral click:", error.message);
  }
}
