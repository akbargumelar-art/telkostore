// ==============================
// TELKO.STORE — WhatsApp Notification Helper
// Centralized WAHA integration + Group Notifications
// ==============================

import db from "@/db/index.js";
import { gatewaySettings } from "@/db/schema.js";
import { eq } from "drizzle-orm";

// ===== WAHA Settings Cache =====
let _wahaCache = null;
let _wahaCacheTime = 0;
const CACHE_TTL = 30 * 1000;

function boolFromSetting(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === "true";
}

async function getWahaSettings() {
  if (_wahaCache && Date.now() - _wahaCacheTime < CACHE_TTL) return _wahaCache;
  try {
    const [settings] = await db
      .select()
      .from(gatewaySettings)
      .where(eq(gatewaySettings.providerName, "waha"))
      .limit(1);
    _wahaCache = settings || null;
    _wahaCacheTime = Date.now();
    return _wahaCache;
  } catch {
    return null;
  }
}

// ===== Shared Footer =====
const WA_FOOTER = `\n—————————————————\nTelko.Store — Pulsa & Paket Data Murah\n💬 CS: wa.me/6281285755557\n🌐 telko.store`;

// ===== Format Rupiah for Messages =====
export function formatRupiahServer(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

// ===== Format Date for Messages =====
function formatDateWA(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ==============================
// SEND FUNCTIONS
// ==============================

/**
 * Send a WhatsApp text message to a phone number via WAHA API
 * @param {string} phone - Indonesian phone number (08xxx format)
 * @param {string} message - Message text (supports WhatsApp formatting)
 */
export async function sendWhatsAppNotification(phone, message) {
  const settings = await getWahaSettings();
  if (settings && boolFromSetting(settings.isActive, true) === false) {
    console.warn("⚠️ WAHA dinonaktifkan di Pengaturan Admin, skipping WhatsApp notification");
    return false;
  }

  const wahaUrl = settings?.apiUrl || process.env.WAHA_API_URL;
  const wahaApiKey = settings?.serverKey || process.env.WAHA_API_KEY;
  const wahaSession = settings?.sessionName || process.env.WAHA_SESSION || "default";

  if (!wahaUrl) {
    console.warn("⚠️ WAHA_API_URL not set, skipping WhatsApp notification");
    return false;
  }

  try {
    // Format phone: 08xxx → 628xxx@c.us
    const chatId = phone.replace(/^0/, "62") + "@c.us";

    const res = await fetch(`${wahaUrl}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(wahaApiKey ? { "X-Api-Key": wahaApiKey } : {}),
      },
      body: JSON.stringify({
        session: wahaSession,
        chatId,
        text: message,
      }),
    });

    if (!res.ok) {
      console.error(`❌ WhatsApp API error: ${res.status} ${res.statusText}`);
      return false;
    }

    console.log(`✅ WhatsApp sent to ${phone}`);
    return true;
  } catch (err) {
    console.error("❌ WhatsApp notification failed:", err.message);
    return false;
  }
}

/**
 * Send notification to internal WhatsApp group
 * Group ID is read from admin dashboard settings (gateway_settings → waha → client_key)
 * @param {string} message - Message text
 */
export async function sendGroupNotification(message) {
  const settings = await getWahaSettings();
  if (settings && boolFromSetting(settings.isActive, true) === false) {
    console.warn("⚠️ WAHA dinonaktifkan di Pengaturan Admin, skipping group notification");
    return;
  }

  const wahaUrl = settings?.apiUrl || process.env.WAHA_API_URL;
  const wahaApiKey = settings?.serverKey || process.env.WAHA_API_KEY;
  const groupId = settings?.clientKey || process.env.WAHA_GROUP_ID;
  const wahaSession = settings?.sessionName || process.env.WAHA_SESSION || "default";

  if (!wahaUrl || !groupId) {
    console.warn("⚠️ WA Group ID belum diisi di Pengaturan Admin, skipping group notification");
    return;
  }

  try {
    const res = await fetch(`${wahaUrl}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(wahaApiKey ? { "X-Api-Key": wahaApiKey } : {}),
      },
      body: JSON.stringify({
        session: wahaSession,
        chatId: groupId,
        text: message,
      }),
    });

    if (!res.ok) {
      console.error(`❌ Group WA API error: ${res.status} ${res.statusText}`);
      return;
    }

    console.log("✅ Group notification sent");
  } catch (err) {
    console.error("❌ Group notification failed:", err.message);
  }
}

// ==============================
// MESSAGE TEMPLATES — BUYER
// ==============================

/**
 * Build WhatsApp message for order created (sent to buyer)
 */
