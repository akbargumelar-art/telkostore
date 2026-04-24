"use client";

import { useParams, useRouter } from "next/navigation";
import { Copy, KeyRound, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import PromoVisualCard from "@/components/referral/PromoVisualCard";
import {
  copyToClipboard,
  formatDateTime,
  formatRupiah,
  getCommissionStatusMeta,
  getOrderStatusMeta,
} from "@/lib/referral-client";
import { PROMO_VISUAL_VARIANTS, REFERRAL_THEME_OPTIONS } from "@/lib/referral-config";

export default function AdminDownlineDetailPage() {
  const params = useParams();
  const router = useRouter();
  const profileId = params?.id;
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [resetPasswordInfo, setResetPasswordInfo] = useState("");

  const fetchDetail = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/downline/${profileId}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      setDetail(data.data);
      setForm({
        displayName: data.data.profile.displayName || "",
        email: data.data.profile.email || "",
        phone: data.data.profile.phone || "",
        marginPerTransaction: String(data.data.profile.marginPerTransaction || 0),
        isReferralActive: Boolean(data.data.profile.isReferralActive),
        slug: data.data.profile.slug || "",
        customReferralAlias: data.data.profile.customReferralAlias || "",
        bannerTitle: data.data.profile.bannerTitle || "",
        bannerSubtitle: data.data.profile.bannerSubtitle || "",
        bannerImageUrl: data.data.profile.bannerImageUrl || "",
        themeKey: data.data.profile.themeKey || "sunrise",
        promoRedirectPath: data.data.profile.promoRedirectPath || "/",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (profileId) {
      fetchDetail();
    }
  }, [profileId]);

  const previewProfile = useMemo(() => {
    if (!detail?.profile || !form) return null;

    const theme =
      REFERRAL_THEME_OPTIONS.find((item) => item.key === form.themeKey) ||
      detail.profile.promoTheme;
    const canonicalUrl = detail.profile.links.canonicalUrl.replace(
      `/${detail.profile.slug}`,
      `/${form.slug || detail.profile.slug}`
    );
    const customUrl = form.customReferralAlias
      ? canonicalUrl.replace(`/${detail.profile.slug}`, `/r/${form.customReferralAlias}`)
      : detail.profile.links.customUrl || "";
    const preferredUrl = customUrl || canonicalUrl;
    const redirectUrl =
      form.promoRedirectPath && form.promoRedirectPath !== "/"
        ? `${preferredUrl}?to=${encodeURIComponent(form.promoRedirectPath)}`
        : preferredUrl;

    return {
      ...detail.profile,
      ...form,
      marginPerTransaction: Number(form.marginPerTransaction || 0),
      promoTheme: theme,
      links: {
        ...detail.profile.links,
        customUrl,
      },
      promoDefaults: {
        ...detail.profile.promoDefaults,
        preferredUrl,
        redirectUrl,
      },
    };
  }, [detail, form]);

  const handleSave = async (event) => {
    event.preventDefault();
    setSaving(true);

    const res = await fetch(`/api/admin/downline/${profileId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        marginPerTransaction: Number(form.marginPerTransaction || 0),
      }),
    });
    const data = await res.json();
    setSaving(false);

    if (data.success) {
      setDetail(data.data);
      setMessage("Profil referral berhasil diperbarui.");
    } else {
      setMessage(data.error || "Gagal menyimpan perubahan.");
    }
  };

  const handleResetPassword = async () => {
    const res = await fetch(`/api/admin/downline/${profileId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();

    if (data.success) {
      setResetPasswordInfo(data.data.password);
      setMessage("Password referral berhasil direset.");
    } else {
      setMessage(data.error || "Gagal reset password.");
    }
  };

  const handleCopy = async (value, label) => {
    const copied = await copyToClipboard(value);
    setMessage(copied ? `${label} berhasil disalin.` : `Gagal menyalin ${label}.`);
  };

  const handleDelete = async () => {
    if (!window.confirm("Yakin ingin menghapus mitra ini? Semua data terkait (akun, komisi, dll) akan terhapus dan tidak dapat dikembalikan.")) {
      return;
    }

    setDeleting(true);
    const res = await fetch(`/api/admin/downline/${profileId}`, {
      method: "DELETE",
    });
    const data = await res.json();

    if (data.success) {
      alert("Referral berhasil dihapus.");
      router.push("/control/downline");
    } else {
      setMessage(data.error || "Gagal menghapus referral.");
      setDeleting(false);
    }
  };

  if (loading || !detail || !form || !previewProfile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-navy" />
      </div>
    );
  }

  const { profile, recentOrders, commissions } = detail;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">{profile.displayName}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola margin, status, slug canonical, dan profil promo referral.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCopy(profile.links.canonicalUrl, "canonical link")}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-navy"
          >
            <Copy size={15} />
            Copy Canonical
          </button>
          <button
            onClick={handleResetPassword}
            className="inline-flex items-center gap-2 rounded-2xl bg-navy px-4 py-3 text-sm font-bold text-white"
          >
            <KeyRound size={15} />
            Reset Password
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-100 disabled:opacity-60"
          >
            <Trash2 size={15} />
            {deleting ? "Menghapus..." : "Hapus Mitra"}
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {message}
        </div>
      ) : null}

      {resetPasswordInfo ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          Password baru: <span className="font-mono">{resetPasswordInfo}</span>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Klik Link", value: profile.stats.totalClicks },
          { label: "Total Order", value: profile.stats.totalOrders },
          { label: "Approved", value: formatRupiah(profile.stats.approvedCommission) },
          { label: "Paid", value: formatRupiah(profile.stats.paidCommission) },
        ].map((card) => (
          <div key={card.label} className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{card.label}</p>
            <p className="mt-3 text-2xl font-black text-navy">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleSave} className="space-y-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-navy">Edit Profil Referral</h2>
            <p className="mt-1 text-sm text-gray-500">
              Mitra tetap bisa edit custom link di portal sendiri, tapi superadmin masih dapat override dari sini.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Nama Display</label>
              <input
                type="text"
                value={form.displayName}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Nomor HP</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Margin per Transaksi</label>
              <input
                type="number"
                min="0"
                value={form.marginPerTransaction}
                onChange={(event) => setForm((current) => ({ ...current, marginPerTransaction: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Slug Canonical</label>
              <input
                type="text"
                value={form.slug}
                onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Custom Alias</label>
              <input
                type="text"
                value={form.customReferralAlias}
                onChange={(event) =>
                  setForm((current) => ({ ...current, customReferralAlias: event.target.value.toLowerCase() }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Theme</label>
              <select
                value={form.themeKey}
                onChange={(event) => setForm((current) => ({ ...current, themeKey: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              >
                {REFERRAL_THEME_OPTIONS.map((theme) => (
                  <option key={theme.key} value={theme.key}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Redirect Path</label>
              <input
                type="text"
                value={form.promoRedirectPath}
                onChange={(event) => setForm((current) => ({ ...current, promoRedirectPath: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Judul Promo</label>
              <input
                type="text"
                value={form.bannerTitle}
                onChange={(event) => setForm((current) => ({ ...current, bannerTitle: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Subtitle Promo</label>
              <textarea
                rows={3}
                value={form.bannerSubtitle}
                onChange={(event) => setForm((current) => ({ ...current, bannerSubtitle: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Image URL Promo</label>
              <input
                type="url"
                value={form.bannerImageUrl}
                onChange={(event) => setForm((current) => ({ ...current, bannerImageUrl: event.target.value }))}
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-3 rounded-2xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={form.isReferralActive}
              onChange={(event) => setForm((current) => ({ ...current, isReferralActive: event.target.checked }))}
              className="h-4 w-4 rounded border-gray-300"
            />
            Referral aktif
          </label>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl gradient-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </form>

        <div className="space-y-5">
          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-navy">Preview Promo Referral</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Preview ini mengikuti setting yang sedang diedit di form.
                </p>
              </div>
            </div>
            <PromoVisualCard
              variant={PROMO_VISUAL_VARIANTS[0]}
              profile={previewProfile}
              preferredUrl={previewProfile.promoDefaults.preferredUrl}
              redirectUrl={previewProfile.promoDefaults.redirectUrl}
            />
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-navy">Order Referral Terbaru</h2>
            <div className="mt-4 space-y-3">
              {recentOrders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                  Belum ada order referral.
                </div>
              ) : (
                recentOrders.map((order) => {
                  const statusMeta = getOrderStatusMeta(order.status);
                  return (
                    <div key={order.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-navy">{order.productName}</p>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {order.id} • {formatDateTime(order.createdAt)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-navy">
                        {formatRupiah(order.productPrice)} • Profit {formatRupiah(order.downlineMarginSnapshot)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-navy">Ledger Komisi</h2>
            <div className="mt-4 space-y-3">
              {commissions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                  Belum ada komisi referral.
                </div>
              ) : (
                commissions.map((item) => {
                  const statusMeta = getCommissionStatusMeta(item.status);
                  return (
                    <div key={item.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-navy">{item.orderId}</p>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {item.productName} • {formatDateTime(item.createdOrderAt)}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-navy">
                        {formatRupiah(item.commissionAmount)}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
