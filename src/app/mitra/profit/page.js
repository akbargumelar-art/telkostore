"use client";

import { useEffect, useState } from "react";

import {
  formatDateTime,
  formatRupiah,
  getCommissionStatusMeta,
} from "@/lib/referral-client";

export default function MitraProfitPage() {
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  const fetchData = async (nextStatus = status) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (nextStatus && nextStatus !== "all") params.set("status", nextStatus);

    const [commissionsRes, statsRes] = await Promise.all([
      fetch(`/api/mitra/commissions?${params.toString()}`, { cache: "no-store" }),
      fetch("/api/mitra/stats", { cache: "no-store" }),
    ]);

    const commissionsData = await commissionsRes.json();
    const statsData = await statsRes.json();

    if (commissionsData.success) setRows(commissionsData.data || []);
    if (statsData.success) setStats(statsData.data?.stats || null);
    setLoading(false);
  };

  useEffect(() => {
    fetchData("all");
  }, []);

  const cards = [
    {
      label: "Pending",
      value: formatRupiah(stats?.pendingCommission || 0),
      className: "bg-amber-50 text-amber-700",
    },
    {
      label: "Approved",
      value: formatRupiah(stats?.approvedCommission || 0),
      className: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Paid",
      value: formatRupiah(stats?.paidCommission || 0),
      className: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-navy">Profit Referral</h1>
          <p className="mt-1 text-sm text-gray-500">
            Ledger profit referral berdasarkan status order yang sudah tersinkron.
          </p>
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            fetchData(event.target.value);
          }}
          className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
        >
          <option value="all">Semua status komisi</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="void">Void</option>
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${card.className}`}>
              {card.label}
            </span>
            <p className="mt-4 text-2xl font-black text-navy">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-navy" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-gray-200 bg-white px-4 py-10 text-center text-sm font-medium text-gray-400 shadow-sm">
            Belum ada data profit untuk filter ini.
          </div>
        ) : (
          rows.map((row) => {
            const statusMeta = getCommissionStatusMeta(row.status);
            return (
              <div key={row.id} className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-black text-navy">{row.productName}</p>
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusMeta.className}`}>
                        {statusMeta.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {row.orderId} • Order dibuat {formatDateTime(row.createdOrderAt)}
                    </p>
                  </div>
                  <div className="text-left md:text-right">
                    <p className="text-base font-black text-navy">
                      {formatRupiah(row.commissionAmount)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Omzet {formatRupiah(row.productPrice)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-gray-100 pt-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Tracked
                    </p>
                    <p className="mt-1 text-sm font-semibold text-navy">{formatDateTime(row.trackedAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Approved
                    </p>
                    <p className="mt-1 text-sm font-semibold text-navy">{formatDateTime(row.approvedAt)}</p>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Paid
                    </p>
                    <p className="mt-1 text-sm font-semibold text-navy">{formatDateTime(row.paidAt)}</p>
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
