"use client";

import Link from "next/link";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";

export default function MitraProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    displayName: "",
    email: "",
    phone: "",
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");

  const fetchProfile = async () => {
    setLoading(true);
    const res = await fetch("/api/mitra/profile", { cache: "no-store" });
    const data = await res.json();
    if (data.success) {
      setProfile(data.data);
      setForm({
        displayName: data.data.displayName || "",
        email: data.data.email || "",
        phone: data.data.phone || "",
      });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleProfileSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    const res = await fetch("/api/mitra/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSaving(false);

    if (data.success) {
      setProfile(data.data);
      setMessage("Profil mitra berhasil diperbarui.");
    } else {
      setMessage(data.error || "Gagal menyimpan profil.");
    }
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    setSavingPassword(true);
    const res = await fetch("/api/mitra/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(passwordForm),
    });
    const data = await res.json();
    setSavingPassword(false);

    if (data.success) {
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setMessage("Password mitra berhasil diperbarui.");
    } else {
      setMessage(data.error || "Gagal memperbarui password.");
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-navy" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-navy">Profil Mitra</h1>
        <p className="mt-1 text-sm text-gray-500">
          Kelola identitas akun referral dan keamanan login.
        </p>
      </div>

      {message ? (
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <form onSubmit={handleProfileSave} className="space-y-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-navy">Data Akun</h2>
            <p className="mt-1 text-sm text-gray-500">
              Nama, email, dan nomor yang dipakai untuk portal referral.
            </p>
          </div>

          <div className="grid gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Nama Display
              </label>
              <input
                type="text"
                value={form.displayName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, displayName: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Email Login
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Nomor HP
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(event) =>
                  setForm((current) => ({ ...current, phone: event.target.value }))
                }
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl gradient-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            <Save size={16} />
            {saving ? "Menyimpan..." : "Simpan Profil"}
          </button>
        </form>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-navy">Identitas Referral</h2>
              <p className="mt-1 text-sm text-gray-500">
                Canonical link selalu dibuat otomatis. Custom link bisa diatur dari halaman promo.
              </p>
            </div>

            <div className="mt-4 grid gap-3">
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Slug Canonical
                </p>
                <p className="mt-1 text-sm font-semibold text-navy">{profile.slug}</p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Custom Link
                </p>
                <p className="mt-1 text-sm font-semibold text-navy">
                  {profile.links.customUrl || "Belum diaktifkan"}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                  Redirect Tujuan
                </p>
                <p className="mt-1 text-sm font-semibold text-navy">
                  {profile.promoRedirectPath || "/"}
                </p>
              </div>
            </div>

            <Link
              href="/mitra/promo"
              className="mt-4 inline-flex rounded-2xl border border-gray-200 px-4 py-3 text-sm font-bold text-navy"
            >
              Buka Pengaturan Promo
            </Link>
          </div>

          <form onSubmit={handlePasswordSave} className="space-y-5 rounded-[28px] border border-gray-100 bg-white p-5 shadow-sm">
            <div>
              <h2 className="text-lg font-black text-navy">Ubah Password</h2>
              <p className="mt-1 text-sm text-gray-500">
                Gunakan password baru minimal 8 karakter.
              </p>
            </div>

            <div className="grid gap-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Password Lama
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      currentPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Password Baru
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(event) =>
                    setPasswordForm((current) => ({
                      ...current,
                      newPassword: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center gap-2 rounded-2xl bg-navy px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {savingPassword ? "Menyimpan..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
