// ==============================
// TELKO.STORE — Voucher Code Helper
// Handles auto-assign, status tracking, and redeem URLs
// ==============================

import db from "@/db/index.js";
import { voucherCodes, products, orders } from "@/db/schema.js";
import { eq, and, sql, count } from "drizzle-orm";
import { nanoid } from "nanoid";

const MAX_ASSIGN_RETRIES = 3;

// ===== Provider Redeem URLs =====
const REDEEM_URLS = {
  simpati: "https://www.telkomsel.com/shops/voucher/redeem",
  byu: "https://pidaw-webfront.cx.byu.id/web/tkr-voucher",
};

/**
 * Get the redeem URL for a provider
 */
export function getRedeemUrl(provider) {
  return REDEEM_URLS[provider] || REDEEM_URLS.simpati;
}

/**
 * Get redeem instructions for WA message based on provider
 */
export function getRedeemInstructions(provider, code, phone) {
  const dialCode = `*133*${code}#`;

  if (provider === "byu") {
    return (
      `📲 *Cara Redeem (byU):*\n\n` +
      `*Cara 1 — Via Website:*\n` +
      `1. Buka: ${REDEEM_URLS.byu}\n` +
      `2. Login dengan nomor byU kamu\n` +
      `3. Masukkan kode voucher: *${code}*\n` +
      `4. Klik "Tukar Voucher"\n` +
      `5. Selesai! ✅\n\n` +
      `*Cara 2 — Via Dial UMB (Lebih Cepat):*\n` +
      `1. Buka aplikasi Telepon/Dialer di HP\n` +
      `2. Ketik: *${dialCode}*\n` +
      `3. Tekan tombol *Panggil* 📞\n` +
      `4. Tunggu konfirmasi, kuota otomatis masuk ✅`
    );
  }

  // Default: Simpati / Telkomsel
  return (
    `📲 *Cara Redeem (Telkomsel/Simpati):*\n\n` +
    `*Cara 1 — Via Website:*\n` +
    `1. Buka: ${REDEEM_URLS.simpati}\n` +
    `2. Masukkan nomor HP: *${phone}*\n` +
    `3. Masukkan kode voucher: *${code}*\n` +
    `4. Klik "Redeem"\n` +
    `5. Selesai! ✅\n\n` +
    `*Cara 2 — Via Dial UMB (Lebih Cepat):*\n` +
    `1. Buka aplikasi Telepon/Dialer di HP\n` +
    `2. Ketik: *${dialCode}*\n` +
    `3. Tekan tombol *Panggil* 📞\n` +
    `4. Tunggu konfirmasi, kuota otomatis masuk ✅`
  );
}

/**
 * Detect provider from phone number prefix
 */
export function detectProviderFromPhone(phone) {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");

  // byU prefix
  if (cleaned.startsWith("0851")) return "byu";

  // Telkomsel/Simpati prefixes
  const simpatiPrefixes = [
    "0811", "0812", "0813", "0821", "0822", "0823", "0852", "0853",
  ];
  if (simpatiPrefixes.some((p) => cleaned.startsWith(p))) return "simpati";

  return null;
}

/**
 * Assign an available voucher code to an order.
 * Uses MySQL SELECT ... FOR UPDATE to prevent race conditions.
 * Picks the oldest available code matching the product (and optionally provider).
 *
 * @param {string} orderId - Order ID
 * @param {string} productId - Product ID
 * @param {string} customerPhone - Customer phone
 * @param {string} [preferredProvider] - Provider hint (simpati/byu)
 * @param {number} [_retryCount=0] - Internal retry counter (do not pass manually)
 * @returns {object|null} The assigned voucher, or null if none available
 */
