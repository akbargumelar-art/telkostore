import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/db/index.js";
import { downlineProfiles, users } from "@/db/schema.js";
import { requireAdminSession } from "@/lib/admin-session";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";

export async function POST(request, { params }) {
  const auth = await requireAdminSession({
    allowedAdminTypes: ["superadmin"],
    forbiddenMessage: "Hanya superadmin yang dapat reset password referral.",
  });
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const providedPassword = String(body.password || "").trim();
    const nextPassword =
      providedPassword.length >= 8 ? providedPassword : generateTemporaryPassword(10);

    const [existing] = await db
      .select({ userId: downlineProfiles.userId })
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

    await db
      .update(users)
      .set({ passwordHash: hashPassword(nextPassword) })
      .where(eq(users.id, existing.userId));

    return NextResponse.json({
      success: true,
      message: "Password referral berhasil direset.",
      data: {
        password: nextPassword,
      },
    });
  } catch (error) {
    console.error("POST /api/admin/downline/[id]/reset-password error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal reset password referral." },
      { status: 500 }
    );
  }
}
