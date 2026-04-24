"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cloneDefaultSiteBanners } from "@/lib/site-banners";

export default function BannerSlider({ onCategoryChange }) {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [banners, setBanners] = useState(null);
  const router = useRouter();

  const resolvedBanners = banners ?? cloneDefaultSiteBanners();
  const slideCount = resolvedBanners.length;

  const next = useCallback(() => {
    if (slideCount <= 1) return;
    setCurrent((prev) => (prev + 1) % slideCount);
  }, [slideCount]);

  const prev = useCallback(() => {
    if (slideCount <= 1) return;
    setCurrent((prev) => (prev - 1 + slideCount) % slideCount);
  }, [slideCount]);

  useEffect(() => {
    let cancelled = false;

    async function fetchBanners() {
      try {
        const res = await fetch("/api/banners", { cache: "no-store" });
        const data = await res.json();

        if (!cancelled && data.success && Array.isArray(data.data)) {
          setBanners(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch banners:", error);
      }
    }

    fetchBanners();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (slideCount === 0) {
      setCurrent(0);
      return;
    }

    setCurrent((prev) => (prev >= slideCount ? 0 : prev));
  }, [slideCount]);

  useEffect(() => {
    if (isPaused || slideCount <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isPaused, next, slideCount]);

  const handleCategoryCta = (categoryId) => {
    if (onCategoryChange) {
      onCategoryChange(categoryId);
      setTimeout(() => {
        const el = document.getElementById("beli");
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      router.push(`/?category=${categoryId}#beli`);
    }
  };

  if (banners && banners.length === 0) {
    return null;
  }

  return (
    <div
      className="relative overflow-hidden rounded-2xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {resolvedBanners.map((banner) => (
          <div
            key={banner.id}
            className="w-full shrink-0 relative overflow-hidden"
            style={{ background: banner.backgroundStyle }}
          >
            <div
              className="absolute top-0 right-0 w-64 h-64 rounded-full -translate-y-1/2 translate-x-1/2"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
            <div
              className="absolute bottom-0 left-0 w-48 h-48 rounded-full translate-y-1/2 -translate-x-1/2"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />

            <div className="relative z-10 px-6 md:px-12 py-10 md:py-16">
              <div className="max-w-lg">
                <h2 className="text-white text-xl md:text-3xl font-extrabold leading-tight mb-2">
                  {banner.title}
                </h2>
                <p className="text-white/80 text-sm md:text-base mb-5">
                  {banner.subtitle}
                </p>
                {banner.ctaType === "link" ? (
                  <Link
                    href={banner.ctaLink}
                    className="inline-flex items-center gap-2 bg-white text-navy font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                  >
                    {banner.ctaText}
                    <ChevronRight size={16} />
                  </Link>
                ) : (
                  <button
                    onClick={() => handleCategoryCta(banner.categoryId)}
                    className="inline-flex items-center gap-2 bg-white text-navy font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-gray-100 transition-colors shadow-lg cursor-pointer"
                  >
                    {banner.ctaText}
                    <ChevronRight size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {slideCount > 1 && (
        <>
          <button
            onClick={prev}
            className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center text-white hover:bg-white/20 transition-colors"
            style={{ background: "rgba(255,255,255,0.15)" }}
            aria-label="Previous slide"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={next}
            className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center text-white hover:bg-white/20 transition-colors"
            style={{ background: "rgba(255,255,255,0.15)" }}
            aria-label="Next slide"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {slideCount > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {resolvedBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrent(index)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: index === current ? "24px" : "6px",
                background:
                  index === current ? "white" : "rgba(255,255,255,0.4)",
              }}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
