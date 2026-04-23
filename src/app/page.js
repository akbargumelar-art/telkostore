"use client";

import { useState, useEffect, useMemo } from "react";
import BannerSlider from "@/components/BannerSlider";
import CategoryTabs from "@/components/CategoryTabs";
import Sidebar from "@/components/Sidebar";
import ProductCard from "@/components/ProductCard";
import FlashSaleBanner from "@/components/FlashSaleBanner";
import CategoryIcon from "@/components/CategoryIcon";
import { ArrowRight, Sparkles, TrendingUp, Filter } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeValidity, setActiveValidity] = useState("all");
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [flashSaleProducts, setFlashSaleProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch products and categories from API
  useEffect(() => {
    async function fetchData() {
      try {
        const [prodRes, catRes, flashRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
          fetch("/api/products?flash_sale=true"),
        ]);

        const [prodData, catData, flashData] = await Promise.all([
          prodRes.json(),
          catRes.json(),
          flashRes.json(),
        ]);

        if (prodData.success) setProducts(prodData.data);
        if (catData.success) setCategories(catData.data);
        if (flashData.success) setFlashSaleProducts(flashData.data);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Reset validity filter when category changes
  useEffect(() => {
    setActiveValidity("all");
  }, [activeCategory]);

  // Get unique validity values for current category
  const validityOptions = useMemo(() => {
    if (activeCategory === "all") return [];
    const categoryProducts = products.filter((p) => p.categoryId === activeCategory);
    const validities = [...new Set(categoryProducts.map((p) => p.validity).filter(Boolean))];
    // Sort by number of days
    return validities.sort((a, b) => {
      const numA = parseInt(a) || 0;
      const numB = parseInt(b) || 0;
      return numA - numB;
    });
  }, [activeCategory, products]);

  const filteredProducts = useMemo(() => {
    let result = products;
    if (activeCategory !== "all") {
      result = result.filter((p) => p.categoryId === activeCategory);
    }
    if (activeValidity !== "all") {
      result = result.filter((p) => p.validity === activeValidity);
    }
    return result;
  }, [activeCategory, activeValidity, products]);

  const getProductsByCategory = (catId) =>
    products.filter((p) => p.categoryId === catId);

  const activeCategoryData = categories.find((c) => c.id === activeCategory);

  // Loading skeleton
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4 md:pt-6">
        <div className="flex gap-6">
          <div className="hidden md:block w-56 shrink-0">
            <div className="bg-white rounded-2xl p-4 animate-pulse">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-100 rounded-xl mb-2"></div>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <div className="h-40 md:h-56 bg-gray-200 rounded-2xl mb-6 animate-pulse"></div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                  <div className="h-4 bg-gray-100 rounded mb-3"></div>
                  <div className="h-6 bg-gray-100 rounded mb-2 w-1/2"></div>
                  <div className="h-3 bg-gray-100 rounded w-3/4"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sticky Category Tabs (mobile only) */}
      <div className="md:hidden sticky top-14 z-40 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100/50">
        <CategoryTabs
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          categories={categories}
        />

        {/* Validity sub-filter (shows when category has validity options) */}
        {validityOptions.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-4 pb-2.5">
            <button
              onClick={() => setActiveValidity("all")}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeValidity === "all"
                  ? "bg-navy text-white"
                  : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              Semua
            </button>
            {validityOptions.map((v) => (
              <button
                key={v}
                onClick={() => setActiveValidity(v)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeValidity === v
                    ? "bg-navy text-white"
                    : "bg-white text-gray-500 border border-gray-200"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

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
            <BannerSlider onCategoryChange={setActiveCategory} />

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

            {/* Product Grid */}
            <section className="mt-6 md:mt-8" id="beli">
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
                        <CategoryIcon
                          categoryId={activeCategoryData?.id}
                          icon={activeCategoryData?.icon}
                          alt={activeCategoryData?.name}
                          size={20}
                        />
                        {activeCategoryData?.name}
                      </>
                    )}
                  </h2>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {filteredProducts.length} produk tersedia
                    {activeValidity !== "all" && ` • Masa aktif: ${activeValidity}`}
                  </p>
                </div>
              </div>

              {/* Desktop: Validity filter chips */}
              {validityOptions.length > 0 && (
                <div className="hidden md:flex gap-2 mb-4 flex-wrap">
                  <span className="text-xs text-gray-400 font-medium self-center mr-1 flex items-center gap-1">
                    <Filter size={12} /> Masa Aktif:
                  </span>
                  <button
                    onClick={() => setActiveValidity("all")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      activeValidity === "all"
                        ? "bg-navy text-white"
                        : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    Semua
                  </button>
                  {validityOptions.map((v) => (
                    <button
                      key={v}
                      onClick={() => setActiveValidity(v)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeValidity === v
                          ? "bg-navy text-white"
                          : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}

              {/* Category Sub-sections for "All" view */}
              {activeCategory === "all" ? (
                <div className="space-y-8">
                  {categories.map((cat) => {
                    const catProducts = getProductsByCategory(cat.id);
                    if (catProducts.length === 0) return null;
                    return (
                      <div key={cat.id}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-bold text-sm text-gray-700 flex items-center gap-2">
                            <CategoryIcon
                              categoryId={cat.id}
                              icon={cat.icon}
                              alt={cat.name}
                              size={20}
                            />
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
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product, i) => (
                      <ProductCard key={product.id} product={product} index={i} />
                    ))
                  ) : (
                    <div className="col-span-full text-center py-12">
                      <p className="text-gray-400 text-sm">Tidak ada produk ditemukan</p>
                    </div>
                  )}
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
    </>
  );
}