export async function assignVoucherToOrder(orderId, productId, customerPhone, preferredProvider, _retryCount = 0) {
  if (_retryCount >= MAX_ASSIGN_RETRIES) {
    console.warn(`⚠️ Voucher assignment exhausted ${MAX_ASSIGN_RETRIES} retries for order ${orderId}`);
    return null;
  }

  const now = new Date().toISOString();

  try {
    // Use raw SQL transaction with SELECT ... FOR UPDATE for atomic locking
    const result = await db.transaction(async (tx) => {
      // Lock and select the oldest available voucher
      let rows;
      if (preferredProvider) {
        [rows] = await tx.execute(
          sql`SELECT id, code, provider, product_id FROM voucher_codes 
              WHERE product_id = ${productId} AND status = 'available' AND provider = ${preferredProvider}
              ORDER BY created_at ASC 
              LIMIT 1 
              FOR UPDATE`
        );
      } else {
        [rows] = await tx.execute(
          sql`SELECT id, code, provider, product_id FROM voucher_codes 
              WHERE product_id = ${productId} AND status = 'available'
              ORDER BY created_at ASC 
              LIMIT 1 
              FOR UPDATE`
        );
      }

      // Handle the result - tx.execute returns [rows, fields]
      const voucher = Array.isArray(rows) ? rows[0] : rows;
      if (!voucher) return null;

      // Update the locked row — guaranteed no other transaction can touch it
      await tx
        .update(voucherCodes)
        .set({
          status: "reserved",
          orderId,
          customerPhone,
          updatedAt: now,
        })
        .where(eq(voucherCodes.id, voucher.id));

      return voucher;
    });

    if (!result && preferredProvider) {
      // If provider-specific search failed, try without provider filter
      return assignVoucherToOrder(orderId, productId, customerPhone, null, _retryCount + 1);
    }

    // Re-fetch the full voucher data after transaction commit
    if (result) {
      const [updated] = await db
        .select()
        .from(voucherCodes)
        .where(eq(voucherCodes.id, result.id))
        .limit(1);
      return updated || null;
    }

    return null;
  } catch (err) {
    // Deadlock or lock wait timeout — retry
    if (err.code === "ER_LOCK_DEADLOCK" || err.code === "ER_LOCK_WAIT_TIMEOUT") {
      console.warn(`🔄 Voucher assignment lock conflict, retrying (${_retryCount + 1}/${MAX_ASSIGN_RETRIES})...`);
      return assignVoucherToOrder(orderId, productId, customerPhone, preferredProvider, _retryCount + 1);
    }
    throw err;
  }
}

/**
 * Mark a voucher as redeemed (called by admin after manual redeem)
 */
export async function markVoucherRedeemed(voucherId, response) {
  const now = new Date().toISOString();
  await db
    .update(voucherCodes)
    .set({
      status: "redeemed",
      redeemedAt: now,
      redeemResponse: response || "Berhasil di-redeem oleh admin",
      updatedAt: now,
    })
    .where(eq(voucherCodes.id, voucherId));
}

/**
 * Mark a voucher as failed (called by admin if redeem fails)
 */
export async function markVoucherFailed(voucherId, response) {
  const now = new Date().toISOString();
  await db
    .update(voucherCodes)
    .set({
      status: "failed",
      redeemResponse: response || "Gagal di-redeem",
      updatedAt: now,
    })
    .where(eq(voucherCodes.id, voucherId));
}

/**
 * Release a reserved voucher back to available (e.g. when payment fails)
 */
export async function releaseVoucher(orderId) {
  const now = new Date().toISOString();
  await db
    .update(voucherCodes)
    .set({
      status: "available",
      orderId: null,
      customerPhone: null,
      updatedAt: now,
    })
    .where(and(eq(voucherCodes.orderId, orderId), eq(voucherCodes.status, "reserved")));
}

/**
 * Get voucher stats for a product
 */
export async function getVoucherStats(productId) {
  const result = await db
    .select({
      status: voucherCodes.status,
      count: count(),
    })
    .from(voucherCodes)
    .where(productId ? eq(voucherCodes.productId, productId) : sql`1=1`)
    .groupBy(voucherCodes.status);

  const stats = { total: 0, available: 0, reserved: 0, redeemed: 0, failed: 0 };
  for (const row of result) {
    const c = Number(row.count);
    stats[row.status] = c;
    stats.total += c;
  }
  return stats;
}

/**
 * Get voucher assigned to a specific order
 */
export async function getVoucherByOrderId(orderId) {
  const [voucher] = await db
    .select()
    .from(voucherCodes)
    .where(eq(voucherCodes.orderId, orderId))
    .limit(1);
  return voucher || null;
}

/**
 * Check if a product is a voucher-internet product (has voucher codes)
 */
export async function isVoucherProduct(productId) {
  const [product] = await db
    .select({ categoryId: products.categoryId })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);

  return product?.categoryId === "voucher-internet";
}
