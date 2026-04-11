"use client";

import { useState, useEffect } from "react";
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
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchProducts = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (filterCategory !== "all") params.set("category", filterCategory);

      const res = await fetch(`/api/admin/products?${params}`);
      const data = await res.json();
      if (data.success) setProducts(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, [filterCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    setLoading(true);
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
        stock: Number(form.stock),
      };

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
    if (!confirm(`Hapus produk "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setSuccess("Produk dihapus!");
        setTimeout(() => setSuccess(""), 3000);
        setLoading(true);
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
            <Package size={24} /> Kelola Produk
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">{products.length} produk ditemukan</p>
        </div>
        <button
          onClick={openCreate}
          className="gradient-red text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-95 transition-opacity flex items-center gap-2 self-start"
        >
          <Plus size={16} /> Tambah Produk
        </button>
      </div>

      {/* Success Message */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <Check size={14} className="text-green-600" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
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
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.isActive ? "opacity-50" : ""}`}>
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
                      <span className={`text-xs font-bold ${p.stock <= 10 ? "text-red-600" : "text-gray-600"}`}>
                        {p.stock}
                      </span>
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
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                          title="Hapus"
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
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Stok</label>
                  <input type="number" value={form.stock} onChange={(e) => setForm({...form, stock: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy" placeholder="999"/>
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
    </div>
  );
}
