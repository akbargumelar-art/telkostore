"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  ChevronRight,
  User,
  Users,
  Ticket,
} from "lucide-react";
import { useEffect, useState } from "react";

const allNavItems = [
  { href: "/control", label: "Dashboard", icon: LayoutDashboard, superadminOnly: false },
  { href: "/control/produk", label: "Produk", icon: Package, superadminOnly: false },
  { href: "/control/pesanan", label: "Pesanan", icon: ShoppingCart, superadminOnly: false },
  { href: "/control/voucher", label: "Voucher", icon: Ticket, superadminOnly: false },
  { href: "/control/users", label: "Users", icon: Users, superadminOnly: true },
  { href: "/control/profil", label: "Profil", icon: User, superadminOnly: false },
  { href: "/control/pengaturan", label: "Pengaturan", icon: Settings, superadminOnly: true },
];

function SidebarContent({ pathname, onLogout, navItems }) {
  return (
    <>
      <div className="px-5 py-5 border-b border-gray-100">
        <Link href="/control" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-navy flex items-center justify-center">
            <Store size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm text-navy leading-tight">
              Telko<span className="text-tred">.Store</span>
            </h1>
            <p className="text-[10px] text-gray-400 font-medium">Control Panel</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/control" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "gradient-navy text-white shadow-md"
                  : "text-gray-600 hover:bg-gray-100 hover:text-navy"
              }`}
            >
              <Icon size={18} />
              {item.label}
              {isActive && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 space-y-2">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-100 transition-all"
        >
          <Store size={18} />
          Lihat Toko
        </Link>
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </>
  );
}

export default function ControlLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [adminType, setAdminType] = useState(null);

  useEffect(() => {
    if (pathname === "/control/login") return;

    fetch("/api/admin/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAdminType(data.adminType);
        }
      })
      .catch(() => {});
  }, [pathname]);

  if (pathname === "/control/login") {
    return children;
  }

  // Filter nav items based on admin type
  const navItems = adminType === "superadmin" || adminType === null
    ? allNavItems
    : allNavItems.filter((item) => !item.superadminOnly);

  const handleLogout = async () => {
    setSidebarOpen(false);

    try {
      await signOut({ redirect: false });
    } catch {
      // Ignore if there is no Auth.js session and continue clearing legacy cookie.
    }

    try {
      await fetch("/api/admin/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // Ignore logout route failures and continue redirecting to login page.
    }

    router.push("/control/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden md:flex w-60 bg-white border-r border-gray-100 flex-col fixed inset-y-0 left-0 z-30">
        <SidebarContent pathname={pathname} onLogout={handleLogout} navItems={navItems} />
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 inset-y-0 w-64 bg-white flex flex-col animate-slide-right shadow-2xl">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
            >
              <X size={16} />
            </button>
            <SidebarContent pathname={pathname} onLogout={handleLogout} navItems={navItems} />
          </aside>
        </div>
      )}

      <div className="flex-1 md:ml-60">
        <header className="md:hidden sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
          >
            <Menu size={18} />
          </button>
          <h1 className="font-bold text-sm text-navy">
            Telko<span className="text-tred">.Store</span> Control
          </h1>
        </header>

        <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
