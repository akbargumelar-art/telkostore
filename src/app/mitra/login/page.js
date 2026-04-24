"use client";

import { useRouter } from "next/navigation";
import { Link2, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";

export default function MitraLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/mitra/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Login gagal.");
        return;
      }

      router.push("/mitra");
      router.refresh();
    } catch {
      setError("Terjadi gangguan saat login.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#2d2d6b,_#0f0f30)] px-4 py-10">
      <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[32px] border border-white/12 bg-white/8 p-8 text-white shadow-2xl backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
            <Link2 size={14} />
            Portal Referral
          </div>
          <h1 className="mt-5 max-w-lg text-4xl font-black leading-tight">
            Kelola link referral, lihat transaksi, dan siapkan promo personalmu.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/78">
            Masuk sebagai mitra Telko.Store untuk cek performa referral, ubah custom
            link, dan gunakan key visual yang siap dibagikan ke sosial media atau banner website.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              "Dashboard transaksi referral real-time",
              "Custom link pribadi yang bisa kamu edit sendiri",
              "Preview visual promo untuk feed, banner, dan story",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/12 bg-white/8 p-4 text-sm font-medium text-white/85"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[32px] bg-white p-7 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl gradient-red">
              <ShieldCheck size={20} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Login Mitra
              </p>
              <h2 className="text-lg font-black text-navy">Masuk ke Portal Referral</h2>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Email Referral
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="mitra@telko.store"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                placeholder="Minimal 8 karakter"
                className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/10"
                required
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl gradient-navy px-4 py-3 text-sm font-bold text-white transition-opacity hover:opacity-95 disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Masuk ke Dashboard
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
