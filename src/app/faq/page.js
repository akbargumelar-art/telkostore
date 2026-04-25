"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CreditCard,
  Package,
  RefreshCw,
  Shield,
  Smartphone,
  Gamepad2,
  MessageCircle,
} from "lucide-react";

const faqCategories = [
  {
    title: "Cara Pembelian",
    icon: Package,
    color: "text-blue-600",
    bg: "bg-blue-50",
    items: [
      {
        q: "Bagaimana cara membeli pulsa atau paket data?",
        a: "Pilih produk yang kamu inginkan dari halaman utama atau kategori, lalu klik produk tersebut. Masukkan nomor HP tujuan, konfirmasi pesanan, dan lakukan pembayaran. Produk akan diproses otomatis setelah pembayaran berhasil.",
      },
      {
        q: "Apakah saya harus membuat akun untuk membeli?",
        a: "Tidak wajib. Kami menyediakan Express Checkout sehingga kamu bisa langsung beli tanpa daftar akun. Namun jika ingin melihat riwayat pesanan, kamu bisa login dengan Google atau Facebook.",
      },
      {
        q: "Operator apa saja yang didukung?",
        a: "Kami mendukung semua operator Indonesia: Telkomsel, byU, XL, Indosat (IM3/Mentari), Axis, Three (3), dan Smartfren.",
      },
      {
        q: "Berapa lama proses pengiriman setelah bayar?",
        a: "Produk virtual (pulsa, paket data, voucher) diproses secara instan setelah pembayaran berhasil. Biasanya kurang dari 1 menit.",
      },
    ],
  },
  {
    title: "Pembayaran",
    icon: CreditCard,
    color: "text-green-600",
    bg: "bg-green-50",
    items: [
      {
        q: "Metode pembayaran apa yang tersedia?",
        a: "Metode pembayaran mengikuti gateway aktif yang sedang dipakai sistem. Umumnya tersedia kanal seperti QRIS, e-wallet, transfer bank atau virtual account, dan metode lain yang didukung Midtrans, DOKU, Duitku POP, atau provider aktif lainnya.",
      },
      {
        q: "Apakah pembayaran aman?",
        a: "Ya. Pembayaran diproses melalui payment gateway aktif yang terintegrasi di Telkostore, dan data sensitif pembayaran tidak kami simpan langsung di aplikasi.",
      },
      {
        q: "Berapa lama batas waktu pembayaran?",
        a: "Batas waktu pembayaran mengikuti channel yang ditampilkan pada halaman gateway. Banyak metode mendukung hingga 24 jam, tetapi beberapa channel bisa memiliki expiry yang lebih singkat. Jika lewat dari batas waktu tersebut, pesanan akan otomatis dibatalkan.",
      },
      {
        q: "Saya sudah bayar tapi status masih pending, apa yang harus saya lakukan?",
        a: "Klik tombol \"Sudah Bayar? Cek Status\" di halaman pesanan kamu. Sistem akan mengecek status terbaru atau menunggu callback dari gateway aktif. Jika status masih belum berubah setelah beberapa menit, silakan hubungi customer service kami via WhatsApp.",
      },
    ],
  },
  {
    title: "Voucher Game",
    icon: Gamepad2,
    color: "text-purple-600",
    bg: "bg-purple-50",
    items: [
      {
        q: "Game apa saja yang bisa di-top up?",
        a: "Saat ini kami mendukung top up untuk Mobile Legends, Free Fire, PUBG Mobile, dan Genshin Impact. Game lainnya akan segera ditambahkan.",
      },
      {
        q: "Apa itu User ID dan Server ID di Mobile Legends?",
        a: "User ID dan Server ID bisa kamu lihat di halaman profil game Mobile Legends. Klik avatar kamu lalu ID dan Zone ID akan tertera di bawah username.",
      },
      {
        q: "Diamonds atau UC tidak masuk ke akun game saya, kenapa?",
        a: "Pastikan User ID dan Server ID yang kamu masukkan sudah benar. Jika data sudah benar tapi belum masuk setelah 15 menit, segera hubungi customer service kami.",
      },
    ],
  },
  {
    title: "Refund & Masalah",
    icon: RefreshCw,
    color: "text-orange-600",
    bg: "bg-orange-50",
    items: [
      {
        q: "Apakah bisa refund atau pembatalan?",
        a: "Produk digital yang sudah dikirim tidak bisa dibatalkan. Namun jika produk belum terkirim atau terjadi error, silakan hubungi customer service kami dalam waktu 1x24 jam.",
      },
      {
        q: "Saya salah isi nomor HP, bagaimana?",
        a: "Jika pembayaran belum dilakukan, kamu bisa membuat pesanan baru dengan nomor yang benar. Jika sudah bayar dan produk terkirim ke nomor salah, segera hubungi customer service kami.",
      },
      {
        q: "Pesanan saya gagal terus, apa yang harus saya lakukan?",
        a: "Pastikan koneksi internet kamu stabil. Coba metode pembayaran yang tersedia di halaman gateway. Jika masih gagal, hubungi kami melalui WhatsApp dengan menyertakan nomor invoice pesanan.",
      },
    ],
  },
  {
    title: "Keamanan & Privasi",
    icon: Shield,
    color: "text-tred",
    bg: "bg-tred-50",
    items: [
      {
        q: "Apakah data pribadi saya aman?",
        a: "Kami hanya menyimpan data yang diperlukan untuk memproses pesanan, seperti nomor HP atau data akun game. Data kartu atau kredensial pembayaran diproses langsung di halaman gateway aktif dan tidak kami simpan di aplikasi.",
      },
      {
        q: "Mengapa perlu nomor HP saat checkout?",
        a: "Nomor HP digunakan untuk mengirim notifikasi status pesanan via WhatsApp dan sebagai target pengiriman produk (pulsa atau paket data). Untuk voucher game, nomor HP hanya digunakan untuk notifikasi.",
      },
    ],
  },
];

