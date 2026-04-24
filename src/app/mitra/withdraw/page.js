"use client";

import { useEffect, useState } from "react";

import { formatDateTime, formatRupiah } from "@/lib/referral-client";

export default function MitraWithdrawPage() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ bankName: "", accountNumber: "", accountName: "" });
  const [message, setMessage] = useState({ type: "", text: "" });

  const fetchData = async () => {
    setLoading(true);
    const [withdrawalsRes, statsRes] = await Promise.all([
      fetch("/api/mitra/withdrawals", { cache: "no-store" }),
      fetch("/api/mitra/stats", { cache: "no-store" }),
    ]);

    const withdrawalsData = await withdrawalsRes.json();
    const statsData = await statsRes.json();

    if (withdrawalsData.success) setRows(withdrawalsData.data || []);
    if (statsData.success) setStats(statsData.data?.stats || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: "", text: "" });

    const res = await fetch("/api/mitra/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();

    if (data.success) {
      setMessage({ type: "success", text: data.message });
      setShowModal(false);
      setForm({ bankName: "", accountNumber: "", accountName: "" });
      fetchData(); // Refresh data
    } else {
      setMessage({ type: "error", text: data.error || "Gagal mengajukan penarikan." });
    }
    setSubmitting(false);
  };

  const getStatusMeta = (status) => {
    switch (status) {
      case "pending":
        return { label: "Menunggu", className: "bg-amber-50 text-amber-700" };
      case "processing":
        return { label: "Diproses", className: "bg-blue-50 text-blue-700" };
      case "completed":
        return { label: "Sukses", className: "bg-emerald-50 text-emerald-700" };
      case "rejected":
        return { label: "Ditolak", className: "bg-red-50 text-red-700" };
      default:
        return { label: status, className: "bg-gray-50 text-gray-700" };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">Withdraw Saldo</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tarik komisi approved Anda ke rekening bank.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={!stats || stats.approvedCommission <= 0}
          className="rounded-2xl gradient-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          Ajukan Penarikan
        </button>
      </div>

      {message.text && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            message.type === "success"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            Saldo Bisa Ditarik (Approved)
          </p>
          <p className="mt-3 text-2xl font-black text-navy">
            {formatRupiah(stats?.approvedCommission || 0)}
          </p>
        </div>
        <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
            Sedang Diproses (Processing)
          </p>
          <p className="mt-3 text-2xl font-black text-navy">
            {formatRupiah(stats?.processingCommission || 0)}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-navy mb-4">Riwayat Penarikan</h2>
        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-14">
              <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-navy" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm font-medium text-gray-400 shadow-sm">
              Belum ada riwayat penarikan.
            </div>
          ) : (
            rows.map((row) => {
              const meta = getStatusMeta(row.status);
              return (
                <div key={row.id} className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm flex flex-col gap-4 md:flex-row md:items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-black text-navy">{row.id}</p>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${meta.className}`}>
                        {meta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {row.bankName} - {row.accountNumber} ({row.accountName})
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      Diajukan: {formatDateTime(row.createdAt)}
                    </p>
                    {row.adminNotes && (
                      <p className="mt-2 text-xs text-red-600 font-semibold bg-red-50 p-2 rounded-lg inline-block">
                        Catatan Admin: {row.adminNotes}
                      </p>
                    )}
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-xl font-black text-navy">{formatRupiah(row.amount)}</p>
                    {row.processedAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Diproses: {formatDateTime(row.processedAt)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[24px] bg-white p-6 shadow-xl">
            <h3 className="text-xl font-black text-navy">Ajukan Penarikan</h3>
            <p className="mt-2 text-sm text-gray-500">
              Total saldo yang akan ditarik: <strong className="text-navy">{formatRupiah(stats?.approvedCommission || 0)}</strong>
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Nama Bank / E-Wallet
                </label>
                <input
                  type="text"
                  required
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                  placeholder="BCA / Mandiri / DANA / OVO"
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-navy focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Nomor Rekening / HP
                </label>
                <input
                  type="text"
                  required
                  value={form.accountNumber}
                  onChange={(e) => setForm({ ...form, accountNumber: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-navy focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-gray-500">
                  Nama Pemilik Rekening
                </label>
                <input
                  type="text"
                  required
                  value={form.accountName}
                  onChange={(e) => setForm({ ...form, accountName: e.target.value })}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-semibold text-navy focus:border-navy focus:bg-white focus:outline-none focus:ring-2 focus:ring-navy/10"
                />
              </div>
              <div className="mt-8 flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-2xl px-5 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl gradient-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {submitting ? "Memproses..." : "Tarik Sekarang"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
