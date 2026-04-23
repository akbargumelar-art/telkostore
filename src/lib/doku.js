// ==============================
// TELKO.STORE — DOKU Payment Gateway Helper
// https://www.doku.com — Enterprise payment gateway
//
// Uses DOKU Checkout API v1 (payment page redirect flow)
// Auth: HMAC-SHA256 signature with Client-Id + Secret Key
// ==============================

import crypto from "crypto";
import db from "@/db/index.js";
import { gatewaySettings } from "@/db/schema.js";
import { eq } from "drizzle-orm";

let _dokuCache = null;
let _dokuCacheTime = 0;
const CACHE_TTL = 30 * 1000;

function boolFromSetting(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === "true";
}

function hasUsableKey(value) {
  if (!value) return false;
  return !["YOUR_CLIENT_ID", "YOUR_SECRET_KEY"].includes(value) && !value.includes("XXXX");
}

/**
 * Get DOKU settings from database (cached)
 */
async function getDokuSettings() {
  if (_dokuCache && Date.now() - _dokuCacheTime < CACHE_TTL) {
    return _dokuCache;
  }

  try {
    const [settings] = await db
      .select()
      .from(gatewaySettings)
      .where(eq(gatewaySettings.providerName, "doku"))
      .limit(1);

    _dokuCache = settings || null;
    _dokuCacheTime = Date.now();
    return _dokuCache;
  } catch (error) {
    console.warn("DOKU settings lookup failed:", error.message);
    return null;
  }
}

/**
 * Resolve DOKU config from DB or env
 * serverKey = Secret Key, clientKey = Client ID
 */
async function resolveDokuConfig() {
  const settings = await getDokuSettings();

  if (settings && boolFromSetting(settings.isActive, true) === false) {
    throw new Error("DOKU dinonaktifkan di Pengaturan Admin");
  }

  const useDbKeys =
    hasUsableKey(settings?.serverKey) && hasUsableKey(settings?.clientKey);

  const secretKey = useDbKeys ? settings.serverKey : process.env.DOKU_SECRET_KEY;
  const clientId = useDbKeys ? settings.clientKey : process.env.DOKU_CLIENT_ID;
  const isProduction = useDbKeys
    ? boolFromSetting(settings.isProduction, false)
    : process.env.DOKU_IS_PRODUCTION === "true";

  if (!secretKey || !clientId) {
    throw new Error("Konfigurasi DOKU belum lengkap (Client ID & Secret Key diperlukan)");
  }

  const apiUrl = isProduction
    ? "https://api.doku.com"
    : "https://api-sandbox.doku.com";

  return { secretKey, clientId, isProduction, apiUrl };
}

/**
 * Generate DOKU API signature (HMAC-SHA256)
 *
 * Format:
 *   Client-Id:{clientId}\n
 *   Request-Id:{requestId}\n
 *   Request-Timestamp:{timestamp}\n
 *   Request-Target:{target}\n
 *   Digest:{sha256Base64OfBody}
 *
 * @param {string} clientId
 * @param {string} requestId
 * @param {string} timestamp - ISO8601 UTC format (e.g. "2024-01-01T00:00:00Z")
 * @param {string} target - Request path (e.g. "/checkout/v1/payment")
 * @param {string} body - Raw JSON body string
 * @param {string} secretKey
 * @returns {string} HMACSHA256={base64Signature}
 */
export function generateDokuSignature(clientId, requestId, timestamp, target, body, secretKey) {
  // 1. Generate body digest
  const digest = crypto.createHash("sha256").update(body).digest("base64");

  // 2. Build signature component string
  const components = [
    `Client-Id:${clientId}`,
    `Request-Id:${requestId}`,
    `Request-Timestamp:${timestamp}`,
    `Request-Target:${target}`,
    `Digest:${digest}`,
  ].join("\n");

  // 3. HMAC-SHA256
  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(components)
    .digest("base64");

  return `HMACSHA256=${signature}`;
}

/**
 * Verify DOKU webhook notification signature
 *
 * @param {string} rawBody - Raw request body string
 * @param {object} headers - Request headers
 * @param {string} requestTarget - Webhook endpoint path (e.g. "/api/webhook/doku")
 * @returns {Promise<boolean>}
 */
