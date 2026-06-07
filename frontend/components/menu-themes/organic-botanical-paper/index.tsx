"use client"

import React from "react"
import { Leaf, Menu as MenuIcon, Plus, ShoppingBag, Sparkles, Utensils, Car, Soup, Coffee, Salad, Fish, Drumstick, Cookie, Wheat, CircleDot } from "lucide-react"
import { motion } from "framer-motion"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { formatCurrency } from "@/lib/currency"
import { getMenuImageUrl } from "@/lib/api-client"
import { defaultMenuHighlightSettings, type MenuHighlightSettings, type MenuItem } from "@/lib/data"
import { useLanguageStore } from "@/store/language-store"
import type { TranslationKey } from "@/lib/translations"
import { useCartStore } from "@/store/cart-store"
import { cn, truncateText } from "@/lib/utils"
import { FoodAttributeTags } from "@/components/food-attribute-tags"
import { FoodNutritionSummary } from "@/components/food-nutrition-summary"
import { FoodItemColorDot } from "@/components/food-item-color-dot"
import { getTextAlignClass, getTextDirection } from "@/lib/text-direction"

export const ORGANIC_BOTANICAL_THEME_KEY = "organic_botanical_paper"

export function organicBotanicalVars(): React.CSSProperties {
  return {
    "--organic-bg": "var(--theme-background, #F3EBDD)",
    "--organic-surface": "var(--theme-input, #FFF9EF)",
    "--organic-primary": "var(--pmd-primary, var(--theme-primary, #737A55))",
    "--organic-accent": "var(--pmd-accent, var(--theme-accent, #B8864B))",
    "--organic-text": "var(--theme-text-primary, #352F28)",
    "--organic-muted": "var(--theme-text-secondary, #7D7467)",
    "--organic-border": "var(--theme-border, #D8CBAF)",
  } as React.CSSProperties
}

type HeroProps = {
  restaurantName: string
  tableNumber?: string | number | null
  onValetClick?: () => void
}

export function OrganicBotanicalHero({ restaurantName, tableNumber, onValetClick }: HeroProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <section className="organic-hero relative isolate min-h-[430px] overflow-hidden rounded-b-[3.2rem] border-b border-[#D8CBAF]/80 shadow-[0_22px_70px_rgba(66,55,35,0.18)]">
      <div className="absolute inset-0">
        <OptimizedImage
          src="/themes/botanical-paper/hero-bg.png"
          alt="Botanical paper dining table"
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(53,47,40,0.28),rgba(53,47,40,0.08)_38%,rgba(246,239,226,0.92)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(255,249,239,0.72),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(184,134,75,0.22),transparent_28%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[430px] max-w-4xl flex-col px-5 pb-12 pt-5 sm:px-8">
        <div className="flex items-start justify-between gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#E4D6BD]/80 bg-[#FFF9EF]/88 text-[#352F28] shadow-[0_10px_28px_rgba(66,55,35,0.16)] backdrop-blur-md transition hover:bg-[#FFF9EF]"
              aria-expanded={open}
              aria-haspopup="menu"
              aria-label="Open menu navigation"
            >
              <MenuIcon className="h-5 w-5" strokeWidth={1.7} />
            </button>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className="absolute left-0 top-14 z-30 w-48 overflow-hidden rounded-[1.45rem] border border-[#D8CBAF] bg-[#FFF9EF]/95 p-2 text-[#352F28] shadow-[0_20px_50px_rgba(66,55,35,0.22)] backdrop-blur-xl"
                role="menu"
              >
                <button type="button" className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left font-serif text-sm hover:bg-[#F3EBDD]" onClick={() => setOpen(false)} role="menuitem">
                  <Utensils className="h-4 w-4 text-[var(--organic-primary)]" strokeWidth={1.6} /> Menu
                </button>
                <button type="button" className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left font-serif text-sm hover:bg-[#F3EBDD]" onClick={() => { setOpen(false); onValetClick?.() }} role="menuitem">
                  <Car className="h-4 w-4 text-[var(--organic-primary)]" strokeWidth={1.6} /> Valet
                </button>
              </motion.div>
            )}
          </div>

          {tableNumber ? (
            <div className="rounded-full border border-[#E4D6BD]/85 bg-[#FFF9EF]/88 px-4 py-2 font-serif text-sm text-[#352F28] shadow-[0_10px_28px_rgba(66,55,35,0.14)] backdrop-blur-md">
              Table {tableNumber}
            </div>
          ) : null}
        </div>

        <div className="mt-auto max-w-[680px] pb-4 pt-24 text-[#352F28]">
          <div className="mb-4 flex w-fit items-center gap-2 rounded-full border border-[#E4D6BD]/80 bg-[#FFF9EF]/82 px-4 py-2 font-serif text-xs uppercase tracking-[0.26em] text-[var(--organic-primary)] shadow-sm backdrop-blur-md">
            <Leaf className="h-4 w-4" strokeWidth={1.5} /> Organic Botanical Paper
          </div>
          <h1 className="max-w-2xl font-serif text-5xl leading-[0.95] tracking-[-0.04em] text-[#352F28] drop-shadow-[0_1px_0_rgba(255,249,239,0.65)] sm:text-7xl">
            {restaurantName}
          </h1>
          <p className="mt-5 max-w-lg font-serif text-lg leading-7 text-[#5F584C] sm:text-xl">
            Seasonal dishes on a warm paper canvas, crafted with botanical calm and real PayMyDine ordering.
          </p>
        </div>
      </div>
    </section>
  )
}

