"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, ChevronLeft, X, Zap, Sparkles, Tag, Gift } from "lucide-react";
import { usePathname } from "next/navigation";

const promoNotifications = [
  { id: 1, icon: "⚡", title: "Flash Sale Aktif!", desc: "Harga spesial terbatas untuk produk pilihan.", time: "Sekarang", isNew: true },
  { id: 2, icon: "💸", title: "Diskon hingga 20%", desc: "Promo spesial bulan ini untuk semua operator.", time: "Hari ini", isNew: true },
  { id: 3, icon: "🎮", title: "Voucher Game Murah", desc: "Top up game favoritmu dengan harga terjangkau.", time: "2 hari lalu", isNew: false },
  { id: 4, icon: "📶", title: "Paket Data Hemat", desc: "Paket internet mulai dari Rp 10.000.", time: "3 hari lalu", isNew: false },
];

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSeen, setNotifSeen] = useState(false);
  const notifRef = useRef(null);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isProductPage = pathname.startsWith("/product/");

  // Close notif on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  // Close on route change
  useEffect(() => {
    setNotifOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const handleBellClick = () => {
    setNotifOpen(!notifOpen);
    if (!notifSeen) setNotifSeen(true);
  };

  const newCount = notifSeen ? 0 : promoNotifications.filter((n) => n.isNew).length;

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
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleBellClick}
                className="p-2 rounded-full hover:bg-gray-100 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell size={20} className="text-gray-500" />
                {newCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 bg-tred rounded-full text-white text-[8px] font-bold flex items-center justify-center">
                    {newCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown (Mobile) */}
              {notifOpen && (
                <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50 animate-slide-down">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-navy">Notifikasi</h3>
                    <button onClick={() => setNotifOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
                      <X size={14} className="text-gray-400" />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {promoNotifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                          notif.isNew ? "bg-tred-50/30" : ""
                        }`}
                      >
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-lg shrink-0">
                          {notif.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-1">{notif.desc}</p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[9px] text-gray-400">{notif.time}</span>
                          {notif.isNew && (
                            <span className="w-2 h-2 bg-tred rounded-full mt-1"></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/promo"
                    onClick={() => setNotifOpen(false)}
                    className="block text-center py-3 text-xs font-semibold text-tred border-t border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    Lihat Semua Promo →
                  </Link>
                </div>
              )}
            </div>
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

            {/* Desktop Bell */}
            <div className="relative" ref={notifOpen ? undefined : null}>
              <button
                onClick={handleBellClick}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative ml-1"
              >
                <Bell size={18} className="text-gray-500" />
                {newCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-tred rounded-full text-white text-[7px] font-bold flex items-center justify-center">
                    {newCount}
                  </span>
                )}
              </button>
            </div>

            <Link
              href="/account"
              className="ml-2 px-5 py-2 gradient-red text-white rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity shadow-md shadow-tred/20"
            >
              Masuk
            </Link>
          </nav>
        </div>
      </header>

      {/* Desktop Notification Dropdown */}
      {notifOpen && (
        <div className="hidden md:block fixed top-[6.5rem] right-8 z-[60] w-96 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden animate-slide-down">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-sm text-navy">Notifikasi</h3>
            <button onClick={() => setNotifOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
              <X size={14} className="text-gray-400" />
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {promoNotifications.map((notif) => (
              <div
                key={notif.id}
                className={`px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
                  notif.isNew ? "bg-tred-50/30" : ""
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0">
                  {notif.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{notif.desc}</p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-[10px] text-gray-400">{notif.time}</span>
                  {notif.isNew && (
                    <span className="w-2 h-2 bg-tred rounded-full mt-1"></span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/promo"
            onClick={() => setNotifOpen(false)}
            className="block text-center py-3 text-xs font-semibold text-tred border-t border-gray-100 hover:bg-gray-50 transition-colors"
          >
            Lihat Semua Promo →
          </Link>
        </div>
      )}
    </>
  );
}
