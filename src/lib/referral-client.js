export function formatRupiah(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function copyToClipboard(value) {
  if (!value) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function getOrderStatusMeta(status) {
  switch (status) {
    case "completed":
      return { label: "Selesai", className: "bg-green-50 text-green-700" };
    case "processing":
      return { label: "Diproses", className: "bg-orange-50 text-orange-700" };
    case "paid":
      return { label: "Dibayar", className: "bg-blue-50 text-blue-700" };
    case "failed":
      return { label: "Gagal", className: "bg-red-50 text-red-700" };
    default:
      return { label: "Pending", className: "bg-yellow-50 text-yellow-700" };
  }
}

export function getCommissionStatusMeta(status) {
  switch (status) {
    case "paid":
      return { label: "Paid", className: "bg-emerald-50 text-emerald-700" };
    case "approved":
      return { label: "Approved", className: "bg-indigo-50 text-indigo-700" };
    case "void":
      return { label: "Void", className: "bg-red-50 text-red-700" };
    default:
      return { label: "Pending", className: "bg-amber-50 text-amber-700" };
  }
}
