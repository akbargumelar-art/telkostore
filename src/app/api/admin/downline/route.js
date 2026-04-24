import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import crypto from "crypto";

import db from "@/db/index.js";
import { downlineProfiles, users } from "@/db/schema.js";
import { requireAdminSession } from "@/lib/admin-session";
import { hashPassword, generateTemporaryPassword } from "@/lib/password";
import {
  generateUniqueCanonicalSlug,
} from "@/lib/referral";
import {
  listDownlines,
} from "@/lib/referral-service";
import { normalizeRedirectPath } from "@/lib/referral-config";
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";

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

    const existingUserRows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    const existingUser = existingUserRows[0];

    if (existingUser) {
      // Check if already a downline
      const existingProfile = await db
        .select({ id: downlineProfiles.id })
        .from(downlineProfiles)
        .where(eq(downlineProfiles.userId, existingUser.id))
        .limit(1);

      if (existingProfile.length > 0) {
        return NextResponse.json(
          { success: false, error: "Email ini sudah memiliki akun referral." },
          { status: 409 }
        );
      }
    }

    const generatedPassword =
      providedPassword.length >= 8 ? providedPassword : generateTemporaryPassword(10);
    const userId = existingUser ? existingUser.id : `DLN-${nanoid(10)}`;
    const profileId = `DLP-${nanoid(10)}`;
    const slug = await generateUniqueCanonicalSlug(displayName);
    const now = new Date().toISOString();
    const activationToken = crypto.randomBytes(32).toString('hex');

    await db.transaction(async (tx) => {
      if (!existingUser) {
        // Create new user
        await tx.insert(users).values({
          id: userId,
          name: displayName,
          email,
          phone: phone || null,
          role: "downline",
          passwordHash: hashPassword(generatedPassword),
          activationToken: activationToken,
          emailVerified: false,
          provider: "manual",
          providerId: null,
          createdAt: now,
        });
      } else {
        // Update existing user (set password if they don't have one, update role if they are just a "user")
        const updateData = {
          activationToken: activationToken,
          emailVerified: false,
        };
        if (!existingUser.passwordHash) {
          updateData.passwordHash = hashPassword(generatedPassword);
        } else if (providedPassword) {
          // If admin explicitly provided a password, overwrite the old one
          updateData.passwordHash = hashPassword(providedPassword);
        }
        
        if (existingUser.role === "user") {
          updateData.role = "downline";
        }
        
        await tx.update(users).set(updateData).where(eq(users.id, existingUser.id));
      }

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

    // Send Activation Link via WA
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://telko.store";
    const activationUrl = `${baseUrl}/mitra/aktivasi?token=${activationToken}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(links.canonicalUrl)}&margin=10`;
    
    const waMessage = `Halo *${displayName}*,

Selamat bergabung! Akun Mitra Referral Telko.Store Anda telah berhasil didaftarkan.

*Data Referral Anda:*
- Email Login: ${email}
- Link Referral: ${links.canonicalUrl}
- Download QR Code: ${qrCodeUrl}

*(Anda bisa menggunakan Link/QR Code di atas untuk disebar ke pelanggan Anda)*

*LANGKAH PENTING:*
Silakan klik link di bawah ini untuk **mengatur password** dan mengaktifkan akun Anda:
${activationUrl}

_(Link ini hanya untuk Anda, jangan bagikan ke siapapun)_`;

    if (phone) {
      // Background WA send
      sendWhatsAppNotification(phone, waMessage).catch((err) => {
        console.error("Gagal mengirim WA aktivasi:", err);
      });
    }

    // Send Activation Link via Email
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
        <h2 style="color: #0f0f30;">Halo ${displayName},</h2>
        <p>Selamat bergabung! Akun Mitra Referral <strong>Telko.Store</strong> Anda telah berhasil didaftarkan.</p>
        
        <div style="background-color: #f7f7fb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 24px 0;">
          <h3 style="margin-top: 0; color: #2d2d6b; font-size: 16px;">Data Referral Anda:</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="margin-bottom: 8px;"><strong>Email Login:</strong> ${email}</li>
            <li style="margin-bottom: 8px;"><strong>Link Referral:</strong> <a href="${links.canonicalUrl}" style="color: #d11f26;">${links.canonicalUrl}</a></li>
          </ul>
          
          <div style="margin-top: 20px; text-align: center;">
            <p style="font-size: 14px; margin-bottom: 8px; color: #666;">QR Code Referral Anda:</p>
            <img src="${qrCodeUrl}" alt="QR Code" width="150" height="150" style="border-radius: 8px; border: 1px solid #eee; padding: 4px; background: white;" />
          </div>
        </div>
        
        <p><em>(Anda bisa menggunakan Link/QR Code di atas untuk disebar ke pelanggan Anda)</em></p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        
        <h3 style="color: #d11f26;">LANGKAH PENTING:</h3>
        <p>Silakan klik tombol di bawah ini untuk <strong>mengatur password</strong> dan mengaktifkan akun Anda:</p>
        
        <div style="text-align: center; margin: 32px 0;">
          <a href="${activationUrl}" style="display: inline-block; background-color: #0f0f30; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: bold;">Aktifkan Akun & Buat Password</a>
        </div>
        
        <p style="font-size: 13px; color: #666;">Jika tombol tidak bisa diklik, silakan copy-paste link berikut ke browser Anda:<br>
        <a href="${activationUrl}" style="color: #0f0f30; word-break: break-all;">${activationUrl}</a></p>
        
        <p style="font-size: 12px; color: #999; margin-top: 40px; text-align: center;">
          Pesan ini dikirim secara otomatis. Harap jangan membalas pesan ini (No Reply).
        </p>
      </div>
    `;

    // Background Email send
    sendEmail({
      to: email,
      subject: "Aktivasi Akun Mitra Referral Telko.Store",
      html: emailHtml,
    }).catch((err) => {
      console.error("Gagal mengirim Email aktivasi:", err);
    });

    return NextResponse.json({
      success: true,
      message: "Akun referral berhasil dibuat dan link aktivasi telah dikirim via WA & Email.",
      data: {
        userId,
        profileId,
        slug,
        email,
        activationToken,
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

