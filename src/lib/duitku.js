import crypto from "crypto";
import db from "@/db/index.js";
import { gatewaySettings } from "@/db/schema.js";
import { eq } from "drizzle-orm";

const DUITKU_PRODUCTION_URL = "https://api-prod.duitku.com";
const DUITKU_SANDBOX_URL = "https://api-sandbox.duitku.com";
const CREATE_INVOICE_PATH = "/api/merchant/createInvoice";
const CACHE_TTL = 30 * 1000;

let duitkuCache = null;
let duitkuCacheTime = 0;

function boolFromSetting(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return value === true || value === 1 || value === "true";
}

function hasUsableKey(value) {
  if (!value) return false;
  return ![
    "YOUR_DUITKU_API_KEY",
    "YOUR_DUITKU_MERCHANT_CODE",
    "YOUR_API_KEY",
    "YOUR_MERCHANT_CODE",
  ].includes(value) && !String(value).includes("XXXX");
}

async function getDuitkuSettings() {
  if (duitkuCache && Date.now() - duitkuCacheTime < CACHE_TTL) {
    return duitkuCache;
  }

  try {
    const [settings] = await db
      .select()
      .from(gatewaySettings)
      .where(eq(gatewaySettings.providerName, "duitku"))
      .limit(1);

    duitkuCache = settings || null;
    duitkuCacheTime = Date.now();
    return duitkuCache;
  } catch (error) {
    console.warn("Duitku settings lookup failed:", error.message);
    return null;
  }
}

async function resolveDuitkuConfig() {
  const settings = await getDuitkuSettings();

  if (settings && boolFromSetting(settings.isActive, true) === false) {
    throw new Error("Duitku dinonaktifkan di Pengaturan Admin");
  }

  const useDbKeys =
    hasUsableKey(settings?.serverKey) && hasUsableKey(settings?.clientKey);

  const apiKey = useDbKeys ? settings.serverKey : process.env.DUITKU_API_KEY;
  const merchantCode = useDbKeys
    ? settings.clientKey
    : process.env.DUITKU_MERCHANT_CODE;
  const isProduction = useDbKeys
    ? boolFromSetting(settings.isProduction, false)
    : process.env.DUITKU_IS_PRODUCTION === "true";

  if (!apiKey || !merchantCode) {
    throw new Error("Konfigurasi Duitku belum lengkap (Merchant Code & API Key diperlukan)");
  }

  return {
    apiKey,
    merchantCode,
    isProduction,
    apiUrl:
      settings?.apiUrl ||
      (isProduction ? DUITKU_PRODUCTION_URL : DUITKU_SANDBOX_URL),
  };
}

export function generateDuitkuRequestSignature(merchantCode, timestamp, apiKey) {
  return crypto
    .createHash("sha256")
    .update(`${merchantCode}${timestamp}${apiKey}`)
    .digest("hex");
}

export function generateDuitkuCallbackSignature(
  merchantCode,
  amount,
  merchantOrderId,
  apiKey
) {
  return crypto
    .createHash("md5")
    .update(`${merchantCode}${amount}${merchantOrderId}${apiKey}`)
    .digest("hex");
}

export async function verifyDuitkuCallbackSignature({
  merchantCode,
  amount,
  merchantOrderId,
  signature,
}) {
  try {
    const config = await resolveDuitkuConfig();

    if (!merchantCode || !amount || !merchantOrderId || !signature) {
      return false;
    }

    if (merchantCode !== config.merchantCode) {
      return false;
    }

    const expected = generateDuitkuCallbackSignature(
      merchantCode,
      amount,
      merchantOrderId,
      config.apiKey
    );

    if (signature.length !== expected.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      Buffer.from(signature.toLowerCase(), "utf8"),
      Buffer.from(expected.toLowerCase(), "utf8")
    );
  } catch (error) {
    console.error("Duitku callback verification failed:", error.message);
    return false;
  }
}

export async function createDuitkuInvoice({
  orderId,
  amount,
  productName,
  customerPhone,
  customerEmail,
  callbackUrl,
  returnUrl,
  customerName = "Pelanggan Telko",
}) {
  const config = await resolveDuitkuConfig();
  const timestamp = Date.now().toString();
  const signature = generateDuitkuRequestSignature(
    config.merchantCode,
    timestamp,
    config.apiKey
  );

  const safeCustomerName = String(customerName || "Pelanggan Telko")
    .trim()
    .slice(0, 20);

  const payload = {
    paymentAmount: Math.round(amount),
    merchantOrderId: orderId,
    productDetails: String(productName || "Telko Store").slice(0, 255),
    email: customerEmail,
    phoneNumber: customerPhone,
    itemDetails: [
      {
        name: String(productName || "Produk").slice(0, 100),
        price: Math.round(amount),
        quantity: 1,
      },
    ],
    customerVaName: safeCustomerName,
    customerDetail: {
      firstName: safeCustomerName,
      email: customerEmail,
      phoneNumber: customerPhone,
    },
    callbackUrl,
    returnUrl,
  };

  const res = await fetch(`${config.apiUrl}${CREATE_INVOICE_PATH}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-duitku-signature": signature,
      "x-duitku-timestamp": timestamp,
      "x-duitku-merchantcode": config.merchantCode,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await res.text();

  if (!res.ok) {
    throw new Error(
      `Duitku createInvoice failed: ${res.status} ${responseText.slice(0, 200)}`
    );
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error("Duitku returned invalid JSON response");
  }

  if (!data?.paymentUrl) {
    throw new Error(
      data?.statusMessage || "Duitku paymentUrl tidak ditemukan pada response"
    );
  }

  return {
    paymentUrl: data.paymentUrl,
    reference: data.reference || null,
    merchantCode: data.merchantCode || config.merchantCode,
    amount: data.amount || Math.round(amount),
    statusCode: data.statusCode || null,
    statusMessage: data.statusMessage || null,
    rawResponse: data,
  };
}

export async function isDuitkuAvailable() {
  try {
    const settings = await getDuitkuSettings();
    if (!settings) return false;
    if (boolFromSetting(settings.isActive, true) === false) return false;
    return hasUsableKey(settings.serverKey) && hasUsableKey(settings.clientKey);
  } catch {
    return false;
  }
}

export function clearDuitkuCache() {
  duitkuCache = null;
  duitkuCacheTime = 0;
}
