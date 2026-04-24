// ==============================
// TELKO.STORE — Voucher Code Helper
// Handles auto-assign, status tracking, and redeem URLs
// ==============================

import db from "@/db/index.js";
import { voucherCodes, products, orders } from "@/db/schema.js";
import { eq, and, sql, count } from "drizzle-orm";
import { nanoid } from "nanoid";
import { buildVoucherDeliveryMsg } from "@/lib/whatsapp";
import { getOperatorName, validateVoucherInternetCheckout } from "@/lib/utils";
import { syncReferralCommissionForOrder } from "@/lib/referral-commission";

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
  const operator = getOperatorName(phone);
  if (operator === "byU") return "byu";
  if (operator === "Telkomsel") return "simpati";

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
export async function assignVoucherToOrder(
  orderId,
  productId,
  customerPhone,
  preferredProvider,
  options = {},
  _retryCount = 0
) {
  const allowProviderFallback = options.allowProviderFallback === true;

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

    if (!result && preferredProvider && allowProviderFallback) {
      // If provider-specific search failed, try without provider filter
      return assignVoucherToOrder(
        orderId,
        productId,
        customerPhone,
        null,
        { allowProviderFallback: false },
        _retryCount + 1
      );
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
      return assignVoucherToOrder(
        orderId,
        productId,
        customerPhone,
        preferredProvider,
        options,
        _retryCount + 1
      );
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

function shouldAttemptAutoRedeem(voucher, options = {}) {
  if (!voucher || voucher.status !== "reserved") return false;
  if (options.forceAutoRedeem) return true;

  const lastResponse = voucher.redeemResponse || "";
  if (!lastResponse) return true;
  if (lastResponse.startsWith("AUTO_REDEEM_IN_PROGRESS")) return false;
  if (lastResponse.startsWith("Auto-redeem gagal:")) {
    return Boolean(options.retryFailedAutoRedeem);
  }

  return false;
}

async function markVoucherAutoRedeemInProgress(voucherId) {
  const now = new Date().toISOString();
  await db
    .update(voucherCodes)
    .set({
      redeemResponse: `AUTO_REDEEM_IN_PROGRESS:${now}`,
      updatedAt: now,
    })
    .where(eq(voucherCodes.id, voucherId));
}

/**
 * Ensure a paid voucher-internet order has an assigned code and can start auto-redeem.
 * This keeps voucher fulfillment consistent across webhook, manual check, and admin flows.
 */
export async function ensureVoucherFulfillment(order, callbacks = {}, options = {}) {
  const { sendWA, sendGroup } = callbacks;

  if (!(await isVoucherProduct(order.productId))) {
    return {
      isVoucher: false,
      voucher: null,
      assigned: false,
      autoRedeemTriggered: false,
      skippedReason: "not_voucher_product",
    };
  }

  let voucher = await getVoucherByOrderId(order.id);
  let assigned = false;
  const targetPhone = order.targetData || order.guestPhone;
  const voucherValidation = validateVoucherInternetCheckout(
    {
      id: order.productId,
      categoryId: "voucher-internet",
      name: order.productName,
    },
    targetPhone
  );

  if (!voucherValidation.valid) {
    if (sendGroup && options.notifyWhenInvalidTarget !== false) {
      try {
        await sendGroup(
          `*VOUCHER INTERNET BUTUH TINDAKAN ADMIN*\n\n` +
            `Order: ${order.id}\n` +
            `Produk: ${order.productName}\n` +
            `Nomor tujuan: ${targetPhone}\n\n` +
            `${voucherValidation.message}`
        );
      } catch (waErr) {
        console.error("WA voucher invalid target notification failed:", waErr.message);
      }
    }

    return {
      isVoucher: true,
      voucher: null,
      assigned: false,
      autoRedeemTriggered: false,
      skippedReason: "invalid_target_for_product",
      validationMessage: voucherValidation.message,
    };
  }

  if (!voucher) {
    const detectedProvider =
      voucherValidation.matchedProvider || detectProviderFromPhone(targetPhone);
    voucher = await assignVoucherToOrder(
      order.id,
      order.productId,
      order.guestPhone,
      detectedProvider,
      { allowProviderFallback: false }
    );

    if (!voucher) {
      if (sendGroup && options.notifyWhenOutOfStock !== false) {
        try {
          await sendGroup(
            `⚠️ *STOK VOUCHER HABIS*\n\nProduk: ${order.productName}\nOrder: ${order.id}\nPembeli: ${order.guestPhone}\n\nSegera tambah kode voucher di Admin!`
          );
        } catch (waErr) {
          console.error("WA voucher out-of-stock notification failed:", waErr.message);
        }
      }

      return {
        isVoucher: true,
        voucher: null,
        assigned: false,
        autoRedeemTriggered: false,
        skippedReason: "voucher_unavailable",
      };
    }

    assigned = true;
  }

  if (assigned && sendWA && options.sendVoucherMessage !== false) {
    try {
      const instructions = getRedeemInstructions(
        voucher.provider,
        voucher.code,
        targetPhone
      );
      await sendWA(
        order.guestPhone,
        buildVoucherDeliveryMsg(order, voucher, instructions)
      );
    } catch (waErr) {
      console.error("WA voucher delivery notification failed:", waErr.message);
    }
  }

  let autoRedeemTriggered = false;
  if (options.triggerAutoRedeem !== false && shouldAttemptAutoRedeem(voucher, options)) {
    await markVoucherAutoRedeemInProgress(voucher.id);
    autoRedeemTriggered = true;

    autoRedeemAndComplete(
      order,
      {
        ...voucher,
        redeemResponse: `AUTO_REDEEM_IN_PROGRESS:${new Date().toISOString()}`,
      },
      callbacks
    ).catch((err) => {
      console.error("Auto-redeem background error:", err.message);
    });
  }

  return {
    isVoucher: true,
    voucher,
    assigned,
    autoRedeemTriggered,
  };
}

/**
 * Auto-redeem a voucher via Puppeteer and complete the order if successful.
 * Falls back to semi-auto (admin manual redeem via dashboard) if auto-redeem fails.
 * 
 * This function is called asynchronously AFTER the payment success WA notification.
 * It does NOT block the webhook response.
 * 
 * @param {object} order - Order data
 * @param {object} voucher - Assigned voucher { id, code, provider }
 * @param {object} callbacks - { sendWA, sendGroup } notification functions
 * @returns {Promise<{ autoRedeemed: boolean, message: string }>}
 */
export async function autoRedeemAndComplete(order, voucher, callbacks = {}) {
  const { sendWA, sendGroup } = callbacks;
  const now = new Date().toISOString();

  // Dynamic import to avoid breaking builds when puppeteer is not installed
  let autoRedeemVoucher, isPuppeteerAvailable;
  try {
    const autoRedeemModule = await import("@/lib/auto-redeem.js");
    autoRedeemVoucher = autoRedeemModule.autoRedeemVoucher;
    isPuppeteerAvailable = autoRedeemModule.isPuppeteerAvailable;
  } catch (importErr) {
    console.warn("⚠️ auto-redeem.js module not available, falling back to semi-auto:", importErr.message);
    await db
      .update(voucherCodes)
      .set({
        redeemResponse: `Auto-redeem gagal: module error (${importErr.message})`,
        updatedAt: now,
      })
      .where(eq(voucherCodes.id, voucher.id));
    // Send fallback notification to admin group
    if (sendGroup) {
      try {
        await sendGroup(
          `🎫 *VOUCHER PERLU DIREDEEM — Telko.Store*\n\n` +
          `📋 Invoice: ${order.id}\n` +
          `📦 Produk: ${order.productName}\n` +
          `📱 No. Tujuan: ${order.targetData || order.guestPhone}\n` +
          `🏷️ Provider: ${(voucher.provider || "—").toUpperCase()}\n` +
          `🔑 Kode: *${voucher.code}*\n\n` +
          `⚠️ Auto-redeem tidak tersedia (module error)\n` +
          `⚡ Redeem manual diperlukan:\n` +
          `${process.env.NEXT_PUBLIC_BASE_URL}/control/voucher`
        );
      } catch {}
    }
    return { autoRedeemed: false, message: "Auto-redeem module not available" };
  }

  const puppeteerReady = await isPuppeteerAvailable();
  if (!puppeteerReady) {
    console.warn("⚠️ Puppeteer not installed — falling back to semi-auto redeem");
    await db
      .update(voucherCodes)
      .set({
        redeemResponse: "Auto-redeem gagal: Puppeteer belum terpasang di server",
        updatedAt: now,
      })
      .where(eq(voucherCodes.id, voucher.id));
    // Send fallback notification to admin group
    if (sendGroup) {
      try {
        await sendGroup(
          `🎫 *VOUCHER PERLU DIREDEEM — Telko.Store*\n\n` +
          `📋 Invoice: ${order.id}\n` +
          `📦 Produk: ${order.productName}\n` +
          `📱 No. Tujuan: ${order.targetData || order.guestPhone}\n` +
          `🏷️ Provider: ${(voucher.provider || "—").toUpperCase()}\n` +
          `🔑 Kode: *${voucher.code}*\n\n` +
          `⚠️ Puppeteer belum di-install di server\n` +
          `⚡ Redeem manual diperlukan:\n` +
          `${process.env.NEXT_PUBLIC_BASE_URL}/control/voucher`
        );
      } catch {}
    }
    return { autoRedeemed: false, message: "Puppeteer not installed" };
  }

  const provider = voucher.provider || "simpati";
  const targetPhone = order.targetData || order.guestPhone;

  console.log(`🤖 Attempting auto-redeem: order=${order.id}, provider=${provider}, voucher=${voucher.code?.substring(0, 4)}****`);

  try {
    const result = await autoRedeemVoucher(provider, voucher.code, targetPhone);

    if (result.success) {
      // ✅ Auto-redeem succeeded — mark voucher as redeemed and complete order
      console.log(`✅ Auto-redeem SUCCESS for order ${order.id}: ${result.message}`);

      await markVoucherRedeemed(voucher.id, `Auto-redeem berhasil: ${result.message}`);

      // Complete the order
      const now = new Date().toISOString();
      await db
        .update(orders)
        .set({
          status: "completed",
          completedAt: now,
          updatedAt: now,
          notes: `Voucher ${voucher.code} auto-redeemed berhasil`,
        })
        .where(eq(orders.id, order.id));

      await syncReferralCommissionForOrder({
        ...order,
        status: "completed",
        completedAt: now,
        updatedAt: now,
      });

      // Notify buyer — voucher redeemed & order completed
      if (sendWA) {
        try {
          await sendWA(
            order.guestPhone,
            `🎉 *Voucher Berhasil Diaktifkan — Telko.Store*\n\n` +
            `📋 Invoice: ${order.id}\n` +
            `📦 Produk: ${order.productName}\n` +
            `📱 No. Tujuan: ${targetPhone}\n\n` +
            `✅ Kode voucher sudah *otomatis di-redeem* ke nomor ${targetPhone}.\n` +
            `Kuota akan masuk dalam beberapa menit.\n\n` +
            `Terima kasih telah berbelanja di Telko.Store 🙏\n` +
            `\n—————————————————\nTelko.Store — Pulsa & Paket Data Murah\n💬 CS: wa.me/6281285755557\n🌐 telko.store`
          );
        } catch (waErr) {
          console.error("WA auto-redeem success notification failed:", waErr.message);
        }
      }

      // Notify admin group
      if (sendGroup) {
        try {
          await sendGroup(
            `🤖 *AUTO-REDEEM BERHASIL — Telko.Store*\n\n` +
            `📋 Invoice: ${order.id}\n` +
            `📦 Produk: ${order.productName}\n` +
            `📱 No. Tujuan: ${targetPhone}\n` +
            `🏷️ Provider: ${provider.toUpperCase()}\n` +
            `🔑 Kode: ${voucher.code}\n\n` +
            `✅ Voucher otomatis di-redeem dan pesanan selesai.`
          );
        } catch (waErr) {
          console.error("WA group auto-redeem notification failed:", waErr.message);
        }
      }

      return { autoRedeemed: true, message: result.message };
    } else {
      // ❌ Auto-redeem failed — fall back to semi-auto
      console.warn(`⚠️ Auto-redeem FAILED for order ${order.id}: ${result.message}`);

      // Update voucher with failure details but keep as "reserved" (not "failed")
      // so admin can still manually redeem via dashboard
      const now = new Date().toISOString();
      await db
        .update(voucherCodes)
        .set({
          redeemResponse: `Auto-redeem gagal: ${result.message}`,
          updatedAt: now,
        })
        .where(eq(voucherCodes.id, voucher.id));

      // Notify admin group — needs manual action
      if (sendGroup) {
        try {
          await sendGroup(
            `⚠️ *AUTO-REDEEM GAGAL — Perlu Redeem Manual*\n\n` +
            `📋 Invoice: ${order.id}\n` +
            `📦 Produk: ${order.productName}\n` +
            `📱 No. Tujuan: ${targetPhone}\n` +
            `🏷️ Provider: ${provider.toUpperCase()}\n` +
            `🔑 Kode: *${voucher.code}*\n\n` +
            `❌ Alasan: ${result.message}\n\n` +
            `⚡ Redeem manual diperlukan:\n` +
            `${process.env.NEXT_PUBLIC_BASE_URL}/control/voucher`
          );
        } catch (waErr) {
          console.error("WA group auto-redeem failed notification:", waErr.message);
        }
      }

      return { autoRedeemed: false, message: result.message };
    }
  } catch (err) {
    console.error(`❌ Auto-redeem unexpected error for order ${order.id}:`, err.message);

    await db
      .update(voucherCodes)
      .set({
        redeemResponse: `Auto-redeem gagal: ${err.message}`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(voucherCodes.id, voucher.id));

    // Notify admin group about unexpected error
    if (sendGroup) {
      try {
        await sendGroup(
          `🚨 *AUTO-REDEEM ERROR — Telko.Store*\n\n` +
          `📋 Invoice: ${order.id}\n` +
          `📦 Produk: ${order.productName}\n` +
          `🔑 Kode: *${voucher.code}*\n\n` +
          `❌ Error: ${err.message}\n\n` +
          `⚡ Redeem manual diperlukan:\n` +
          `${process.env.NEXT_PUBLIC_BASE_URL}/control/voucher`
        );
      } catch {}
    }

    return { autoRedeemed: false, message: err.message };
  }
}
