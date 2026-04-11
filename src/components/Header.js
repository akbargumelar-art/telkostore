"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Bell, ChevronLeft } from "lucide-react";
import { usePathname } from "next/navigation";

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isProductPage = pathname.startsWith("/product/");

  return (
    <>
      {/* ===== MOBILE HEADER ===== */}
      <header className="md:hidden sticky top-0 z-50 glass-effect">
        <div className="flex items-center justify-between px-4 h-14">
          {isProductPage ? (
            <Link
              href="/"
              className="flex items-center gap-1 text-navy font-semibold text-sm"
            >
              <ChevronLeft size={20} />
              <span>Kembali</span>
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-red flex items-center justify-center text-white font-extrabold text-sm">
                T
              </div>
              <span className="font-bold text-navy text-lg tracking-tight">
                Telko<span className="text-tred">.Store</span>
              </span>
            </Link>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search size={20} className="text-gray-500" />
            </button>
            <button
              className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={20} className="text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-tred rounded-full"></span>
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {searchOpen && (
          <div className="px-4 pb-3 animate-slide-down">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Cari pulsa, paket data, voucher..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-tred/20 focus:border-tred transition-all"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      {/* ===== DESKTOP HEADER ===== */}
      <header className="hidden md:block sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        {/* Top bar */}
        <div className="gradient-navy text-white text-xs py-1.5">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <span>⚡ Express Checkout — Beli langsung tanpa daftar akun!</span>
            <div className="flex items-center gap-4">
              <Link href="/history" className="hover:text-tred-light transition-colors">
                Lacak Pesanan
              </Link>
              <span className="text-white/40">|</span>
              <Link href="/account" className="hover:text-tred-light transition-colors">
                Masuk / Daftar
              </Link>
            </div>
          </div>
        </div>

        {/* Main nav */}
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl gradient-red flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-tred/20">
              T
            </div>
            <span className="font-extrabold text-navy text-xl tracking-tight">
              Telko<span className="text-tred">.Store</span>
            </span>
          </Link>

          {/* Search bar */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Cari pulsa, paket data, voucher game..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-tred/20 focus:border-tred focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1 shrink-0">
            {[
              { href: "/", label: "Beranda", active: isHome },
              { href: "/promo", label: "🔥 Promo", active: pathname === "/promo" },
              { href: "/history", label: "Riwayat", active: pathname === "/history" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  link.active
                    ? "bg-tred-50 text-tred"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/account"
              className="ml-2 px-5 py-2 gradient-red text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-md shadow-tred/20"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
