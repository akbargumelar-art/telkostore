"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const bannerData = [
  {
    id: 1,
    title: "Flash Sale Paket Data!",
    subtitle: "Combo Sakti 30GB hanya Rp85.000",
    bg: "linear-gradient(135deg, #ED0226 0%, #1A1A4E 100%)",
    ctaText: "Beli Sekarang",
    ctaLink: "/product/data-combo-30d",
  },
  {
    id: 2,
    title: "Pulsa Murah Telkomsel",
    subtitle: "Mulai dari Rp6.500 — Proses instan!",
    bg: "linear-gradient(135deg, #1A1A4E 0%, #2D2D6B 100%)",
    ctaText: "Isi Pulsa",
    ctaLink: "/product/pulsa-5k",
  },
  {
    id: 3,
    title: "Top Up Game Murah 🎮",
    subtitle: "Mobile Legends, Free Fire, PUBG & Genshin",
    bg: "linear-gradient(135deg, #0F0F30 0%, #B8001F 100%)",
    ctaText: "Top Up Sekarang",
    ctaLink: "/?category=voucher-game",
  },
  {
    id: 4,
    title: "Voucher Internet Hemat",
    subtitle: "25GB hanya Rp85.000 — Diskon 15%!",
    bg: "linear-gradient(135deg, #B8001F 0%, #1A1A4E 100%)",
    ctaText: "Lihat Voucher",
    ctaLink: "/?category=voucher-internet",
  },
];

export default function BannerSlider() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % bannerData.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + bannerData.length) % bannerData.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slides container */}
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {bannerData.map((banner) => (
          <div
            key={banner.id}
            className="w-full shrink-0 relative overflow-hidden"
            style={{ background: banner.bg }}
          >
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2" style={{ background: 'rgba(255,255,255,0.06)' }}></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full translate-y-1/2 -translate-x-1/2" style={{ background: 'rgba(255,255,255,0.05)' }}></div>

            <div className="relative z-10 px-6 md:px-12 py-10 md:py-16">
              <div className="max-w-lg">
                <h2 className="text-white text-xl md:text-3xl font-extrabold leading-tight mb-2">
                  {banner.title}
                </h2>
                <p className="text-white/80 text-sm md:text-base mb-5">
                  {banner.subtitle}
                </p>
                <Link
                  href={banner.ctaLink}
                  className="inline-flex items-center gap-2 bg-white text-navy font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                >
                  {banner.ctaText}
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation arrows (desktop) */}
      <button
        onClick={prev}
        className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center text-white hover:bg-white/20 transition-colors"
        style={{ background: 'rgba(255,255,255,0.15)' }}
        aria-label="Previous slide"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center text-white hover:bg-white/20 transition-colors"
        style={{ background: 'rgba(255,255,255,0.15)' }}
        aria-label="Next slide"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
        {bannerData.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === current ? '24px' : '6px',
              background: i === current ? 'white' : 'rgba(255,255,255,0.4)',
            }}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