export async function verifyDokuWebhookSignature(rawBody, headers, requestTarget) {
  try {
    const { secretKey, clientId } = await resolveDokuConfig();

    const receivedClientId = headers.get("client-id") || headers.get("Client-Id");
    const requestId = headers.get("request-id") || headers.get("Request-Id");
    const requestTimestamp = headers.get("request-timestamp") || headers.get("Request-Timestamp");
    const receivedSignature = headers.get("signature") || headers.get("Signature");

    if (!receivedSignature || !requestId || !requestTimestamp) {
      console.error("DOKU webhook missing required headers");
      return false;
    }

    // Verify client ID matches
    if (receivedClientId && receivedClientId !== clientId) {
      console.error("DOKU webhook client ID mismatch");
      return false;
    }

    // Generate digest
    const digest = crypto.createHash("sha256").update(rawBody).digest("base64");

    // Build component string
    const components = [
      `Client-Id:${clientId}`,
      `Request-Id:${requestId}`,
      `Request-Timestamp:${requestTimestamp}`,
      `Request-Target:${requestTarget}`,
      `Digest:${digest}`,
    ].join("\n");

    // Compute expected signature
    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(components)
      .digest("base64");

    // Extract signature value (remove "HMACSHA256=" prefix if present)
    const receivedSigValue = receivedSignature.replace("HMACSHA256=", "");

    // Timing-safe comparison
    if (receivedSigValue.length !== expectedSignature.length) return false;
    return crypto.timingSafeEqual(
      Buffer.from(receivedSigValue, "utf8"),
      Buffer.from(expectedSignature, "utf8")
    );
  } catch (error) {
    console.error("DOKU signature verification failed:", error.message);
    return false;
  }
}

/**
 * Create a DOKU Checkout payment (redirect to DOKU payment page)
 *
 * POST {apiUrl}/checkout/v1/payment
 *
 * @param {object} params
 * @param {string} params.orderId - External order ID (TELKO-INV-xxx)
 * @param {number} params.amount - Amount in IDR
 * @param {string} params.productName - Product description
 * @param {string} params.customerPhone - Customer phone
 * @param {string} params.callbackUrl - Redirect after payment (success)
 * @param {string} params.failedUrl - Redirect on failure
 */
export async function createDokuTransaction({
  orderId,
  amount,
  productName,
  customerPhone,
  callbackUrl,
  failedUrl,
}) {
  const config = await resolveDokuConfig();

  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString().split(".")[0] + "Z";
  const target = "/checkout/v1/payment";

  const payload = {
    order: {
      invoice_number: orderId,
      amount: Math.round(amount),
      line_items: [
        {
          name: productName.substring(0, 50),
          price: Math.round(amount),
          quantity: 1,
        },
      ],
      callback_url: callbackUrl,
      ...(failedUrl && { failed_url: failedUrl }),
      auto_redirect: true,
    },
    customer: {
      id: customerPhone,
      name: customerPhone,
      phone: customerPhone,
    },
    payment: {
      payment_due_date: 1440, // 24 hours in minutes
    },
  };

  const bodyStr = JSON.stringify(payload);
  const signature = generateDokuSignature(
    config.clientId,
    requestId,
    timestamp,
    target,
    bodyStr,
    config.secretKey
  );

  const digest = crypto.createHash("sha256").update(bodyStr).digest("base64");

  const res = await fetch(`${config.apiUrl}${target}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Client-Id": config.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signature,
      Digest: digest,
    },
    body: bodyStr,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`DOKU API error: ${res.status}`, errorText);
    throw new Error(`DOKU payment creation failed: ${res.status}`);
  }

  const data = await res.json();

  // DOKU response contains payment.url for redirect
  const paymentUrl =
    data?.response?.payment?.url ||
    data?.payment?.url ||
    data?.url ||
    null;

  if (!paymentUrl) {
    console.error("DOKU response missing payment URL:", JSON.stringify(data));
    throw new Error("DOKU payment URL not found in response");
  }

  return {
    paymentUrl,
    transactionId: orderId,
    rawResponse: data,
  };
}

/**
 * Check if DOKU is available and active
 */
export async function isDokuAvailable() {
  try {
    const settings = await getDokuSettings();
    if (!settings) return false;
    if (boolFromSetting(settings.isActive, true) === false) return false;
    return hasUsableKey(settings.serverKey) && hasUsableKey(settings.clientKey);
  } catch {
    return false;
  }
}

/**
 * Clear DOKU settings cache (call after admin updates settings)
 */
export function clearDokuCache() {
  _dokuCache = null;
  _dokuCacheTime = 0;
}
