"use client";

import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import { formatRupiah, calculateDiscount } from "@/lib/utils";
import { Flame, Zap } from "lucide-react";

const FALLBACK_CATEGORY_ICONS = {
  pulsa: "\uD83D\uDCF1",
  "paket-data": "\uD83D\uDCF6",
  "voucher-internet": "\uD83C\uDF10",
  "voucher-game": "\uD83C\uDFAE",
};

export default function ProductCard({ product, index = 0 }) {
  const discount = calculateDiscount(product.originalPrice, product.price);
  const stock = Number(product.stock ?? 0);
  const isSoldOut = stock <= 0;
  const fallbackIcon =
    FALLBACK_CATEGORY_ICONS[product.categoryId] ||
    FALLBACK_CATEGORY_ICONS["voucher-game"];

  return (
    <Link
      href={`/product/${product.id}`}
      aria-label={
        isSoldOut
          ? `${product.name} stok habis karena laris`
          : product.name
      }
      className={`group relative block rounded-2xl border overflow-hidden animate-fade-in transition-all duration-200 ${
        isSoldOut
          ? "bg-slate-950/90 border-slate-900/80 opacity-90 shadow-[0_12px_34px_rgba(15,23,42,0.22)] hover:opacity-100 hover:shadow-[0_16px_42px_rgba(15,23,42,0.28)]"
          : "bg-white border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] hover:-translate-y-1"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {isSoldOut && (
        <>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_10%,rgba(255,184,0,0.18),transparent_30%),linear-gradient(135deg,rgba(15,15,48,0.34),rgba(15,23,42,0.82))]" />
          <div className="pointer-events-none absolute -right-10 top-5 z-20 rotate-12 bg-white/95 px-10 py-1 text-[10px] font-black tracking-[0.2em] text-slate-950 shadow-lg">
            HABIS
          </div>
        </>
      )}

      {/* Top section */}
      <div className="relative z-10 px-4 pt-4 pb-2">
        {/* Badges */}
        <div className="flex gap-1.5 mb-3 min-h-[20px]">
          {isSoldOut ? (
            <span className="flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-300/15 px-2 py-0.5 text-[10px] font-bold text-amber-100">
              <Flame size={10} className="text-amber-200" /> LARIS{" "}
              {"\u2022"} HABIS
            </span>
          ) : product.isFlashSale ? (
            <span className="flex items-center gap-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full gradient-red">
              <Zap size={10} /> FLASH SALE
            </span>
          ) : null}
          {discount > 0 && !product.isFlashSale && !isSoldOut && (
            <span className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full bg-success">
              -{discount}%
            </span>
          )}
        </div>

        {/* Product icon */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-2 transition-transform border ${
            isSoldOut
              ? "bg-white/10 border-white/10 opacity-70 grayscale group-hover:scale-105"
              : "bg-gray-50 border-gray-100 group-hover:scale-110"
          }`}
        >
          {product.gameIcon ? (
            product.gameIcon
          ) : (
            <CategoryIcon
              categoryId={product.categoryId}
              icon={fallbackIcon}
              alt={product.name}
              size={28}
              fallbackClassName="text-2xl"
            />
          )}
        </div>

        {/* Product name */}
        <h3
          className={`font-bold text-sm transition-colors leading-tight ${
            isSoldOut
              ? "text-white/80 group-hover:text-white"
              : "text-gray-800 group-hover:text-tred"
          }`}
        >
          {product.name}
        </h3>

        {/* Meta info */}
        {product.gameName && (
          <p
            className={`text-[11px] mt-0.5 ${
              isSoldOut ? "text-white/45" : "text-gray-400"
            }`}
          >
            {product.gameName}
          </p>
        )}
        {product.validity && (
          <p
            className={`text-[11px] mt-0.5 ${
              isSoldOut ? "text-white/45" : "text-gray-400"
            }`}
          >
            {product.quota} {"\u2022"} {product.validity}
          </p>
        )}
      </div>

      {/* Price section */}
      <div className="relative z-10 px-4 pb-4 pt-1">
        {isSoldOut && (
          <div className="mb-2 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2">
            <p className="flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-100">
              <Flame size={11} className="text-amber-200" /> Sold Out
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-white/55">
              Diburu pembeli, stok baru saja habis.
            </p>
          </div>
        )}
        {product.originalPrice > product.price && (
          <p
            className={`text-[11px] line-through ${
              isSoldOut ? "text-white/30" : "text-gray-400"
            }`}
          >
            {formatRupiah(product.originalPrice)}
          </p>
        )}
        <p
          className={`font-extrabold text-base ${
            isSoldOut
              ? "text-white/45 line-through decoration-white/30"
              : "text-tred"
          }`}
        >
          {formatRupiah(product.price)}
        </p>
      </div>
    </Link>
  );
}
