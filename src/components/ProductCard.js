"use client";

import Link from "next/link";
import { formatRupiah, calculateDiscount } from "@/lib/utils";
import { Zap } from "lucide-react";

export default function ProductCard({ product, index = 0 }) {
  const discount = calculateDiscount(product.originalPrice, product.price);

  return (
    <Link
      href={`/product/${product.id}`}
      className="group block bg-white rounded-2xl border border-gray-200/80 overflow-hidden animate-fade-in shadow-[0_2px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.10)] hover:-translate-y-1 transition-all duration-200"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Top section */}
      <div className="px-4 pt-4 pb-2">
        {/* Badges */}
        <div className="flex gap-1.5 mb-3 min-h-[20px]">
          {product.isFlashSale && (
            <span className="flex items-center gap-1 text-white text-[10px] font-bold px-2 py-0.5 rounded-full gradient-red">
              <Zap size={10} /> FLASH SALE
            </span>
          )}
          {discount > 0 && !product.isFlashSale && (
            <span className="text-white text-[10px] font-bold px-2 py-0.5 rounded-full bg-success">
              -{discount}%
            </span>
          )}
        </div>

        {/* Product icon */}
        <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center text-2xl mb-2 group-hover:scale-110 transition-transform border border-gray-100">
          {product.gameIcon ||
            (product.categoryId === "pulsa"
              ? "📱"
              : product.categoryId === "paket-data"
              ? "📶"
              : product.categoryId === "voucher-internet"
              ? "🌐"
              : "🎮")}
        </div>

        {/* Product name */}
        <h3 className="font-bold text-sm text-gray-800 group-hover:text-tred transition-colors leading-tight">
          {product.name}
        </h3>

        {/* Meta info */}
        {product.gameName && (
          <p className="text-[11px] text-gray-400 mt-0.5">{product.gameName}</p>
        )}
        {product.validity && (
          <p className="text-[11px] text-gray-400 mt-0.5">
            {product.quota} • {product.validity}
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
        <p className="text-tred font-extrabold text-base">
          {formatRupiah(product.price)}
        </p>
      </div>
    </Link>
  );
}
