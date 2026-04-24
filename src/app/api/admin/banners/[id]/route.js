import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import db from "@/db/index.js";
import { siteBanners } from "@/db/schema.js";
import { requireAdminSession } from "@/lib/admin-session";
import {
  normalizeBannerRecord,
  validateBannerPayload,
} from "@/lib/site-banners";

const SUPERADMIN_ONLY_MESSAGE =
  "Akses ditolak. Hanya superadmin yang dapat mengelola banner website.";

export async function PUT(request, { params }) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: SUPERADMIN_ONLY_MESSAGE,
  });

  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const [existing] = await db
      .select()
      .from(siteBanners)
      .where(eq(siteBanners.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Slide banner tidak ditemukan" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const mergedPayload = {
      ...normalizeBannerRecord(existing),
      ...body,
    };
    const validation = validateBannerPayload(mergedPayload);

    if (validation.error) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    await db
      .update(siteBanners)
      .set({
        ...validation.data,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(siteBanners.id, id));

    return NextResponse.json({
      success: true,
      message: "Slide banner berhasil diperbarui",
    });
  } catch (error) {
    console.error("PUT /api/admin/banners/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal memperbarui slide banner" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: SUPERADMIN_ONLY_MESSAGE,
  });

  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const [existing] = await db
      .select({ id: siteBanners.id })
      .from(siteBanners)
      .where(eq(siteBanners.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Slide banner tidak ditemukan" },
        { status: 404 }
      );
    }

    await db.delete(siteBanners).where(eq(siteBanners.id, id));

    return NextResponse.json({
      success: true,
      message: "Slide banner berhasil dihapus",
    });
  } catch (error) {
    console.error("DELETE /api/admin/banners/[id] error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal menghapus slide banner" },
      { status: 500 }
    );
  }
}