const categoryIconFor = (category: string) => {
  const key = category.toLowerCase()
  if (key === "all") return Sparkles
  if (key.includes("salad") || key.includes("veg") || key.includes("green")) return Salad
  if (key.includes("soup")) return Soup
  if (key.includes("coffee") || key.includes("tea") || key.includes("drink")) return Coffee
  if (key.includes("fish") || key.includes("sea")) return Fish
  if (key.includes("chicken") || key.includes("meat") || key.includes("grill")) return Drumstick
  if (key.includes("dessert") || key.includes("cake") || key.includes("sweet")) return Cookie
  if (key.includes("grain") || key.includes("bread")) return Wheat
  return CircleDot
}

export function OrganicBotanicalCategoryNav({ categories, selectedCategory, onSelectCategory }: { categories: string[]; selectedCategory: string; onSelectCategory: (category: string) => void }) {
  return (
    <nav className="sticky top-0 z-20 mx-auto mb-8 mt-[-2.3rem] max-w-4xl px-4 pt-3" aria-label="Menu categories">
      <div className="flex gap-2 overflow-x-auto rounded-[2rem] border border-[#D8CBAF]/90 bg-[#FFF9EF]/88 p-2 shadow-[0_16px_44px_rgba(66,55,35,0.14)] backdrop-blur-xl scrollbar-hide">
        {categories.map((category) => {
          const Icon = categoryIconFor(category)
          const active = selectedCategory === category || (!selectedCategory && category === "All")
          return (
            <button
              key={category}
              type="button"
              onClick={() => onSelectCategory(category)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 font-serif text-sm transition",
                active
                  ? "border-[var(--organic-primary)] bg-[var(--organic-primary)] text-[#FFF9EF] shadow-[0_8px_20px_rgba(115,122,85,0.28)]"
                  : "border-transparent bg-transparent text-[#6E6659] hover:border-[#E3D6BD] hover:bg-[#F3EBDD]",
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.35} />
              <span>{category}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function MenuRecommendationBadges({ item, settings = defaultMenuHighlightSettings }: { item: MenuItem; settings?: MenuHighlightSettings }) {
  if (!settings.show_card_badges || settings.badge_position === "hidden") return null
  const badges: Array<{ key: string; label: string; icon: React.ReactNode; className: string }> = []
  if ((item as any).is_chef_recommended) badges.push({ key: "chef", label: settings.chef_label || "Chef’s Choice", icon: <Sparkles className="h-3.5 w-3.5" strokeWidth={1.4} />, className: "border-[#737A55]/35 bg-[#EEF2E5] text-[#5F6747]" })
  if ((item as any).is_bestseller) badges.push({ key: "best", label: settings.bestseller_label || "Best Seller", icon: <ShoppingBag className="h-3.5 w-3.5" strokeWidth={1.4} />, className: "border-[#B8864B]/35 bg-[#F7E7C8] text-[#8B602D]" })
  const visible = settings.badge_display_mode === "show_all" ? badges : badges.slice(0, 1)
  if (!visible.length) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label="Menu item highlights">
      {visible.map((badge) => (
        <span key={badge.key} className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em]", badge.className)} title={badge.label}>
          {badge.icon}
          {settings.show_badge_text_on_cards ? <span>{badge.label}</span> : null}
        </span>
      ))}
    </div>
  )
}

export function OrganicBotanicalMenuCard({ item, onSelect, onAdd, highlightSettings = defaultMenuHighlightSettings, prioritizeImage = false }: { item: MenuItem; onSelect: (item: MenuItem) => void; onAdd: (event: React.MouseEvent) => void; highlightSettings?: MenuHighlightSettings; prioritizeImage?: boolean }) {
  const { t } = useLanguageStore()
  const { items } = useCartStore()
  const quantity = items.find((cartItem) => cartItem.item.id === item.id)?.quantity || 0
  const itemName = item.nameKey && t(item.nameKey as TranslationKey) ? t(item.nameKey as TranslationKey) : item.name
  const itemDescription = item.descriptionKey && t(item.descriptionKey as TranslationKey) ? t(item.descriptionKey as TranslationKey) : item.description
  const image = getMenuImageUrl(item.image || (Array.isArray((item as any).images) ? (item as any).images[0] : "")) || "/placeholder.svg"
  const soldOut = item.available === false || Number(item.stock_qty ?? 1) <= 0

  return (
    <motion.article
      layout
      whileHover={{ y: -3 }}
      className="group relative cursor-pointer overflow-hidden rounded-[2.2rem] border border-[#DFD1B6]/90 bg-[#FFF9EF]/92 p-3 shadow-[0_14px_34px_rgba(66,55,35,0.11)] transition hover:shadow-[0_20px_48px_rgba(66,55,35,0.16)]"
      onClick={() => onSelect(item)}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[#B8864B]/10 blur-2xl" />
      <div className="grid grid-cols-[116px_1fr] gap-4 sm:grid-cols-[136px_1fr]">
        <div className="relative h-36 overflow-hidden border border-[#E5D8BF] bg-[#F3EBDD] shadow-inner" style={{ borderRadius: "42% 58% 48% 52% / 55% 43% 57% 45%" }}>
          <OptimizedImage src={image} alt={itemName} fill priority={prioritizeImage} className="object-contain p-2 transition duration-700 group-hover:scale-105" />
          {soldOut ? <div className="absolute inset-0 grid place-items-center bg-[#352F28]/45 font-serif text-sm uppercase tracking-[0.18em] text-[#FFF9EF]">Sold out</div> : null}
        </div>
        <div className="flex min-w-0 flex-col py-1">
          <div className="mb-2 flex min-h-6 items-center justify-between gap-2">
            <MenuRecommendationBadges item={item} settings={highlightSettings} />
            <FoodItemColorDot color={item.color} label={`${itemName} color`} />
          </div>
          <h3 dir={getTextDirection(itemName)} className={cn("font-serif text-2xl leading-6 tracking-[-0.02em] text-[#352F28]", getTextAlignClass(itemName))}>{itemName}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <FoodAttributeTags halal={item.halal} vegetarian={item.vegetarian} vegan={item.vegan} allergens={item.allergens} allergyTags={item.allergy_tags} compact />
            <FoodNutritionSummary calories={item.calories} protein={item.protein} carbs={item.carbs} fat={item.fat} sugar={item.sugar} servingSize={item.serving_size} compact />
          </div>
          <p dir={getTextDirection(itemDescription)} className={cn("mt-2 line-clamp-2 text-sm leading-5 text-[#7D7467]", getTextAlignClass(itemDescription))}>{truncateText(itemDescription || "", 88)}</p>
          <div className="mt-auto flex items-end justify-between gap-3 pt-3">
            <div>
              <p className="font-serif text-xl font-semibold text-[var(--organic-accent)]">{formatCurrency(item.price || 0)}</p>
              {Array.isArray(item.options) && item.options.length ? <p className="text-[11px] uppercase tracking-[0.12em] text-[#9A907F]">Options available</p> : null}
            </div>
            <button
              type="button"
              onClick={onAdd}
              disabled={soldOut}
              className="inline-flex h-12 min-w-12 items-center justify-center rounded-full bg-[var(--organic-primary)] px-3 text-[#FFF9EF] shadow-[0_10px_24px_rgba(115,122,85,0.32)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:bg-[#BDB5A5]"
              aria-label={quantity > 0 ? `${quantity} in cart, add one more` : "Add to cart"}
            >
              {quantity > 0 ? <span className="font-serif text-lg font-semibold">{quantity}</span> : <Plus className="h-5 w-5" strokeWidth={1.8} />}
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
