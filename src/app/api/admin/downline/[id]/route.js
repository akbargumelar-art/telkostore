import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/db/index.js";
import { downlineProfiles, users } from "@/db/schema.js";
import { requireAdminSession } from "@/lib/admin-session";
import {
  ensureUniqueCustomAlias,
  generateUniqueCanonicalSlug,
} from "@/lib/referral";
import { getDownlineDetail } from "@/lib/referral-service";
import {
  isValidReferralSlugFormat,
  normalizeRedirectPath,
} from "@/lib/referral-config";

function parseMargin(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export async function GET(_request, { params }) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: "Hanya superadmin yang dapat mengakses detail referral.",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const detail = await getDownlineDetail(id);

    if (!detail) {
      return NextResponse.json(
        { success: false, error: "Referral tidak ditemukan." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error) {
    console.error("GET /api/admin/downline/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil detail referral." },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: "Hanya superadmin yang dapat mengubah akun referral.",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();

    const [existing] = await db
      .select({
        profileId: downlineProfiles.id,
        userId: downlineProfiles.userId,
        slug: downlineProfiles.slug,
        customReferralAlias: downlineProfiles.customReferralAlias,
        userEmail: users.email,
      })
      .from(downlineProfiles)
      .innerJoin(users, eq(downlineProfiles.userId, users.id))
      .where(and(eq(downlineProfiles.id, id), eq(users.role, "downline")))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Referral tidak ditemukan." },
        { status: 404 }
      );
    }

    const displayName = body.displayName !== undefined
      ? String(body.displayName || "").trim()
      : undefined;
    const email = body.email !== undefined
      ? String(body.email || "").trim().toLowerCase()
      : undefined;
    const phone = body.phone !== undefined
      ? String(body.phone || "").trim()
      : undefined;
    const marginPerTransaction = body.marginPerTransaction !== undefined
      ? parseMargin(body.marginPerTransaction)
      : undefined;
    const isReferralActive = body.isReferralActive !== undefined
      ? Boolean(body.isReferralActive)
      : undefined;
    const bannerTitle = body.bannerTitle !== undefined
      ? String(body.bannerTitle || "").trim()
      : undefined;
    const bannerSubtitle = body.bannerSubtitle !== undefined
      ? String(body.bannerSubtitle || "").trim()
      : undefined;
    const bannerImageUrl = body.bannerImageUrl !== undefined
      ? String(body.bannerImageUrl || "").trim()
      : undefined;
    const themeKey = body.themeKey !== undefined
      ? String(body.themeKey || "").trim()
      : undefined;
    const promoRedirectPath = body.promoRedirectPath !== undefined
      ? normalizeRedirectPath(body.promoRedirectPath)
      : undefined;
    const slugInput = body.slug !== undefined
      ? String(body.slug || "").trim().toLowerCase()
      : undefined;
    const customAliasInput = body.customReferralAlias !== undefined
      ? String(body.customReferralAlias || "").trim().toLowerCase()
      : undefined;

    if (marginPerTransaction === null) {
      return NextResponse.json(
        { success: false, error: "Komisi fallback legacy tidak valid." },
        { status: 400 }
      );
    }

    if (email) {
      const emailRows = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, existing.userId)))
        .limit(1);

      if (emailRows.length > 0) {
        return NextResponse.json(
          { success: false, error: "Email sudah dipakai akun lain." },
          { status: 409 }
        );
      }
    }

    let nextSlug = existing.slug;
    if (slugInput !== undefined) {
      if (!slugInput) {
        nextSlug = await generateUniqueCanonicalSlug(
          displayName || existing.slug,
          db,
          existing.profileId
        );
      } else if (!isValidReferralSlugFormat(slugInput)) {
        return NextResponse.json(
          { success: false, error: "Format slug referral tidak valid." },
          { status: 400 }
        );
      } else {
        nextSlug = await generateUniqueCanonicalSlug(slugInput, db, existing.profileId);
      }
    }

    let nextAlias = existing.customReferralAlias || null;
    let isCustomReferralActive = Boolean(existing.customReferralAlias);
    if (customAliasInput !== undefined) {
      if (!customAliasInput) {
        nextAlias = null;
        isCustomReferralActive = false;
      } else {
        nextAlias = await ensureUniqueCustomAlias(
          customAliasInput,
          db,
          existing.profileId
        );
        isCustomReferralActive = true;
      }
    }

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      const userUpdate = {};
      if (displayName !== undefined) userUpdate.name = displayName;
      if (email !== undefined) userUpdate.email = email;
      if (phone !== undefined) userUpdate.phone = phone || null;

      if (Object.keys(userUpdate).length > 0) {
        await tx.update(users).set(userUpdate).where(eq(users.id, existing.userId));
      }

      const profileUpdate = {
        updatedAt: now,
      };
      if (displayName !== undefined) profileUpdate.displayName = displayName;
      if (marginPerTransaction !== undefined) {
        profileUpdate.marginPerTransaction = marginPerTransaction;
      }
      if (isReferralActive !== undefined) profileUpdate.isReferralActive = isReferralActive;
      if (bannerTitle !== undefined) profileUpdate.bannerTitle = bannerTitle || null;
      if (bannerSubtitle !== undefined) profileUpdate.bannerSubtitle = bannerSubtitle || null;
      if (bannerImageUrl !== undefined) profileUpdate.bannerImageUrl = bannerImageUrl || null;
      if (themeKey !== undefined) profileUpdate.themeKey = themeKey || "sunrise";
      if (promoRedirectPath !== undefined) profileUpdate.promoRedirectPath = promoRedirectPath;
      if (slugInput !== undefined) profileUpdate.slug = nextSlug;
      if (customAliasInput !== undefined) {
        profileUpdate.customReferralAlias = nextAlias;
        profileUpdate.isCustomReferralActive = isCustomReferralActive;
      }

      await tx
        .update(downlineProfiles)
        .set(profileUpdate)
        .where(eq(downlineProfiles.id, existing.profileId));
    });

    const detail = await getDownlineDetail(existing.profileId);

    return NextResponse.json({
      success: true,
      message: "Profil referral berhasil diperbarui.",
      data: detail,
    });
  } catch (error) {
    console.error("PUT /api/admin/downline/[id] error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memperbarui referral." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: "Hanya superadmin yang dapat menghapus akun referral.",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    
    // First find the userId associated with this profile
    const [existing] = await db
      .select({ userId: downlineProfiles.userId })
      .from(downlineProfiles)
      .where(eq(downlineProfiles.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Referral tidak ditemukan." },
        { status: 404 }
      );
    }

    await db.transaction(async (tx) => {
      // 1. Delete the profile
      await tx.delete(downlineProfiles).where(eq(downlineProfiles.id, id));
      // 2. Delete the associated user account
      await tx.delete(users).where(eq(users.id, existing.userId));
    });

    return NextResponse.json({
      success: true,
      message: "Akun referral berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE /api/admin/downline/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus referral." },
      { status: 500 }
    );
  }
}
