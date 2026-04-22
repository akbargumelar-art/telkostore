// ==============================
// TELKO.STORE — Pakasir Payment Gateway Helper
// https://pakasir.com — Link-based payment gateway
//
// Docs: https://pakasir.com/p/docs
// Auth: api_key dikirim di body JSON (BUKAN Bearer header)
// ==============================

import db from "@/db/index.js";
import { gatewaySettings } from "@/db/schema.js";
import { eq } from "drizzle-orm";

let _pakasirCache = null;
let _pakasirCacheTime = 0;
const CACHE_TTL = 30 * 1000;

function boolFromSetting(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === "true";
}

function hasUsableKey(value) {
  if (!value) return false;
  return !["YOUR_API_KEY", "YOUR_SLUG"].includes(value) && !value.includes("XXXX");
}

/**
 * Get Pakasir settings from database (cached)
 */
async function getPakasirSettings() {
  if (_pakasirCache && Date.now() - _pakasirCacheTime < CACHE_TTL) {
    return _pakasirCache;
  }

  try {
    const [settings] = await db
      .select()
      .from(gatewaySettings)
      .where(eq(gatewaySettings.providerName, "pakasir"))
      .limit(1);

    _pakasirCache = settings || null;
    _pakasirCacheTime = Date.now();
    return _pakasirCache;
  } catch (error) {
    console.warn("Pakasir settings lookup failed:", error.message);
    return null;
  }
}

/**
 * Resolve Pakasir config from DB or env
 * serverKey = API Key, clientKey = Project Slug
 */
async function resolvePakasirConfig() {
  const settings = await getPakasirSettings();

  if (settings && boolFromSetting(settings.isActive, true) === false) {
    throw new Error("Pakasir dinonaktifkan di Pengaturan Admin");
  }

  const useDbKeys =
    hasUsableKey(settings?.serverKey) && hasUsableKey(settings?.clientKey);

  const apiKey = useDbKeys ? settings.serverKey : process.env.PAKASIR_API_KEY;
  const projectSlug = useDbKeys ? settings.clientKey : process.env.PAKASIR_PROJECT_SLUG;
  const isProduction = useDbKeys
    ? boolFromSetting(settings.isProduction, false)
    : process.env.PAKASIR_IS_PRODUCTION === "true";
  const apiUrl = settings?.apiUrl || process.env.PAKASIR_API_URL || "https://app.pakasir.com";

  if (!apiKey || !projectSlug) {
    throw new Error("Konfigurasi Pakasir belum lengkap (API Key & Project Slug diperlukan)");
  }

  return { apiKey, projectSlug, isProduction, apiUrl };
}

/**
 * Create a Pakasir payment transaction using URL-based flow.
 *
 * Pakasir menyediakan 2 cara:
 *   A) URL-Based: redirect ke https://app.pakasir.com/pay/{slug}/{amount}?order_id=xxx
 *   B) API-Based: POST /api/transactioncreate/{method} — untuk render QR/VA sendiri
 *
 * Kita pakai Opsi A (URL redirect) karena lebih sederhana dan sesuai
 * dengan flow redirect yang sudah ada di checkout.
 *
 * @param {object} params
 * @param {string} params.orderId - External order ID (TELKO-INV-xxx)
 * @param {number} params.amount - Amount in IDR (bilangan bulat)
 * @param {string} params.productName - Product description (informational)
 * @param {string} params.customerPhone - Customer phone (informational)
 * @param {string} params.callbackUrl - Redirect after payment
 */
export async function createPakasirTransaction({
  orderId,
  amount,
  productName,
  customerPhone,
  callbackUrl,
}) {
  const config = await resolvePakasirConfig();

  const roundedAmount = Math.round(amount);
  const redirectUrl = encodeURIComponent(callbackUrl);

  // Pakasir URL-Based payment flow (Docs Bagian B)
  // Format: https://app.pakasir.com/pay/{slug}/{amount}?order_id={order_id}&redirect={url}
  const paymentUrl =
    `${config.apiUrl}/pay/${config.projectSlug}/${roundedAmount}` +
    `?order_id=${encodeURIComponent(orderId)}` +
    `&redirect=${redirectUrl}`;

  return {
    paymentUrl,
    transactionId: orderId,
    rawResponse: null, // URL-based, no API response
  };
}

