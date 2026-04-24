"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  Megaphone,
  ReceiptText,
  Store,
  UserRound,
  Wallet,
  X,
  Banknote,
} from "lucide-react";
import { useEffect, useState } from "react";
const navItems = [
  { href: "/mitra", label: "Dashboard", icon: LayoutDashboard },
  { href: "/mitra/transaksi", label: "Transaksi", icon: ReceiptText },
  { href: "/mitra/profit", label: "Profit", icon: Wallet },
  { href: "/mitra/withdraw", label: "Withdraw", icon: Banknote },
  { href: "/mitra/promo", label: "Promo", icon: Megaphone },
  { href: "/mitra/profil", label: "Profil", icon: UserRound },
];

function SidebarContent({ pathname, profile, onLogout }) {
  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <Link href="/mitra" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/14">
            <Link2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black text-white">
              Portal Mitra
            </h1>
            <p className="text-[11px] text-white/65">
              {profile?.displayName || "Referral Telko.Store"}
            </p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/mitra" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all ${
                isActive
                  ? "bg-white text-navy shadow-lg"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-white/10 px-3 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-white/80 hover:bg-white/10 hover:text-white"
        >
          <Store size={17} />
          Lihat Toko
        </Link>
        <button
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold text-rose-100 hover:bg-white/10"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </>
  );
}

export default function MitraLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    if (pathname === "/mitra/login") {
      setCheckingSession(false);
      return;
    }

    fetch("/api/mitra/me", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          router.replace("/mitra/login");
          return;
        }

        setProfile(data.data || null);
      })
      .catch(() => {
        router.replace("/mitra/login");
      })
      .finally(() => {
        setCheckingSession(false);
      });
  }, [pathname, router]);

  const handleLogout = async () => {
    setSidebarOpen(false);

    try {
      await fetch("/api/mitra/auth/logout", { method: "POST" });
    } catch {
      // Ignore.
    }

    router.push("/mitra/login");
    router.refresh();
  };

  if (pathname === "/mitra/login") {
    return children;
  }

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#2d2d6b,_#0f0f30)]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7fb]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col bg-[radial-gradient(circle_at_top,_#2d2d6b,_#0f0f30)] md:flex">
        <SidebarContent pathname={pathname} profile={profile} onLogout={handleLogout} />
      </aside>

      {sidebarOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-[radial-gradient(circle_at_top,_#2d2d6b,_#0f0f30)] shadow-2xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white"
            >
              <X size={16} />
            </button>
            <SidebarContent pathname={pathname} profile={profile} onLogout={handleLogout} />
          </aside>
        </div>
      ) : null}

      <div className="md:ml-72">
        <header className="sticky top-0 z-20 border-b border-gray-100 bg-white/90 backdrop-blur md:hidden">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gray-100"
            >
              <Menu size={18} />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                Portal
              </p>
              <h1 className="text-sm font-black text-navy">
                {profile?.displayName || "Mitra Telko.Store"}
              </h1>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
