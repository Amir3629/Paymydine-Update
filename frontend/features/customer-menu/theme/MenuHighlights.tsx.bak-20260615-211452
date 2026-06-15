"use client"

import { ChefHat, Star, Trophy } from "lucide-react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { OptimizedImage } from "@/components/ui/optimized-image"
import { defaultMenuHighlightSettings, type MenuHighlightSettings, type MenuItem } from "@/lib/data"
import { formatCurrency } from "@/lib/currency"

export function MenuRecommendationBadges({
  item,
  compact = false,
  settings = defaultMenuHighlightSettings,
  placement = 'card',
}: {
  item: MenuItem
  compact?: boolean
  settings?: MenuHighlightSettings
  placement?: 'card' | 'modal' | 'section'
}) {
  if (placement === 'card' && (!settings.show_card_badges || settings.badge_position === 'hidden')) return null
  if (placement === 'modal' && !settings.show_modal_badges) return null

  const candidates = [] as Array<{ key: string; label: string; icon: React.ReactNode; tone: 'gold' | 'emerald' }>
  if ((item as any).is_chef_recommended) {
    candidates.push({
      key: 'chef',
      label: settings.chef_label || "Chef’s Choice",
      icon: <ChefHat className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />,
      tone: 'emerald',
    })
  }
  if ((item as any).is_bestseller) {
    candidates.push({
      key: 'best',
      label: settings.bestseller_label || 'Best Seller',
      icon: <Trophy className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} aria-hidden="true" />,
      tone: 'gold',
    })
  }
  const badges = settings.badge_display_mode === 'show_all' ? candidates : candidates.slice(0, 1)
  if (!badges.length) return null

  const showText = placement === 'modal' ? settings.show_badge_text_in_modal : settings.show_badge_text_on_cards
  const style = placement === 'modal' ? 'soft_pill' : settings.badge_style
  const cardCircle = style === 'minimal_circle'
  const cardRibbon = style === 'corner_ribbon' && placement === 'card'

  const classFor = (tone: 'gold' | 'emerald') => {
    const colors = tone === 'gold'
      ? 'border-[#C7A45A]/45 bg-[#F7E8BD] text-[#704A10]'
      : 'border-[#0F4D43]/35 bg-[#E6F2EF] text-[#0F4D43]'
    if (cardCircle) return `inline-flex h-8 w-8 items-center justify-center rounded-full border ${colors} shadow-sm`
    if (cardRibbon) return `inline-flex items-center gap-1 border ${colors} px-2 py-1 text-[10px] font-bold uppercase tracking-[0.05em] shadow-sm`
    if (style === 'luxury_label') return `inline-flex items-center gap-1.5 rounded-md border ${colors} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] shadow-sm`
    return `inline-flex items-center gap-1.5 rounded-full border ${colors} px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.04em] shadow-sm`
  }

  return (
    <div className={`pmd-menu-recommendation-badges flex flex-wrap items-center gap-1 ${cardRibbon ? 'max-w-[112px]' : ''}`} aria-label="Menu item highlights">
      {badges.map((badge) => (
        <span key={badge.key} className={classFor(badge.tone)} aria-label={badge.label} title={badge.label}>
          {badge.icon}
          {showText && !cardCircle && <span>{badge.label}</span>}
        </span>
      ))}
    </div>
  )
}

export function MenuHighlightSection({
  title,
  subtitle,
  items,
  settings,
  onSelect,
  onFirstAdd,
  organic = false,
  onOrganicAdd,
}: {
  title: string
  subtitle: string
  items: MenuItem[]
  settings: MenuHighlightSettings
  onSelect: (item: MenuItem) => void
  onFirstAdd: (item: MenuItem) => void
  organic?: boolean
  onOrganicAdd?: (item: MenuItem, event: React.MouseEvent) => void
}) {
  if (!items.length) return null

  return (
    <section className={organic ? "organic-highlight-section relative mb-9 px-4" : "mb-8 px-4"} aria-label={title}>
      <div className={organic ? "mb-4 text-center" : "mb-3 flex items-end justify-between gap-3"}>
        <div>
          {organic && <div className="mx-auto mb-2 flex w-fit items-center gap-2 text-[var(--organic-accent)]" aria-hidden="true"><span className="h-px w-8 bg-current" /><span className="text-lg">☘</span><span className="h-px w-8 bg-current" /></div>}
          <h2 className={organic ? "font-serif text-3xl uppercase tracking-[0.16em] text-[var(--organic-text)]" : "font-serif text-2xl font-bold text-paydine-elegant-gray"}>{title}</h2>
          <p className={organic ? "mt-1 font-serif text-sm text-[var(--organic-muted)]" : "text-sm text-gray-500"}>{subtitle}</p>
        </div>
      </div>
      <div className={organic ? "flex gap-4 overflow-x-auto rounded-[2.4rem] border border-[#E5D8BF]/70 bg-[#FFF9EF]/42 p-3 pb-4 shadow-[inset_0_1px_0_rgba(255,255,255,.65)] md:grid md:grid-cols-2 md:overflow-visible" : "flex gap-4 overflow-x-auto pb-2 md:grid md:grid-cols-2 md:overflow-visible"}>
        {items.map((item, index) => (
          <div key={`highlight-${title}-${item.id}`} className="min-w-[82vw] md:min-w-0">
            {organic ? (
              <OrganicBotanicalMenuCard
                item={item}
                onSelect={onSelect}
                onAdd={(event) => onOrganicAdd ? onOrganicAdd(item, event) : onFirstAdd(item)}
                highlightSettings={settings}
              />
            ) : (
              <ExpandingToolbarMenuItemCard
                item={item}
                onSelect={onSelect}
                onFirstAdd={() => onFirstAdd(item)}
                prioritizeImage={index < 2}
                highlightSettings={settings}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// Component for individual order item with expandable options
// PMD_QUANTITY_ICON_SOURCE_WHITE_FINAL_20260601
// PMD_QTY_SVG_REPLACED_WITH_TEXT_SYMBOLS_20260601
