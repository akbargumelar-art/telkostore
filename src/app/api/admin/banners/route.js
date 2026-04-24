import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { nanoid } from "nanoid";
import db from "@/db/index.js";
import { siteBanners } from "@/db/schema.js";
import { requireAdminSession } from "@/lib/admin-session";
import {
  normalizeBannerRecord,
  validateBannerPayload,
} from "@/lib/site-banners";

const SUPERADMIN_ONLY_MESSAGE =
  "Akses ditolak. Hanya superadmin yang dapat mengelola banner website.";

export async function GET() {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: SUPERADMIN_ONLY_MESSAGE,
  });

  if (!auth.ok) return auth.response;

  try {
    const rows = await db
      .select()
      .from(siteBanners)
      .orderBy(asc(siteBanners.sortOrder), asc(siteBanners.createdAt));

    return NextResponse.json({
      success: true,
      data: rows.map(normalizeBannerRecord),
    });
  } catch (error) {
    console.error("GET /api/admin/banners error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengambil data banner" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: SUPERADMIN_ONLY_MESSAGE,
  });

  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const validation = validateBannerPayload(body);

    if (validation.error) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const id = `banner-${nanoid(10)}`;

    await db.insert(siteBanners).values({
      id,
      ...validation.data,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      data: { id },
      message: "Slide banner berhasil ditambahkan",
    });
  } catch (error) {
    console.error("POST /api/admin/banners error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menambah slide banner" },
      { status: 500 }
    );
  }
}
