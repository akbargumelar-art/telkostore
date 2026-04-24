import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { users, downlineProfiles } from "@/db/schema.js";
import { hashPassword } from "@/lib/password";

export async function POST(request) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!token) {
      return NextResponse.json({ success: false, error: "Token aktivasi tidak valid." }, { status: 400 });
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ success: false, error: "Password minimal 8 karakter." }, { status: 400 });
    }

    const userRows = await db
      .select()
      .from(users)
      .where(eq(users.activationToken, token))
      .limit(1);

    const user = userRows[0];

    if (!user) {
      return NextResponse.json({ success: false, error: "Token aktivasi tidak valid atau sudah kadaluarsa." }, { status: 400 });
    }

    // Verify they are actually a downline
    const profileRows = await db
      .select({ id: downlineProfiles.id })
      .from(downlineProfiles)
      .where(eq(downlineProfiles.userId, user.id))
      .limit(1);

    if (profileRows.length === 0) {
      return NextResponse.json({ success: false, error: "Profil mitra tidak ditemukan." }, { status: 404 });
    }

    await db.update(users).set({
      passwordHash: hashPassword(password),
      activationToken: null,
      emailVerified: true,
    }).where(eq(users.id, user.id));

    return NextResponse.json({
      success: true,
      message: "Akun berhasil diaktifkan. Silakan login.",
    });
  } catch (error) {
    console.error("POST /api/mitra/auth/activate error:", error);
    return NextResponse.json({ success: false, error: "Terjadi kesalahan sistem." }, { status: 500 });
  }
}
