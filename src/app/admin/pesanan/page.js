"use client";

import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Search,
  Clock,
  CheckCircle2,
  Package,
  AlertCircle,
  ChevronRight,
  RefreshCw,
  Phone,
  MessageCircle,
} from "lucide-react";

function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const statusConfig = {
  pending: { bg: "bg-yellow-50", text: "text-yellow-700", icon: Clock, label: "Menunggu Bayar" },
  paid: { bg: "bg-blue-50", text: "text-blue-700", icon: CheckCircle2, label: "Dibayar" },
  processing: { bg: "bg-orange-50", text: "text-orange-700", icon: Package, label: "Diproses" },
  completed: { bg: "bg-green-50", text: "text-green-700", icon: CheckCircle2, label: "Selesai" },
  failed: { bg: "bg-red-50", text: "text-red-700", icon: AlertCircle, label: "Gagal" },
};

const statusOptions = [
  { value: "all", label: "Semua" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Dibayar" },
  { value: "processing", label: "Diproses" },
  { value: "completed", label: "Selesai" },
  { value: "failed", label: "Gagal" },
];

export default function AdminPesananPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState("");
  const [pagination, setPagination] = useState(null);

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus !== "all") params.set("status", filterStatus);

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [filterStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    fetchOrders();
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`Pesanan ${orderId} → ${newStatus}`);
        setTimeout(() => setSuccess(""), 3000);
        setSelectedOrder(null);
        setLoading(true);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
            <ShoppingCart size={24} /> Kelola Pesanan
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {pagination ? `${pagination.total} pesanan total` : "Memuat..."}
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchOrders(); }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 self-start"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Success */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={14} className="text-green-600" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari invoice, nomor HP, produk..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:opacity-90 shrink-0">Cari</button>
        </form>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilterStatus(opt.value); setLoading(true); }}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                filterStatus === opt.value
                  ? "gradient-navy text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-navy animate-spin"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="text-gray-200 mx-auto mb-3" size={40} />
            <p className="text-gray-400 text-sm">Tidak ada pesanan ditemukan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {orders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const isExpanded = selectedOrder === order.id;

              return (
                <div key={order.id}>
                  <button
                    onClick={() => setSelectedOrder(isExpanded ? null : order.id)}
                    className="w-full text-left px-4 md:px-5 py-3 md:py-4 flex items-center gap-3 md:gap-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full ${config.bg} ${config.text} flex items-center justify-center shrink-0`}>
                      <StatusIcon size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-sm text-gray-800 truncate">{order.productName}</p>
                        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                          {config.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-gray-400">{order.id}</span>
                        <span className="text-gray-300 hidden md:inline">•</span>
                        <span className="text-[11px] text-gray-400 hidden md:inline">{order.guestPhone}</span>
                        <span className="text-gray-300">•</span>
                        <span className="text-[11px] text-gray-400">{formatDate(order.createdAt)}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 hidden md:block">
                      <p className="text-sm font-bold text-navy">{formatRupiah(order.productPrice)}</p>
                    </div>
                    <ChevronRight
                      size={16}
                      className={`text-gray-300 shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`}
                    />
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="px-4 md:px-5 pb-4 border-t border-gray-50 animate-slide-down">
                      <div className="pt-3 space-y-2.5">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-500 text-xs">Invoice</span>
                            <p className="font-medium text-gray-800">{order.id}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">HP Pembeli</span>
                            <p className="font-medium text-gray-800 flex items-center gap-1">
                              <Phone size={12} /> {order.guestPhone}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">No. Tujuan</span>
                            <p className="font-medium text-gray-800">{order.targetData}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Total</span>
                            <p className="font-bold text-tred">{formatRupiah(order.productPrice)}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">Pembayaran</span>
                            <p className="font-medium text-gray-800">{order.paymentMethod || "—"}</p>
                          </div>
                          <div>
                            <span className="text-gray-500 text-xs">WA Notif</span>
                            <p className="font-medium text-gray-800">{order.whatsappSent ? "✅ Terkirim" : "❌ Belum"}</p>
                          </div>
                          {order.paidAt && (
                            <div>
                              <span className="text-gray-500 text-xs">Dibayar</span>
                              <p className="font-medium text-gray-800">{formatDate(order.paidAt)}</p>
                            </div>
                          )}
                          {order.completedAt && (
                            <div>
                              <span className="text-gray-500 text-xs">Selesai</span>
                              <p className="font-medium text-gray-800">{formatDate(order.completedAt)}</p>
                            </div>
                          )}
                        </div>

                        {order.notes && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <span className="text-gray-500 text-xs">Catatan</span>
                            <p className="text-sm text-gray-700 mt-0.5">{order.notes}</p>
                          </div>
                        )}

                        {/* Status Update Buttons */}
                        <div className="pt-2 flex flex-wrap gap-2 border-t border-gray-100">
                          <span className="text-xs text-gray-400 font-medium self-center mr-1">Ubah status:</span>
                          {["pending", "paid", "processing", "completed", "failed"].map((s) => {
                            const sc = statusConfig[s];
                            const isCurrent = order.status === s;
                            return (
                              <button
                                key={s}
                                onClick={() => !isCurrent && handleUpdateStatus(order.id, s)}
                                disabled={isCurrent || updating}
                                className={`text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all ${
                                  isCurrent
                                    ? `${sc.bg} ${sc.text} ring-2 ring-current/30`
                                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                } disabled:opacity-50`}
                              >
                                {sc.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
