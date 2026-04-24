"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

function AktivasiForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [tokenUsed, setTokenUsed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setCheckingToken(false);
      return;
    }
    
    // Verify if token is still valid
    fetch(`/api/mitra/auth/activate?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.valid && data.used) {
          setTokenUsed(true);
        }
        setCheckingToken(false);
      })
      .catch(() => {
        setCheckingToken(false);
      });
  }, [token]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!token) {
      setError("Token aktivasi tidak ditemukan di URL.");
      return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mitra/auth/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Gagal mengaktifkan akun.");
      }
    } catch (err) {
      setError("Terjadi kesalahan jaringan.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-center shadow-lg">
        <p className="font-semibold text-red-600">Link aktivasi tidak valid.</p>
        <p className="mt-2 text-sm text-red-500">Pastikan Anda mengklik link lengkap dari pesan WhatsApp/Email.</p>
      </div>
    );
  }

  if (checkingToken) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-white" />
        <p className="mt-4 text-sm text-white/80">Memverifikasi link aktivasi...</p>
      </div>
    );
  }

  if (tokenUsed) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
          <AlertCircle size={32} className="text-blue-600" />
        </div>
        <h2 className="mt-6 text-2xl font-black text-navy">Sudah Diverifikasi</h2>
        <p className="mt-2 text-sm text-gray-500">
          Akun referral Anda sudah aktif dan password sudah dibuat sebelumnya.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          Silakan langsung login menggunakan Email dan Password yang telah Anda buat.
        </p>
        <Link
          href="/mitra/login"
          className="mt-8 flex w-full justify-center rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-navy/90"
        >
          Masuk ke Portal Mitra
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h2 className="mt-6 text-2xl font-black text-navy">Akun Aktif!</h2>
        <p className="mt-2 text-sm text-gray-500">
          Password Anda berhasil disimpan. Anda sekarang bisa login ke Portal Mitra.
        </p>
        <Link
          href="/mitra/login"
          className="mt-8 flex w-full justify-center rounded-xl bg-navy px-4 py-3 text-sm font-bold text-white shadow-lg transition-colors hover:bg-navy/90"
        >
          Masuk ke Portal Mitra
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-6 shadow-2xl md:p-8">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-black text-navy">Aktivasi Akun Mitra</h1>
        <p className="mt-2 text-sm text-gray-500">
          Buat password baru untuk akun referral Anda.
        </p>
      </div>

      {error ? (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-600">
            Buat Password Baru
          </label>
          <div className="relative">
            <Lock
              size={18}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
              className="w-full rounded-xl border border-gray-200 py-3.5 pl-11 pr-12 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || password.length < 8}
          className="w-full rounded-xl bg-navy px-4 py-3.5 text-sm font-bold text-white shadow-lg transition-colors hover:bg-navy/90 disabled:opacity-50"
        >
          {loading ? "Menyimpan..." : "Simpan & Aktifkan"}
        </button>
      </form>
    </div>
  );
}

export default function MitraAktivasiPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#2d2d6b,_#0f0f30)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-xl shadow-black/20">
            <span className="text-2xl font-black text-navy">T</span>
          </div>
        </div>
        <Suspense fallback={<div className="text-center text-white">Memuat formulir aktivasi...</div>}>
          <AktivasiForm />
        </Suspense>
      </div>
    </div>
  );
}