function FAQItem({ item }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden transition-all">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <HelpCircle size={18} className="text-gray-400 shrink-0 mt-0.5" />
        <span className="flex-1 text-sm font-semibold text-gray-800">{item.q}</span>
        {isOpen ? (
          <ChevronUp size={16} className="text-gray-400 shrink-0 mt-0.5" />
        ) : (
          <ChevronDown size={16} className="text-gray-400 shrink-0 mt-0.5" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 pl-[42px] animate-slide-down">
          <p className="text-sm text-gray-500 leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 md:py-10">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl gradient-red flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-tred/20">
          <HelpCircle size={32} />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-navy mb-2">
          Frequently Asked Questions
        </h1>
        <p className="text-gray-400 text-sm md:text-base">
          Temukan jawaban untuk pertanyaan yang sering diajukan
        </p>
      </div>

      <div className="space-y-6">
        {faqCategories.map((cat, ci) => {
          const Icon = cat.icon;
          return (
            <div key={ci} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
                <div className={`w-10 h-10 ${cat.bg} rounded-xl flex items-center justify-center`}>
                  <Icon size={20} className={cat.color} />
                </div>
                <div>
                  <h2 className="font-bold text-base text-navy">{cat.title}</h2>
                  <p className="text-xs text-gray-400">{cat.items.length} pertanyaan</p>
                </div>
              </div>

              <div className="p-3 space-y-2">
                {cat.items.map((item, qi) => (
                  <FAQItem key={qi} item={item} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 gradient-navy rounded-2xl p-6 md:p-8 text-center">
        <MessageCircle size={32} className="text-white mx-auto mb-3" />
        <h3 className="text-white font-bold text-lg mb-2">
          Masih ada pertanyaan?
        </h3>
        <p className="text-white/60 text-sm mb-5">
          Jangan ragu untuk menghubungi kami. Tim kami siap membantu!
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-white text-navy font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Hubungi Kami
          </Link>
          <a
            href="https://wa.me/6281285755557"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 bg-success text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          >
            <Smartphone size={16} />
            Chat WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
