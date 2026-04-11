// ==============================
// TELKO.STORE — Midtrans Helper
// Centralized Midtrans client creation
// ==============================

import midtransClient from "midtrans-client";
import crypto from "crypto";

/**
 * Create a Midtrans Snap client instance
 */
export function createSnapClient() {
  return new midtransClient.Snap({
    isProduction: process.env.MIDTRANS_IS_PRODUCTION === "true",
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
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
export function verifySignature(orderId, statusCode, grossAmount, signatureKey) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  const expected = generateSignature(orderId, statusCode, grossAmount, serverKey);
  return signatureKey === expected;
}
