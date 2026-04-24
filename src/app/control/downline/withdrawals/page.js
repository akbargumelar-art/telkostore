"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateTime, formatRupiah } from "@/lib/referral-client";

export default function AdminWithdrawalsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchRows = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/downline/withdrawals", { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      setRows(data.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const updateStatus = async (id, newStatus) => {
    const adminNotes = prompt(`Masukkan catatan admin (opsional) untuk status ${newStatus}:`);
    if (adminNotes === null) return; // cancelled

    setUpdatingId(id);
    const res = await fetch(`/api/admin/downline/withdrawals/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus, adminNotes }),
    });
    const data = await res.json();
    
    if (data.success) {
      alert(data.message);
      fetchRows();
    } else {
      alert(data.error || "Gagal mengubah status.");
    }
    setUpdatingId(null);
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
          <h1 className="text-2xl font-black text-navy">Manajemen Withdraw</h1>
          <p className="mt-1 text-sm text-gray-500">
            Daftar pengajuan penarikan komisi oleh mitra referral.
          </p>
        </div>
        <Link
          href="/control/downline"
          className="rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
        >
          Kembali ke Downline
        </Link>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-navy" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm font-medium text-gray-400 shadow-sm">
            Tidak ada data withdraw.
          </div>
        ) : (
          rows.map((row) => {
            const meta = getStatusMeta(row.status);
            return (
              <div
                key={row.id}
                className="flex flex-col gap-4 rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="text-base font-black text-navy">{row.displayName || row.slug}</p>
                    <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {row.bankName} - {row.accountNumber}
                  </p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">a.n {row.accountName}</p>
                  <p className="mt-2 text-xs text-gray-400">
                    ID: {row.id} • Diajukan: {formatDateTime(row.createdAt)}
                  </p>
                  {row.adminNotes && (
                    <p className="mt-2 text-xs text-navy font-medium bg-gray-50 p-2 rounded-lg inline-block">
                      Catatan: {row.adminNotes}
                    </p>
                  )}
                </div>

                <div className="flex flex-col md:items-end gap-3">
                  <p className="text-lg font-black text-navy">{formatRupiah(row.amount)}</p>
                  
                  {row.status === "pending" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(row.id, "rejected")}
                        disabled={updatingId === row.id}
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => updateStatus(row.id, "processing")}
                        disabled={updatingId === row.id}
                        className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-100 disabled:opacity-50"
                      >
                        Proses
                      </button>
                    </div>
                  )}

                  {row.status === "processing" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(row.id, "rejected")}
                        disabled={updatingId === row.id}
                        className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        Tolak
                      </button>
                      <button
                        onClick={() => updateStatus(row.id, "completed")}
                        disabled={updatingId === row.id}
                        className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-100 disabled:opacity-50"
                      >
                        Sukses (Tandai Paid)
                      </button>
                    </div>
                  )}

                  {(row.status === "completed" || row.status === "rejected") && row.processedAt && (
                    <p className="text-[11px] text-gray-400">
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
  );
}