export function buildOrderCreatedMsg(order, product, payUrl, gameData) {
  let msg = `🛒 *Pesanan Dibuat — Telko.Store*\n\n`;
  msg += `📦 Produk: ${product.name}\n`;

  if (product.categoryId === "voucher-game" && gameData) {
    msg += `🎮 Game: ${gameData.gameName || product.gameName}\n`;
    msg += `🆔 Data Akun: ${order.targetData}\n`;
  }

  msg += `📱 No. HP: ${order.guestPhone}\n`;
  msg += `💰 Total: ${formatRupiahServer(product.price)}\n\n`;
  msg += `🔗 Bayar sekarang:\n${payUrl}\n\n`;
  msg += `⏳ Batas pembayaran: 24 jam\n\n`;
  msg += `📋 Invoice: ${order.id}\n`;
  msg += `🔑 Lacak pesanan:\n${process.env.NEXT_PUBLIC_BASE_URL}/order/${order.id}?token=${order.guestToken}`;
  msg += WA_FOOTER;

  return msg;
}

/**
 * Build WhatsApp message for payment success (sent to buyer)
 */
export function buildPaymentSuccessMsg(order, paymentType) {
  let msg = `✅ *Pembayaran Berhasil — Telko.Store*\n\n`;
  msg += `📦 Produk: ${order.productName}\n`;
  msg += `📱 No. Tujuan: ${order.targetData}\n`;
  msg += `💰 Total: ${formatRupiahServer(order.productPrice)}\n`;
  msg += `💳 Pembayaran: ${paymentType}\n\n`;
  msg += `✨ Produk sedang diproses dan akan segera masuk ke nomor tujuan.\n\n`;
  msg += `📋 Invoice: ${order.id}\n`;
  msg += `🔑 Lacak pesanan:\n${process.env.NEXT_PUBLIC_BASE_URL}/order/${order.id}?token=${order.guestToken}`;
  msg += WA_FOOTER;

  return msg;
}

/**
 * Build WhatsApp message for payment failed/expired (sent to buyer)
 */
export function buildPaymentFailedMsg(order, transactionStatus) {
  const statusMap = {
    deny: "Ditolak",
    cancel: "Dibatalkan",
    expire: "Kedaluwarsa",
  };

  let msg = `❌ *Pembayaran Gagal — Telko.Store*\n\n`;
  msg += `📦 Produk: ${order.productName}\n`;
  msg += `📋 Invoice: ${order.id}\n\n`;
  msg += `📌 Status: ${statusMap[transactionStatus] || transactionStatus}\n\n`;
  msg += `Silakan coba lagi atau hubungi customer service kami.\n`;
  msg += `🔗 Belanja lagi: ${process.env.NEXT_PUBLIC_BASE_URL}`;
  msg += WA_FOOTER;

  return msg;
}

/**
 * Build WhatsApp message for order processing (sent to buyer — triggered by admin)
 */
export function buildOrderProcessingMsg(order) {
  let msg = `📦 *Pesanan Sedang Diproses — Telko.Store*\n\n`;
  msg += `📋 Invoice: ${order.id}\n`;
  msg += `📦 Produk: ${order.productName}\n\n`;
  msg += `Pesanan kamu sedang diproses oleh tim kami. Kami akan memberitahu kamu setelah selesai.\n\n`;
  msg += `🔑 Lacak pesanan:\n${process.env.NEXT_PUBLIC_BASE_URL}/order/${order.id}?token=${order.guestToken}`;
  msg += WA_FOOTER;

  return msg;
}

/**
 * Build WhatsApp message for order completed (sent to buyer — triggered by admin)
 */
export function buildOrderCompletedMsg(order) {
  let msg = `🎉 *Pesanan Selesai — Telko.Store*\n\n`;
  msg += `📋 Invoice: ${order.id}\n`;
  msg += `📦 Produk: ${order.productName}\n\n`;
  msg += `Produk sudah berhasil dikirim! Terima kasih telah berbelanja di Telko.Store 🙏\n\n`;
  msg += `🔑 Detail pesanan:\n${process.env.NEXT_PUBLIC_BASE_URL}/order/${order.id}?token=${order.guestToken}`;
  msg += WA_FOOTER;

  return msg;
}

// ==============================
// MESSAGE TEMPLATES — INTERNAL GROUP
// ==============================

/**
 * Build group message for new order
 */
export function buildGroupNewOrderMsg(order, product) {
  let msg = `🆕 *PESANAN BARU — Telko.Store*\n\n`;
  msg += `📋 Invoice: ${order.id}\n`;
  msg += `📦 Produk: ${product.name}\n`;
  msg += `💰 Total: ${formatRupiahServer(product.price)}\n`;
  msg += `📱 Pembeli: ${order.guestPhone}\n`;
  msg += `🎯 Tujuan: ${order.targetData}\n`;
  msg += `⏰ Waktu: ${formatDateWA(new Date().toISOString())}\n\n`;
  msg += `⏳ Status: Menunggu Pembayaran\n`;
  msg += `🔗 Control: ${process.env.NEXT_PUBLIC_BASE_URL}/control/pesanan`;

  return msg;
}

