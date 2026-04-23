"use client";

import Link from "next/link";
import CategoryIcon from "@/components/CategoryIcon";
import { formatRupiah, calculateDiscount } from "@/lib/utils";
import { Zap } from "lucide-react";

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
      aria-label={isSoldOut ? `${product.name} stok habis` : product.name}
      className={`group relative block rounded-2xl border overflow-hidden animate-fade-in transition-all duration-200 ${
        isSoldOut
          ? "bg-white border-gray-200/70 opacity-60 grayscale shadow-none hover:opacity-70"
          : "bg-white border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] hover:-translate-y-1"
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Top section */}
      <div className="px-4 pt-4 pb-2">
        {/* Badges */}
        <div className="flex gap-1.5 mb-3 min-h-[20px]">
          {isSoldOut ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
              Stok habis
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
              ? "bg-gray-50 border-gray-100"
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
              ? "text-gray-600"
              : "text-gray-800 group-hover:text-tred"
          }`}
        >
          {product.name}
        </h3>

        {/* Meta info */}
        {product.gameName && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            {product.gameName}
          </p>
        )}
        {product.validity && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            {product.quota} {"\u2022"} {product.validity}
          </p>
        )}
      </div>

      {/* Price section */}
      <div className="px-4 pb-4 pt-1">
        {product.originalPrice > product.price && (
          <p className="text-[11px] text-gray-400 line-through">
            {formatRupiah(product.originalPrice)}
          </p>
        )}
        <p
          className={`font-extrabold text-base ${
            isSoldOut
              ? "text-gray-500"
              : "text-tred"
          }`}
        >
          {formatRupiah(product.price)}
        </p>
      </div>
    </Link>
  );
}
