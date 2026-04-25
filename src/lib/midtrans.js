// ==============================
// TELKO.STORE — Midtrans Helper
// Centralized Midtrans client creation
// ==============================

import midtransClient from "midtrans-client";
import crypto from "crypto";
import db from "@/db/index.js";
import { gatewaySettings } from "@/db/schema.js";
import { eq } from "drizzle-orm";

let _midtransCache = null;
let _midtransCacheTime = 0;
const CACHE_TTL = 30 * 1000;

function boolFromSetting(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === "true";
}

function hasUsableKey(value) {
  if (!value) return false;
  return !["YOUR_SERVER_KEY", "YOUR_CLIENT_KEY"].includes(value) && !value.includes("XXXX");
}

async function getMidtransSettings() {
  if (_midtransCache && Date.now() - _midtransCacheTime < CACHE_TTL) {
    return _midtransCache;
  }

  try {
    const [settings] = await db
      .select()
      .from(gatewaySettings)
      .where(eq(gatewaySettings.providerName, "midtrans"))
      .limit(1);

    _midtransCache = settings || null;
    _midtransCacheTime = Date.now();
    return _midtransCache;
  } catch (error) {
    console.warn("Midtrans settings lookup failed, falling back to env:", error.message);
    return null;
  }
}

async function resolveMidtransConfig() {
  const settings = await getMidtransSettings();

  if (settings && boolFromSetting(settings.isActive, true) === false) {
    throw new Error("Midtrans dinonaktifkan di Pengaturan Admin");
  }

  const useDbKeys =
    hasUsableKey(settings?.serverKey) && hasUsableKey(settings?.clientKey);
  const serverKey = useDbKeys
    ? settings.serverKey
    : process.env.MIDTRANS_SERVER_KEY;
  const clientKey = useDbKeys
    ? settings.clientKey
    : process.env.MIDTRANS_CLIENT_KEY;
  const isProduction = useDbKeys
    ? boolFromSetting(settings.isProduction, false)
    : process.env.MIDTRANS_IS_PRODUCTION === "true";

  if (!serverKey || !clientKey) {
    throw new Error("Konfigurasi Midtrans belum lengkap");
  }

  return { serverKey, clientKey, isProduction };
}

/**
 * Create a Midtrans Snap client instance
 */
export async function createSnapClient() {
  const config = await resolveMidtransConfig();
  return new midtransClient.Snap({
    isProduction: config.isProduction,
    serverKey: config.serverKey,
    clientKey: config.clientKey,
  });
}

/**
 * Create a Midtrans Core API client (for transaction.status, etc.)
 */
export async function createCoreClient() {
  const config = await resolveMidtransConfig();
  return new midtransClient.CoreApi({
    isProduction: config.isProduction,
    serverKey: config.serverKey,
    clientKey: config.clientKey,
  });
}

/**
 * Verify Midtrans webhook signature
 * @param {string} orderId - Midtrans order_id
 * @param {string} statusCode - HTTP status code from Midtrans
 * @param {string} grossAmount - Transaction amount
 * @param {string} serverKey - Midtrans server key
 * @returns {string} SHA512 hash
 */
export function generateSignature(orderId, statusCode, grossAmount, serverKey) {
  const payload = orderId + statusCode + grossAmount + serverKey;
  return crypto.createHash("sha512").update(payload).digest("hex");
}

/**
 * Verify a Midtrans webhook signature key
 */
export async function verifySignature(orderId, statusCode, grossAmount, signatureKey) {
  const { serverKey } = await resolveMidtransConfig();
  const expected = generateSignature(orderId, statusCode, grossAmount, serverKey);

  // Timing-safe comparison to prevent timing attacks
  if (!signatureKey || signatureKey.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signatureKey, "utf8"),
      Buffer.from(expected, "utf8")
    );
  } catch {
    return false;
  }
}

export function clearMidtransCache() {
  _midtransCache = null;
  _midtransCacheTime = 0;
}
