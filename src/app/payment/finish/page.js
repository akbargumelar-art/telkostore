"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ShieldCheck,
  ChevronLeft,
  ArrowRight,
} from "lucide-react";

const statusMap = {
  success: {
    icon: CheckCircle2,
    title: "Pembayaran Berhasil! 🎉",
    subtitle: "Terima kasih, pembayaran kamu telah berhasil diproses.",
    bg: "bg-green-50",
    color: "text-green-600",
    border: "border-green-200",
    iconBg: "bg-green-100",
  },
  pending: {
    icon: Clock,
    title: "Pembayaran Diproses ⏳",
    subtitle: "Pembayaran kamu sedang diproses. Kami akan memperbarui status segera.",
    bg: "bg-yellow-50",
    color: "text-yellow-600",
    border: "border-yellow-200",
    iconBg: "bg-yellow-100",
  },
  failed: {
    icon: XCircle,
    title: "Pembayaran Gagal 😞",
    subtitle: "Maaf, pembayaran kamu gagal atau expired. Silakan coba lagi.",
    bg: "bg-red-50",
    color: "text-red-600",
    border: "border-red-200",
    iconBg: "bg-red-100",
  },
  unfinish: {
    icon: Clock,
    title: "Pembayaran Belum Selesai ⏸️",
    subtitle: "Kamu meninggalkan halaman pembayaran sebelum selesai. Kamu masih bisa melanjutkan pembayaran.",
    bg: "bg-yellow-50",
    color: "text-yellow-600",
    border: "border-yellow-200",
    iconBg: "bg-yellow-100",
  },
};

function getPaymentStatus(statusCode, transactionStatus, customStatus) {
  // Handle custom status from our redirect callbacks
  if (customStatus === "error") return "failed";
  if (customStatus === "unfinish") return "unfinish";

  if (transactionStatus === "settlement" || transactionStatus === "capture") return "success";
  if (transactionStatus === "pending") return "pending";
  if (["deny", "cancel", "expire", "failure"].includes(transactionStatus)) return "failed";

  // Fallback: check status code
  if (statusCode === "200") return "success";
  if (statusCode === "201") return "pending";
  return "pending"; // Default to pending instead of failed for ambiguous cases
}

export default function PaymentFinishPage({ searchParams }) {
  const resolvedParams = use(searchParams);
  const orderId = resolvedParams?.order_id || "";
  const token = resolvedParams?.token || "";
  const statusCode = resolvedParams?.status_code || "";
  const transactionStatus = resolvedParams?.transaction_status || "";
  const customStatus = resolvedParams?.status || "";

  const [countdown, setCountdown] = useState(5);
  const [orderData, setOrderData] = useState(null);
  const [checking, setChecking] = useState(false);

  // Determine status from Midtrans params + custom status
  const status = getPaymentStatus(statusCode, transactionStatus, customStatus);
  const config = statusMap[status] || statusMap.pending;
  const StatusIcon = config.icon;

  // Extract the actual order ID from Midtrans order_id (format: TELKO-INV-xxx)
  const actualOrderId = orderId.startsWith("TELKO-") ? orderId.replace("TELKO-", "") : orderId;
  const trackingUrl = `/order/${actualOrderId}?token=${token}`;

  // Check payment status via API
  useEffect(() => {
    if (!actualOrderId || !token) return;

    async function checkStatus() {
      setChecking(true);
      try {
        const res = await fetch(`/api/orders/${actualOrderId}/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (data.success && data.data) {
          setOrderData(data.data);
        }
      } catch (err) {
        console.error("Status check failed:", err);
      } finally {
        setChecking(false);
      }
    }

    checkStatus();
  }, [actualOrderId, token]);

  // Auto-redirect countdown
  useEffect(() => {
    if (countdown <= 0) {
      window.location.href = trackingUrl;
      return;
    }

    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, trackingUrl]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-10">
      <div className="max-w-md w-full">
        {/* Status Card */}
        <div className={`${config.bg} ${config.border} border rounded-2xl p-8 text-center mb-6 animate-scale-in`}>
          {/* Animated Icon */}
          <div className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-5`}>
            <StatusIcon size={40} className={config.color} />
          </div>

          <h1 className={`text-2xl font-extrabold ${config.color} mb-2`}>
            {config.title}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            {config.subtitle}
          </p>
        </div>

        {/* Order Info */}
        {actualOrderId && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 space-y-2.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Invoice</span>
              <span className="font-semibold text-gray-800">{actualOrderId}</span>
            </div>
            {orderData && (
              <>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Produk</span>
                  <span className="font-semibold text-gray-800">{orderData.productName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={`font-semibold capitalize ${
                    orderData.status === "paid" || orderData.status === "completed" ? "text-green-600" :
                    orderData.status === "pending" ? "text-yellow-600" : "text-red-600"
                  }`}>
                    {orderData.status === "paid" ? "Dibayar" :
                     orderData.status === "completed" ? "Selesai" :
                     orderData.status === "pending" ? "Menunggu" :
                     orderData.status === "processing" ? "Diproses" : "Gagal"}
                  </span>
                </div>
              </>
            )}
            {checking && (
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
                <Loader2 size={12} className="animate-spin" />
                Mengecek status pembayaran...
              </div>
            )}
          </div>
        )}

        {/* Redirect Info */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-4 text-center">
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-3">
            <Loader2 size={14} className="animate-spin text-tred" />
            <span>Mengalihkan ke halaman pesanan dalam <strong className="text-navy">{countdown}</strong> detik...</span>
          </div>
          <Link
            href={trackingUrl}
            className="inline-flex items-center gap-2 gradient-red text-white font-bold text-sm px-6 py-3 rounded-xl shadow-lg shadow-tred/20 hover:opacity-95 transition-opacity"
          >
            Lihat Detail Pesanan
            <ArrowRight size={16} />
          </Link>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {status === "failed" && (
            <Link
              href="/"
              className="flex-1 text-center py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
            >
              Coba Lagi
            </Link>
          )}
          <Link
            href="/"
            className="flex-1 text-center py-2.5 border-2 border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <ChevronLeft size={14} />
            Kembali ke Beranda
          </Link>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-gray-400">
          <ShieldCheck size={14} />
          <span className="text-[10px]">Transaksi aman & terenkripsi via Midtrans</span>
        </div>
      </div>
    </div>
  );
}
