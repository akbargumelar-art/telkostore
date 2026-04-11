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

export function isValidTelkomselNumber(phone) {
  const cleaned = phone.replace(/\D/g, "");
  const prefixes = [
    "0811", "0812", "0813", "0821", "0822", "0823",
    "0851", "0852", "0853",
  ];
  if (cleaned.length < 10 || cleaned.length > 13) return false;
  return prefixes.some((p) => cleaned.startsWith(p));
}

export function getTelkomselPrefix(phone) {
  const cleaned = phone.replace(/\D/g, "");
  const prefixes = [
    "0811", "0812", "0813", "0821", "0822", "0823",
    "0851", "0852", "0853",
  ];
  return prefixes.find((p) => cleaned.startsWith(p)) || null;
}
