"use client";

import { useState, useEffect } from "react";
import { User, Key, Save, CheckCircle2, AlertCircle, Shield } from "lucide-react";

export default function AdminProfilPage() {
  const [oldKey, setOldKey] = useState("");
  const [newKey, setNewKey] = useState("");
  const [confirmKey, setConfirmKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!oldKey || !newKey || !confirmKey) {
      setError("Semua field wajib diisi");
      return;
    }
    if (newKey !== confirmKey) {
      setError("Konfirmasi kunci baru tidak cocok");
      return;
    }
    if (newKey.length < 8) {
      setError("Kunci baru minimal 8 karakter");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldKey, newKey }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess("Kunci admin berhasil diubah! Silakan login ulang.");
        setOldKey("");
        setNewKey("");
        setConfirmKey("");
        // Update cookie with new key
        document.cookie = `admin_token=${newKey}; path=/; max-age=${60 * 60 * 24 * 30}`;
      } else {
        setError(data.error || "Gagal mengubah kunci");
      }
    } catch (err) {
      setError("Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
          <User size={24} /> Profil Admin
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Kelola keamanan akun admin
        </p>
      </div>

      {/* Admin Info Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gradient-navy flex items-center justify-center">
            <Shield size={24} className="text-white" />
          </div>
          <div>
            <h2 className="font-bold text-navy text-base">Super Admin</h2>
            <p className="text-gray-400 text-sm">Single admin • Secret key auth</p>
          </div>
        </div>
      </div>

      {/* Success */}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-600" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-red-600" />
          <p className="text-red-700 text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Change Key Form */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h3 className="font-bold text-sm text-navy mb-4 flex items-center gap-2">
          <Key size={16} /> Ubah Kunci Admin
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
              Kunci Saat Ini
            </label>
            <input
              type="password"
              value={oldKey}
              onChange={(e) => setOldKey(e.target.value)}
              placeholder="Masukkan kunci saat ini..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
              Kunci Baru
            </label>
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Minimal 8 karakter..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
              Konfirmasi Kunci Baru
            </label>
            <input
              type="password"
              value={confirmKey}
              onChange={(e) => setConfirmKey(e.target.value)}
              placeholder="Ulangi kunci baru..."
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full gradient-navy text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={16} /> Simpan Perubahan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
