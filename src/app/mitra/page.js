"use client";

import Link from "next/link";
import { ArrowRight, Eye, Link2, MousePointerClick, ReceiptText, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { copyToClipboard, formatDateTime, formatRupiah, getOrderStatusMeta } from "@/lib/referral-client";

export default function MitraDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/mitra/stats", { cache: "no-store" })
      .then((res) => res.json())
      .then((payload) => {
        if (payload.success) {
          setData(payload.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = async (value, label) => {
    const copied = await copyToClipboard(value);
    setMessage(copied ? `${label} berhasil disalin.` : `Gagal menyalin ${label}.`);
    setTimeout(() => setMessage(""), 2200);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-navy" />
      </div>
    );
  }

  if (!data?.profile) {
    return (
      <div className="rounded-[28px] border border-gray-100 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-gray-500">
          Data mitra belum tersedia.
        </p>
      </div>
    );
  }

  const { profile, stats, recentOrders, recentClicks } = data;
  const statCards = [
    {
      label: "Total Order Referral",
      value: stats.totalOrders,
      icon: ReceiptText,
      tone: "bg-blue-50 text-blue-700",
    },
    {
      label: "Total Klik Link",
      value: stats.totalClicks,
      icon: MousePointerClick,
      tone: "bg-indigo-50 text-indigo-700",
    },
    {
      label: "Profit Pending",
      value: formatRupiah(stats.pendingCommission),
      icon: Eye,
      tone: "bg-amber-50 text-amber-700",
    },
    {
      label: "Profit Paid",
      value: formatRupiah(stats.paidCommission),
      icon: Wallet,
      tone: "bg-emerald-50 text-emerald-700",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] bg-[radial-gradient(circle_at_top,_#2d2d6b,_#0f0f30)] p-6 text-white shadow-2xl md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">
              Dashboard Referral
            </p>
            <h1 className="mt-2 text-3xl font-black leading-tight md:text-4xl">
              Halo, {profile.displayName}
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/76">
              Semua performa referral kamu ada di sini. Kamu bisa cek klik link,
              transaksi terbaru, dan profit yang sudah disetujui atau dibayar.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => handleCopy(profile.links.customUrl || profile.links.canonicalUrl, "link referral")}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-navy shadow-lg"
            >
              Copy Link Referral
            </button>
            <Link
              href="/mitra/promo"
              className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white"
            >
              Atur Promo
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {message ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {message}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;

          return (
            <div key={card.label} className="rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm">
              <div className={`inline-flex rounded-2xl p-3 ${card.tone}`}>
                <Icon size={18} />
              </div>
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-black text-navy">{card.value}</p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-navy">Link Referral Aktif</h2>
              <p className="text-sm text-gray-500">
                Gunakan link custom bila sudah aktif, atau pakai canonical link bawaan.
              </p>
            </div>
            <Link href="/mitra/promo" className="text-sm font-bold text-tred hover:underline">
              Edit
            </Link>
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Canonical Link
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-navy">
                {profile.links.canonicalUrl}
              </p>
              <button
                onClick={() => handleCopy(profile.links.canonicalUrl, "canonical link")}
                className="mt-3 rounded-xl bg-navy px-3 py-2 text-xs font-bold text-white"
              >
                Copy Canonical
              </button>
            </div>

            <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Custom Link
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-navy">
                {profile.links.customUrl || "Belum diaktifkan. Atur di halaman promo."}
              </p>
              <button
                onClick={() =>
                  handleCopy(
                    profile.links.customUrl || profile.links.canonicalUrl,
                    "custom link"
                  )
                }
                className="mt-3 rounded-xl bg-white px-3 py-2 text-xs font-bold text-navy ring-1 ring-gray-200"
              >
                Copy Link Pilihan
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-navy">Klik Terbaru</h2>
              <p className="text-sm text-gray-500">
                Aktivitas klik link referral paling akhir.
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
              <Link2 size={18} />
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {recentClicks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm font-medium text-gray-400">
                Belum ada klik referral yang tercatat.
              </div>
            ) : (
              recentClicks.map((click) => (
                <div key={click.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-navy">
                      {click.customAlias ? `/r/${click.customAlias}` : `/${click.slug}`}
                    </p>
                    <p className="text-xs font-medium text-gray-400">
                      {formatDateTime(click.createdAt)}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Redirect ke {click.landingPath || "/"}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-navy">Transaksi Referral Terbaru</h2>
            <p className="text-sm text-gray-500">
              Order terbaru yang masuk dari link referral kamu.
            </p>
          </div>
          <Link href="/mitra/transaksi" className="text-sm font-bold text-tred hover:underline">
            Lihat semua
          </Link>
        </div>

        <div className="mt-4 space-y-3">
          {recentOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm font-medium text-gray-400">
              Belum ada transaksi referral.
            </div>
          ) : (
            recentOrders.map((order) => {
              const statusMeta = getOrderStatusMeta(order.status);
              return (
                <div
                  key={order.id}
                  className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-navy">{order.productName}</p>
                        <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusMeta.className}`}>
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {order.id} • {order.guestPhoneMasked} • {formatDateTime(order.createdAt)}
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm font-black text-navy">
                        {formatRupiah(order.productPrice)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Profit snapshot {formatRupiah(order.downlineMarginSnapshot)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
