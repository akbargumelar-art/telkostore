"use client";

import { useState, useEffect, useRef } from "react";
import {
  Package,
  Plus,
  Search,
  Edit3,
  Trash2,
  X,
  Check,
  AlertCircle,
  ChevronDown,
  Eye,
  EyeOff,
  Upload,
  Download,
  CheckSquare,
  Square,
  ToggleLeft,
  ToggleRight,
  Layers,
} from "lucide-react";

function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", minimumFractionDigits: 0,
  }).format(n);
}

const categoryOptions = [
  { id: "pulsa", name: "Pulsa" },
  { id: "paket-data", name: "Paket Data" },
  { id: "voucher-internet", name: "Voucher Internet" },
  { id: "voucher-game", name: "Voucher Game" },
];

const emptyForm = {
  name: "", categoryId: "pulsa", type: "virtual", description: "",
  nominal: "", price: "", originalPrice: "", stock: 999,
  validity: "", quota: "", gameName: "", gameIcon: "",
  isPromo: false, isFlashSale: false,
};

export default function AdminProdukPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  // Bulk management state
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState("");
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState("");
  const [importResult, setImportResult] = useState(null);
  const [bulkStockValue, setBulkStockValue] = useState(999);
  const fileInputRef = useRef(null);
  const stockManagedByVoucherCodes = form.categoryId === "voucher-internet";
  const selectedProducts = products.filter((product) => selected.has(product.id));
  const hasSelectedManualStock = selectedProducts.some((product) => product.stockMode !== "voucher-codes");
  const hasSelectedVoucherManagedStock = selectedProducts.some((product) => product.stockMode === "voucher-codes");
  const productCountLabel =
    filterStatus === "active"
      ? "produk aktif ditemukan"
      : filterStatus === "inactive"
        ? "produk non-aktif ditemukan"
        : "produk ditemukan";

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (filterStatus === "active") params.set("active", "true");
      if (filterStatus === "inactive") params.set("active", "false");

      const res = await fetch(`/api/admin/products?${params}`);
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSelected(new Set());
    setLoading(true);
    fetchProducts();
  }, [filterCategory, filterStatus]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
    setSelected(new Set());
    fetchProducts();
  };

  const openCreate = () => {
    setEditId(null);
    setForm({ ...emptyForm });
    setError("");
    setShowModal(true);
  };

  const openEdit = (product) => {
    setEditId(product.id);
    setForm({
      name: product.name || "",
      categoryId: product.categoryId || "pulsa",
      type: product.type || "virtual",
      description: product.description || "",
      nominal: product.nominal || "",
      price: product.price || "",
      originalPrice: product.originalPrice || "",
      stock: product.stock ?? 999,
      validity: product.validity || "",
      quota: product.quota || "",
      gameName: product.gameName || "",
      gameIcon: product.gameIcon || "",
      isPromo: product.isPromo || false,
      isFlashSale: product.isFlashSale || false,
    });
    setError("");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      setError("Nama dan harga wajib diisi");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        price: Number(form.price),
        originalPrice: form.originalPrice ? Number(form.originalPrice) : null,
        nominal: form.nominal ? Number(form.nominal) : null,
      };

      if (!stockManagedByVoucherCodes) {
        payload.stock = Number(form.stock);
      }

      const url = editId ? `/api/admin/products/${editId}` : "/api/admin/products";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (data.success) {
        setShowModal(false);
        setSuccess(editId ? "Produk diperbarui!" : "Produk ditambahkan!");
        setTimeout(() => setSuccess(""), 3000);
        setLoading(true);
        fetchProducts();
      } else {
        setError(data.error || "Gagal menyimpan");
      }
    } catch (err) {
      setError("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Nonaktifkan produk "${name}"? Produk tidak akan tampil di toko.`)) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "Produk dinonaktifkan!");
        setTimeout(() => setSuccess(""), 3000);
        setLoading(true);
        fetchProducts();
      } else {
        setError(data.error || "Gagal menonaktifkan produk");
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal menonaktifkan produk");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleHardDelete = async (id, name) => {
    if (!confirm(`Hapus permanen produk "${name}"? Aksi ini tidak bisa dibatalkan.`)) return;

    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hard-delete", ids: [id] }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "Produk dihapus permanen!");
        setTimeout(() => setSuccess(""), 3000);
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setLoading(true);
        fetchProducts();
      } else {
        setError(data.error || "Gagal menghapus permanen produk");
        setTimeout(() => setError(""), 5000);
      }
    } catch (err) {
      console.error(err);
      setError("Gagal menghapus permanen produk");
      setTimeout(() => setError(""), 5000);
    }
  };

  const handleToggleActive = async (id, currentActive) => {
    try {
      await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      });
      setLoading(true);
      fetchProducts();
    } catch (err) {
      console.error(err);
    }
  };

  // ===== BULK HANDLERS =====
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === products.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(products.map((p) => p.id)));
    }
  };

  const handleBulkAction = async (action, extraData = {}) => {
    if (selected.size === 0) return;
    setBulkProcessing(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids: [...selected], data: extraData }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message);
        setTimeout(() => setSuccess(""), 3000);
        setSelected(new Set());
        setLoading(true);
        fetchProducts();
      } else {
        setError(data.error);
        setTimeout(() => setError(""), 3000);
      }
    } catch (err) {
      setError("Gagal memproses bulk action");
    } finally {
      setBulkProcessing(false);
      setBulkAction("");
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "export" }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Gagal export produk");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("content-disposition") || "";
      const filenameMatch = disposition.match(/filename="([^"]+)"/i);
      const filename = filenameMatch?.[1] || `produk-export-${new Date().toISOString().slice(0, 10)}.xlsx`;
      const exportCount = res.headers.get("x-export-count");

      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      setSuccess(
        exportCount
          ? `${exportCount} produk berhasil diexport ke Excel`
          : "Produk berhasil diexport ke Excel"
      );
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      if (file.name.endsWith(".csv")) {
        // Parse CSV
        const lines = text.split("\n").filter((l) => l.trim());
        if (lines.length < 2) { setImportData(""); return; }
        const headers = lines[0].split(",").map((h) => h.trim());
        const items = lines.slice(1).map((line) => {
          const vals = line.split(",").map((v) => v.trim());
          const obj = {};
          headers.forEach((h, i) => { obj[h] = vals[i] || ""; });
          return obj;
        });
        setImportData(JSON.stringify(items, null, 2));
      } else {
        setImportData(text);
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async () => {
    setBulkProcessing(true);
    setImportResult(null);
    try {
      const parsed = JSON.parse(importData);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", data: items }),
      });
      const data = await res.json();
      setImportResult(data);
      if (data.success && data.data?.imported > 0) {
        setSuccess(data.message);
        setTimeout(() => setSuccess(""), 4000);
        setLoading(true);
        fetchProducts();
      }
    } catch (err) {
      setImportResult({ success: false, message: "Format JSON tidak valid" });
    } finally {
      setBulkProcessing(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
            <Package size={24} /> Kelola Produk
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{products.length} {productCountLabel}</p>
        </div>
        <div className="flex items-center gap-2 self-start flex-wrap">
          <button onClick={() => setShowImport(true)} className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50">
            <Upload size={14} /> Import
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {exporting ? <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-navy animate-spin" /> : <Download size={14} />}
            {exporting ? "Exporting..." : "Export Excel"}
          </button>
          <button onClick={openCreate} className="gradient-red text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-95 transition-opacity flex items-center gap-2">
            <Plus size={16} /> Tambah Produk
          </button>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selected.size > 0 && (
        <div className="mb-4 bg-navy/5 border border-navy/20 rounded-2xl p-3 flex flex-wrap items-center gap-2 animate-fade-in">
          <span className="text-sm font-bold text-navy px-2"><Layers size={14} className="inline mr-1" />{selected.size} dipilih</span>
          <div className="h-5 w-px bg-navy/20 hidden md:block" />
          <button onClick={() => handleBulkAction("toggle-active", { isActive: true })} disabled={bulkProcessing} className="px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-semibold hover:bg-green-100 flex items-center gap-1"><ToggleRight size={12} /> Aktifkan</button>
          <button onClick={() => handleBulkAction("toggle-active", { isActive: false })} disabled={bulkProcessing} className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold hover:bg-yellow-100 flex items-center gap-1"><ToggleLeft size={12} /> Nonaktifkan</button>
          <button onClick={() => handleBulkAction("toggle-promo", { isPromo: true })} disabled={bulkProcessing} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100">🏷️ Promo ON</button>
          <button onClick={() => handleBulkAction("toggle-promo", { isPromo: false })} disabled={bulkProcessing} className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-200">🏷️ Promo OFF</button>
          <div className="flex items-center gap-1">
            <input type="number" value={bulkStockValue} onChange={(e) => setBulkStockValue(e.target.value)} className="w-20 px-2 py-1.5 border border-gray-200 rounded-lg text-xs" placeholder="Stok" />
            <button onClick={() => handleBulkAction("update-stock", { stock: Number(bulkStockValue) })} disabled={bulkProcessing || !hasSelectedManualStock} className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-100 disabled:opacity-50">Set Stok</button>
          </div>
          {hasSelectedVoucherManagedStock && (
            <span className="text-[11px] text-gray-500">
              Voucher internet memakai stok otomatis dari kode voucher.
            </span>
          )}
          <button onClick={() => { if(confirm(`Nonaktifkan ${selected.size} produk?`)) handleBulkAction("delete"); }} disabled={bulkProcessing} className="px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-semibold hover:bg-yellow-100 flex items-center gap-1 ml-auto"><EyeOff size={12} /> Nonaktifkan</button>
          <button onClick={() => { if(confirm(`Hapus permanen ${selected.size} produk? Aksi ini tidak bisa dibatalkan.`)) handleBulkAction("hard-delete"); }} disabled={bulkProcessing} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 flex items-center gap-1"><Trash2 size={12} /> Hapus Permanen</button>
          <button onClick={() => setSelected(new Set())} className="px-3 py-1.5 bg-gray-100 text-gray-500 rounded-lg text-xs font-semibold hover:bg-gray-200"><X size={12} /></button>
          {bulkProcessing && <div className="w-4 h-4 rounded-full border-2 border-navy/30 border-t-navy animate-spin" />}
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <Check size={14} className="text-green-600" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}

      {error && !showModal && !showImport && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <AlertCircle size={14} className="text-red-600" />
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 flex flex-col md:flex-row gap-3">
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10"
            />
          </div>
          <button type="submit" className="px-4 py-2.5 bg-navy text-white rounded-xl text-sm font-semibold hover:opacity-90 shrink-0">
            Cari
          </button>
        </form>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy bg-white"
        >
          <option value="all">Semua Kategori</option>
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy bg-white"
        >
          <option value="active">Aktif saja</option>
          <option value="inactive">Non-aktif saja</option>
          <option value="all">Semua status</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-navy animate-spin"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package className="text-gray-200 mx-auto mb-3" size={40} />
            <p className="text-gray-400 text-sm">Tidak ada produk ditemukan</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-3 py-3 w-10">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-navy">
                      {selected.size === products.length && products.length > 0 ? <CheckSquare size={16} className="text-navy" /> : <Square size={16} />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Produk</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Kategori</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Harga</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Stok</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-500 text-xs uppercase">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.isActive ? "opacity-50" : ""} ${selected.has(p.id) ? "bg-navy/5" : ""}`}>
                    <td className="px-3 py-3">
                      <button onClick={() => toggleSelect(p.id)} className="text-gray-400 hover:text-navy">
                        {selected.has(p.id) ? <CheckSquare size={16} className="text-navy" /> : <Square size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.isFlashSale && <span className="text-[9px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded-full">⚡</span>}
                        {p.isPromo && <span className="text-[9px] bg-yellow-100 text-yellow-700 font-bold px-1.5 py-0.5 rounded-full">🏷️</span>}
                        <div>
                          <p className="font-semibold text-gray-800">{p.name}</p>
                          <p className="text-[11px] text-gray-400 truncate max-w-[200px]">{p.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg font-medium">{p.categoryId}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-navy">{formatRupiah(p.price)}</p>
                      {p.originalPrice && (
                        <p className="text-[10px] text-gray-400 line-through">{formatRupiah(p.originalPrice)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`text-xs font-bold ${p.stock <= 10 ? "text-red-600" : "text-gray-600"}`}>
                          {p.stock}
                        </span>
                        {p.stockMode === "voucher-codes" && (
                          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            Auto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(p.id, p.isActive)}
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full ${
                          p.isActive ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.isActive ? <><Eye size={10} /> Aktif</> : <><EyeOff size={10} /> Non-Aktif</>}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id, p.name)}
                          disabled={!p.isActive}
                          className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                          title={p.isActive ? "Nonaktifkan" : "Sudah non-aktif"}
                        >
                          <EyeOff size={14} />
                        </button>
                        <button
                          onClick={() => handleHardDelete(p.id, p.name)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Hapus permanen"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Create/Edit Product */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-navy text-base">
                {editId ? "Edit Produk" : "Tambah Produk Baru"}
              </h2>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-600" />
                  <p className="text-red-600 text-xs">{error}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nama Produk *</label>
                  <input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy" placeholder="Nama produk"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Kategori *</label>
                  <select value={form.categoryId} onChange={(e) => setForm({...form, categoryId: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy bg-white">
                    {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipe</label>
                  <select value={form.type} onChange={(e) => setForm({...form, type: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy bg-white">
                    <option value="virtual">Virtual</option>
                    <option value="fisik">Fisik</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Harga Jual *</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({...form, price: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy" placeholder="50000"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Harga Asli</label>
                  <input type="number" value={form.originalPrice} onChange={(e) => setForm({...form, originalPrice: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy" placeholder="60000"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nominal</label>
                  <input type="number" value={form.nominal} onChange={(e) => setForm({...form, nominal: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy" placeholder="5000"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    {stockManagedByVoucherCodes ? "Stok Otomatis" : "Stok"}
                  </label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm({...form, stock: e.target.value})}
                    disabled={stockManagedByVoucherCodes}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy disabled:bg-gray-50 disabled:text-gray-400"
                    placeholder={stockManagedByVoucherCodes ? "Otomatis dari kode voucher" : "999"}
                  />
                  {stockManagedByVoucherCodes && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      Nilai stok untuk voucher internet dihitung otomatis dari kode voucher yang tersedia.
                    </p>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Deskripsi</label>
                  <textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy" rows={2} placeholder="Deskripsi produk..."/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Validitas</label>
                  <input value={form.validity} onChange={(e) => setForm({...form, validity: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy" placeholder="30 Hari"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Kuota</label>
                  <input value={form.quota} onChange={(e) => setForm({...form, quota: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy" placeholder="12GB"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nama Game</label>
                  <input value={form.gameName} onChange={(e) => setForm({...form, gameName: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy" placeholder="Mobile Legends"/>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Icon Game</label>
                  <input value={form.gameIcon} onChange={(e) => setForm({...form, gameIcon: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy" placeholder="🎯"/>
                </div>
              </div>

              <div className="flex items-center gap-4 pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isPromo} onChange={(e) => setForm({...form, isPromo: e.target.checked})} className="rounded" />
                  <span className="text-gray-600">Promo</span>
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.isFlashSale} onChange={(e) => setForm({...form, isFlashSale: e.target.checked})} className="rounded" />
                  <span className="text-gray-600">Flash Sale</span>
                </label>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleSave} disabled={saving}
                className="gradient-navy text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-95 disabled:opacity-50 flex items-center gap-2">
                {saving ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div> : <Check size={14} />}
                {editId ? "Simpan Perubahan" : "Tambah Produk"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowImport(false); setImportResult(null); setImportData(""); }} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-navy text-base flex items-center gap-2"><Upload size={16} /> Import Produk</h2>
              <button onClick={() => { setShowImport(false); setImportResult(null); setImportData(""); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">Format JSON:</p>
                <code className="block bg-white/60 rounded p-2 text-[10px] leading-relaxed">{`[{"name":"Pulsa 5K","categoryId":"pulsa","price":6500,"stock":999}]`}</code>
                <p className="mt-2 font-semibold">Format CSV:</p>
                <code className="block bg-white/60 rounded p-2 text-[10px]">name,categoryId,price,stock</code>
              </div>
              <div>
                <input ref={fileInputRef} type="file" accept=".json,.csv" onChange={handleImportFile} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 text-center hover:border-navy hover:bg-navy/5 transition-all">
                  <Upload size={20} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Pilih file CSV atau JSON</p>
                  <p className="text-[10px] text-gray-400 mt-1">Atau paste data JSON di bawah</p>
                </button>
              </div>
              <textarea value={importData} onChange={(e) => setImportData(e.target.value)} rows={6} placeholder='Paste JSON array di sini...' className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:border-navy" />
              {importResult && (
                <div className={`rounded-xl p-3 text-xs ${importResult.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-600"}`}>
                  <p className="font-semibold">{importResult.message}</p>
                  {importResult.data?.errors?.length > 0 && (
                    <ul className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">{importResult.data.errors.map((e, i) => <li key={i}>• {e}</li>)}</ul>
                  )}
                </div>
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={() => { setShowImport(false); setImportResult(null); setImportData(""); }} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleImportSubmit} disabled={bulkProcessing || !importData.trim()} className="gradient-navy text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-95 disabled:opacity-50 flex items-center gap-2">
                {bulkProcessing ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <Upload size={14} />}
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
