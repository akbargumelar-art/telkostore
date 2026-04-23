"use client";

import { useState, useEffect } from "react";
import {
  Shield,
  UserRound,
  LockKeyhole,
  KeyRound,
  RefreshCw,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Save,
  Mail,
} from "lucide-react";

export default function ControlProfilPage() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    image: "",
    password: "",
  });

  useEffect(() => {
    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.profile) {
          setProfile(data.profile);
          setFormData((prev) => ({
            ...prev,
            name: data.profile.name || "",
            image: data.profile.image || "",
          }));
        }
      })
      .catch((err) => console.error("Gagal memuat profil", err))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "Profil berhasil diperbarui");
        setFormData((prev) => ({ ...prev, password: "" })); // Clear password field
      } else {
        setError(data.error || "Gagal memperbarui profil");
      }
    } catch (err) {
      setError("Terjadi kesalahan server");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-navy animate-spin"></div>
      </div>
    );
  }

  // Tampilan untuk superadmin (tidak bisa edit)
  if (profile && !profile.canEditProfile) {
    const envRows = [
      {
        name: "ADMIN_LOGIN_USER",
        desc: "Username utama untuk masuk ke /control/login.",
      },
      {
        name: "ADMIN_LOGIN_EMAIL",
        desc: "Opsional. Email admin yang juga boleh dipakai untuk login kredensial.",
      },
      {
        name: "ADMIN_LOGIN_PASSWORD",
        desc: "Password khusus control panel. Jika kosong, sistem fallback ke ADMIN_SECRET.",
      },
      {
        name: "ADMIN_SECRET",
        desc: "Secret internal untuk menandatangani cookie admin_token. Buat acak dan panjang.",
      },
    ];

    return (
      <div className="max-w-4xl space-y-4">
        <div>
          <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
            <Shield size={24} /> Keamanan Control (Superadmin)
          </h1>
          <p className="text-gray-400 text-sm mt-0.5">
            Pengaturan profil superadmin diatur melalui file environment.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <RefreshCw size={18} className="text-purple-600" />
            </div>
            <div>
              <h3 className="font-bold text-navy text-sm">
                Update dari `.env.local`
              </h3>
              <p className="text-gray-400 text-xs">
                Ubah di server lalu deploy ulang
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {envRows.map((row) => (
              <div
                key={row.name}
                className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
              >
                <p className="font-mono text-xs font-bold text-navy">{row.name}</p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  {row.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Tampilan untuk admin biasa (bisa edit)
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-navy font-extrabold text-xl md:text-2xl flex items-center gap-2">
          <UserRound size={24} /> Profil Saya
        </h1>
        <p className="text-gray-400 text-sm mt-0.5">
          Kelola informasi profil dan password Anda.
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
          <CheckCircle2 size={18} className="text-green-600" />
          <p className="text-green-700 text-sm font-medium">{success}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 animate-fade-in">
          <AlertCircle size={18} className="text-red-600" />
          <p className="text-red-600 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-6 space-y-6">
          {/* Email (Readonly) */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
              <Mail size={16} className="text-gray-400" /> Email Admin
            </label>
            <input
              type="email"
              value={profile?.email || ""}
              disabled
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-2">
              Email tidak dapat diubah karena digunakan untuk login (termasuk via Google/Facebook).
            </p>
          </div>

          <hr className="border-gray-100" />

          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
              <UserRound size={16} className="text-gray-400" /> Nama Lengkap
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Masukkan nama lengkap"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
            />
          </div>

          {/* Photo URL */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
              <ImageIcon size={16} className="text-gray-400" /> URL Foto Profil
            </label>
            <div className="flex gap-4 items-center">
              {formData.image ? (
                <img
                  src={formData.image}
                  alt="Preview"
                  className="w-12 h-12 rounded-full border border-gray-200 object-cover shrink-0"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
                  <UserRound size={20} className="text-gray-400" />
                </div>
              )}
              <input
                type="url"
                name="image"
                value={formData.image}
                onChange={handleChange}
                placeholder="https://example.com/foto.jpg (opsional)"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Password */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block flex items-center gap-2">
              <LockKeyhole size={16} className="text-gray-400" /> Ganti Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Kosongkan jika tidak ingin mengubah password"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/10 transition-all"
            />
            <p className="text-xs text-gray-400 mt-2">
              Masukkan password baru jika Anda ingin mengganti password login manual Anda.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 gradient-navy text-white rounded-xl text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                Menyimpan...
              </>
            ) : (
              <>
                <Save size={16} /> Simpan Profil
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
