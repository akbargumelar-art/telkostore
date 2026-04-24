"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Ticket,
  Plus,
  Search,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  ExternalLink,
  AlertCircle,
  Package,
  Upload,
  Copy,
  Loader2,
  BarChart3,
} from "lucide-react";

const STATUS_CONFIG = {
  available: {
    label: "Tersedia",
    color: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  reserved: {
    label: "Dipesan",
    color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    dot: "bg-yellow-500",
  },
  redeemed: {
    label: "Redeemed",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
  },
  failed: {
    label: "Gagal",
    color: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

const PROVIDER_CONFIG = {
  simpati: {
    label: "Simpati",
    color: "text-red-600",
    redeemUrl: "https://www.telkomsel.com/shops/voucher/redeem",
  },
  byu: {
    label: "byU",
    color: "text-cyan-600",
    redeemUrl: "https://pidaw-webfront.cx.byu.id/web/tkr-voucher",
  },
};

export default function AdminVoucherPage() {
  const [vouchers, setVouchers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    reserved: 0,
    redeemed: 0,
    failed: 0,
  });
  const [permissions, setPermissions] = useState({
    addVoucherCodes: true,
    manageVoucherActions: false,
  });

  const [filterProduct, setFilterProduct] = useState("");
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [showAddForm, setShowAddForm] = useState(false);
  const [addProductId, setAddProductId] = useState("");
  const [addProvider, setAddProvider] = useState("simpati");
  const [addCodes, setAddCodes] = useState("");
  const [adding, setAdding] = useState(false);

  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState({
    show: false,
    msg: "",
    type: "success",
  });
  const [copiedId, setCopiedId] = useState(null);

  const canAddVoucherCodes = permissions.addVoucherCodes !== false;
  const canManageVoucherActions = Boolean(permissions.manageVoucherActions);

  const showToast = useCallback((msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(
      () => setToast({ show: false, msg: "", type: "success" }),
      3000
    );
  }, []);

  const fetchAdminInfo = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setPermissions(
          data.permissions || {
            addVoucherCodes: true,
            manageVoucherActions: false,
          }
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchVouchers = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (filterProduct) params.set("productId", filterProduct);
      if (filterProvider !== "all") params.set("provider", filterProvider);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (searchQuery) params.set("search", searchQuery);
      params.set("limit", "100");

      const res = await fetch(`/api/admin/vouchers?${params}`);
      const data = await res.json();

      if (data.success) {
        setVouchers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterProduct, filterProvider, filterStatus, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/vouchers?statsOnly=true");
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products?category=voucher-internet");
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
      }
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    fetchAdminInfo();
    fetchVouchers();
    fetchStats();
    fetchProducts();
  }, [fetchAdminInfo, fetchVouchers, fetchStats, fetchProducts]);

  const handleAddCodes = async () => {
    if (!canAddVoucherCodes) return;
    if (!addProductId || !addCodes.trim()) return;

    setAdding(true);

    try {
      const codes = addCodes
        .split(/[\n,;]+/)
        .map((code) => code.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: addProductId,
          provider: addProvider,
          codes,
        }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message);
        setAddCodes("");
        setShowAddForm(false);
        fetchVouchers();
        fetchStats();
      } else {
        showToast(data.error || "Gagal", "error");
      }
    } catch {
      showToast("Terjadi kesalahan", "error");
    } finally {
      setAdding(false);
    }
  };

  const handleAction = async (voucherId, action, extra = {}) => {
    if (!canManageVoucherActions) return;

    setActionLoading(voucherId);

    try {
      const res = await fetch(`/api/admin/vouchers/${voucherId}`, {
        method: action === "delete" ? "DELETE" : "PUT",
        headers: { "Content-Type": "application/json" },
        body:
          action === "delete"
            ? undefined
            : JSON.stringify({ action, ...extra }),
      });
      const data = await res.json();

      if (data.success) {
        showToast(data.message);
        fetchVouchers();
        fetchStats();
      } else {
        showToast(data.error || "Gagal", "error");
      }
    } catch {
      showToast("Terjadi kesalahan", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOneClickRedeem = (voucher) => {
    const config = PROVIDER_CONFIG[voucher.provider] || PROVIDER_CONFIG.simpati;
    window.open(config.redeemUrl, "_blank");
  };

  const handleCopy = async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // noop
    }
  };

  const needsRedeem = vouchers.filter((voucher) => voucher.status === "reserved");
  const allProducts = products.length > 0 ? products : [];
  const detectedCodesCount = addCodes
    .split(/[\n,;]+/)
    .filter((code) => code.trim()).length;

  return (
    <div>
      {toast.show && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 animate-fade-in ${
            toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-green-50 border-green-200 text-green-700"
          }`}
        >
          {toast.type === "error" ? (
            <XCircle size={16} />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span className="text-sm font-medium">{toast.msg}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
            <Ticket size={24} /> Manajemen Voucher
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Kelola kode voucher internet Simpati dan byU
          </p>
        </div>
        {canAddVoucherCodes && (
          <button
            onClick={() => setShowAddForm((current) => !current)}
            className="gradient-navy text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-95"
          >
            <Plus size={16} /> Tambah Kode
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          {
            label: "Total",
            value: stats.total,
            icon: Package,
            color: "text-navy",
            bg: "bg-navy/5",
          },
          {
            label: "Tersedia",
            value: stats.available,
            icon: CheckCircle2,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Dipesan",
            value: stats.reserved,
            icon: Loader2,
            color: "text-yellow-600",
            bg: "bg-yellow-50",
          },
          {
            label: "Redeemed",
            value: stats.redeemed,
            icon: BarChart3,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Gagal",
            value: stats.failed,
            icon: XCircle,
            color: "text-red-600",
            bg: "bg-red-50",
          },
        ].map((item) => (
          <div key={item.label} className={`${item.bg} rounded-xl p-3 border border-gray-100`}>
            <div className="flex items-center gap-2 mb-1">
              <item.icon size={14} className={item.color} />
              <span className="text-[11px] text-gray-500 font-medium">
                {item.label}
              </span>
            </div>
            <p className={`text-xl font-extrabold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {stats.available <= 5 && stats.total > 0 && (
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <AlertCircle size={16} className="text-yellow-600 shrink-0" />
          <p className="text-yellow-700 text-sm font-medium">
            Stok voucher tersedia tinggal <strong>{stats.available}</strong>.
            Segera tambah kode baru.
          </p>
        </div>
      )}

      {!canManageVoucherActions && (
        <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <AlertCircle size={16} className="text-blue-600 shrink-0" />
          <p className="text-blue-700 text-sm font-medium">
            Admin biasa bisa melihat data voucher dan menambah kode baru.
            Redeem, reset, dan hapus voucher khusus superadmin.
          </p>
        </div>
      )}

      {canManageVoucherActions && needsRedeem.length > 0 && (
        <div className="mb-4 bg-purple-50 border border-purple-200 rounded-xl p-4 animate-fade-in">
          <p className="text-purple-700 text-sm font-bold mb-2 flex items-center gap-2">
            <Ticket size={16} /> {needsRedeem.length} voucher menunggu redeem
          </p>
          <div className="space-y-2">
            {needsRedeem.slice(0, 3).map((voucher) => (
              <div
                key={voucher.id}
                className="flex items-center justify-between bg-white rounded-lg p-2.5 border border-purple-100"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono font-bold text-gray-800 truncate">
                    {voucher.code}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {voucher.productName} | {voucher.customerPhone} |{" "}
                    {(voucher.provider || "-").toUpperCase()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => {
                      handleCopy(voucher.code, voucher.id);
                      handleOneClickRedeem(voucher);
                    }}
                    className="bg-purple-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-700 transition-colors"
                  >
                    <ExternalLink size={10} /> Redeem
                  </button>
                  <button
                    onClick={() => handleAction(voucher.id, "redeem")}
                    disabled={actionLoading === voucher.id}
                    className="bg-green-600 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    OK
                  </button>
                  <button
                    onClick={() =>
                      handleAction(voucher.id, "fail", {
                        response: "Gagal redeem manual",
                      })
                    }
                    disabled={actionLoading === voucher.id}
                    className="bg-red-500 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    Fail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {canAddVoucherCodes && showAddForm && (
        <div className="mb-6 bg-white rounded-2xl border border-gray-100 p-5 animate-fade-in">
          <h3 className="font-bold text-sm text-navy mb-4 flex items-center gap-2">
            <Upload size={16} /> Tambah Kode Voucher
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Produk
              </label>
              <select
                value={addProductId}
                onChange={(event) => setAddProductId(event.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy"
              >
                <option value="">Pilih Produk</option>
                {allProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">
                Provider
              </label>
              <select
                value={addProvider}
                onChange={(event) => setAddProvider(event.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy"
              >
                <option value="simpati">Simpati (Telkomsel)</option>
                <option value="byu">byU</option>
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">
              Kode Voucher{" "}
              <span className="text-gray-400 font-normal">
                (satu per baris, atau pisahkan dengan koma)
              </span>
            </label>
            <textarea
              value={addCodes}
              onChange={(event) => setAddCodes(event.target.value)}
              rows={5}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-navy resize-none"
              placeholder={"VCHR-ABCD-1234-5678\nVCHR-EFGH-9012-3456"}
            />
            {addCodes.trim() && (
              <p className="text-[11px] text-gray-400 mt-1">
                {detectedCodesCount} kode terdeteksi
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleAddCodes}
              disabled={!addProductId || !addCodes.trim() || adding}
              className="gradient-navy text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:opacity-95 disabled:opacity-50"
            >
              {adding ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Simpan {detectedCodesCount || 0} Kode
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-5 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Cari kode voucher..."
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy"
            />
          </div>
          <select
            value={filterProduct}
            onChange={(event) => setFilterProduct(event.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy"
          >
            <option value="">Semua Produk</option>
            {allProducts.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
          <select
            value={filterProvider}
            onChange={(event) => setFilterProvider(event.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy"
          >
            <option value="all">Semua Provider</option>
            <option value="simpati">Simpati</option>
            <option value="byu">byU</option>
          </select>
          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-navy"
          >
            <option value="all">Semua Status</option>
            <option value="available">Tersedia</option>
            <option value="reserved">Dipesan</option>
            <option value="redeemed">Redeemed</option>
            <option value="failed">Gagal</option>
          </select>
          <button
            onClick={() => {
              fetchVouchers();
              fetchStats();
            }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-navy animate-spin" />
          </div>
        ) : vouchers.length === 0 ? (
          <div className="text-center py-16">
            <Ticket size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Belum ada kode voucher</p>
            {canAddVoucherCodes && (
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-3 text-navy text-sm font-semibold hover:underline"
              >
                + Tambah kode baru
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                    Kode Voucher
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                    Produk
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                    Provider
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                    Pembeli
                  </th>
                  {canManageVoucherActions && (
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                      Aksi
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => {
                  const statusCfg =
                    STATUS_CONFIG[voucher.status] || STATUS_CONFIG.available;
                  const providerCfg = PROVIDER_CONFIG[voucher.provider];
                  const isLoading = actionLoading === voucher.id;

                  return (
                    <tr
                      key={voucher.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">
                            {voucher.code}
                          </code>
                          <button
                            onClick={() => handleCopy(voucher.code, voucher.id)}
                            className="text-gray-400 hover:text-navy transition-colors"
                            title="Salin kode"
                          >
                            {copiedId === voucher.id ? (
                              <CheckCircle2
                                size={12}
                                className="text-green-500"
                              />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 truncate block max-w-[150px]">
                          {voucher.productName || "-"}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {providerCfg ? (
                          <span className={`text-xs font-bold ${providerCfg.color}`}>
                            {providerCfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-1 rounded-full border ${statusCfg.color}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                          />
                          {statusCfg.label}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        {voucher.customerPhone ? (
                          <div>
                            <p className="text-xs text-gray-700 font-medium">
                              {voucher.customerPhone}
                            </p>
                            {voucher.orderId && (
                              <p className="text-[10px] text-gray-400">
                                {voucher.orderId}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>

                      {canManageVoucherActions && (
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {voucher.status === "reserved" && (
                              <>
                                <button
                                  onClick={() => {
                                    handleCopy(voucher.code, voucher.id);
                                    handleOneClickRedeem(voucher);
                                  }}
                                  className="bg-purple-600 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 hover:bg-purple-700 transition-colors"
                                  title="Buka situs redeem + salin kode"
                                >
                                  <ExternalLink size={10} /> Redeem
                                </button>
                                <button
                                  onClick={() =>
                                    handleAction(voucher.id, "redeem")
                                  }
                                  disabled={isLoading}
                                  className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                                  title="Tandai berhasil"
                                >
                                  OK
                                </button>
                                <button
                                  onClick={() =>
                                    handleAction(voucher.id, "fail", {
                                      response: "Gagal redeem",
                                    })
                                  }
                                  disabled={isLoading}
                                  className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1.5 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
                                  title="Tandai gagal"
                                >
                                  Fail
                                </button>
                              </>
                            )}

                            {voucher.status === "failed" && (
                              <button
                                onClick={() =>
                                  handleAction(voucher.id, "release")
                                }
                                disabled={isLoading}
                                className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-1.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                                title="Kembalikan ke tersedia"
                              >
                                Reset
                              </button>
                            )}

                            {voucher.status === "available" && (
                              <button
                                onClick={() =>
                                  handleAction(voucher.id, "delete")
                                }
                                disabled={isLoading}
                                className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 p-1"
                                title="Hapus"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}

                            {voucher.status === "redeemed" && (
                              <span className="text-[10px] text-gray-400">
                                {voucher.redeemedAt
                                  ? new Date(
                                      voucher.redeemedAt
                                    ).toLocaleDateString("id-ID")
                                  : "-"}
                              </span>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {canManageVoucherActions && (
        <div className="mt-4 bg-white rounded-xl border border-gray-100 p-4">
          <h4 className="text-xs font-bold text-gray-500 mb-2">
            Panduan Aksi:
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-gray-500">
            <div className="flex items-start gap-2">
              <span className="bg-purple-600 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">
                Redeem
              </span>
              <span>
                Salin kode ke clipboard dan buka situs redeem provider di tab baru.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-green-100 text-green-700 text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">
                OK
              </span>
              <span>
                Tandai voucher berhasil di-redeem agar order selesai otomatis.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">
                Fail
              </span>
              <span>
                Tandai voucher gagal jika redeem manual tidak berhasil.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-gray-100 text-gray-700 text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0">
                Reset
              </span>
              <span>
                Kembalikan voucher gagal ke status tersedia untuk dipakai ulang.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
