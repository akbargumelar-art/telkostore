import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/db/index.js";
import { downlineProfiles, users } from "@/db/schema.js";
import { requireDownlineSession } from "@/lib/downline-auth";
import { ensureUniqueCustomAlias } from "@/lib/referral";
import { getDownlineByProfileId } from "@/lib/referral-service";
import { normalizeRedirectPath } from "@/lib/referral-config";

export async function GET() {
  const auth = await requireDownlineSession();
  if (!auth.ok) return auth.response;

  try {
    const profile = await getDownlineByProfileId(auth.profile.profileId);
    return NextResponse.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    console.error("GET /api/mitra/profile error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil profil mitra." },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  const auth = await requireDownlineSession();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const email = body.email !== undefined
      ? String(body.email || "").trim().toLowerCase()
      : undefined;
    const phone = body.phone !== undefined
      ? String(body.phone || "").trim()
      : undefined;
    const displayName = body.displayName !== undefined
      ? String(body.displayName || "").trim()
      : undefined;
    const customAliasInput = body.customReferralAlias !== undefined
      ? String(body.customReferralAlias || "").trim().toLowerCase()
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
    const promoRedirectPath = body.promoRedirectPath !== undefined
      ? normalizeRedirectPath(body.promoRedirectPath)
      : undefined;
    const themeKey = body.themeKey !== undefined
      ? String(body.themeKey || "").trim()
      : undefined;
    const bankName = body.bankName !== undefined
      ? String(body.bankName || "").trim()
      : undefined;
    const bankAccountNumber = body.bankAccountNumber !== undefined
      ? String(body.bankAccountNumber || "").trim()
      : undefined;
    const bankAccountName = body.bankAccountName !== undefined
      ? String(body.bankAccountName || "").trim()
      : undefined;

    if (email) {
      const existingEmail = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, auth.profile.userId)))
        .limit(1);

      if (existingEmail.length > 0) {
        return NextResponse.json(
          { success: false, error: "Email sudah dipakai akun lain." },
          { status: 409 }
        );
      }
    }

    let customAlias = auth.profile.customReferralAlias || null;
    let isCustomReferralActive = Boolean(auth.profile.customReferralAlias);

    if (customAliasInput !== undefined) {
      if (!customAliasInput) {
        customAlias = null;
        isCustomReferralActive = false;
      } else {
        customAlias = await ensureUniqueCustomAlias(
          customAliasInput,
          db,
          auth.profile.profileId
        );
        isCustomReferralActive = true;
      }
    }

    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      const userUpdate = {};
      if (email !== undefined) userUpdate.email = email;
      if (phone !== undefined) userUpdate.phone = phone || null;
      if (displayName !== undefined) userUpdate.name = displayName;

      if (Object.keys(userUpdate).length > 0) {
        await tx.update(users).set(userUpdate).where(eq(users.id, auth.profile.userId));
      }

      const profileUpdate = { updatedAt: now };
      if (displayName !== undefined) profileUpdate.displayName = displayName;
      if (bannerTitle !== undefined) profileUpdate.bannerTitle = bannerTitle || null;
      if (bannerSubtitle !== undefined) profileUpdate.bannerSubtitle = bannerSubtitle || null;
      if (bannerImageUrl !== undefined) profileUpdate.bannerImageUrl = bannerImageUrl || null;
      if (promoRedirectPath !== undefined) profileUpdate.promoRedirectPath = promoRedirectPath;
      if (themeKey !== undefined) profileUpdate.themeKey = themeKey || "sunrise";
      if (customAliasInput !== undefined) {
        profileUpdate.customReferralAlias = customAlias;
        profileUpdate.isCustomReferralActive = isCustomReferralActive;
      }
      if (bankName !== undefined) profileUpdate.bankName = bankName || null;
      if (bankAccountNumber !== undefined) profileUpdate.bankAccountNumber = bankAccountNumber || null;
      if (bankAccountName !== undefined) profileUpdate.bankAccountName = bankAccountName || null;

      await tx
        .update(downlineProfiles)
        .set(profileUpdate)
        .where(eq(downlineProfiles.id, auth.profile.profileId));
    });

    const profile = await getDownlineByProfileId(auth.profile.profileId);

    return NextResponse.json({
      success: true,
      message: "Profil mitra berhasil diperbarui.",
      data: profile,
    });
  } catch (error) {
    console.error("PUT /api/mitra/profile error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal memperbarui profil mitra." },
      { status: 500 }
    );
  }
}
