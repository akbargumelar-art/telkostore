import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import db from "@/db/index.js";
import { downlineProfiles, users } from "@/db/schema.js";
import {
  evaluateReferralActivation,
} from "@/lib/referral-activation.mjs";
import {
  applyDownlineAuthCookie,
  createDownlineToken,
} from "@/lib/downline-auth";
import { verifyPassword } from "@/lib/password";

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body.email || body.identifier || "").trim().toLowerCase();
    const password = String(body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email dan password wajib diisi." },
        { status: 400 }
      );
    }

    const [account] = await db
      .select({
        id: users.id,
        email: users.email,
        passwordHash: users.passwordHash,
        role: users.role,
        activationToken: users.activationToken,
        activationTokenExpiresAt: users.activationTokenExpiresAt,
        emailVerified: users.emailVerified,
        profileId: downlineProfiles.id,
        isReferralActive: downlineProfiles.isReferralActive,
      })
      .from(users)
      .innerJoin(downlineProfiles, eq(downlineProfiles.userId, users.id))
      .where(and(eq(users.email, email), eq(users.role, "downline")))
      .limit(1);

    if (!account || !account.passwordHash) {
      return NextResponse.json(
        { success: false, error: "Akun referral tidak ditemukan." },
        { status: 401 }
      );
    }

    if (!verifyPassword(password, account.passwordHash)) {
      return NextResponse.json(
        { success: false, error: "Password referral salah." },
        { status: 401 }
      );
    }

    const activationStatus = evaluateReferralActivation(account);
    if (!activationStatus.canLogin) {
      return NextResponse.json(
        {
          success: false,
          activationRequired: true,
          activationExpired: activationStatus.isExpired,
          error: activationStatus.isExpired
            ? "Link aktivasi referral sudah kadaluarsa. Silakan minta admin mengirim ulang aktivasi."
            : "Akun referral belum diaktivasi. Silakan cek link aktivasi yang dikirim via email atau WhatsApp.",
        },
        { status: 403 }
      );
    }

    if (!account.isReferralActive) {
      return NextResponse.json(
        { success: false, error: "Akun referral sedang dinonaktifkan." },
        { status: 403 }
      );
    }

    const token = createDownlineToken({
      userId: account.id,
      downlineProfileId: account.profileId,
      email: account.email,
    });

    const response = NextResponse.json({
      success: true,
      message: "Login referral berhasil.",
    });
    applyDownlineAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error("POST /api/mitra/auth/login error:", error);
    return NextResponse.json(
      { success: false, error: "Login referral gagal." },
      { status: 500 }
    );
  }
}
