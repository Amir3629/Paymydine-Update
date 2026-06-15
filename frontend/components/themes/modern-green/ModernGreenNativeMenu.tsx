"use client";

import { type ReactNode, useMemo, useState } from "react";
import { Plus, Search, Star } from "lucide-react";
import { formatCurrency } from "@/lib/currency";
import { OptimizedImage } from "@/components/ui/optimized-image";
import { ModernGreenActionBar } from "./actions/ModernGreenActionBar";
import {
  nativeItemCategory,
  nativeItemDescription,
  nativeItemId,
  nativeItemImage,
  nativeItemName,
  nativeItemPrice,
} from "./menu/itemMapping";

type Props = {
  sourceItems: any[];
  cartItems: any[];
  totalItems: number;
  totalPrice: number;
  lastInteractedItem?: any;
  categories: string[];
  restaurantName: string;
  logoUrl?: string;
  tableNumber?: string | number | null;
  onAddItem: (item: any, quantity?: number) => void;
  onOpenItem: (item: any) => void;
  onCheckout: () => void;
  onCallWaiter: () => void | Promise<void>;
  onOpenNote: (note?: string) => void | Promise<void>;
  onOpenValet: (values?: any) => void | Promise<void>;
  onTableOrder?: () => void | Promise<void>;
  onLanguage?: () => void | Promise<void>;
  showTableOrder?: boolean;
  tableOrderCount?: number;
  children?: ReactNode;
};

