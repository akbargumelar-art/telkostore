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
  CheckSquare,
  Square,
  MinusSquare,
  Trash2,
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

function toStartOfDayIso(date) {
  return date ? new Date(`${date}T00:00:00`).toISOString() : "";
}

function toEndOfDayIso(date) {
  return date ? new Date(`${date}T23:59:59.999`).toISOString() : "";
}

export default function AdminPesananPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState(null);
  const [adminType, setAdminType] = useState(null);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState("completed");
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [filterDeleting, setFilterDeleting] = useState(false);
  const canDeleteHistory = adminType === "superadmin";

  const fetchAdminInfo = async () => {
    try {
      const res = await fetch("/api/admin/me");
      const data = await res.json();
      if (data.success) setAdminType(data.adminType);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (dateFrom) params.set("createdFrom", toStartOfDayIso(dateFrom));
      if (dateTo) params.set("createdTo", toEndOfDayIso(dateTo));

      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data);
        setPagination(data.pagination);
      } else {
        setError(data.error || "Gagal memuat pesanan");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdminInfo(); }, []);
  useEffect(() => { fetchOrders(); }, [filterStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("Tanggal mulai tidak boleh lebih besar dari tanggal akhir");
      setTimeout(() => setError(""), 4000);
      return;
    }

    setLoading(true);
    setSelectedIds(new Set());
    fetchOrders();
  };

  const clearDateFilters = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedIds(new Set());
    setLoading(true);
  };

  useEffect(() => {
    if (!dateFrom && !dateTo) {
      fetchOrders();
    }
  }, [dateFrom, dateTo]);

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
      } else {
        setError(data.error || "Gagal mengubah status pesanan");
        setTimeout(() => setError(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  // Bulk selection handlers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(orders.map((o) => o.id)));
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) return;
    setBulkUpdating(true);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds: [...selectedIds], status: bulkStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`${data.data.updated} pesanan → ${bulkStatus}`);
        setTimeout(() => setSuccess(""), 3000);
        setSelectedIds(new Set());
        setLoading(true);
        fetchOrders();
      } else {
        setError(data.error || "Gagal mengubah status pesanan");
        setTimeout(() => setError(""), 4000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBulkUpdating(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!canDeleteHistory || selectedIds.size === 0) return;
    if (!confirm(`Hapus permanen ${selectedIds.size} riwayat pesanan terpilih? Aksi ini tidak bisa dibatalkan.`)) return;

    setBulkDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: [...selectedIds],
          confirmText: "HAPUS PESANAN",
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "Riwayat pesanan dihapus");
        setTimeout(() => setSuccess(""), 3000);
        setSelectedIds(new Set());
        setSelectedOrder(null);
        setLoading(true);
        fetchOrders();
      } else {
        setError(data.error || "Gagal menghapus riwayat pesanan");
        setTimeout(() => setError(""), 5000);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal menghapus riwayat pesanan");
      setTimeout(() => setError(""), 5000);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleDeleteFiltered = async () => {
    if (!canDeleteHistory || !pagination?.total) return;

    const hasDateFilter = Boolean(dateFrom || dateTo);
    const scope =
      filterStatus === "all" && !search && !hasDateFilter
        ? "SEMUA riwayat pesanan"
        : `${pagination.total} riwayat pesanan sesuai filter saat ini`;
    const typed = window.prompt(
      `Hapus permanen ${scope}? Ketik HAPUS PESANAN untuk melanjutkan.`
    );
    if (typed !== "HAPUS PESANAN") return;

    setFilterDeleting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deleteMatching: true,
          status: filterStatus,
          search,
          createdFrom: toStartOfDayIso(dateFrom),
          createdTo: toEndOfDayIso(dateTo),
          confirmText: typed,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "Riwayat pesanan dihapus");
        setTimeout(() => setSuccess(""), 3000);
        setSelectedIds(new Set());
        setSelectedOrder(null);
        setLoading(true);
        fetchOrders();
      } else {
        setError(data.error || "Gagal menghapus riwayat pesanan");
        setTimeout(() => setError(""), 5000);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal menghapus riwayat pesanan");
      setTimeout(() => setError(""), 5000);
    } finally {
      setFilterDeleting(false);
    }
  };

  const isAllSelected = orders.length > 0 && selectedIds.size === orders.length;
  const isSomeSelected = selectedIds.size > 0 && selectedIds.size < orders.length;

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
        <div className="flex items-center gap-2 self-start flex-wrap">
          {canDeleteHistory && pagination?.total > 0 && (
            <button
              onClick={handleDeleteFiltered}
              disabled={filterDeleting}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-sm font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50"
            >
              {filterDeleting ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-red-300 border-t-red-600 animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Hapus Hasil Filter
            </button>
          )}
          <button
            onClick={() => { setLoading(true); fetchOrders(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={14} className="text-green-600" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <AlertCircle size={14} className="text-red-600" />
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Bulk Action Toolbar */}
      {selectedIds.size > 0 && (
        <div className="mb-4 bg-navy/5 border border-navy/20 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckSquare size={18} className="text-navy" />
            <span className="text-sm font-bold text-navy">{selectedIds.size} pesanan dipilih</span>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-gray-500">Ubah status ke:</span>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-navy/20"
            >
              <option value="pending">Menunggu Bayar</option>
              <option value="paid">Dibayar</option>
              <option value="processing">Diproses</option>
              <option value="completed">Selesai</option>
              <option value="failed">Gagal</option>
            </select>
            <button
              onClick={handleBulkUpdate}
              disabled={bulkUpdating}
              className="px-4 py-2 gradient-navy text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
            >
              {bulkUpdating ? (
                <>
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                  Proses...
                </>
              ) : (
                "Terapkan"
              )}
            </button>
          </div>
          {canDeleteHistory && (
            <button
              onClick={handleDeleteSelected}
              disabled={bulkDeleting}
              className="px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-semibold hover:bg-red-100 disabled:opacity-50 flex items-center gap-1.5"
            >
              {bulkDeleting ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 border-red-300 border-t-red-600 animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              Hapus Terpilih
            </button>
          )}
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium"
          >
            Batal
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex flex-col gap-3">
        <form onSubmit={handleSearch} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari invoice, nomor HP, produk..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 shrink-0" htmlFor="order-date-from">Dari</label>
            <input
              id="order-date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full lg:w-40 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 shrink-0" htmlFor="order-date-to">Sampai</label>
            <input
              id="order-date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full lg:w-40 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:opacity-90 shrink-0">Cari</button>
          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={clearDateFilters}
              className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-200 shrink-0"
            >
              Reset Tanggal
            </button>
          )}
        </form>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setFilterStatus(opt.value); setLoading(true); setSelectedIds(new Set()); }}
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
          <>
            {/* Select All Header */}
            <div className="px-4 md:px-5 py-2.5 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
              <button onClick={toggleSelectAll} className="text-gray-400 hover:text-navy transition-colors">
                {isAllSelected ? <CheckSquare size={18} className="text-navy" /> :
                 isSomeSelected ? <MinusSquare size={18} className="text-navy" /> :
                 <Square size={18} />}
              </button>
              <span className="text-xs text-gray-500 font-medium">
                {isAllSelected ? "Batal pilih semua" : "Pilih semua"}
              </span>
            </div>

            <div className="divide-y divide-gray-50">
              {orders.map((order) => {
                const config = statusConfig[order.status] || statusConfig.pending;
                const StatusIcon = config.icon;
                const isExpanded = selectedOrder === order.id;
                const isChecked = selectedIds.has(order.id);

                return (
                  <div key={order.id}>
                    <div className="flex items-center">
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleSelect(order.id)}
                        className="pl-4 md:pl-5 pr-1 py-3 md:py-4 text-gray-400 hover:text-navy transition-colors"
                      >
                        {isChecked ? (
                          <CheckSquare size={18} className="text-navy" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>

                      {/* Order Row */}
                      <button
                        onClick={() => setSelectedOrder(isExpanded ? null : order.id)}
                        className="flex-1 text-left px-2 md:px-3 py-3 md:py-4 flex items-center gap-3 md:gap-4 hover:bg-gray-50 transition-colors"
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
                    </div>

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
          </>
        )}
      </div>
    </div>
  );
}
