import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import db from "@/db/index.js";
import { users, downlineProfiles } from "@/db/schema.js";
import {
  evaluateReferralActivation,
} from "@/lib/referral-activation.mjs";
import { hashPassword } from "@/lib/password";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ valid: false, error: "Token tidak valid" });
    }

    const userRows = await db
      .select({
        id: users.id,
        activationToken: users.activationToken,
        activationTokenExpiresAt: users.activationTokenExpiresAt,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.activationToken, token))
      .limit(1);

    if (userRows.length === 0) {
      return NextResponse.json({ valid: false, used: false, expired: false, error: "Token aktivasi tidak ditemukan." });
    }

    const activationStatus = evaluateReferralActivation(userRows[0]);
    if (activationStatus.isExpired) {
      return NextResponse.json({ valid: false, used: false, expired: true, error: "Token aktivasi sudah kadaluarsa." });
    }

    return NextResponse.json({ valid: true, expired: false });
  } catch (error) {
    return NextResponse.json({ valid: false, error: "Server error" });
  }
}

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
      .select({
        id: users.id,
        activationToken: users.activationToken,
        activationTokenExpiresAt: users.activationTokenExpiresAt,
        emailVerified: users.emailVerified,
      })
      .from(users)
      .where(eq(users.activationToken, token))
      .limit(1);

    const user = userRows[0];

    if (!user) {
      return NextResponse.json({ success: false, error: "Token aktivasi tidak valid atau tidak ditemukan." }, { status: 400 });
    }

    const activationStatus = evaluateReferralActivation(user);
    if (activationStatus.isExpired) {
      await db
        .update(users)
        .set({ activationToken: null, activationTokenExpiresAt: null })
        .where(eq(users.id, user.id));

      return NextResponse.json(
        { success: false, error: "Token aktivasi sudah kadaluarsa. Silakan minta admin mengirim ulang aktivasi." },
        { status: 400 }
      );
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
      activationTokenExpiresAt: null,
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
