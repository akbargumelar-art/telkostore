"use client";

import { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
} from "lucide-react";
import {
  BANNER_CATEGORY_OPTIONS,
  DEFAULT_SITE_BANNERS,
} from "@/lib/site-banners";

const emptyForm = {
  title: "",
  subtitle: "",
  ctaText: "",
  ctaType: "link",
  ctaLink: "",
  categoryId: "",
  backgroundStyle:
    DEFAULT_SITE_BANNERS[0]?.backgroundStyle ||
    "linear-gradient(135deg, #ED0226 0%, #1A1A4E 100%)",
  sortOrder: 1,
  isActive: true,
};

export default function AdminBannerPage() {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchBanners = async () => {
    try {
      const res = await fetch("/api/admin/banners", { cache: "no-store" });
      const data = await res.json();

      if (data.success) {
        setBanners(data.data || []);
      } else {
        setError(data.error || "Gagal memuat banner");
      }
    } catch (fetchError) {
      console.error(fetchError);
      setError("Gagal memuat banner");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      sortOrder: banners.length + 1,
    });
    setError("");
    setShowModal(true);
  };

  const openEdit = (banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      ctaText: banner.ctaText || "",
      ctaType: banner.ctaType || "link",
      ctaLink: banner.ctaLink || "",
      categoryId: banner.categoryId || "",
      backgroundStyle: banner.backgroundStyle || emptyForm.backgroundStyle,
      sortOrder: Number(banner.sortOrder || 0),
      isActive: banner.isActive !== false,
    });
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder || 0),
      };

      const url = editingId
        ? `/api/admin/banners/${editingId}`
        : "/api/admin/banners";
      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Gagal menyimpan slide banner");
        return;
      }

      setSuccess(
        editingId
          ? "Slide banner berhasil diperbarui"
          : "Slide banner berhasil ditambahkan"
      );
      setTimeout(() => setSuccess(""), 3000);
      closeModal();
      setLoading(true);
      fetchBanners();
    } catch (saveError) {
      console.error(saveError);
      setError("Terjadi kesalahan saat menyimpan banner");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (banner) => {
    if (!window.confirm(`Hapus slide "${banner.title}"?`)) return;

    setDeletingId(banner.id);
    setError("");

    try {
      const res = await fetch(`/api/admin/banners/${banner.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Gagal menghapus slide banner");
        return;
      }

      setSuccess(data.message || "Slide banner berhasil dihapus");
      setTimeout(() => setSuccess(""), 3000);
      setLoading(true);
      fetchBanners();
    } catch (deleteError) {
      console.error(deleteError);
      setError("Terjadi kesalahan saat menghapus banner");
    } finally {
      setDeletingId(null);
    }
  };

  const ctaIsCategory = form.ctaType === "category";

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
            <ImageIcon size={24} /> Kelola Banner
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Atur slide banner homepage website
          </p>
        </div>
        <button
          onClick={openCreate}
          className="gradient-red text-white font-bold px-5 py-2.5 rounded-xl text-sm hover:opacity-95 transition-opacity flex items-center gap-2 self-start"
        >
          <Plus size={16} /> Tambah Slide
        </button>
      </div>

      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={14} className="text-green-600" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}

      {error && !showModal && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2 animate-fade-in">
          <AlertCircle size={14} className="text-red-600" />
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-navy animate-spin" />
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-16">
            <ImageIcon size={48} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Belum ada slide banner</p>
            <button
              onClick={openCreate}
              className="mt-3 text-navy text-sm font-semibold hover:underline"
            >
              + Tambah slide pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 p-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="rounded-2xl border border-gray-100 overflow-hidden"
              >
                <div
                  className="relative px-5 py-6"
                  style={{ background: banner.backgroundStyle }}
                >
                  <div
                    className="absolute top-0 right-0 w-40 h-40 rounded-full -translate-y-1/2 translate-x-1/2"
                    style={{ background: "rgba(255,255,255,0.06)" }}
                  />
                  <div className="relative z-10 max-w-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="bg-white/15 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        Urutan {banner.sortOrder}
                      </span>
                      <span className="bg-white/15 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        {banner.ctaType === "category" ? "Kategori" : "Link"}
                      </span>
                      <span className="bg-white/15 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        {banner.isActive ? "Aktif" : "Non-aktif"}
                      </span>
                    </div>
                    <h2 className="text-white text-xl font-extrabold leading-tight mb-2">
                      {banner.title}
                    </h2>
                    <p className="text-white/80 text-sm mb-5">
                      {banner.subtitle}
                    </p>
                    <div className="inline-flex items-center gap-2 bg-white text-navy font-bold text-sm px-4 py-2 rounded-xl shadow-lg">
                      {banner.ctaText}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">
                      Tujuan CTA
                    </p>
                    <p className="text-sm text-gray-700 font-medium truncate">
                      {banner.ctaType === "category"
                        ? `Kategori: ${banner.categoryId}`
                        : banner.ctaLink}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEdit(banner)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-50 text-blue-700 text-sm font-semibold hover:bg-blue-100 transition-colors"
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(banner)}
                      disabled={deletingId === banner.id}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 text-sm font-semibold hover:bg-red-100 transition-colors disabled:opacity-60"
                    >
                      <Trash2 size={14} /> Hapus
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-2xl">
              <h2 className="font-bold text-navy text-base">
                {editingId ? "Edit Slide Banner" : "Tambah Slide Banner"}
              </h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
              >
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Judul Slide
                  </label>
                  <input
                    value={form.title}
                    onChange={(event) =>
                      setForm({ ...form, title: event.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy"
                    placeholder="Contoh: Flash Sale Paket Data"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Subjudul
                  </label>
                  <textarea
                    value={form.subtitle}
                    onChange={(event) =>
                      setForm({ ...form, subtitle: event.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy resize-none"
                    placeholder="Ringkasan promo atau ajakan singkat"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Teks Tombol
                  </label>
                  <input
                    value={form.ctaText}
                    onChange={(event) =>
                      setForm({ ...form, ctaText: event.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy"
                    placeholder="Contoh: Beli Sekarang"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Tipe CTA
                  </label>
                  <select
                    value={form.ctaType}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        ctaType: event.target.value,
                        ...(event.target.value === "link"
                          ? { categoryId: "" }
                          : { ctaLink: "" }),
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy bg-white"
                  >
                    <option value="link">Link Produk / Halaman</option>
                    <option value="category">Kategori Produk</option>
                  </select>
                </div>

                {ctaIsCategory ? (
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      Kategori Target
                    </label>
                    <select
                      value={form.categoryId}
                      onChange={(event) =>
                        setForm({ ...form, categoryId: event.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy bg-white"
                    >
                      <option value="">Pilih kategori</option>
                      {BANNER_CATEGORY_OPTIONS.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">
                      Link Target
                    </label>
                    <input
                      value={form.ctaLink}
                      onChange={(event) =>
                        setForm({ ...form, ctaLink: event.target.value })
                      }
                      className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy"
                      placeholder="/product/data-combo-30d atau /promo"
                    />
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Background CSS
                  </label>
                  <input
                    value={form.backgroundStyle}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        backgroundStyle: event.target.value,
                      })
                    }
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-navy"
                    placeholder="linear-gradient(135deg, #ED0226 0%, #1A1A4E 100%)"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Isi dengan gradient CSS atau nilai background lain yang valid.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">
                    Urutan
                  </label>
                  <input
                    type="number"
                    value={form.sortOrder}
                    onChange={(event) =>
                      setForm({ ...form, sortOrder: event.target.value })
                    }
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy"
                  />
                </div>

                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm({ ...form, isActive: event.target.checked })
                      }
                      className="rounded"
                    />
                    {form.isActive ? (
                      <>
                        <Eye size={14} /> Tampilkan slide ini
                      </>
                    ) : (
                      <>
                        <EyeOff size={14} /> Sembunyikan slide ini
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden border border-gray-100">
                <div
                  className="px-5 py-6"
                  style={{ background: form.backgroundStyle }}
                >
                  <p className="text-white/60 text-[11px] font-medium mb-2">
                    Preview
                  </p>
                  <h3 className="text-white text-xl font-extrabold leading-tight mb-2">
                    {form.title || "Judul slide"}
                  </h3>
                  <p className="text-white/80 text-sm mb-4">
                    {form.subtitle || "Subjudul slide akan tampil di sini."}
                  </p>
                  <div className="inline-flex items-center gap-2 bg-white text-navy font-bold text-sm px-4 py-2 rounded-xl shadow-lg">
                    {form.ctaText || "Tombol CTA"}
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-5 py-4 flex justify-end gap-3 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="gradient-navy text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:opacity-95 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                {editingId ? "Simpan Perubahan" : "Tambah Slide"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
