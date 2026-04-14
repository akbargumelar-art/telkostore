"use client";

import { useState } from "react";
import {
  Search,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Receipt,
  Phone,
  ExternalLink,
} from "lucide-react";

const statusConfig = {
  pending: { bg: "bg-yellow-50", text: "text-yellow-800", icon: Clock, label: "Menunggu Bayar" },
  paid: { bg: "bg-blue-50", text: "text-blue-700", icon: CheckCircle2, label: "Dibayar" },
  processing: { bg: "bg-orange-50", text: "text-orange-700", icon: Package, label: "Diproses" },
  completed: { bg: "bg-green-50", text: "text-green-800", icon: CheckCircle2, label: "Selesai" },
  failed: { bg: "bg-red-50", text: "text-red-700", icon: AlertCircle, label: "Gagal" },
};

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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function HistoryPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 3) {
      setError("Masukkan minimal 3 karakter");
      return;
    }

    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const res = await fetch(`/api/orders/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();

      if (data.success) {
        setOrders(data.data);
      } else {
        setError(data.error || "Pencarian gagal");
        setOrders([]);
      }
    } catch (err) {
      setError("Terjadi kesalahan");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-4 md:py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-navy font-extrabold text-2xl md:text-3xl flex items-center gap-2">
          <Receipt className="text-tred" size={28} />
          Riwayat Pesanan
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Lacak status pesanan kamu
        </p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6 shadow-sm">
        <h2 className="font-bold text-sm text-navy mb-3 flex items-center gap-2">
          <Search size={16} /> Cari Pesanan
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Nomor invoice atau nomor HP..."
              className="w-full pl-4 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tred focus:ring-2 focus:ring-tred/10 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="gradient-red text-white px-5 py-3 rounded-xl font-semibold text-sm hover:opacity-95 transition-opacity shrink-0 disabled:opacity-50"
          >
            {loading ? "..." : "Cari"}
          </button>
        </div>
        {error && (
          <p className="text-tred text-xs mt-2 flex items-center gap-1">
            <AlertCircle size={11} /> {error}
          </p>
        )}
        <p className="text-gray-400 text-[11px] mt-2 flex items-center gap-1">
          <Phone size={11} />
          Tip: Masukkan nomor HP untuk melihat semua pesanan terkait
        </p>
      </div>

      {/* Results */}
      {loading && (
        <div className="text-center py-10">
          <div className="w-10 h-10 rounded-full border-4 border-gray-200 border-t-tred animate-spin mx-auto mb-3"></div>
          <p className="text-gray-400 text-sm">Mencari pesanan...</p>
        </div>
      )}

      {!loading && searched && orders.length === 0 && (
        <div className="text-center py-10">
          <Search className="text-gray-300 mx-auto mb-3" size={40} />
          <p className="text-gray-500 text-sm font-medium">Pesanan tidak ditemukan</p>
          <p className="text-gray-400 text-xs mt-1">Pastikan nomor invoice atau HP sudah benar</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="space-y-3">
          <p className="text-gray-400 text-xs mb-2">{orders.length} pesanan ditemukan</p>

          {orders.map((order) => {
            const config = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = config.icon;
            const isExpanded = selectedOrder === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setSelectedOrder(isExpanded ? null : order.id)}
                  className="w-full text-left px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full ${config.bg} ${config.text} flex items-center justify-center shrink-0`}>
                    <StatusIcon size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-sm text-gray-800 truncate">
                        {order.productName}
                      </p>
                      <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{order.id}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <ChevronRight
                    size={18}
                    className={`text-gray-300 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                  />
                </button>

                {/* Expanded */}
                {isExpanded && (
                  <div className="px-5 pb-4 pt-0 border-t border-gray-50 animate-slide-down">
                    <div className="pt-3 space-y-2.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">No. HP Tujuan</span>
                        <span className="font-medium text-gray-800">{order.targetData}</span>
                      </div>
                      {order.paymentMethod && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Pembayaran</span>
                          <span className="font-medium text-gray-800">{order.paymentMethod}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Total</span>
                        <span className="font-bold text-tred">{formatRupiah(order.productPrice)}</span>
                      </div>

                      {/* Progress */}
                      <div className="pt-3">
                        <div className="flex items-center">
                          {[
                            { label: "Pesanan", done: true },
                            { label: "Bayar", done: ["paid", "processing", "completed"].includes(order.status) },
                            { label: "Proses", done: ["processing", "completed"].includes(order.status) },
                            { label: "Selesai", done: order.status === "completed" },
                          ].map((step, i, arr) => (
                            <div key={i} className="flex items-center flex-1">
                              <div className="flex flex-col items-center">
                                <div className={`w-3 h-3 rounded-full shrink-0 ${step.done ? "bg-success" : "bg-gray-200"}`}></div>
                                <span className={`text-[9px] mt-1 font-medium ${step.done ? "text-green-700" : "text-gray-400"}`}>
                                  {step.label}
                                </span>
                              </div>
                              {i < arr.length - 1 && (
                                <div className={`flex-1 h-0.5 mx-1 ${step.done ? "bg-success" : "bg-gray-200"}`}></div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* View detail button */}
                      <div className="pt-3">
                        {order.detailAvailable && order.guestToken ? (
                          <a
                            href={`/order/${order.id}?token=${order.guestToken}`}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                          >
                            <ExternalLink size={14} />
                            Lihat Detail Pesanan
                          </a>
                        ) : (
                          <p className="text-[11px] text-gray-400 text-center bg-gray-50 rounded-xl px-3 py-2.5">
                            Masukkan nomor HP lengkap untuk membuka detail pesanan.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!searched && (
        <div className="text-center text-gray-400 text-sm py-10">
          <Receipt className="text-gray-200 mx-auto mb-3" size={48} />
          <p className="font-medium text-gray-500">Cari pesanan kamu</p>
          <p className="text-xs mt-1">Masukkan nomor invoice atau nomor HP untuk mencari pesanan.</p>
        </div>
      )}
    </div>
  );
}