/**
 * Build group message for payment received
 */
export function buildGroupPaymentSuccessMsg(order, paymentType) {
  let msg = `💰 *PEMBAYARAN DITERIMA — Telko.Store*\n\n`;
  msg += `📋 Invoice: ${order.id}\n`;
  msg += `📦 Produk: ${order.productName}\n`;
  msg += `💰 Total: ${formatRupiahServer(order.productPrice)}\n`;
  msg += `💳 Metode: ${paymentType}\n`;
  msg += `📱 Pembeli: ${order.guestPhone}\n`;
  msg += `⏰ Waktu: ${formatDateWA(new Date().toISOString())}\n\n`;
  msg += `✅ Status: Pembayaran Berhasil\n`;
  msg += `🔗 Control: ${process.env.NEXT_PUBLIC_BASE_URL}/control/pesanan`;

  return msg;
}

/**
 * Build group message for payment failed
 */
export function buildGroupPaymentFailedMsg(order, transactionStatus) {
  const statusMap = {
    deny: "Ditolak",
    cancel: "Dibatalkan",
    expire: "Kedaluwarsa",
  };

  let msg = `❌ *PEMBAYARAN GAGAL — Telko.Store*\n\n`;
  msg += `📋 Invoice: ${order.id}\n`;
  msg += `📦 Produk: ${order.productName}\n`;
  msg += `💰 Total: ${formatRupiahServer(order.productPrice)}\n`;
  msg += `📱 Pembeli: ${order.guestPhone}\n`;
  msg += `📌 Alasan: ${statusMap[transactionStatus] || transactionStatus}\n`;
  msg += `⏰ Waktu: ${formatDateWA(new Date().toISOString())}`;

  return msg;
}

/**
 * Build group message for contact form submission
 */
export function buildGroupContactFormMsg(name, email, subject, message) {
  const subjectMap = {
    order: "Masalah Pesanan",
    payment: "Masalah Pembayaran",
    refund: "Permintaan Refund",
    product: "Pertanyaan Produk",
    other: "Lainnya",
  };

  let msg = `📬 *PESAN BARU — Contact Form*\n\n`;
  msg += `👤 Nama: ${name}\n`;
  msg += `📧 Email: ${email}\n`;
  msg += `📌 Subjek: ${subjectMap[subject] || subject || "Umum"}\n`;
  msg += `⏰ Waktu: ${formatDateWA(new Date().toISOString())}\n\n`;
  msg += `💬 Pesan:\n${message}`;

  return msg;
}

// ==============================
// MESSAGE TEMPLATES — VOUCHER
// ==============================

/**
 * Build WhatsApp message for voucher code delivery (sent to buyer after payment)
 * @param {object} order - Order data
 * @param {object} voucher - Voucher code data { code, provider }
 * @param {string} redeemInstructions - Provider-specific redeem instructions
 */
export function buildVoucherDeliveryMsg(order, voucher, redeemInstructions) {
  let msg = `🎫 *Kode Voucher Kamu — Telko.Store*\n\n`;
  msg += `📋 Invoice: ${order.id}\n`;
  msg += `📦 Produk: ${order.productName}\n`;
  msg += `📱 No. Tujuan: ${order.targetData || order.guestPhone}\n\n`;
  msg += `🔑 *Kode Voucher:*\n`;
  msg += `\`\`\`${voucher.code}\`\`\`\n\n`;
  msg += `${redeemInstructions}\n\n`;
  msg += `⚠️ *Penting:*\n`;
  msg += `• Kode voucher hanya bisa digunakan 1x\n`;
  msg += `• Redeem dalam waktu 24 jam\n`;
  msg += `• Jika gagal, hubungi CS kami\n`;
  msg += WA_FOOTER;

  return msg;
}

/**
 * Build group notification for voucher that needs admin redeem
 * @param {object} order - Order data
 * @param {object} voucher - Voucher code data { code, provider }
 */
export function buildGroupVoucherRedeemMsg(order, voucher) {
  let msg = `🎫 *VOUCHER PERLU DIREDEEM — Telko.Store*\n\n`;
  msg += `📋 Invoice: ${order.id}\n`;
  msg += `📦 Produk: ${order.productName}\n`;
  msg += `📱 No. Tujuan: ${order.targetData || order.guestPhone}\n`;
  msg += `🏷️ Provider: ${(voucher.provider || "—").toUpperCase()}\n`;
  msg += `🔑 Kode: *${voucher.code}*\n\n`;
  msg += `⚡ Segera redeem di Admin Dashboard:\n`;
  msg += `${process.env.NEXT_PUBLIC_BASE_URL}/control/voucher\n\n`;
  msg += `⏰ Waktu: ${formatDateWA(new Date().toISOString())}`;

  return msg;
}
