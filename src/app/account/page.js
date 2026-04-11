"use client";

import { useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import {
  User,
  LogOut,
  ShoppingBag,
  ChevronRight,
  Clock,
  CheckCircle2,
  Package,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

// Status badge colors
const statusStyle = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-blue-100 text-blue-800",
  processing: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
};

const statusLabel = {
  pending: "Menunggu",
  paid: "Dibayar",
  processing: "Proses",
  completed: "Selesai",
  failed: "Gagal",
};

function formatRupiah(n) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(n);
}

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ===== LOGIN VIEW =====
function LoginView() {
  const [trackingLink, setTrackingLink] = useState("");

  const handleTrackingOpen = () => {
    if (trackingLink.trim()) {
      // Extract path from full URL or use as-is
      const url = trackingLink.trim();
      if (url.startsWith("http")) {
        try {
          const parsed = new URL(url);
          window.location.href = parsed.pathname + parsed.search;
        } catch {
          window.location.href = url;
        }
      } else {
        window.location.href = url;
      }
    }
  };

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

      {/* Social Login Card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="p-5 space-y-3">
          <button
            onClick={() => signIn("google", { callbackUrl: "/account" })}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Masuk dengan Google
          </button>

          <button
            onClick={() => signIn("facebook", { callbackUrl: "/account" })}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
            Masuk dengan Facebook
          </button>
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
            value={trackingLink}
            onChange={(e) => setTrackingLink(e.target.value)}
            placeholder="Tempel link tracking di sini..."
            className="flex-1 px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-tred focus:ring-2 focus:ring-tred/10 transition-all"
          />
          <button
            onClick={handleTrackingOpen}
            className="gradient-navy text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-95 transition-opacity shrink-0"
          >
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

// ===== PROFILE VIEW =====
function ProfileView({ session }) {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Fetch user's orders
  useState(() => {
    async function fetchOrders() {
      try {
        const res = await fetch("/api/user/orders");
        const data = await res.json();
        if (data.success) {
          setOrders(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err);
      } finally {
        setLoadingOrders(false);
      }
    }
    fetchOrders();
  });

  return (
    <div className="max-w-lg mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm mb-6">
        <div className="gradient-navy px-5 py-6 text-center">
          {session.user.image ? (
            <img
              src={session.user.image}
              alt={session.user.name}
              className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white/30"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
              <User size={28} className="text-white/60" />
            </div>
          )}
          <h2 className="text-white font-extrabold text-lg">
            {session.user.name || "User"}
          </h2>
          <p className="text-white/60 text-sm">{session.user.email}</p>
        </div>

        <div className="p-4">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-red-50 hover:border-red-200 hover:text-tred transition-all"
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
      </div>

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-navy text-base mb-2">Keluar dari akun?</h3>
            <p className="text-gray-400 text-sm mb-5">
              Kamu masih bisa melakukan pembelian sebagai tamu.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex-1 py-2.5 gradient-red text-white rounded-xl text-sm font-bold hover:opacity-95 transition-opacity"
              >
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6 shadow-sm">
        <h3 className="font-bold text-sm text-navy mb-3 flex items-center gap-2">
          <ShoppingBag size={16} /> Menu
        </h3>
        <div className="space-y-1">
          {[
            { href: "/", icon: "🏪", label: "Beranda", desc: "Jelajahi produk" },
            { href: "/promo", icon: "🔥", label: "Promo", desc: "Penawaran spesial" },
            { href: "/history", icon: "📋", label: "Cari Pesanan", desc: "Cari via invoice / nomor HP" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
            >
              <span className="text-xl">{item.icon}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{item.label}</p>
                <p className="text-[10px] text-gray-400">{item.desc}</p>
              </div>
              <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <h3 className="font-bold text-sm text-navy mb-3 flex items-center gap-2">
          <Clock size={16} /> Pesanan Terakhir
        </h3>

        {loadingOrders ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex gap-3 p-3 rounded-xl bg-gray-50">
                <div className="w-10 h-10 bg-gray-200 rounded-xl"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-1.5"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <Package size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Belum ada pesanan</p>
            <Link
              href="/"
              className="inline-flex items-center gap-1 text-tred text-sm font-semibold mt-2 hover:underline"
            >
              Mulai belanja <ChevronRight size={14} />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.slice(0, 5).map((order) => (
              <Link
                key={order.id}
                href={`/order/${order.id}?token=${order.guestToken}`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group border border-gray-50"
              >
                <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg shrink-0">
                  {order.status === "completed" ? "✅" :
                   order.status === "failed" ? "❌" :
                   order.status === "pending" ? "⏳" : "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">
                    {order.productName}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    {formatDate(order.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-navy">
                    {formatRupiah(order.productPrice)}
                  </p>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${statusStyle[order.status] || ''}`}>
                    {statusLabel[order.status] || order.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function AccountPage() {
  const { data: session, status } = useSession();

  // Loading state
  if (status === "loading") {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-tred animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Memuat...</p>
      </div>
    );
  }

  // Logged in → show profile
  if (session) {
    return <ProfileView session={session} />;
  }

  // Not logged in → show login
  return <LoginView />;
}
