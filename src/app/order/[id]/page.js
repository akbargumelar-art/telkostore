"use client";

import { useState, useEffect, use, useRef } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  Package,
  AlertCircle,
  ChevronLeft,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

const statusConfig = {
  pending: {
    icon: Clock,
    label: "Menunggu Pembayaran",
    color: "text-yellow-600",
    bg: "bg-yellow-50",
    description: "Silakan selesaikan pembayaran Anda.",
  },
  paid: {
    icon: CheckCircle2,
    label: "Pembayaran Diterima",
    color: "text-blue-600",
    bg: "bg-blue-50",
    description: "Pembayaran berhasil. Produk sedang diproses.",
  },
  processing: {
    icon: Package,
    label: "Sedang Diproses",
    color: "text-orange-600",
    bg: "bg-orange-50",
    description: "Produk virtual sedang diproses dan akan segera masuk.",
  },
  completed: {
    icon: CheckCircle2,
    label: "Selesai",
    color: "text-green-600",
    bg: "bg-green-50",
    description: "Produk berhasil dikirim. Terima kasih telah berbelanja!",
  },
  failed: {
    icon: AlertCircle,
    label: "Gagal",
    color: "text-red-600",
    bg: "bg-red-50",
    description: "Pembayaran gagal atau expired. Silakan coba lagi.",
  },
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

export default function OrderPage({ params, searchParams }) {
  const { id } = use(params);
  const resolvedSearch = use(searchParams);
  const token = resolvedSearch?.token;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const hasCheckedMidtrans = useRef(false);

  // Fetch order data
  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}?token=${token}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.data);
        return data.data;
      } else {
        setError(data.error || "Pesanan tidak ditemukan.");
        return null;
      }
    } catch (err) {
      setError("Gagal memuat data pesanan.");
      return null;
    }
  };

  // Check Midtrans status directly (for when webhook can't reach localhost)
  const checkMidtransStatus = async () => {
    setChecking(true);
    try {
      const res = await fetch(`/api/orders/${id}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrder(data.data);
      }
    } catch (err) {
      console.error("Status check failed:", err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!token) {
      setError("Token akses diperlukan untuk melihat pesanan ini.");
      setLoading(false);
      return;
    }

    async function initLoad() {
      const orderData = await fetchOrder();
      setLoading(false);

      // Auto-check Midtrans status if order is pending (user likely just returned from payment)
      if (orderData && orderData.status === "pending" && !hasCheckedMidtrans.current) {
        hasCheckedMidtrans.current = true;
        // Small delay to let Midtrans process the payment
        setTimeout(() => {
          checkMidtransStatus();
        }, 2000);
      }
    }

    initLoad();

    // Poll every 10s for status updates (only when pending)
    const interval = setInterval(async () => {
      const data = await fetchOrder();
      // Stop polling if status is no longer pending
      if (data && data.status !== "pending") {
        clearInterval(interval);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [id, token]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-gray-200 border-t-tred animate-spin mx-auto mb-4"></div>
        <p className="text-gray-500 text-sm">Memuat pesanan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <AlertCircle className="text-tred mx-auto mb-4" size={48} />
        <h1 className="text-lg font-bold text-navy mb-2">Oops!</h1>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 gradient-red text-white px-6 py-2.5 rounded-xl font-semibold text-sm"
        >
          <ChevronLeft size={16} /> Kembali ke Beranda
        </Link>
      </div>
    );
  }

  const config = statusConfig[order.status] || statusConfig.pending;
  const StatusIcon = config.icon;

  const steps = [
    { label: "Pesanan", done: true, time: order.createdAt },
    { label: "Bayar", done: ["paid", "processing", "completed"].includes(order.status), time: order.paidAt },
    { label: "Proses", done: ["processing", "completed"].includes(order.status), time: order.paidAt },
    { label: "Selesai", done: order.status === "completed", time: order.completedAt },
  ];

  return (
    <div className="max-w-lg mx-auto px-4 py-6 md:py-10">
      {/* Status Header */}
      <div className={`${config.bg} rounded-2xl p-6 text-center mb-6`}>
        <StatusIcon className={`${config.color} mx-auto mb-3`} size={48} />
        <h1 className={`text-xl font-extrabold ${config.color}`}>
          {config.label}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{config.description}</p>
      </div>

      {/* Pay button for pending orders */}
      {order.status === "pending" && order.snapRedirectUrl && (
        <div className="mb-4 space-y-2">
          <a
            href={order.snapRedirectUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full gradient-red text-white font-bold text-center py-3.5 rounded-xl shadow-lg shadow-tred/20 hover:opacity-95 transition-opacity"
          >
            <ExternalLink size={16} className="inline mr-2" />
            Bayar Sekarang
          </a>
          <button
            onClick={checkMidtransStatus}
            disabled={checking}
            className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all disabled:opacity-50"
          >
            {checking ? (
              <>
                <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-navy animate-spin"></div>
                Mengecek status...
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Sudah Bayar? Cek Status
              </>
            )}
          </button>
        </div>
      )}

      {/* Progress tracker */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <div className="flex items-center justify-between">
          {steps.map((step, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.done ? "bg-success text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {step.done ? <CheckCircle2 size={16} /> : i + 1}
                </div>
                <span className={`text-[9px] mt-1 font-medium ${step.done ? "text-green-700" : "text-gray-400"}`}>
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${step.done ? "bg-success" : "bg-gray-200"}`}></div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-3">
        <h2 className="font-bold text-sm text-navy mb-2">Detail Pesanan</h2>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Invoice</span>
          <span className="font-medium text-gray-800">{order.id}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Produk</span>
          <span className="font-medium text-gray-800">{order.productName}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">No. Tujuan</span>
          <span className="font-medium text-gray-800">{order.targetData}</span>
        </div>
        {order.paymentMethod && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Pembayaran</span>
            <span className="font-medium text-gray-800">{order.paymentMethod}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Tanggal</span>
          <span className="font-medium text-gray-800">{formatDate(order.createdAt)}</span>
        </div>
        {order.paidAt && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Dibayar</span>
            <span className="font-medium text-green-700">{formatDate(order.paidAt)}</span>
          </div>
        )}
        {order.completedAt && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Selesai</span>
            <span className="font-medium text-green-700">{formatDate(order.completedAt)}</span>
          </div>
        )}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-navy">Total</span>
            <span className="text-lg font-extrabold text-tred">{formatRupiah(order.productPrice)}</span>
          </div>
        </div>
      </div>

      {/* Share Link */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4">
        <h3 className="font-bold text-sm text-navy mb-2">🔗 Link Tracking</h3>
        <p className="text-gray-400 text-xs mb-3">
          Simpan link ini untuk melacak pesanan kamu kapan saja.
        </p>
        <button
          onClick={copyLink}
          className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
        >
          <Copy size={14} />
          {copied ? "✅ Link disalin!" : "Salin Link Tracking"}
        </button>
      </div>

      {/* Back to home */}
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-tred font-semibold text-sm hover:underline"
        >
          <ChevronLeft size={16} /> Kembali Belanja
        </Link>
      </div>
    </div>
  );
}
