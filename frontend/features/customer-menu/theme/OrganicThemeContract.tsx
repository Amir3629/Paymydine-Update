"use client";

import React from "react";
import { formatCurrency } from "@/lib/currency";

export const ORGANIC_BOTANICAL_THEME_KEY = "organic_botanical_paper";

export const organicBotanicalVars = (): React.CSSProperties =>
  ({
    "--theme-background": "#f6efe2",
    "--theme-surface": "#fffaf0",
    "--theme-primary": "#6f8b55",
    "--theme-accent": "#b88940",
    "--theme-text-primary": "#343529",
    "--theme-text-secondary": "#716f5e",
  }) as React.CSSProperties;

export const hasCheckoutThemeRoot = () =>
  typeof document !== "undefined" &&
  Boolean(document.querySelector('[data-pmd-checkout-theme-root="1"]'));

export function OrganicBotanicalHero({
  restaurantName,
  tableNumber,
}: {
  restaurantName?: string;
  tableNumber?: string | number | null;
  heroItem?: any;
}) {
  return (
    <section className="rounded-[2rem] border border-[#ded3bd] bg-[#fffaf0] p-6 text-[#343529]">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[#8b7a54]">
        Organic Botanical · Table {tableNumber || "Guest"}
      </p>
      <h1 className="mt-2 text-4xl font-semibold">
        {restaurantName || "Menu"}
      </h1>
    </section>
  );
}

export function OrganicBotanicalCategoryNav({
  categories = [],
  activeCategory,
  onSelectCategory,
}: any) {
  return (
    <nav className="flex gap-2 overflow-auto px-4 py-3">
      {categories.map((category: string) => (
        <button
          key={category}
          type="button"
          onClick={() => onSelectCategory?.(category)}
          className={`rounded-full px-4 py-2 ${category === activeCategory ? "bg-[#6f8b55] text-white" : "bg-[#fffaf0] text-[#343529]"}`}
        >
          {category}
        </button>
      ))}
    </nav>
  );
}

export function OrganicBotanicalMenuCard({ item, onSelect, onAdd }: any) {
  return (
    <article className="rounded-3xl border border-[#ded3bd] bg-[#fffaf0] p-4 text-[#343529]">
      <button
        type="button"
        className="text-left"
        onClick={() => onSelect?.(item)}
      >
        <h3 className="text-lg font-semibold">
          {item?.name || item?.menu_name || "Menu item"}
        </h3>
        <p className="mt-1 text-sm text-[#716f5e]">
          {item?.description ||
            item?.menu_description ||
            item?.category ||
            "Freshly prepared."}
        </p>
      </button>
      <div className="mt-4 flex items-center justify-between">
        <strong>{formatCurrency(Number(item?.price || 0))}</strong>
        <button
          type="button"
          className="rounded-full bg-[#b88940] px-4 py-2 text-sm font-bold text-white"
          onClick={onAdd}
        >
          Add
        </button>
      </div>
    </article>
  );
}
