export const REFERRAL_RESERVED_SEGMENTS = [
  "api",
  "_next",
  "account",
  "contact",
  "control",
  "faq",
  "history",
  "mitra",
  "order",
  "payment",
  "product",
  "promo",
  "robots.txt",
  "sitemap.xml",
  "favicon.ico",
];

export const REFERRAL_THEME_OPTIONS = [
  {
    key: "sunrise",
    label: "Sunrise Flash",
    background:
      "linear-gradient(135deg, rgba(237,2,38,1) 0%, rgba(255,120,66,1) 52%, rgba(255,184,0,1) 100%)",
    accent: "#FFE8A3",
    card: "rgba(255,255,255,0.14)",
    cardBorder: "rgba(255,255,255,0.28)",
    badge: "rgba(255,255,255,0.22)",
    text: "#FFF8F4",
    shadow: "rgba(184,0,31,0.28)",
  },
  {
    key: "midnight",
    label: "Midnight Grid",
    background:
      "linear-gradient(135deg, rgba(26,26,78,1) 0%, rgba(30,63,114,1) 55%, rgba(0,123,255,1) 100%)",
    accent: "#91D0FF",
    card: "rgba(255,255,255,0.12)",
    cardBorder: "rgba(145,208,255,0.28)",
    badge: "rgba(145,208,255,0.18)",
    text: "#F6FAFF",
    shadow: "rgba(15,15,48,0.35)",
  },
  {
    key: "ember",
    label: "Ember Gold",
    background:
      "linear-gradient(135deg, rgba(94,21,36,1) 0%, rgba(181,47,47,1) 44%, rgba(255,184,0,1) 100%)",
    accent: "#FFF3C4",
    card: "rgba(255,255,255,0.15)",
    cardBorder: "rgba(255,243,196,0.3)",
    badge: "rgba(255,243,196,0.18)",
    text: "#FFF7EF",
    shadow: "rgba(94,21,36,0.3)",
  },
];

export const PROMO_VISUAL_VARIANTS = [
  {
    key: "social-square",
    label: "Social Square",
    description: "Cocok untuk feed Instagram, Facebook, dan marketplace post.",
    aspectClass: "aspect-square",
    width: 1080,
    height: 1080,
  },
  {
    key: "web-banner",
    label: "Web Banner",
    description: "Lebar ideal untuk banner website, landing page, atau blog sponsor.",
    aspectClass: "aspect-[1200/628]",
    width: 1200,
    height: 628,
  },
  {
    key: "story-card",
    label: "Story Card",
    description: "Format vertikal untuk status WhatsApp, story, dan redirect card.",
    aspectClass: "aspect-[4/5]",
    width: 1080,
    height: 1350,
  },
];

export function getReferralTheme(themeKey) {
  return (
    REFERRAL_THEME_OPTIONS.find((theme) => theme.key === themeKey) ||
    REFERRAL_THEME_OPTIONS[0]
  );
}

export function slugifyReferralSegment(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isReservedReferralSegment(segment) {
  return REFERRAL_RESERVED_SEGMENTS.includes(String(segment || "").toLowerCase());
}

export function isValidReferralSlugFormat(slug) {
  return /^dl-[a-z0-9-]{3,60}$/.test(String(slug || ""));
}

export function isValidReferralAliasFormat(alias) {
  const normalized = String(alias || "");
  return /^[a-z0-9-]{3,60}$/.test(normalized) && !normalized.startsWith("dl-");
}

export function normalizeRedirectPath(value) {
  const raw = String(value || "").trim();

  if (!raw || raw === "/") {
    return "/";
  }

  if (!raw.startsWith("/") || raw.startsWith("//")) {
    return "/";
  }

  if (raw.startsWith("/api/")) {
    return "/";
  }

  return raw;
}

export function buildCanonicalReferralPath(slug) {
  return `/${String(slug || "").replace(/^\/+/, "")}`;
}

export function buildCustomReferralPath(alias) {
  return `/r/${String(alias || "").replace(/^\/+/, "")}`;
}
