"use client";

import Link from "next/link";
import { categories } from "@/data/products";
import { HelpCircle, MessageCircle } from "lucide-react";

export default function Sidebar({ activeCategory, onCategoryChange }) {
  return (
    <aside className="hidden md:block w-64 shrink-0">
      <div className="sticky top-[7.5rem] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Sidebar header */}
        <div className="gradient-navy px-5 py-4">
          <h2 className="text-white font-bold text-base">Kategori Produk</h2>
          <p className="text-white/60 text-xs mt-0.5">
            Pilih kategori produk
          </p>
        </div>

        {/* Category list */}
        <div className="p-2">
          <button
            onClick={() => onCategoryChange("all")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all mb-1 ${
              activeCategory === "all"
                ? "bg-tred-50 text-tred border border-tred/20"
                : "text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className="text-xl">🔥</span>
            <div className="flex-1 min-w-0">
              <p className={`text-sm ${activeCategory === "all" ? "font-bold" : "font-medium"}`}>
                Semua Produk
              </p>
            </div>
            {activeCategory === "all" && (
              <div className="w-1.5 h-8 rounded-full bg-tred"></div>
            )}
          </button>

          {categories.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onCategoryChange(cat.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all mb-1 ${
                  isActive
                    ? "bg-tred-50 text-tred border border-tred/20"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-xl">{cat.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isActive ? "font-bold" : "font-medium"}`}>
                    {cat.name}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5 leading-tight truncate">
                    {cat.description}
                  </p>
                </div>
                {isActive && (
                  <div className="w-1.5 h-8 rounded-full bg-tred"></div>
                )}
              </button>
            );
          })}
        </div>

        {/* Info section */}
        <div className="px-4 pb-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 mb-3">
            <p className="text-xs font-semibold text-navy mb-1">
              💡 Express Checkout
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Beli langsung tanpa daftar akun. Pilih produk, masukkan nomor HP,
              bayar, selesai!
            </p>
          </div>

          {/* Quick links */}
          <div className="space-y-1.5">
            <Link
              href="/faq"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-tred transition-all text-sm font-medium"
            >
              <HelpCircle size={16} />
              FAQ
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-50 hover:text-tred transition-all text-sm font-medium"
            >
              <MessageCircle size={16} />
              Hubungi Kami
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
