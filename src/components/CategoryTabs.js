"use client";

import { useRef, useEffect } from "react";
import CategoryIcon from "@/components/CategoryIcon";

export default function CategoryTabs({ activeCategory, onCategoryChange, categories = [] }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      const activeBtn = scrollRef.current.querySelector("[data-active='true']");
      if (activeBtn) {
        activeBtn.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeCategory]);

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto hide-scrollbar px-4 py-2.5"
    >
      <button
        onClick={() => onCategoryChange("all")}
        data-active={activeCategory === "all"}
        className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
          activeCategory === "all"
            ? "gradient-red text-white shadow-md shadow-tred/20"
            : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
        }`}
      >
        🔥 Semua
      </button>
      {categories.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            data-active={isActive}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              isActive
                ? "gradient-red text-white shadow-md shadow-tred/20"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300"
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <CategoryIcon
                categoryId={cat.id}
                icon={cat.icon}
                alt={cat.name}
                size={18}
              />
              <span>{cat.name}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
