import crypto from "crypto";

const DEFAULT_BASE_URL = "https://api.digiflazz.com";
const DIGIFLAZZ_ENDPOINT = "/v1/transaction";

function boolFromEnv(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === "true" || value === "1";
}

export function getDigiflazzConfig() {
  const isProduction = boolFromEnv(process.env.DIGIFLAZZ_IS_PRODUCTION, false);
  const apiKey = isProduction
    ? process.env.DIGIFLAZZ_API_KEY_PROD
    : process.env.DIGIFLAZZ_API_KEY_DEV;

  return {
    username: process.env.DIGIFLAZZ_USERNAME || "",
    apiKey: apiKey || "",
    baseUrl: (process.env.DIGIFLAZZ_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ""),
    isProduction,
    webhookSecret: process.env.DIGIFLAZZ_WEBHOOK_SECRET || "",
    isConfigured: Boolean(process.env.DIGIFLAZZ_USERNAME && apiKey),
  };
}

export function buildDigiflazzRefId(orderId) {
  return String(orderId);
}

export function createDigiflazzSignature(username, apiKey, refId) {
  return crypto
    .createHash("md5")
    .update(`${username}${apiKey}${refId}`)
    .digest("hex");
}

export function normalizeDigiflazzStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "sukses" || normalized === "success") return "success";
  if (normalized === "pending" || normalized === "process") return "pending";
  if (normalized === "gagal" || normalized === "failed" || normalized === "failure") return "failed";

  return "pending";
}

export function mapDigiflazzStatusToOrderStatus(status) {
  const normalized = normalizeDigiflazzStatus(status);
  if (normalized === "success") return "completed";
  if (normalized === "failed") return "failed";
  return "processing";
}

export function normalizeDigiflazzProductConfig(input = {}, categoryId) {
  const supplierName = String(input.supplierName || "").trim().toLowerCase();
  const supplierSkuCode = String(input.supplierSkuCode || "").trim();
  const isDigiflazzEnabled =
    input.isDigiflazzEnabled === true ||
    input.isDigiflazzEnabled === "true" ||
    supplierName === "digiflazz";

  if (categoryId === "voucher-internet" && isDigiflazzEnabled) {
    throw new Error("Voucher internet harus tetap memakai flow voucher internal, bukan Digiflazz");
  }

  if (isDigiflazzEnabled && !supplierSkuCode) {
    throw new Error("SKU Digiflazz wajib diisi jika produk memakai Digiflazz");
  }

  return {
    supplierName: isDigiflazzEnabled ? "digiflazz" : null,
    supplierSkuCode: isDigiflazzEnabled ? supplierSkuCode : null,
    isDigiflazzEnabled,
  };
}

export function isDigiflazzEnabledProduct(product) {
  if (!product) return false;

  return (
    product.categoryId !== "voucher-internet" &&
    (product.isDigiflazzEnabled === true || product.supplierName === "digiflazz") &&
    Boolean(product.supplierSkuCode)
  );
}

function buildDigiflazzTransactionPayload({
  username,
  apiKey,
  buyerSkuCode,
  customerNo,
  refId,
  callbackUrl,
  maxPrice,
  isProduction,
}) {
  const payload = {
    username,
    buyer_sku_code: buyerSkuCode,
    customer_no: customerNo,
    ref_id: refId,
    sign: createDigiflazzSignature(username, apiKey, refId),
  };

  if (!isProduction) {
    payload.testing = true;
  }
  if (Number.isFinite(maxPrice) && maxPrice > 0) {
    payload.max_price = Math.round(maxPrice);
  }
  if (callbackUrl) {
    payload.cb_url = callbackUrl;
  }
  if (String(customerNo || "").includes(".")) {
    payload.allow_dot = true;
  }

  return payload;
}

async function callDigiflazzTransaction(payload) {
  const config = getDigiflazzConfig();
  if (!config.isConfigured) {
    throw new Error("Konfigurasi Digiflazz belum lengkap");
  }

  const endpoint = `${config.baseUrl}${DIGIFLAZZ_ENDPOINT}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  const rawText = await response.text();
  let parsed;

  try {
    parsed = JSON.parse(rawText);
  } catch {
    parsed = { raw: rawText };
  }

  if (!response.ok) {
    throw new Error(
      `Digiflazz request failed: ${response.status} ${response.statusText} - ${rawText.substring(0, 200)}`
    );
  }

  return {
    payload: parsed?.data || parsed,
    rawResponse: parsed,
  };
}

export async function createDigiflazzTransaction({
  buyerSkuCode,
  customerNo,
  refId,
  callbackUrl,
  maxPrice,
}) {
  const config = getDigiflazzConfig();
  const payload = buildDigiflazzTransactionPayload({
    username: config.username,
    apiKey: config.apiKey,
    buyerSkuCode,
    customerNo,
    refId,
    callbackUrl,
    maxPrice,
    isProduction: config.isProduction,
  });

  const result = await callDigiflazzTransaction(payload);
  return {
    ...result,
    rawRequest: payload,
  };
}

export async function checkDigiflazzTransaction({
  buyerSkuCode,
  customerNo,
  refId,
}) {
  const config = getDigiflazzConfig();
  const payload = buildDigiflazzTransactionPayload({
    username: config.username,
    apiKey: config.apiKey,
    buyerSkuCode,
    customerNo,
    refId,
    callbackUrl: null,
    maxPrice: null,
    isProduction: config.isProduction,
  });

  const result = await callDigiflazzTransaction(payload);
  return {
    ...result,
    rawRequest: payload,
  };
}

export function verifyDigiflazzWebhookSignature(rawBody, signatureHeader) {
  const { webhookSecret } = getDigiflazzConfig();
  if (!webhookSecret) return true;
  if (!signatureHeader) return false;

  const digest = crypto
    .createHmac("sha1", webhookSecret)
    .update(rawBody)
    .digest("hex");

  const expected = `sha1=${digest}`;
  return expected === signatureHeader;
}
