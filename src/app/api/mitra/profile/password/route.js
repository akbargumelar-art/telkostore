import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/db/index.js";
import { users } from "@/db/schema.js";
import { requireDownlineSession } from "@/lib/downline-auth";
import { hashPassword, verifyPassword } from "@/lib/password";

export async function POST(request) {
  const auth = await requireDownlineSession();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const currentPassword = String(body.currentPassword || "").trim();
    const nextPassword = String(body.newPassword || "").trim();

    if (!currentPassword || !nextPassword) {
      return NextResponse.json(
        { success: false, error: "Password lama dan baru wajib diisi." },
        { status: 400 }
      );
    }

    if (nextPassword.length < 8) {
      return NextResponse.json(
        { success: false, error: "Password baru minimal 8 karakter." },
        { status: 400 }
      );
    }

    const [user] = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, auth.profile.userId))
      .limit(1);

    if (!user?.passwordHash || !verifyPassword(currentPassword, user.passwordHash)) {
      return NextResponse.json(
        { success: false, error: "Password lama tidak cocok." },
        { status: 401 }
      );
    }

    await db
      .update(users)
      .set({ passwordHash: hashPassword(nextPassword) })
      .where(eq(users.id, auth.profile.userId));

    return NextResponse.json({
      success: true,
      message: "Password mitra berhasil diperbarui.",
    });
  } catch (error) {
    console.error("POST /api/mitra/profile/password error:", error);
    return NextResponse.json(
      { success: false, error: "Gagal mengubah password mitra." },
      { status: 500 }
    );
  }
}
