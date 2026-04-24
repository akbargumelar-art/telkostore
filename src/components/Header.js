"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ChevronLeft, Search, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

const promoNotifications = [
  {
    id: 1,
    icon: "\u26A1",
    title: "Flash Sale Aktif!",
    desc: "Harga spesial terbatas untuk produk pilihan.",
    time: "Sekarang",
    isNew: true,
  },
  {
    id: 2,
    icon: "\u{1F4B8}",
    title: "Diskon hingga 20%",
    desc: "Promo spesial bulan ini untuk semua operator.",
    time: "Hari ini",
    isNew: true,
  },
  {
    id: 3,
    icon: "\u{1F3AE}",
    title: "Voucher Game Murah",
    desc: "Top up game favoritmu dengan harga terjangkau.",
    time: "2 hari lalu",
    isNew: false,
  },
  {
    id: 4,
    icon: "\u{1F4F6}",
    title: "Paket Data Hemat",
    desc: "Paket internet mulai dari Rp 10.000.",
    time: "3 hari lalu",
    isNew: false,
  },
];

function NotificationPanel({ compact = false, onClose }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden animate-slide-down ${
        compact ? "w-80 max-w-[calc(100vw-2rem)]" : "w-96"
      }`}
    >
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="font-bold text-sm text-navy">Notifikasi</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded-full"
          aria-label="Tutup notifikasi"
        >
          <X size={14} className="text-gray-400" />
        </button>
      </div>

      <div className={`${compact ? "max-h-72" : "max-h-80"} overflow-y-auto divide-y divide-gray-50`}>
        {promoNotifications.map((notif) => (
          <div
            key={notif.id}
            className={`px-4 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors ${
              notif.isNew ? "bg-tred-50/30" : ""
            }`}
          >
            <div
              className={`${
                compact ? "w-9 h-9 text-lg" : "w-10 h-10 text-xl"
              } rounded-xl bg-gray-100 flex items-center justify-center shrink-0`}
            >
              {notif.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
              <p className={`${compact ? "text-[11px] line-clamp-1" : "text-xs"} text-gray-400 mt-0.5`}>
                {notif.desc}
              </p>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className={`${compact ? "text-[9px]" : "text-[10px]"} text-gray-400`}>
                {notif.time}
              </span>
              {notif.isNew && <span className="w-2 h-2 bg-tred rounded-full mt-1" />}
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/promo"
        onClick={onClose}
        className={`block text-center ${
          compact ? "py-3 text-xs" : "py-3 text-sm"
        } font-semibold text-tred border-t border-gray-100 hover:bg-gray-50 transition-colors`}
      >
        Lihat Semua Promo
      </Link>
    </div>
  );
}

export default function Header() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentSearch, setCurrentSearch] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifSeen, setNotifSeen] = useState(false);
  const mobileNotifRef = useRef(null);
  const desktopNotifRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  if (pathname.startsWith("/control") || pathname.startsWith("/mitra")) {
    return null;
  }

  const isHome = pathname === "/";
  const isProductPage = pathname.startsWith("/product/");
  const isAuthenticated = status === "authenticated" && Boolean(session?.user);
  const isAuthResolved = status !== "loading";
  const userName = session?.user?.name?.trim() || "Akun Saya";
  const firstName = userName.split(" ")[0] || "Akun";
  const userImage = session?.user?.image;
  const userInitial = firstName.charAt(0).toUpperCase() || "A";

  useEffect(() => {
    function handleClickOutside(event) {
      const insideMobile = mobileNotifRef.current?.contains(event.target);
      const insideDesktop = desktopNotifRef.current?.contains(event.target);

      if (!insideMobile && !insideDesktop) {
        setNotifOpen(false);
      }
    }

    if (notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notifOpen]);

  useEffect(() => {
    setNotifOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const syncSearchFromUrl = () => {
      if (typeof window === "undefined") return;

      const params = new URLSearchParams(window.location.search);
      const nextSearch = params.get("search") || "";
      setCurrentSearch(nextSearch);
      setSearchQuery(nextSearch);
    };

    syncSearchFromUrl();
    window.addEventListener("popstate", syncSearchFromUrl);

    return () => window.removeEventListener("popstate", syncSearchFromUrl);
  }, [pathname]);

  const getSearchHref = (query) => {
    const params = new URLSearchParams();
    const currentCategory =
      pathname === "/" && typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("category")
        : null;

    if (currentCategory && currentCategory !== "all") {
      params.set("category", currentCategory);
    }

    if (query) {
      params.set("search", query);
    }

    const queryString = params.toString();
    return queryString ? `/?${queryString}#beli` : "/#beli";
  };

  const handleSearchSubmit = (event) => {
    event.preventDefault();
    const nextSearch = searchQuery.trim();
    setCurrentSearch(nextSearch);
    setSearchQuery(nextSearch);
    router.push(getSearchHref(nextSearch));
    setSearchOpen(false);
  };

  const handleSearchReset = () => {
    setCurrentSearch("");
    setSearchQuery("");
    router.push(getSearchHref(""));
    setSearchOpen(false);
  };

  const handleBellClick = () => {
    setNotifOpen((prev) => !prev);
    if (!notifSeen) {
      setNotifSeen(true);
    }
  };

  const newCount = notifSeen
    ? 0
    : promoNotifications.filter((item) => item.isNew).length;

  const topBarMessage = isAuthenticated
    ? `Login sebagai ${firstName} - cek promo dan riwayat pesanan lebih cepat`
    : "Express Checkout - beli langsung tanpa daftar akun";

  const topBarAccountLabel = isAuthenticated
    ? "Akun Saya"
    : isAuthResolved
      ? "Masuk / Daftar"
      : "Akun";

  const navLinks = [
    { href: "/", label: "Beranda", active: isHome },
    { href: "/promo", label: "Promo", active: pathname === "/promo" },
    { href: "/history", label: "Riwayat", active: pathname === "/history" },
  ];

  return (
    <>
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
              onClick={() => setSearchOpen((prev) => !prev)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
              aria-label="Search"
            >
              <Search size={20} className="text-gray-500" />
            </button>

            <div className="relative" ref={mobileNotifRef}>
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

              {notifOpen && (
                <div className="absolute right-0 top-12 z-50">
                  <NotificationPanel
                    compact
                    onClose={() => setNotifOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {searchOpen && (
          <form
            onSubmit={handleSearchSubmit}
            className="px-4 pb-3 animate-slide-down"
          >
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari pulsa, paket data, voucher..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-tred/20 focus:border-tred transition-all"
                autoFocus
              />
            </div>
            <div className="mt-2 flex items-center justify-end gap-2">
              {(searchQuery || currentSearch) && (
                <button
                  type="button"
                  onClick={handleSearchReset}
                  className="px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                type="submit"
                className="px-3 py-2 text-xs font-semibold text-white gradient-red rounded-lg"
              >
                Cari
              </button>
            </div>
          </form>
        )}
      </header>

      <header className="hidden md:block sticky top-0 z-50 bg-white shadow-sm border-b border-gray-100">
        <div className="gradient-navy text-white text-xs py-1.5">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <span>{topBarMessage}</span>
            <div className="flex items-center gap-4">
              <Link href="/faq" className="hover:text-tred-light transition-colors">
                FAQ
              </Link>
              <span className="text-white/40">|</span>
              <Link
                href="/contact"
                className="hover:text-tred-light transition-colors"
              >
                Hubungi Kami
              </Link>
              <span className="text-white/40">|</span>
              <Link
                href="/history"
                className="hover:text-tred-light transition-colors"
              >
                Lacak Pesanan
              </Link>
              <span className="text-white/40">|</span>
              <Link
                href="/account"
                className="hover:text-tred-light transition-colors"
              >
                {topBarAccountLabel}
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl gradient-red flex items-center justify-center text-white font-extrabold text-base shadow-md shadow-tred/20">
              T
            </div>
            <span className="font-extrabold text-navy text-xl tracking-tight">
              Telko<span className="text-tred">.Store</span>
            </span>
          </Link>

          <div className="flex-1 max-w-xl">
            <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari pulsa, paket data, voucher game..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-tred/20 focus:border-tred focus:bg-white transition-all"
              />
              {(searchQuery || currentSearch) && (
                <button
                  type="button"
                  onClick={handleSearchReset}
                  className="shrink-0 px-3 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                type="submit"
                className="shrink-0 px-4 py-2.5 text-sm font-semibold text-white gradient-red rounded-xl shadow-md shadow-tred/20 hover:opacity-90 transition-opacity"
              >
                Cari
              </button>
            </form>
          </div>

          <nav className="flex items-center gap-1 shrink-0">
            {navLinks.map((link) => (
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

            <div className="relative ml-1" ref={desktopNotifRef}>
              <button
                onClick={handleBellClick}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors relative"
                aria-label="Notifications"
              >
                <Bell size={18} className="text-gray-500" />
                {newCount > 0 && (
                  <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-tred rounded-full text-white text-[7px] font-bold flex items-center justify-center">
                    {newCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 top-12 z-[60]">
                  <NotificationPanel onClose={() => setNotifOpen(false)} />
                </div>
              )}
            </div>

            <Link
              href="/account"
              className={`ml-2 flex items-center gap-2 rounded-lg text-sm font-semibold transition-all ${
                isAuthenticated
                  ? "px-3.5 py-2 border border-gray-200 bg-white text-navy hover:bg-gray-50 shadow-sm"
                  : "px-5 py-2 gradient-red text-white hover:opacity-90 shadow-md shadow-tred/20"
              }`}
            >
              {isAuthenticated ? (
                <>
                  {userImage ? (
                    <img
                      src={userImage}
                      alt={userName}
                      className="w-7 h-7 rounded-full border border-gray-200 object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full gradient-navy text-white text-xs font-bold flex items-center justify-center">
                      {userInitial}
                    </div>
                  )}
                  <span className="max-w-[7rem] truncate">Halo, {firstName}</span>
                </>
              ) : (
                <span>{isAuthResolved ? "Masuk" : "Akun"}</span>
              )}
            </Link>
          </nav>
        </div>
      </header>
    </>
  );
}
