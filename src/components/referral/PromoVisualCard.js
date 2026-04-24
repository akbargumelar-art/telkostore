"use client";

import { Link as LinkIcon, Megaphone, Sparkles } from "lucide-react";

export default function PromoVisualCard({
  variant,
  profile,
  preferredUrl,
  redirectUrl,
}) {
  const theme = profile?.promoTheme || {};
  const title =
    profile?.bannerTitle ||
    `Promo digital hemat bareng ${profile?.displayName || "Mitra Telko.Store"}`;
  const subtitle =
    profile?.bannerSubtitle ||
    "Pulsa, paket data, dan voucher internet resmi dengan checkout cepat.";
  const displayName = profile?.displayName || profile?.name || "Mitra Telko.Store";
  const shareUrl = redirectUrl || preferredUrl || profile?.links?.customUrl || profile?.links?.canonicalUrl;

  return (
    <div
      className={`${variant.aspectClass} relative overflow-hidden rounded-[28px] p-6 text-white shadow-2xl`}
      style={{
        background: theme.background,
        boxShadow: `0 30px 80px ${theme.shadow || "rgba(26,26,78,0.22)"}`,
      }}
    >
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(255,255,255,0.18) 0, rgba(255,255,255,0.18) 8%, transparent 8%, transparent 16%)",
          backgroundSize: "24px 24px",
        }}
      />
      <div
        className="absolute -top-10 -right-10 h-40 w-40 rounded-full blur-2xl"
        style={{ backgroundColor: theme.accent || "#FFE8A3", opacity: 0.35 }}
      />
      <div
        className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full blur-2xl"
        style={{ backgroundColor: theme.badge || "rgba(255,255,255,0.22)", opacity: 0.5 }}
      />

      <div className="relative flex h-full flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{
              backgroundColor: theme.badge || "rgba(255,255,255,0.18)",
              borderColor: theme.cardBorder || "rgba(255,255,255,0.3)",
            }}
          >
            <Megaphone size={12} />
            Telko.Store Referral
          </div>
          <div
            className="rounded-2xl border px-3 py-2 text-right"
            style={{
              backgroundColor: theme.card || "rgba(255,255,255,0.14)",
              borderColor: theme.cardBorder || "rgba(255,255,255,0.3)",
            }}
          >
            <p className="text-[10px] uppercase tracking-[0.18em] text-white/75">
              Mitra
            </p>
            <p className="text-sm font-black leading-tight">{displayName}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="max-w-[85%]">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/14 px-3 py-1 text-[11px] font-semibold text-white/90">
              <Sparkles size={12} />
              Link promo personal aktif
            </p>
            <h3 className="mt-3 text-2xl font-black leading-tight md:text-[30px]">
              {title}
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 md:text-[15px]">
              {subtitle}
            </p>
          </div>

          {profile?.bannerImageUrl ? (
            <div
              className="absolute bottom-20 right-6 hidden w-28 overflow-hidden rounded-[24px] border border-white/25 bg-white/10 shadow-lg backdrop-blur md:block"
              style={{ aspectRatio: "4 / 5" }}
            >
              <img
                src={profile.bannerImageUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}
        </div>

        <div
          className="mt-6 rounded-[24px] border p-4 backdrop-blur"
          style={{
            backgroundColor: theme.card || "rgba(255,255,255,0.14)",
            borderColor: theme.cardBorder || "rgba(255,255,255,0.28)",
          }}
        >
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/75">
            <LinkIcon size={12} />
            Link Siap Share
          </div>
          <p className="mt-2 break-all text-sm font-semibold leading-relaxed text-white">
            {shareUrl}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-white/80">
            <span className="rounded-full bg-black/15 px-2.5 py-1">
              {variant.label}
            </span>
            <span className="rounded-full bg-black/15 px-2.5 py-1">
              Redirect: {profile?.promoRedirectPath || "/"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
