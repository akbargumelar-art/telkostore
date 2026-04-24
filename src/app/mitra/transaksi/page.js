"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

import {
  formatDateTime,
  formatRupiah,
  getOrderStatusMeta,
} from "@/lib/referral-client";

export default function MitraTransactionsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const fetchRows = async (nextSearch = search, nextStatus = status) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextSearch) params.set("search", nextSearch);
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);

    const res = await fetch(`/api/mitra/orders?${params.toString()}`, {
      cache: "no-store",
    });
    const data = await res.json();
    if (data.success) {
      setRows(data.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRows("", "all");
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-navy">Transaksi Referral</h1>
        <p className="mt-1 text-sm text-gray-500">
          Semua transaksi yang masuk dari link referral kamu.
        </p>
      </div>

      <div className="rounded-[24px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari invoice, nomor, atau produk..."
              className="w-full rounded-2xl border border-gray-200 px-10 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
          >
            <option value="all">Semua status</option>
            <option value="pending">Pending</option>
            <option value="paid">Paid</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
          <button
            onClick={() => fetchRows(search, status)}
            className="rounded-2xl gradient-navy px-5 py-3 text-sm font-bold text-white"
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
            Belum ada transaksi referral dengan filter ini.
          </div>
        ) : (
          rows.map((row) => {
            const statusMeta = getOrderStatusMeta(row.status);

            return (
              <div
                key={row.id}
                className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-black text-navy">{row.productName}</p>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.id} • {formatDateTime(row.createdAt)}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-base font-black text-navy">{formatRupiah(row.productPrice)}</p>
                    <p className="text-xs text-gray-500">
                      Profit snapshot {formatRupiah(row.downlineMarginSnapshot)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Pembeli
                    </p>
                    <p className="mt-1 text-sm font-semibold text-navy">{row.guestPhoneMasked}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Target
                    </p>
                    <p className="mt-1 text-sm font-semibold text-navy">{row.targetDataMasked}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Sumber
                    </p>
                    <p className="mt-1 text-sm font-semibold text-navy">
                      {row.referralSource === "custom_alias"
                        ? row.downlineCustomAlias
                          ? `/r/${row.downlineCustomAlias}`
                          : "Custom"
                        : `/${row.downlineSlug}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
