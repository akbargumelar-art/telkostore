"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Ticket,
  Image as ImageIcon,
} from "lucide-react";

function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const statusConfig = {
  pending: { bg: "bg-yellow-50", text: "text-yellow-700", label: "Pending" },
  paid: { bg: "bg-blue-50", text: "text-blue-700", label: "Dibayar" },
  processing: { bg: "bg-orange-50", text: "text-orange-700", label: "Proses" },
  completed: { bg: "bg-green-50", text: "text-green-700", label: "Selesai" },
  failed: { bg: "bg-red-50", text: "text-red-700", label: "Gagal" },
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [adminType, setAdminType] = useState("admin");

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      const data = await res.json();
      if (data.success) setStats(data.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetch("/api/admin/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAdminType(data.adminType || "admin");
        }
      })
      .catch(() => {
        setAdminType("admin");
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-navy animate-spin"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="text-gray-300 mx-auto mb-3" size={48} />
        <p className="text-gray-500 text-sm">Gagal memuat data dashboard</p>
        <button onClick={fetchStats} className="mt-3 text-navy text-sm font-semibold hover:underline">
          Coba lagi
        </button>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Produk",
      value: stats.products.active,
      subtext: `${stats.products.total} total`,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Pesanan",
      value: stats.orders.total,
      subtext: `${stats.orders.pending} menunggu`,
      icon: ShoppingCart,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Revenue Total",
      value: formatRupiah(stats.revenue.total),
      subtext: `${stats.orders.completed} selesai`,
      icon: DollarSign,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "Hari Ini",
      value: stats.revenue.todayOrders,
      subtext: formatRupiah(stats.revenue.today),
      icon: TrendingUp,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  const quickActions =
    adminType === "superadmin"
      ? [
          {
            href: "/control/produk",
            label: "Kelola Produk",
            desc: "Tambah, edit, hapus produk",
            icon: Package,
            color: "gradient-navy",
          },
          {
            href: "/control/pesanan",
            label: "Kelola Pesanan",
            desc: "Lihat dan update status",
            icon: ShoppingCart,
            color: "gradient-red",
          },
          {
            href: "/control/banner",
            label: "Kelola Banner",
            desc: "Atur slide homepage",
            icon: ImageIcon,
            color: "gradient-navy",
          },
        ]
      : [
          {
            href: "/control/produk",
            label: "Lihat Produk",
            desc: "Pantau katalog tanpa edit",
            icon: Package,
            color: "gradient-navy",
          },
          {
            href: "/control/pesanan",
            label: "Kelola Pesanan",
            desc: "Lihat dan update status",
            icon: ShoppingCart,
            color: "gradient-red",
          },
          {
            href: "/control/voucher",
            label: "Tambah Voucher",
            desc: "Masukkan kode voucher internet",
            icon: Ticket,
            color: "gradient-navy",
          },
        ];

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-navy font-extrabold text-xl md:text-2xl">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Selamat datang di control panel</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchStats(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-all"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon size={20} className={card.color} />
                </div>
              </div>
              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide">{card.label}</p>
              <p className="text-lg md:text-xl font-extrabold text-navy mt-0.5">{card.value}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-6">
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <Link
              key={i}
              href={action.href}
              className="bg-white rounded-2xl border border-gray-100 p-4 md:p-5 flex items-center gap-4 hover:shadow-md transition-shadow group"
            >
              <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center shrink-0`}>
                <Icon size={22} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm text-navy">{action.label}</p>
                <p className="text-[11px] text-gray-400">{action.desc}</p>
              </div>
              <ArrowRight size={16} className="text-gray-300 group-hover:text-navy transition-colors" />
            </Link>
          );
        })}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-sm text-navy">Pesanan Terbaru</h2>
          <Link href="/control/pesanan" className="text-tred text-xs font-semibold hover:underline flex items-center gap-1">
            Lihat semua <ArrowRight size={12} />
          </Link>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <ShoppingCart className="text-gray-200 mx-auto mb-2" size={32} />
            <p className="text-gray-400 text-sm">Belum ada pesanan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {stats.recentOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              return (
                <div key={order.id} className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{order.productName}</p>
                      <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-gray-400">{order.id}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-[11px] text-gray-400">{order.guestPhone}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-[11px] text-gray-400">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-navy shrink-0">{formatRupiah(order.productPrice)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
