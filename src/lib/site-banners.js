export const BANNER_CATEGORY_OPTIONS = [
  { id: "pulsa", name: "Pulsa" },
  { id: "paket-data", name: "Paket Data" },
  { id: "voucher-internet", name: "Voucher Internet" },
  { id: "voucher-game", name: "Voucher Game" },
];

export const DEFAULT_SITE_BANNERS = [
  {
    id: "banner-home-1",
    title: "Flash Sale Paket Data!",
    subtitle: "Combo Sakti 30GB hanya Rp85.000",
    backgroundStyle: "linear-gradient(135deg, #ED0226 0%, #1A1A4E 100%)",
    ctaText: "Beli Sekarang",
    ctaType: "link",
    ctaLink: "/product/data-combo-30d",
    categoryId: "",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "banner-home-2",
    title: "Pulsa Murah Semua Operator",
    subtitle: "Mulai dari Rp6.500, proses instan",
    backgroundStyle: "linear-gradient(135deg, #1A1A4E 0%, #2D2D6B 100%)",
    ctaText: "Isi Pulsa",
    ctaType: "link",
    ctaLink: "/product/pulsa-5k",
    categoryId: "",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "banner-home-3",
    title: "Top Up Game Murah",
    subtitle: "Mobile Legends, Free Fire, PUBG, dan Genshin",
    backgroundStyle: "linear-gradient(135deg, #0F0F30 0%, #B8001F 100%)",
    ctaText: "Top Up Sekarang",
    ctaType: "category",
    ctaLink: "",
    categoryId: "voucher-game",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "banner-home-4",
    title: "Voucher Internet Hemat",
    subtitle: "25GB hanya Rp85.000 dengan diskon spesial",
    backgroundStyle: "linear-gradient(135deg, #B8001F 0%, #1A1A4E 100%)",
    ctaText: "Lihat Voucher",
    ctaType: "category",
    ctaLink: "",
    categoryId: "voucher-internet",
    sortOrder: 4,
    isActive: true,
  },
];

function toTrimmedString(value) {
  return String(value ?? "").trim();
}

function toSortOrder(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function cloneDefaultSiteBanners() {
  return DEFAULT_SITE_BANNERS.map((banner) => ({ ...banner }));
}

export function normalizeBannerRecord(record = {}) {
  const ctaType = record?.ctaType === "category" ? "category" : "link";
  const fallbackBackground =
    DEFAULT_SITE_BANNERS[0]?.backgroundStyle ||
    "linear-gradient(135deg, #ED0226 0%, #1A1A4E 100%)";

  return {
    id: toTrimmedString(record.id),
    title: toTrimmedString(record.title),
    subtitle: toTrimmedString(record.subtitle),
    ctaText: toTrimmedString(record.ctaText),
    ctaType,
    ctaLink: ctaType === "link" ? toTrimmedString(record.ctaLink) : "",
    categoryId:
      ctaType === "category" ? toTrimmedString(record.categoryId) : "",
    backgroundStyle:
      toTrimmedString(record.backgroundStyle) || fallbackBackground,
    sortOrder: toSortOrder(record.sortOrder),
    isActive: record.isActive !== false,
    createdAt: record.createdAt || "",
    updatedAt: record.updatedAt || "",
  };
}

export function validateBannerPayload(input = {}) {
  const data = normalizeBannerRecord(input);

  if (!data.title) {
    return { error: "Judul slide wajib diisi." };
  }

  if (!data.subtitle) {
    return { error: "Subjudul slide wajib diisi." };
  }

  if (!data.ctaText) {
    return { error: "Teks tombol slide wajib diisi." };
  }

  if (!data.backgroundStyle) {
    return { error: "Background slide wajib diisi." };
  }

  if (data.ctaType === "link" && !data.ctaLink) {
    return { error: "Link CTA wajib diisi untuk slide tipe link." };
  }

  if (data.ctaType === "category" && !data.categoryId) {
    return { error: "Kategori CTA wajib dipilih untuk slide tipe kategori." };
  }

  return {
    data: {
      title: data.title,
      subtitle: data.subtitle || null,
      ctaText: data.ctaText,
      ctaType: data.ctaType,
      ctaLink: data.ctaType === "link" ? data.ctaLink : null,
      categoryId: data.ctaType === "category" ? data.categoryId : null,
      backgroundStyle: data.backgroundStyle,
      sortOrder: data.sortOrder,
      isActive: Boolean(data.isActive),
    },
  };
}

export function sortSiteBanners(items = []) {
  return [...items].sort((left, right) => {
    const sortDiff =
      toSortOrder(left?.sortOrder) - toSortOrder(right?.sortOrder);
    if (sortDiff !== 0) return sortDiff;

    const createdLeft = toTrimmedString(left?.createdAt);
    const createdRight = toTrimmedString(right?.createdAt);
    if (createdLeft !== createdRight) {
      return createdLeft.localeCompare(createdRight);
    }

    return toTrimmedString(left?.id).localeCompare(
      toTrimmedString(right?.id)
    );
  });
}
