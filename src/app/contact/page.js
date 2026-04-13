"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MessageCircle,
  Mail,
  Phone,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Instagram,
  ExternalLink,
} from "lucide-react";

const contactInfo = [
  {
    icon: Smartphone,
    label: "WhatsApp",
    value: "0812 857 55557",
    href: "https://wa.me/6281285755557",
    color: "text-green-600",
    bg: "bg-green-50",
    desc: "Respon tercepat, biasanya < 5 menit",
  },
  {
    icon: Mail,
    label: "Email",
    value: "hq@telko.store",
    href: "mailto:hq@telko.store",
    color: "text-blue-600",
    bg: "bg-blue-50",
    desc: "Respon dalam 1x24 jam kerja",
  },
  {
    icon: MapPin,
    label: "Alamat",
    value: "Jl. Pemuda Raya No. 21A, Kota Cirebon",
    href: "https://maps.google.com/?q=Jl.+Pemuda+Raya+No.+21A+Kota+Cirebon",
    color: "text-orange-600",
    bg: "bg-orange-50",
    desc: "Kantor pusat Telko.Store",
  },
  {
    icon: Instagram,
    label: "Instagram",
    value: "@telko.store",
    href: "https://instagram.com/telko.store",
    color: "text-purple-600",
    bg: "bg-purple-50",
    desc: "Follow untuk promo terbaru",
  },
];

const operatingHours = [
  { day: "Senin - Jumat", hours: "08:00 - 22:00 WIB" },
  { day: "Sabtu", hours: "09:00 - 21:00 WIB" },
  { day: "Minggu & Hari Libur", hours: "10:00 - 20:00 WIB" },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      setError("Mohon lengkapi semua field yang wajib diisi.");
      return;
    }

    setSending(true);
    setError("");

    // Simulate sending (for now — can be connected to a real API later)
    await new Promise((r) => setTimeout(r, 1500));

    setSending(false);
    setSent(true);
    setFormData({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-10">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl gradient-navy flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-navy/20">
          <MessageCircle size={32} />
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-navy mb-2">
          Hubungi Kami
        </h1>
        <p className="text-gray-400 text-sm md:text-base max-w-lg mx-auto">
          Ada pertanyaan atau butuh bantuan? Hubungi tim kami melalui salah satu channel di bawah ini.
        </p>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* Contact Channels */}
        <div className="md:col-span-2 space-y-4">
          {/* Contact Cards */}
          {contactInfo.map((info, i) => {
            const Icon = info.icon;
            return (
              <a
                key={i}
                href={info.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-4 bg-white rounded-2xl border border-gray-100 p-4 hover:border-gray-200 hover:shadow-sm transition-all group"
              >
                <div className={`w-12 h-12 ${info.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <Icon size={22} className={info.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 font-medium">{info.label}</p>
                  <p className="text-sm font-bold text-navy group-hover:text-tred transition-colors mt-0.5">
                    {info.value}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{info.desc}</p>
                </div>
                <ExternalLink size={14} className="text-gray-300 group-hover:text-gray-400 shrink-0 mt-1" />
              </a>
            );
          })}

          {/* Operating Hours */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-gold-light rounded-lg flex items-center justify-center">
                <Clock size={16} className="text-yellow-700" />
              </div>
              <h3 className="font-bold text-sm text-navy">Jam Operasional</h3>
            </div>
            <div className="space-y-2">
              {operatingHours.map((oh, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-500">{oh.day}</span>
                  <span className="font-medium text-gray-800">{oh.hours}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">
              * Di luar jam operasional, silakan kirim pesan via WhatsApp dan kami akan membalas sesegera mungkin.
            </p>
          </div>

          {/* FAQ Link */}
          <Link
            href="/faq"
            className="flex items-center gap-3 bg-tred-50 border border-tred/10 rounded-2xl p-4 hover:bg-tred-50/80 transition-colors group"
          >
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
              <HelpCircle size={20} className="text-tred" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-navy">Lihat FAQ</p>
              <p className="text-[11px] text-gray-400">Temukan jawaban cepat untuk pertanyaan umum</p>
            </div>
          </Link>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-3">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="gradient-navy px-6 py-5">
              <h2 className="text-white font-bold text-lg flex items-center gap-2">
                <Send size={18} /> Kirim Pesan
              </h2>
              <p className="text-white/60 text-xs mt-0.5">
                Isi form di bawah dan kami akan membalas secepat mungkin.
              </p>
            </div>

            {sent ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-navy mb-2">Pesan Terkirim! 🎉</h3>
                <p className="text-gray-400 text-sm mb-5">
                  Terima kasih telah menghubungi kami. Kami akan membalas pesan kamu sesegera mungkin.
                </p>
                <button
                  onClick={() => setSent(false)}
                  className="inline-flex items-center gap-2 gradient-red text-white font-semibold text-sm px-6 py-2.5 rounded-xl hover:opacity-95 transition-opacity"
                >
                  Kirim Pesan Lain
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Nama <span className="text-tred">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Nama lengkap"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-tred focus:ring-2 focus:ring-tred/10 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Email <span className="text-tred">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="email@contoh.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-tred focus:ring-2 focus:ring-tred/10 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Subjek
                  </label>
                  <select
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-tred focus:ring-2 focus:ring-tred/10 transition-all appearance-none bg-white"
                  >
                    <option value="">Pilih subjek (opsional)</option>
                    <option value="order">Masalah Pesanan</option>
                    <option value="payment">Masalah Pembayaran</option>
                    <option value="refund">Permintaan Refund</option>
                    <option value="product">Pertanyaan Produk</option>
                    <option value="other">Lainnya</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                    Pesan <span className="text-tred">*</span>
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tuliskan pesan kamu di sini..."
                    rows={5}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:border-tred focus:ring-2 focus:ring-tred/10 transition-all resize-none"
                  />
                </div>

                {error && (
                  <div className="bg-tred-50 border border-tred/20 rounded-xl p-3 flex items-start gap-2">
                    <AlertCircle size={16} className="text-tred shrink-0 mt-0.5" />
                    <p className="text-tred text-xs">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full gradient-red text-white font-bold text-base py-3.5 rounded-xl shadow-lg shadow-tred/20 hover:opacity-95 transition-opacity btn-ripple disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {sending ? (
                    <>
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                      Mengirim...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Kirim Pesan
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
