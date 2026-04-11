"use client";

import { useState, useMemo } from "react";
import {
  getPromoProducts,
  getFlashSaleProducts,
  categories,
} from "@/data/products";
import ProductCard from "@/components/ProductCard";
import FlashSaleBanner from "@/components/FlashSaleBanner";
import { Sparkles, Zap } from "lucide-react";

export default function PromoPage() {
  const [filter, setFilter] = useState("all");
  const promoProducts = useMemo(() => getPromoProducts(), []);
  const flashSaleProducts = useMemo(() => getFlashSaleProducts(), []);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-navy font-extrabold text-2xl md:text-3xl flex items-center gap-2">
          <Sparkles className="text-gold" size={28} />
          Promo & Flash Sale
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Jangan lewatkan penawaran terbaik hari ini!
        </p>
      </div>

      {/* Flash Sale Section */}
      <section className="mb-6">
        <FlashSaleBanner />
      </section>

      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <Zap size={18} className="text-tred" />
          <h2 className="font-extrabold text-navy text-lg">
            Produk Flash Sale
          </h2>
          <span className="text-xs text-gray-400 ml-1">
            ({flashSaleProducts.length} produk)
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {flashSaleProducts.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </section>

      <div className="border-t border-gray-200 my-6 md:my-8"></div>

      {/* All Promo Products */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-extrabold text-navy text-lg flex items-center gap-2">
              🏷️ Semua Promo
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              {promoProducts.length} produk dengan harga spesial
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-4">
          {[
            { id: "all", label: "Semua", icon: "🔥" },
            ...categories.map((c) => ({
              id: c.id,
              label: c.name,
              icon: c.icon,
            })),
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                filter === f.id
                  ? "gradient-red text-white shadow-md shadow-tred/20"
                  : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
              }`}
            >
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {(filter === "all"
            ? promoProducts
            : promoProducts.filter((p) => p.categoryId === filter)
          ).map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-8 mb-4">
        <div className="gradient-navy rounded-2xl px-5 md:px-8 py-6 md:py-8 text-center">
          <h3 className="text-white font-extrabold text-lg md:text-xl mb-2">
            📢 Promo Terus Update!
          </h3>
          <p className="text-white/60 text-sm md:text-base max-w-lg mx-auto">
            Ikuti Telko.Store untuk mendapatkan promo terbaru.
          </p>
          <button className="mt-4 bg-white text-navy font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-gray-100 transition-colors">
            🔔 Aktifkan Notifikasi
          </button>
        </div>
      </section>
    </div>
  );
}
