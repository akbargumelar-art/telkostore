"use client";

import { useState } from "react";
import {
  User,
  Mail,
  Phone,
  Eye,
  EyeOff,
  LogIn,
  MessageCircle,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export default function AccountPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState("phone");

  return (
    <div className="max-w-lg mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl gradient-red flex items-center justify-center text-white text-2xl font-extrabold mx-auto mb-4 shadow-lg shadow-tred/20">
          T
        </div>
        <h1 className="text-navy font-extrabold text-2xl">
          Masuk ke Telko<span className="text-tred">.Store</span>
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Simpan riwayat transaksi & dapatkan promo eksklusif
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        {/* Tab switcher */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setLoginMethod("phone")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              loginMethod === "phone"
                ? "text-tred border-b-2 border-tred"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            📱 Nomor HP
          </button>
          <button
            onClick={() => setLoginMethod("email")}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${
              loginMethod === "email"
                ? "text-tred border-b-2 border-tred"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            ✉️ Email
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loginMethod === "phone" ? (
            <>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Nomor HP
                </label>
                <div className="relative">
                  <Phone
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="tel"
                    placeholder="081234567890"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tred focus:ring-2 focus:ring-tred/10 transition-all"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 flex items-start gap-2.5 border border-gray-100">
                <MessageCircle
                  size={16}
                  className="text-success shrink-0 mt-0.5"
                />
                <p className="text-[11px] text-gray-500 leading-relaxed">
                  Kode OTP akan dikirim via <strong>WhatsApp</strong> ke nomor di
                  atas.
                </p>
              </div>

              <button className="w-full gradient-red text-white font-bold py-3 rounded-xl text-sm hover:opacity-95 transition-opacity btn-ripple flex items-center justify-center gap-2 shadow-lg shadow-tred/20">
                Kirim Kode OTP <ArrowRight size={16} />
              </button>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Email
                </label>
                <div className="relative">
                  <Mail
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="email"
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tred focus:ring-2 focus:ring-tred/10 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                  Password
                </label>
                <div className="relative">
                  <ShieldCheck
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tred focus:ring-2 focus:ring-tred/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button className="w-full gradient-red text-white font-bold py-3 rounded-xl text-sm hover:opacity-95 transition-opacity btn-ripple flex items-center justify-center gap-2 shadow-lg shadow-tred/20">
                <LogIn size={16} /> Masuk
              </button>
            </>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-xs text-gray-400">atau</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Social Login */}
          <div className="space-y-2.5">
            <button className="w-full flex items-center justify-center gap-2.5 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Masuk dengan Google
            </button>
            <button className="w-full flex items-center justify-center gap-2.5 py-3 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Masuk dengan Facebook
            </button>
          </div>
        </div>
      </div>

      {/* Guest Access */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-bold text-sm text-navy mb-2 flex items-center gap-2">
          🔗 Akses Tamu
        </h3>
        <p className="text-gray-400 text-xs mb-3 leading-relaxed">
          Punya link tracking dari pembelian sebelumnya? Masukkan di sini.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Tempel link unik di sini..."
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tred focus:ring-2 focus:ring-tred/10 transition-all"
          />
          <button className="gradient-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-95 transition-opacity shrink-0">
            Buka
          </button>
        </div>
      </div>

      <p className="text-center text-gray-400 text-[10px] mt-6 px-4 leading-relaxed">
        Dengan masuk, kamu menyetujui{" "}
        <span className="text-tred cursor-pointer">Syarat & Ketentuan</span>{" "}
        serta{" "}
        <span className="text-tred cursor-pointer">Kebijakan Privasi</span>{" "}
        Telko.Store
      </p>
    </div>
  );
}