export function ModernGreenNativeMenu(props: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const items = Array.isArray(props.sourceItems) ? props.sourceItems : [];
  const categories = useMemo(
    () => [
      "All",
      ...Array.from(
        new Set(
          [
            ...(props.categories || []),
            ...items.map(nativeItemCategory),
          ].filter(Boolean),
        ),
      ),
    ],
    [props.categories, items],
  );
  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesCategory =
          activeCategory === "All" ||
          nativeItemCategory(item) === activeCategory;
        const text =
          `${nativeItemName(item)} ${nativeItemDescription(item)} ${nativeItemCategory(item)}`.toLowerCase();
        return matchesCategory && text.includes(query.toLowerCase());
      }),
    [items, activeCategory, query],
  );
  const featured = visibleItems
    .filter(
      (item) =>
        item?.is_bestseller ||
        item?.is_recommended ||
        item?.is_featured ||
        item?.is_popular ||
        item?.is_chef_recommended,
    )
    .slice(0, 4);

  return (
    <div className="pmd-theme-modern-green pmd-customer-page page--menu">
      <style>{`
        .pmd-theme-modern-green{min-height:100vh;color:#eefbf3;background:radial-gradient(circle at 85% 0%,rgba(25,118,84,.34),transparent 28%),linear-gradient(180deg,#031b12 0%,#020806 56%,#000 100%);padding:24px 16px 136px;font-family:Inter,ui-sans-serif,system-ui,sans-serif}.pmd-theme-modern-green *{box-sizing:border-box}.pmd-theme-modern-green .mg-shell{max-width:1120px;margin:0 auto}.pmd-theme-modern-green .mg-hero{border:1px solid rgba(167,244,197,.18);background:linear-gradient(135deg,rgba(10,51,34,.94),rgba(2,15,10,.88));box-shadow:0 24px 80px rgba(0,0,0,.4);border-radius:32px;padding:24px;display:grid;gap:20px}.pmd-theme-modern-green .mg-logo{width:64px;height:64px;border-radius:22px;object-fit:cover;background:#effff5}.pmd-theme-modern-green h1{font-size:clamp(2rem,7vw,4.8rem);line-height:.92;margin:12px 0;color:#f8fff9;letter-spacing:-.06em}.pmd-theme-modern-green .mg-muted{color:#a7c7b5}.pmd-theme-modern-green .mg-search{display:flex;align-items:center;gap:10px;border:1px solid rgba(166,244,197,.2);background:rgba(255,255,255,.06);border-radius:999px;padding:12px 16px}.pmd-theme-modern-green .mg-search input{all:unset;width:100%;color:#fff}.pmd-theme-modern-green .mg-cats{display:flex;gap:10px;overflow:auto;padding:18px 2px}.pmd-theme-modern-green button{border:0;cursor:pointer}.pmd-theme-modern-green .mg-cat{white-space:nowrap;border-radius:999px;padding:10px 16px;background:rgba(255,255,255,.07);color:#dceee4;border:1px solid rgba(255,255,255,.08)}.pmd-theme-modern-green .mg-cat[data-active=true]{background:#82f0a8;color:#052414}.pmd-theme-modern-green .mg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px}.pmd-theme-modern-green .mg-card{overflow:hidden;border-radius:28px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);box-shadow:0 14px 40px rgba(0,0,0,.28)}.pmd-theme-modern-green .mg-img{height:170px;background:rgba(255,255,255,.05);position:relative}.pmd-theme-modern-green .mg-img img{object-fit:cover}.pmd-theme-modern-green .mg-card-body{padding:16px}.pmd-theme-modern-green .mg-card h3{margin:0 0 8px;font-size:1.1rem}.pmd-theme-modern-green .mg-card p{min-height:44px;margin:0 0 14px;color:#a7c7b5;font-size:.9rem}.pmd-theme-modern-green .mg-card-footer{display:flex;align-items:center;justify-content:space-between;gap:12px}.pmd-theme-modern-green .mg-add{display:inline-flex;align-items:center;gap:8px;border-radius:999px;background:#82f0a8;color:#052414;padding:10px 14px;font-weight:800}.pmd-theme-modern-green .mg-price{font-weight:900;color:#f5fff9}.pmd-theme-modern-green .mg-actions{position:fixed;left:50%;bottom:18px;z-index:40;transform:translateX(-50%);display:flex;gap:8px;max-width:min(980px,calc(100vw - 24px));overflow:auto;padding:10px;border-radius:999px;background:rgba(2,12,8,.88);border:1px solid rgba(130,240,168,.24);box-shadow:0 20px 60px rgba(0,0,0,.5);backdrop-filter:blur(18px)}.pmd-theme-modern-green .mg-actions button{display:flex;align-items:center;gap:6px;white-space:nowrap;border-radius:999px;padding:10px 14px;background:rgba(255,255,255,.08);color:#effff5}.pmd-theme-modern-green .mg-actions .mg-checkout{background:#82f0a8;color:#052414;font-weight:900}`}</style>
      <main className="mg-shell">
        <section className="mg-hero">
          <div>
            {props.logoUrl ? (
              <img className="mg-logo" src={props.logoUrl} alt="" />
            ) : null}
            <p className="mg-muted">Table {props.tableNumber || "Guest"}</p>
            <h1>{props.restaurantName}</h1>
            <p className="mg-muted">
              Fresh picks, live from the PayMyDine menu.
            </p>
          </div>
          <label className="mg-search">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search dishes"
            />
          </label>
        </section>
        <nav className="mg-cats" aria-label="Menu categories">
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              className="mg-cat"
              data-active={category === activeCategory}
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </button>
          ))}
        </nav>
        {featured.length > 0 && (
          <p className="mg-muted">
            <Star size={16} style={{ display: "inline" }} /> Featured today
          </p>
        )}
        <section className="mg-grid">
          {visibleItems.map((item) => (
            <article key={nativeItemId(item)} className="mg-card">
              <button
                type="button"
                className="mg-img"
                onClick={() => props.onOpenItem(item)}
              >
                {nativeItemImage(item) ? (
                  <OptimizedImage
                    src={nativeItemImage(item)}
                    alt={nativeItemName(item)}
                    fill
                    sizes="280px"
                  />
                ) : null}
              </button>
              <div className="mg-card-body">
                <h3>{nativeItemName(item)}</h3>
                <p>{nativeItemDescription(item) || nativeItemCategory(item)}</p>
                <div className="mg-card-footer">
                  <span className="mg-price">
                    {formatCurrency(nativeItemPrice(item))}
                  </span>
                  <button
                    type="button"
                    className="mg-add"
                    onClick={() => props.onAddItem(item, 1)}
                  >
                    <Plus size={16} /> Add
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      </main>
      <ModernGreenActionBar
        cartCount={props.totalItems}
        totalPrice={props.totalPrice}
        showTableOrder={props.showTableOrder}
        tableOrderCount={props.tableOrderCount}
        onCheckout={props.onCheckout}
        onCallWaiter={props.onCallWaiter}
        onOpenNote={() => props.onOpenNote()}
        onOpenValet={() => props.onOpenValet()}
        onTableOrder={props.onTableOrder}
        onLanguage={props.onLanguage}
      />
      {props.children}
    </div>
  );
}
