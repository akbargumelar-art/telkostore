import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import crypto from "crypto";

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
import { sendWhatsAppNotification } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";

function parseMargin(value) {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function buildReferralQrAttachment(referralUrl) {
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(referralUrl)}&margin=10`;

  try {
    const response = await fetch(qrCodeUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`QR request failed with status ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return {
      qrCodeUrl,
      attachment: {
        filename: "qr-referral-telko-store.png",
        content: Buffer.from(arrayBuffer),
        contentType: "image/png",
        cid: "referral-qrcode@telko.store",
      },
    };
  } catch (error) {
    console.error("Gagal menyiapkan QR Code email referral:", error);
    return {
      qrCodeUrl,
      attachment: null,
    };
  }
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

    // Always generate a temp password (mitra will set their own via activation link)
    const generatedPassword = generateTemporaryPassword(10);
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
    const { qrCodeUrl, attachment: qrCodeAttachment } = await buildReferralQrAttachment(
      links.canonicalUrl
    );
    
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
    const safeDisplayName = escapeHtml(displayName);
    const safeEmail = escapeHtml(email);
    const safeReferralLink = escapeHtml(links.canonicalUrl);
    const safeActivationUrl = escapeHtml(activationUrl);
    const qrCodeImageHtml = qrCodeAttachment
      ? '<img src="cid:referral-qrcode@telko.store" alt="QR Code Referral" width="180" height="180" style="display:block; margin:0 auto; border-radius:16px; border:1px solid #e5e7eb; padding:8px; background:#ffffff;" />'
      : `<img src="${qrCodeUrl}" alt="QR Code Referral" width="180" height="180" style="display:block; margin:0 auto; border-radius:16px; border:1px solid #e5e7eb; padding:8px; background:#ffffff;" />`;

    const emailHtml = `
      <div style="margin:0; padding:32px 16px; background:#f5f7fb; font-family:Arial,Helvetica,sans-serif; color:#1f2937;">
        <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:24px; overflow:hidden; border:1px solid #e5e7eb; box-shadow:0 12px 40px rgba(15,23,42,0.08);">
          <div style="padding:32px 32px 24px; background:linear-gradient(135deg,#0f172a 0%,#1e3a8a 100%); color:#ffffff;">
            <p style="margin:0; font-size:14px; letter-spacing:0.08em; text-transform:uppercase; opacity:0.82;">Telko.Store Referral</p>
            <h1 style="margin:12px 0 0; font-size:28px; line-height:1.3; font-weight:800;">Halo ${safeDisplayName}, Selamat bergabung!</h1>
          </div>

          <div style="padding:32px;">
            <p style="margin:0 0 20px; font-size:15px; line-height:1.7; color:#4b5563;">
              Akun Mitra Referral Anda sudah berhasil dibuat. Berikut data login dan link referral yang bisa langsung digunakan.
            </p>

            <div style="margin:0 0 24px; padding:24px; background:#f8fafc; border:1px solid #dbe4f0; border-radius:20px;">
              <p style="margin:0 0 16px; font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#64748b;">Data Referral</p>
              <div style="margin-bottom:14px;">
                <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">Email Login</div>
                <div style="font-size:16px; font-weight:700; color:#0f172a; word-break:break-word;">${safeEmail}</div>
              </div>
              <div>
                <div style="font-size:12px; font-weight:700; text-transform:uppercase; color:#94a3b8; margin-bottom:6px;">Link Referral</div>
                <a href="${safeReferralLink}" style="font-size:15px; font-weight:700; color:#dc2626; text-decoration:none; word-break:break-all;">${safeReferralLink}</a>
              </div>
            </div>

            <div style="margin:0 0 24px; padding:24px; background:#ffffff; border:1px dashed #cbd5e1; border-radius:20px; text-align:center;">
              <p style="margin:0 0 14px; font-size:13px; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#64748b;">QR Code Referral</p>
              ${qrCodeImageHtml}
              <p style="margin:14px 0 0; font-size:13px; line-height:1.6; color:#6b7280;">
                QR code ini langsung bisa disimpan dari email dan dibagikan ke pelanggan.
              </p>
            </div>

            <div style="text-align:center; margin:28px 0;">
              <a href="${safeActivationUrl}" style="display:inline-block; min-width:280px; padding:16px 28px; border-radius:16px; background:#0f172a; color:#ffffff; text-decoration:none; font-size:16px; font-weight:800;">Aktifkan Akun &amp; Buat Password</a>
            </div>

            <p style="margin:0 0 12px; font-size:13px; line-height:1.7; color:#6b7280;">
              Jika tombol di atas tidak bisa diklik, salin link berikut ke browser Anda:
            </p>
            <p style="margin:0 0 24px; font-size:13px; line-height:1.7; word-break:break-all;">
              <a href="${safeActivationUrl}" style="color:#1d4ed8; text-decoration:none;">${safeActivationUrl}</a>
            </p>

            <div style="padding-top:20px; border-top:1px solid #e5e7eb;">
              <p style="margin:0; font-size:12px; line-height:1.8; color:#9ca3af; text-align:center;">
                Pesan ini dikirim secara otomatis. Harap jangan membalas pesan ini (No Reply).
              </p>
            </div>
          </div>
        </div>
      </div>
    `;

    const emailText = [
      `Halo ${displayName}, Selamat bergabung!`,
      "",
      "Akun Mitra Referral Telko.Store Anda sudah berhasil dibuat.",
      "",
      "Data Referral:",
      `- Email Login: ${email}`,
      `- Link Referral: ${links.canonicalUrl}`,
      qrCodeUrl ? `- QR Code Referral: ${qrCodeUrl}` : null,
      "",
      "Aktifkan akun & buat password melalui link berikut:",
      activationUrl,
      "",
      "Pesan ini dikirim secara otomatis. Harap jangan membalas pesan ini (No Reply).",
    ]
      .filter(Boolean)
      .join("\n");

    // Background Email send
    sendEmail({
      to: email,
      subject: "Aktivasi Akun Mitra Referral Telko.Store",
      html: emailHtml,
      text: emailText,
      attachments: qrCodeAttachment ? [qrCodeAttachment] : [],
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

