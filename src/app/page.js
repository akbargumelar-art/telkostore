"use client";

import { useState, useMemo } from "react";
import BannerSlider from "@/components/BannerSlider";
import CategoryTabs from "@/components/CategoryTabs";
import Sidebar from "@/components/Sidebar";
import ProductCard from "@/components/ProductCard";
import FlashSaleBanner from "@/components/FlashSaleBanner";
import {
  products,
  categories,
  getProductsByCategory,
  getFlashSaleProducts,
} from "@/data/products";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredProducts = useMemo(() => {
    if (activeCategory === "all") return products;
    return getProductsByCategory(activeCategory);
  }, [activeCategory]);

  const flashSaleProducts = useMemo(() => getFlashSaleProducts(), []);

  const activeCategoryData = categories.find((c) => c.id === activeCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
      {/* Desktop: Two-column layout with sidebar */}
      <div className="flex gap-6">
        {/* Sidebar (desktop only) */}
        <Sidebar
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
        />

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Banner Slider */}
          <BannerSlider />

          {/* Flash Sale Section */}
          {(activeCategory === "all" ||
            flashSaleProducts.some(
              (p) => p.categoryId === activeCategory
            )) && (
            <section className="mt-4 md:mt-6">
              <FlashSaleBanner />
              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {flashSaleProducts
                  .filter(
                    (p) =>
                      activeCategory === "all" ||
                      p.categoryId === activeCategory
                  )
                  .slice(0, 4)
                  .map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={i}
                    />
                  ))}
              </div>
            </section>
          )}

          {/* Promo Banner */}
          <section className="mt-6 md:mt-8">
            <Link
              href="/promo"
              className="block gradient-navy rounded-2xl px-5 md:px-8 py-5 md:py-6 group hover:opacity-95 transition-opacity"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <Sparkles size={20} className="text-gold" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-base md:text-lg">
                      Promo Spesial Bulan Ini
                    </h3>
                    <p className="text-white/60 text-xs md:text-sm">
                      Diskon hingga 20% untuk semua produk
                    </p>
                  </div>
                </div>
                <ArrowRight
                  size={20}
                  className="text-white group-hover:translate-x-1 transition-transform"
                />
              </div>
            </Link>
          </section>

          {/* Category Tabs (mobile only) */}
          <div className="overflow-hidden -mx-4 mt-4 md:mt-0">
            <CategoryTabs
              activeCategory={activeCategory}
              onCategoryChange={setActiveCategory}
            />
          </div>

          {/* Product Grid */}
          <section className="mt-3 md:mt-8" id="beli">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-navy font-extrabold text-lg md:text-xl flex items-center gap-2">
                  {activeCategory === "all" ? (
                    <>
                      <TrendingUp size={20} className="text-tred" />
                      Semua Produk
                    </>
                  ) : (
                    <>
                      <span>{activeCategoryData?.icon}</span>
                      {activeCategoryData?.name}
                    </>
                  )}
                </h2>
                <p className="text-gray-400 text-xs mt-0.5">
                  {filteredProducts.length} produk tersedia
                </p>
              </div>
            </div>

            {/* Category Sub-sections for "All" view */}
            {activeCategory === "all" ? (
              <div className="space-y-8">
                {categories.map((cat) => {
                  const catProducts = getProductsByCategory(cat.id);
                  return (
                    <div key={cat.id}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                          <span>{cat.icon}</span>
                          {cat.name}
                          <span className="text-[11px] font-normal text-gray-400">
                            ({catProducts.length})
                          </span>
                        </h3>
                        <button
                          onClick={() => setActiveCategory(cat.id)}
                          className="text-tred text-xs font-semibold hover:underline flex items-center gap-1"
                        >
                          Lihat semua <ArrowRight size={12} />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                        {catProducts.slice(0, 4).map((product, i) => (
                          <ProductCard
                            key={product.id}
                            product={product}
                            index={i}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {filteredProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} />
                ))}
              </div>
            )}
          </section>

          {/* Trust Badges */}
          <section className="mt-8 mb-4">
            <div className="bg-white rounded-2xl border border-gray-100 px-4 py-5 md:px-8 md:py-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                {[
                  { icon: "⚡", title: "Proses Instan", desc: "Produk langsung masuk" },
                  { icon: "🔒", title: "100% Aman", desc: "Pembayaran terenkripsi" },
                  { icon: "💬", title: "Notif WhatsApp", desc: "Status via WA & push" },
                  { icon: "🏷️", title: "Harga Terbaik", desc: "Garansi harga kompetitif" },
                ].map((badge, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 md:flex-col md:items-center md:text-center"
                  >
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gray-50 flex items-center justify-center text-xl md:text-2xl shrink-0 border border-gray-100">
                      {badge.icon}
                    </div>
                    <div>
                      <p className="font-bold text-xs md:text-sm text-navy">
                        {badge.title}
                      </p>
                      <p className="text-[10px] md:text-xs text-gray-400 mt-0.5">
                        {badge.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
