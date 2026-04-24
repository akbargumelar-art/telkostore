"use client";

import { useEffect, useState } from "react";

import { formatDateTime, formatRupiah } from "@/lib/referral-client";

export default function AdminDownlinePayoutPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const fetchRows = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/downline/payout", { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      setRows(data.data || []);
      setSummary(data.summary || null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const toggleSelected = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const handleSubmit = async () => {
    if (selectedIds.length === 0) {
      setMessage("Pilih minimal satu komisi.");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/admin/downline/payout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commissionIds: selectedIds }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (data.success) {
      setMessage(data.message || "Payout berhasil diproses.");
      setSelectedIds([]);
      fetchRows();
    } else {
      setMessage(data.error || "Gagal memproses payout.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">Payout Referral</h1>
          <p className="mt-1 text-sm text-gray-500">
            Tandai komisi approved sebagai paid setelah payout manual dilakukan.
          </p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-2xl gradient-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
        >
          {submitting ? "Memproses..." : `Tandai Paid (${selectedIds.length})`}
        </button>
      </div>

      {message ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Approved Items</p>
          <p className="mt-3 text-2xl font-black text-navy">{summary?.totalItems || 0}</p>
        </div>
        <div className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">Nilai Komisi</p>
          <p className="mt-3 text-2xl font-black text-navy">{formatRupiah(summary?.totalAmount || 0)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-navy" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm font-medium text-gray-400 shadow-sm">
            Tidak ada komisi approved yang menunggu payout.
          </div>
        ) : (
          rows.map((row) => (
            <label
              key={row.id}
              className="flex cursor-pointer flex-col gap-4 rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(row.id)}
                  onChange={() => toggleSelected(row.id)}
                  className="mt-1 h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <p className="text-base font-black text-navy">{row.displayName || row.slug}</p>
                  <p className="mt-1 text-sm text-gray-500">
                    {row.orderId} • {row.productName}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Approved {formatDateTime(row.approvedAt)}
                  </p>
                </div>
              </div>

              <div className="text-left md:text-right">
                <p className="text-lg font-black text-navy">{formatRupiah(row.commissionAmount)}</p>
                <p className="text-xs text-gray-500">
                  {row.customAlias ? `/r/${row.customAlias}` : `/${row.slug}`}
                </p>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
