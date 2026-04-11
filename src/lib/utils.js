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
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 10 || cleaned.length > 13) return false;
  return allPrefixes.some((p) => cleaned.startsWith(p));
}

// Keep backward compat alias
export const isValidTelkomselNumber = isValidIndonesianNumber;

export function getOperatorName(phone) {
  const cleaned = phone.replace(/\D/g, "");
  for (const [operator, prefixes] of Object.entries(operatorPrefixes)) {
    if (prefixes.some((p) => cleaned.startsWith(p))) return operator;
  }
  return null;
}

export function getOperatorPrefix(phone) {
  const cleaned = phone.replace(/\D/g, "");
  return allPrefixes.find((p) => cleaned.startsWith(p)) || null;
}

// Backward compat alias
export const getTelkomselPrefix = getOperatorPrefix;
