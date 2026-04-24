import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

import db from "@/db/index.js";
import { downlineProfiles, users } from "@/db/schema.js";
import { requireAdminSession } from "@/lib/admin-session";
import { hashPassword, generateTemporaryPassword } from "@/lib/password";
import {
  buildReferralLinks,
  generateUniqueCanonicalSlug,
} from "@/lib/referral";
import {
  listDownlines,
} from "@/lib/referral-service";
import { normalizeRedirectPath } from "@/lib/referral-config";

function parseMargin(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

export async function GET(request) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: "Hanya superadmin yang dapat mengakses data referral.",
  });
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = String(searchParams.get("search") || "").trim();
    const status = String(searchParams.get("status") || "all").trim();

    const rows = await listDownlines({ search, status });
    const summary = rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc.active += row.isReferralActive ? 1 : 0;
        acc.inactive += row.isReferralActive ? 0 : 1;
        acc.totalOrders += row.stats.totalOrders;
        acc.totalClicks += row.stats.totalClicks;
        acc.pendingCommission += row.stats.pendingCommission;
        acc.approvedCommission += row.stats.approvedCommission;
        acc.paidCommission += row.stats.paidCommission;
        return acc;
      },
      {
        total: 0,
        active: 0,
        inactive: 0,
        totalOrders: 0,
        totalClicks: 0,
        pendingCommission: 0,
        approvedCommission: 0,
        paidCommission: 0,
      }
    );

    return NextResponse.json({
      success: true,
      data: rows,
      summary,
    });
  } catch (error) {
    console.error("GET /api/admin/downline error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data referral." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: "Hanya superadmin yang dapat membuat akun referral.",
  });
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const displayName = String(body.displayName || body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const phone = String(body.phone || "").trim();
    const providedPassword = String(body.password || "").trim();
    const bannerTitle = String(body.bannerTitle || "").trim();
    const bannerSubtitle = String(body.bannerSubtitle || "").trim();
    const bannerImageUrl = String(body.bannerImageUrl || "").trim();
    const themeKey = String(body.themeKey || "sunrise").trim() || "sunrise";
    const promoRedirectPath = normalizeRedirectPath(body.promoRedirectPath);
    const marginPerTransaction = parseMargin(body.marginPerTransaction);
    const isReferralActive = body.isReferralActive !== false;

    if (!displayName) {
      return NextResponse.json(
        { success: false, error: "Nama referral wajib diisi." },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email login referral wajib diisi." },
        { status: 400 }
      );
    }

    if (marginPerTransaction === null) {
      return NextResponse.json(
        { success: false, error: "Margin per transaksi tidak valid." },
        { status: 400 }
      );
    }

    const existingEmail = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { success: false, error: "Email referral sudah dipakai." },
        { status: 409 }
      );
    }

    const generatedPassword =
      providedPassword.length >= 8 ? providedPassword : generateTemporaryPassword(10);
    const userId = `DLN-${nanoid(10)}`;
    const profileId = `DLP-${nanoid(10)}`;
    const slug = await generateUniqueCanonicalSlug(displayName);
    const now = new Date().toISOString();

    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        name: displayName,
        email,
        phone: phone || null,
        role: "downline",
        passwordHash: hashPassword(generatedPassword),
        provider: "manual",
        providerId: null,
        createdAt: now,
      });

      await tx.insert(downlineProfiles).values({
        id: profileId,
        userId,
        slug,
        customReferralAlias: null,
        isCustomReferralActive: false,
        displayName,
        marginPerTransaction,
        isReferralActive,
        bannerTitle:
          bannerTitle || `Promo digital hemat bareng ${displayName}`,
        bannerSubtitle:
          bannerSubtitle ||
          "Pakai link referral ini untuk checkout cepat di Telko.Store.",
        bannerImageUrl: bannerImageUrl || null,
        themeKey,
        promoRedirectPath,
        createdAt: now,
        updatedAt: now,
      });
    });

    const links = buildReferralLinks({
      slug,
      customReferralAlias: null,
      isCustomReferralActive: false,
    });

    return NextResponse.json({
      success: true,
      message: "Akun referral berhasil dibuat.",
      data: {
        userId,
        profileId,
        slug,
        email,
        password: generatedPassword,
        links,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/downline error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal membuat akun referral." },
      { status: 500 }
    );
  }
}
