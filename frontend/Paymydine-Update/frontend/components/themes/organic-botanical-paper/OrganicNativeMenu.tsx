"use client";

import { type ReactNode, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { OrganicActionBar } from "./actions/OrganicActionBar";
import {
  organicItemCategory,
  organicItemDescription,
  organicItemId,
  organicItemImage,
  organicItemName,
  organicItemPrice,
} from "./menu/itemMapping";

type Props = {
  sourceItems: any[];
  categories: string[];
  restaurantName: string;
  tableNumber?: string | number | null;
  actions?: any;
  onAddItem: (item: any, quantity?: number) => void;
  onOpenItem: (item: any) => void;
  children?: ReactNode;
};

export function OrganicNativeMenu({
  sourceItems,
  categories: rawCategories,
  restaurantName,
  tableNumber,
  actions,
  onAddItem,
  onOpenItem,
  children,
}: Props) {
  const [activeCategory, setActiveCategory] = useState("All");
  const [query, setQuery] = useState("");
  const items = Array.isArray(sourceItems) ? sourceItems : [];
  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          [...(rawCategories || []), ...items.map(organicItemCategory)].filter(
            Boolean,
          ),
        ),
      ),
    ],
    [rawCategories, items],
  );
  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesCategory =
          activeCategory === "All" ||
          organicItemCategory(item) === activeCategory;
        const text =
          `${organicItemName(item)} ${organicItemDescription(item)} ${organicItemCategory(item)}`.toLowerCase();
        return matchesCategory && text.includes(query.toLowerCase());
      }),
    [items, activeCategory, query],
  );

  return (
    <div className="pmd-theme-organic-botanical pmd-customer-page page--menu">
      <style>{`.pmd-theme-organic-botanical{min-height:100vh;background:#f6efe2;color:#343529;padding:22px 16px 138px;font-family:Georgia,ui-serif,serif}.pmd-theme-organic-botanical *{box-sizing:border-box}.pmd-theme-organic-botanical .ob-shell{max-width:1060px;margin:0 auto}.pmd-theme-organic-botanical .ob-hero{border:1px solid #ded3bd;background:linear-gradient(135deg,#fffaf0,#edf4de);border-radius:34px;padding:28px;box-shadow:0 18px 50px rgba(75,63,38,.12);position:relative;overflow:hidden}.pmd-theme-organic-botanical .ob-hero:after{content:"";position:absolute;right:-60px;top:-60px;width:180px;height:180px;border-radius:999px;background:rgba(108,138,88,.18)}.pmd-theme-organic-botanical .ob-eyebrow{letter-spacing:.18em;text-transform:uppercase;color:#8b7a54;font:700 .72rem ui-sans-serif,system-ui}.pmd-theme-organic-botanical h1{font-size:clamp(2.4rem,8vw,5.2rem);line-height:.92;margin:12px 0;color:#2f3b25}.pmd-theme-organic-botanical .ob-muted{color:#716f5e}.pmd-theme-organic-botanical .ob-search{margin-top:18px;display:flex;align-items:center;gap:10px;border:1px solid #ded3bd;background:rgba(255,255,255,.72);border-radius:999px;padding:12px 16px;max-width:520px}.pmd-theme-organic-botanical .ob-search input{all:unset;width:100%;font-family:ui-sans-serif,system-ui;color:#343529}.pmd-theme-organic-botanical .ob-cats{display:flex;gap:10px;overflow:auto;padding:18px 2px}.pmd-theme-organic-botanical button{border:0;cursor:pointer}.pmd-theme-organic-botanical .ob-cat{white-space:nowrap;border-radius:999px;padding:10px 16px;background:#fffaf0;color:#5e6245;border:1px solid #ded3bd}.pmd-theme-organic-botanical .ob-cat[data-active=true]{background:#6f8b55;color:white}.pmd-theme-organic-botanical .ob-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.pmd-theme-organic-botanical .ob-card{overflow:hidden;border-radius:30px;background:#fffaf0;border:1px solid #ded3bd;box-shadow:0 14px 34px rgba(75,63,38,.1)}.pmd-theme-organic-botanical .ob-img{height:168px;width:100%;background:#ebe2cd;position:relative}.pmd-theme-organic-botanical .ob-img img{object-fit:cover}.pmd-theme-organic-botanical .ob-body{padding:16px}.pmd-theme-organic-botanical .ob-body h3{font-size:1.2rem;margin:0 0 8px;color:#343529}.pmd-theme-organic-botanical .ob-body p{min-height:44px;margin:0 0 14px;color:#716f5e;font-family:ui-sans-serif,system-ui;font-size:.9rem}.pmd-theme-organic-botanical .ob-footer{display:flex;justify-content:space-between;align-items:center;gap:12px}.pmd-theme-organic-botanical .ob-price{font-weight:900;color:#3e4d2c;font-family:ui-sans-serif,system-ui}.pmd-theme-organic-botanical .ob-add{display:flex;align-items:center;gap:8px;border-radius:999px;background:#b88940;color:white;padding:10px 14px;font-weight:800}.pmd-theme-organic-botanical .ob-actions{position:fixed;left:50%;bottom:18px;z-index:40;transform:translateX(-50%);display:flex;gap:8px;max-width:min(940px,calc(100vw - 24px));overflow:auto;padding:10px;border-radius:999px;background:rgba(255,250,240,.92);border:1px solid #ded3bd;box-shadow:0 18px 50px rgba(75,63,38,.2);backdrop-filter:blur(16px)}.pmd-theme-organic-botanical .ob-actions button{white-space:nowrap;border-radius:999px;padding:10px 14px;background:#ede3cf;color:#343529;font-family:ui-sans-serif,system-ui;font-weight:800}.pmd-theme-organic-botanical .ob-actions .ob-checkout{background:#6f8b55;color:white}`}</style>
      <main className="ob-shell">
        <section className="ob-hero">
          <p className="ob-eyebrow">
            Organic Botanical · Table {tableNumber || "Guest"}
          </p>
          <h1>{restaurantName}</h1>
          <p className="ob-muted">
            A paper-inspired garden menu powered by live PayMyDine data.
          </p>
          <label className="ob-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search the garden menu"
            />
          </label>
        </section>
        <nav className="ob-cats" aria-label="Menu categories">
          {categories.map((category) => (
            <button
              key={category}
              className="ob-cat"
              data-active={category === activeCategory}
              onClick={() => setActiveCategory(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </nav>
        <section className="ob-grid">
          {visibleItems.map((item) => (
            <article className="ob-card" key={organicItemId(item)}>
              <button
                type="button"
                className="ob-img"
                onClick={() => onOpenItem(item)}
              >
                {organicItemImage(item) ? (
                  <OptimizedImage
                    src={organicItemImage(item)}
                    alt={organicItemName(item)}
                    fill
                  />
                ) : null}
              </button>
              <div className="ob-body">
                <h3>{organicItemName(item)}</h3>
                <p>
                  {organicItemDescription(item) || organicItemCategory(item)}
                </p>
                <div className="ob-footer">
                  <span className="ob-price">
                    {formatCurrency(organicItemPrice(item))}
                  </span>
                  <button
                    type="button"
                    className="ob-add"
                    onClick={() => onAddItem(item, 1)}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
      <OrganicActionBar actions={actions} />
      {children}
    </div>
  );
}