/**
 * Create a Pakasir payment via API (alternative to URL-based).
 * Returns QR string / VA number for custom rendering.
 *
 * POST https://app.pakasir.com/api/transactioncreate/{method}
 * Body: { "project": "slug", "order_id": "xxx", "amount": 99000, "api_key": "xxx" }
 *
 * @param {string} method - Payment method: qris, bni_va, bri_va, etc.
 * @param {object} params
 */
export async function createPakasirTransactionAPI(method, {
  orderId,
  amount,
}) {
  const config = await resolvePakasirConfig();

  const payload = {
    project: config.projectSlug,
    order_id: orderId,
    amount: Math.round(amount),
    api_key: config.apiKey,
  };

  const res = await fetch(`${config.apiUrl}/api/transactioncreate/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`Pakasir API error: ${res.status}`, errorText);
    throw new Error(`Pakasir transaction failed: ${res.status}`);
  }

  const data = await res.json();

  // Response: { payment: { project, order_id, amount, fee, total_payment, payment_method, payment_number, expired_at } }
  return {
    payment: data.payment || data,
    paymentUrl: `${config.apiUrl}/pay/${config.projectSlug}/${Math.round(amount)}?order_id=${orderId}`,
    transactionId: orderId,
    rawResponse: data,
  };
}

/**
 * Check Pakasir transaction status
 * GET https://app.pakasir.com/api/transactiondetail?project={slug}&amount={amount}&order_id={order_id}&api_key={api_key}
 *
 * @param {string} orderId - External order ID
 * @param {number} amount - Transaction amount (required by Pakasir API)
 */
export async function checkPakasirTransaction(orderId, amount) {
  const config = await resolvePakasirConfig();

  const params = new URLSearchParams({
    project: config.projectSlug,
    amount: String(Math.round(amount)),
    order_id: orderId,
    api_key: config.apiKey,
  });

  const res = await fetch(
    `${config.apiUrl}/api/transactiondetail?${params.toString()}`,
    { method: "GET" }
  );

  if (!res.ok) {
    throw new Error(`Pakasir status check failed: ${res.status}`);
  }

  const data = await res.json();
  // Response: { transaction: { amount, order_id, project, status, payment_method, completed_at } }
  return data.transaction || data;
}

/**
 * Cancel a Pakasir transaction
 * POST https://app.pakasir.com/api/transactioncancel
 * Body: { "project": "slug", "order_id": "xxx", "amount": 99000, "api_key": "xxx" }
 *
 * @param {string} orderId - External order ID
 * @param {number} amount - Transaction amount
 */
export async function cancelPakasirTransaction(orderId, amount) {
  const config = await resolvePakasirConfig();

  const res = await fetch(`${config.apiUrl}/api/transactioncancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project: config.projectSlug,
      order_id: orderId,
      amount: Math.round(amount),
      api_key: config.apiKey,
    }),
  });

  return await res.json();
}

/**
 * Simulate a Pakasir payment (sandbox only)
 * POST https://app.pakasir.com/api/paymentsimulation
 * Body: { "project": "slug", "order_id": "xxx", "amount": 99000, "api_key": "xxx" }
 *
 * @param {string} orderId - External order ID
 * @param {number} amount - Transaction amount
 */
export async function simulatePakasirPayment(orderId, amount) {
  const config = await resolvePakasirConfig();

  if (config.isProduction) {
    throw new Error("Payment simulation hanya tersedia di mode Sandbox");
  }

  const res = await fetch(`${config.apiUrl}/api/paymentsimulation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project: config.projectSlug,
      order_id: orderId,
      amount: Math.round(amount),
      api_key: config.apiKey,
    }),
  });

  return await res.json();
}

/**
 * Check if Pakasir is available and active
 */
export async function isPakasirAvailable() {
  try {
    const settings = await getPakasirSettings();
    if (!settings) return false;
    if (boolFromSetting(settings.isActive, true) === false) return false;
    return hasUsableKey(settings.serverKey) && hasUsableKey(settings.clientKey);
  } catch {
    return false;
  }
}

/**
 * Clear Pakasir settings cache (call after admin updates settings)
 */
export function clearPakasirCache() {
  _pakasirCache = null;
  _pakasirCacheTime = 0;
}
