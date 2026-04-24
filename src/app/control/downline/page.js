"use client";

import Link from "next/link";
import {
  Copy,
  HandCoins,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { copyToClipboard, formatRupiah } from "@/lib/referral-client";
import { REFERRAL_THEME_OPTIONS } from "@/lib/referral-config";

const initialForm = {
  displayName: "",
  email: "",
  phone: "",
  password: "",
  marginPerTransaction: "50",
  bannerTitle: "",
  bannerSubtitle: "",
  bannerImageUrl: "",
  themeKey: "sunrise",
  promoRedirectPath: "/",
  isReferralActive: true,
};

export default function AdminDownlinePage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState("");
  const [createdInfo, setCreatedInfo] = useState(null);

  const fetchRows = async (nextSearch = search, nextStatus = status) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextSearch) params.set("search", nextSearch);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);

    const res = await fetch(`/api/admin/downline?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();

    if (data.success) {
      setRows(data.data || []);
      setSummary(data.summary || null);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchRows("", "all");
  }, []);

  const handleCopy = async (value, label) => {
    const copied = await copyToClipboard(value);
    setMessage(copied ? `${label} berhasil disalin.` : `Gagal menyalin ${label}.`);
    setTimeout(() => setMessage(""), 2200);
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setCreating(true);

    const res = await fetch("/api/admin/downline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        marginPerTransaction: Number(form.marginPerTransaction || 0),
      }),
    });
    const data = await res.json();

    setCreating(false);
    if (!data.success) {
      setMessage(data.error || "Gagal membuat akun referral.");
      return;
    }

    setCreatedInfo(data.data);
    setShowCreateModal(false);
    setForm(initialForm);
    setMessage("Akun referral berhasil dibuat.");
    fetchRows();
  };

  const statCards = [
    {
      label: "Total Referral",
      value: summary?.total || 0,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Referral Aktif",
      value: summary?.active || 0,
      tone: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Total Klik",
      value: summary?.totalClicks || 0,
      tone: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Approved Commission",
      value: formatRupiah(summary?.approvedCommission || 0),
      tone: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-navy">
            <HandCoins size={24} />
            Referral Downline
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Superadmin membuat akun referral, lalu tiap mitra bisa mengelola custom link di portalnya sendiri.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/control/downline/payout"
            className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-navy shadow-sm"
          >
            Buka Payout
          </Link>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 rounded-2xl gradient-navy px-4 py-3 text-sm font-bold text-white shadow-sm"
          >
            <Plus size={16} />
            Tambah Referral
          </button>
          <button
            onClick={() => fetchRows()}
            className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-700 shadow-sm"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {message ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {message}
        </div>
      ) : null}

      {createdInfo ? (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-black text-emerald-900">Akun Referral Baru Siap Dipakai</h2>
              <p className="mt-1 text-sm text-emerald-800">
                Simpan kredensial awal ini untuk diberikan ke mitra yang baru dibuat.
              </p>
            </div>
            <button
              onClick={() => setCreatedInfo(null)}
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-sm font-bold text-emerald-900 ring-1 ring-emerald-200"
            >
              Tutup Ringkasan
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-200">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Email</p>
              <p className="mt-1 break-all text-sm font-semibold text-navy">{createdInfo.email}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-200">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Password Awal</p>
              <p className="mt-1 break-all text-sm font-semibold text-navy">{createdInfo.password}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-200">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Canonical Link</p>
              <p className="mt-1 break-all text-sm font-semibold text-navy">{createdInfo.links.canonicalUrl}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-emerald-200">
              <button
                onClick={() =>
                  handleCopy(
                    `Email: ${createdInfo.email}\nPassword: ${createdInfo.password}\nLink: ${createdInfo.links.canonicalUrl}`,
                    "kredensial referral"
                  )
                }
                className="flex h-full w-full items-center justify-center rounded-2xl gradient-navy px-4 py-4 text-sm font-bold text-white"
              >
                Copy Semua
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${card.tone}`}>
              {card.label}
            </span>
            <p className="mt-4 text-2xl font-black text-navy">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari nama, email, slug, atau custom link..."
              className="w-full rounded-2xl border border-gray-200 px-10 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
          >
            <option value="all">Semua status</option>
            <option value="active">Aktif</option>
            <option value="inactive">Nonaktif</option>
          </select>
          <button
            onClick={() => fetchRows(search, status)}
            className="rounded-2xl bg-navy px-5 py-3 text-sm font-bold text-white"
          >
            Terapkan
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-navy" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm font-medium text-gray-400 shadow-sm">
            Belum ada akun referral untuk filter ini.
          </div>
        ) : (
          rows.map((row) => (
            <div key={row.profileId} className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-lg font-black text-navy">{row.displayName}</h2>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                        row.isReferralActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {row.isReferralActive ? "Aktif" : "Nonaktif"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {row.email} • Margin {formatRupiah(row.marginPerTransaction)} / transaksi
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleCopy(row.links.canonicalUrl, "canonical link")}
                      className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700"
                    >
                      <Copy size={12} />
                      Copy Canonical
                    </button>
                    <button
                      onClick={() =>
                        handleCopy(
                          row.links.customUrl || row.links.canonicalUrl,
                          "link referral"
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-xl bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700"
                    >
                      <Copy size={12} />
                      Copy Link Aktif
                    </button>
                    <Link
                      href={`/control/downline/${row.profileId}`}
                      className="rounded-xl bg-navy px-3 py-2 text-xs font-bold text-white"
                    >
                      Buka Detail
                    </Link>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[360px] lg:grid-cols-4">
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Klik</p>
                    <p className="mt-1 text-lg font-black text-navy">{row.stats.totalClicks}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Order</p>
                    <p className="mt-1 text-lg font-black text-navy">{row.stats.totalOrders}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Approved</p>
                    <p className="mt-1 text-lg font-black text-navy">{formatRupiah(row.stats.approvedCommission)}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Paid</p>
                    <p className="mt-1 text-lg font-black text-navy">{formatRupiah(row.stats.paidCommission)}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-navy">Tambah Referral Baru</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Superadmin cukup isi data akun. Canonical link akan digenerate otomatis oleh sistem.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-6 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Nama Display</label>
                  <input
                    type="text"
                    value={form.displayName}
                    onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Email Login</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
                    required
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
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Password Awal (opsional)</label>
                  <input
                    type="text"
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Kosongkan untuk generate otomatis"
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
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Theme Visual</label>
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
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Judul Promo Awal</label>
                  <input
                    type="text"
                    value={form.bannerTitle}
                    onChange={(event) => setForm((current) => ({ ...current, bannerTitle: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Subtitle Promo Awal</label>
                  <textarea
                    rows={3}
                    value={form.bannerSubtitle}
                    onChange={(event) => setForm((current) => ({ ...current, bannerSubtitle: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Image URL Promo</label>
                  <input
                    type="url"
                    value={form.bannerImageUrl}
                    onChange={(event) => setForm((current) => ({ ...current, bannerImageUrl: event.target.value }))}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Redirect Path</label>
                  <input
                    type="text"
                    value={form.promoRedirectPath}
                    onChange={(event) => setForm((current) => ({ ...current, promoRedirectPath: event.target.value || "/" }))}
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
                Aktifkan akun referral segera setelah dibuat
              </label>

              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-2xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-2xl gradient-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {creating ? "Membuat..." : "Buat Referral"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
