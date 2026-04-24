import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(number);
}

export function calculateDiscount(original, discounted) {
  return Math.round(((original - discounted) / original) * 100);
}

export function normalizePhoneNumber(phone) {
  return String(phone || "").replace(/\D/g, "");
}

// All Indonesian mobile operator prefixes
const operatorPrefixes = {
  byU: [
    "0851",
  ],
  Telkomsel: [
    "0811", "0812", "0813", "0821", "0822", "0823",
    "0852", "0853",
  ],
  Indosat: [
    "0814", "0815", "0816", "0855", "0856", "0857", "0858",
  ],
  XL: [
    "0817", "0818", "0819", "0859", "0877", "0878",
  ],
  Axis: [
    "0831", "0832", "0833", "0838",
  ],
  Three: [
    "0895", "0896", "0897", "0898", "0899",
  ],
  Smartfren: [
    "0881", "0882", "0883", "0884", "0885", "0886", "0887", "0888", "0889",
  ],
};

const allPrefixes = Object.values(operatorPrefixes).flat();

export function isValidIndonesianNumber(phone) {
  const cleaned = normalizePhoneNumber(phone);
  if (cleaned.length < 10 || cleaned.length > 13) return false;
  return allPrefixes.some((p) => cleaned.startsWith(p));
}

// Keep backward compat alias
export const isValidTelkomselNumber = isValidIndonesianNumber;

export function getOperatorName(phone) {
  const cleaned = normalizePhoneNumber(phone);
  for (const [operator, prefixes] of Object.entries(operatorPrefixes)) {
    if (prefixes.some((p) => cleaned.startsWith(p))) return operator;
  }
  return null;
}

export function getOperatorPrefix(phone) {
  const cleaned = normalizePhoneNumber(phone);
  return allPrefixes.find((p) => cleaned.startsWith(p)) || null;
}

// Backward compat alias
export const getTelkomselPrefix = getOperatorPrefix;

export const VOUCHER_REGION_APPROVAL_TEXT =
  "Voucher internet ini hanya bisa dipakai jika nomor yang diisi berada di Jawa Barat atau Jabodetabek saat redeem.";

export function getVoucherInternetRequirement(product) {
  if (!product || product.categoryId !== "voucher-internet") {
    return {
      type: null,
      label: null,
      hint: null,
      mismatchMessage: null,
      requiresRegionApproval: false,
    };
  }

  const haystack = [
    product.id,
    product.name,
    product.description,
    product.quota,
    product.validity,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/\bby\.?u\b/.test(haystack)) {
    return {
      type: "byu",
      label: "byU",
      hint: "Produk voucher ini khusus untuk nomor byU.",
      mismatchMessage:
        "Nomor tidak cocok dengan produk. Voucher byU hanya untuk nomor byU.",
      requiresRegionApproval: true,
    };
  }

  if (/\b(simpati|telkomsel)\b/.test(haystack)) {
    return {
      type: "simpati",
      label: "Telkomsel selain byU",
      hint: "Produk voucher ini khusus untuk nomor Telkomsel selain byU.",
      mismatchMessage:
        "Nomor tidak cocok dengan produk. Voucher Simpati hanya untuk nomor Telkomsel selain byU.",
      requiresRegionApproval: true,
    };
  }

  return {
    type: "voucher-internet",
    label: "Telkomsel atau byU",
    hint: "Voucher internet ini hanya mendukung nomor Telkomsel atau byU.",
    mismatchMessage:
      "Nomor tidak cocok dengan produk. Voucher internet ini hanya mendukung nomor Telkomsel atau byU.",
    requiresRegionApproval: true,
  };
}

export function validateVoucherInternetCheckout(product, phone) {
  const requirement = getVoucherInternetRequirement(product);

  if (!product || product.categoryId !== "voucher-internet") {
    return {
      valid: true,
      operator: getOperatorName(phone),
      matchedProvider: null,
      requirement,
      message: "",
    };
  }

  const normalizedPhone = normalizePhoneNumber(phone);
  const operator = getOperatorName(normalizedPhone);

  if (!normalizedPhone) {
    return {
      valid: true,
      operator,
      matchedProvider: null,
      requirement,
      message: "",
    };
  }

  if (!isValidIndonesianNumber(normalizedPhone)) {
    return {
      valid: false,
      operator,
      matchedProvider: null,
      requirement,
      message: "Nomor HP harus nomor Indonesia yang valid (10-13 digit).",
    };
  }

  const matchedProvider =
    operator === "byU" ? "byu" : operator === "Telkomsel" ? "simpati" : null;

  if (!matchedProvider) {
    return {
      valid: false,
      operator,
      matchedProvider,
      requirement,
      message: requirement.mismatchMessage,
    };
  }

  if (requirement.type === "byu" && matchedProvider !== "byu") {
    return {
      valid: false,
      operator,
      matchedProvider,
      requirement,
      message: requirement.mismatchMessage,
    };
  }

  if (requirement.type === "simpati" && matchedProvider !== "simpati") {
    return {
      valid: false,
      operator,
      matchedProvider,
      requirement,
      message: requirement.mismatchMessage,
    };
  }

  return {
    valid: true,
    operator,
    matchedProvider,
    requirement,
    message: "",
  };
}
