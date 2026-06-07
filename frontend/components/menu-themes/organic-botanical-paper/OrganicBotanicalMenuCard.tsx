'use client'

import type React from 'react'
import { Plus, Trophy, ChefHat } from 'lucide-react'
import { OptimizedImage } from '@/components/ui/optimized-image'
import { formatCurrency } from '@/lib/currency'
import { truncateText } from '@/lib/utils'
import { type MenuHighlightSettings, type MenuItem } from '@/lib/data'
import { FoodAttributeTags } from '@/components/food-attribute-tags'

function subtleBadges(item: MenuItem, settings: MenuHighlightSettings) {
  const badges = [] as Array<{ key: string; label: string; icon: React.ReactNode }>
  if ((item as any).is_chef_recommended) badges.push({ key: 'chef', label: settings.chef_label || "Chef’s Choice", icon: <ChefHat className="h-3 w-3" /> })
  if ((item as any).is_bestseller) badges.push({ key: 'best', label: settings.bestseller_label || 'Best Seller', icon: <Trophy className="h-3 w-3" /> })
  return settings.badge_display_mode === 'show_all' ? badges : badges.slice(0, 1)
}

export function OrganicBotanicalMenuCard({ item, onSelect, onAdd, highlightSettings }: { item: MenuItem; onSelect: (item: MenuItem) => void; onAdd: (event: React.MouseEvent) => void; highlightSettings: MenuHighlightSettings }) {
  const image = item.image || (Array.isArray((item as any).images) ? (item as any).images[0] : '') || '/placeholder.svg'
  const badges = highlightSettings.show_card_badges ? subtleBadges(item, highlightSettings) : []

  return (
    <article onClick={() => onSelect(item)} className="group relative flex min-h-[148px] cursor-pointer gap-3 overflow-hidden rounded-[2rem] border border-[#E0D3B8] bg-[var(--organic-surface)] p-4 text-[var(--organic-text)] shadow-[0_12px_28px_rgba(66,55,35,0.08)]">
      <div className="pointer-events-none absolute inset-0 opacity-[0.14] [background-image:radial-gradient(rgba(53,47,40,.18)_1px,transparent_1px)] [background-size:9px_9px]" />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        {badges.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span key={badge.key} className="inline-flex items-center gap-1 rounded-full border border-[#D8CBAF] bg-[#F3EBDD]/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--organic-primary)]">
                {badge.icon}{highlightSettings.show_badge_text_on_cards && badge.label}
              </span>
            ))}
          </div>
        )}
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="font-serif text-xl leading-tight tracking-[-0.02em]">{item.name}</h3>
          <span className="whitespace-nowrap font-serif text-lg text-[var(--organic-accent)]">{formatCurrency(item.price)}</span>
        </div>
        <p className="mb-3 text-sm leading-relaxed text-[var(--organic-muted)]">{truncateText(item.description || '', 86)}</p>
        <div className="mt-auto flex items-end justify-between gap-2">
          <FoodAttributeTags halal={item.halal} vegetarian={item.vegetarian} vegan={item.vegan} allergens={item.allergens} allergyTags={item.allergy_tags} compact />
          <button type="button" onClick={onAdd} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--organic-primary)] text-[#FFF9EF] shadow-sm transition group-hover:scale-105" aria-label={`Add ${item.name}`}>
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="relative z-10 h-28 w-28 shrink-0 overflow-hidden rounded-[1.5rem] bg-[#EFE3CA] md:h-32 md:w-32">
        <OptimizedImage src={image} alt={item.name} fill className="object-cover transition duration-500 group-hover:scale-105" />
        {!item.available && <div className="absolute inset-0 flex items-center justify-center bg-[#352F28]/55 text-xs font-semibold uppercase tracking-wide text-white">Sold out</div>}
      </div>
    </article>
  )
}
