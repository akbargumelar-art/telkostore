"use client";

import { Copy, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import PromoVisualCard from "@/components/referral/PromoVisualCard";
import {
  copyToClipboard,
} from "@/lib/referral-client";

export default function MitraPromoPage() {
  const [payload, setPayload] = useState(null);
  const [form, setForm] = useState({
    customReferralAlias: "",
    bannerTitle: "",
    bannerSubtitle: "",
    bannerImageUrl: "",
    promoRedirectPath: "/",
    themeKey: "sunrise",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchPayload = async () => {
    setLoading(true);
    const res = await fetch("/api/mitra/promo", { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      setPayload(data.data);
      setForm({
        customReferralAlias: data.data.profile.customReferralAlias || "",
        bannerTitle: data.data.profile.bannerTitle || "",
        bannerSubtitle: data.data.profile.bannerSubtitle || "",
        bannerImageUrl: data.data.profile.bannerImageUrl || "",
        promoRedirectPath: data.data.profile.promoRedirectPath || "/",
        themeKey: data.data.profile.themeKey || "sunrise",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPayload();
  }, []);

  const liveProfile = useMemo(() => {
    if (!payload?.profile) return null;

    const theme =
      payload.themeOptions?.find((item) => item.key === form.themeKey) ||
      payload.profile.promoTheme;
    const canonicalUrl = payload.profile.links?.canonicalUrl || "";
    const customUrl = form.customReferralAlias
      ? canonicalUrl.replace(
          `/${payload.profile.slug}`,
          `/r/${form.customReferralAlias}`
        )
      : payload.profile.links?.customUrl || "";
    const preferredUrl = customUrl || canonicalUrl;
    const redirectUrl =
      form.promoRedirectPath && form.promoRedirectPath !== "/"
        ? `${preferredUrl}?to=${encodeURIComponent(form.promoRedirectPath)}`
        : preferredUrl;

    return {
      ...payload.profile,
      customReferralAlias: form.customReferralAlias || null,
      bannerTitle: form.bannerTitle,
      bannerSubtitle: form.bannerSubtitle,
      bannerImageUrl: form.bannerImageUrl,
      promoRedirectPath: form.promoRedirectPath,
      promoTheme: theme,
      links: {
        ...payload.profile.links,
        customUrl,
      },
      promoDefaults: {
        ...payload.profile.promoDefaults,
        preferredUrl,
        redirectUrl,
      },
    };
  }, [form, payload]);

  const handleCopy = async (value, label) => {
    const copied = await copyToClipboard(value);
    setMessage(copied ? `${label} berhasil disalin.` : `Gagal menyalin ${label}.`);
    setTimeout(() => setMessage(""), 2200);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/mitra/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (data.success) {
      setPayload((current) =>
        current
          ? {
              ...current,
              profile: data.data,
            }
          : current
      );
      setMessage("Pengaturan promo berhasil disimpan.");
    } else {
      setMessage(data.error || "Gagal menyimpan pengaturan promo.");
    }

    setSaving(false);
  };

  if (loading || !payload || !liveProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-navy" />
      </div>
    );
  }

  const preferredUrl = liveProfile.promoDefaults.preferredUrl;
  const redirectUrl = liveProfile.promoDefaults.redirectUrl;
  const embedSnippet = `<a href="${redirectUrl}" target="_blank" rel="noopener noreferrer">Promo ${liveProfile.displayName}</a>`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Promo & Custom Link</h1>
        <p className="mt-1 text-sm text-gray-500">
          Atur custom link referral, redirect tujuan, dan key visual yang siap dipakai untuk sosial media atau banner website.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSave} className="space-y-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-navy">Pengaturan Link & Visual</h2>
            <p className="mt-1 text-sm text-gray-500">
              Canonical link dibuat otomatis. Kamu bisa aktivasi custom link sendiri di sini.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Canonical Link
              </label>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-navy">
                {liveProfile.links.canonicalUrl}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Custom Link Alias
              </label>
              <input
                type="text"
                value={form.customReferralAlias}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    customReferralAlias: event.target.value.toLowerCase().replace(/\s+/g, "-"),
                  }))
                }
                placeholder="contoh: joko-cirebon"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
              <p className="mt-2 text-xs text-gray-500">
                Jika diisi, link akan aktif di format <span className="font-mono">/r/alias</span>.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Judul Promo
              </label>
              <input
                type="text"
                value={form.bannerTitle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bannerTitle: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Redirect Path
              </label>
              <input
                type="text"
                value={form.promoRedirectPath}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    promoRedirectPath: event.target.value || "/",
                  }))
                }
                placeholder="/promo"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Subtitle Promo
              </label>
              <textarea
                value={form.bannerSubtitle}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bannerSubtitle: event.target.value }))
                }
                rows={3}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                URL Gambar Promo (opsional)
              </label>
              <input
                type="url"
                value={form.bannerImageUrl}
                onChange={(event) =>
                  setForm((current) => ({ ...current, bannerImageUrl: event.target.value }))
                }
                placeholder="https://..."
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Theme Visual
              </label>
              <select
                value={form.themeKey}
                onChange={(event) =>
                  setForm((current) => ({ ...current, themeKey: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              >
                {payload.themeOptions.map((theme) => (
                  <option key={theme.key} value={theme.key}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl gradient-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Menyimpan..." : "Simpan Pengaturan Promo"}
          </button>
        </form>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-navy">Link Siap Pakai</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Copy link favorit atau snippet sederhana untuk banner website.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {[
                { label: "Canonical", value: liveProfile.links.canonicalUrl },
                { label: "Custom", value: liveProfile.links.customUrl || "Belum aktif" },
                { label: "Share + Redirect", value: redirectUrl },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      {item.label}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.value, `${item.label} link`)}
                      className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-navy ring-1 ring-gray-200"
                    >
                      <Copy size={12} />
                      Copy
                    </button>
                  </div>
                  <p className="mt-2 break-all text-sm font-semibold text-navy">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                  HTML Snippet
                </p>
                <p className="mt-2 break-all rounded-2xl bg-white p-3 font-mono text-xs text-gray-700 ring-1 ring-gray-100">
                  {embedSnippet}
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(embedSnippet, "HTML snippet")}
                  className="mt-3 inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-navy ring-1 ring-gray-200"
                >
                  <Copy size={12} />
                  Copy Snippet
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {payload.visualVariants.map((variant) => (
              <div key={variant.key} className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-base font-black text-navy">{variant.label}</h3>
                  <p className="mt-1 text-sm text-gray-500">{variant.description}</p>
                </div>
                <PromoVisualCard
                  variant={variant}
                  profile={liveProfile}
                  preferredUrl={preferredUrl}
                  redirectUrl={redirectUrl}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
