"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Flame, Zap, ClipboardList, User } from "lucide-react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/promo", label: "Promo", icon: Flame },
  { href: "/#beli", label: "Beli", icon: Zap, isCenter: true },
  { href: "/history", label: "Riwayat", icon: ClipboardList },
  { href: "/account", label: "Akun", icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/control") || pathname.startsWith("/mitra")) {
    return null;
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass-bottom" style={{ boxShadow: '0 -4px 20px rgba(0,0,0,0.06)' }}>
      <div className="flex items-end justify-around px-2 pt-2 pb-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
        {navItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative -mt-5 flex flex-col items-center group"
              >
                <div className="w-14 h-14 rounded-full gradient-red flex items-center justify-center shadow-lg shadow-tred/30 transition-transform group-active:scale-90">
                  <Icon size={24} className="text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-bold text-tred mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-lg transition-colors ${
                isActive
                  ? "text-tred"
                  : "text-gray-400 active:text-gray-500"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className="transition-all"
              />
              <span
                className={`text-[10px] mt-0.5 ${
                  isActive ? "font-bold" : "font-medium"
                }`}
              >
                {item.label}
              </span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-tred mt-0.5"></div>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
