'use client'

import type React from 'react'
import { Plus, Trophy, ChefHat, Leaf } from 'lucide-react'
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
  const isAvailable = item.available !== false

  return (
    <article onClick={() => onSelect(item)} className="group relative isolate grid min-h-[164px] cursor-pointer grid-cols-[1fr_118px] gap-3 overflow-hidden border border-[#E2D4B7] bg-[var(--organic-surface)] p-4 text-[var(--organic-text)] shadow-[0_16px_38px_rgba(67,56,38,0.10)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_22px_48px_rgba(67,56,38,0.14)] sm:grid-cols-[1fr_145px] sm:p-5" style={{ borderRadius: '2.1rem 1.35rem 2.6rem 1.65rem' }}>
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.18] [background-image:radial-gradient(rgba(82,72,52,.16)_1px,transparent_1px),linear-gradient(135deg,rgba(255,255,255,.58),transparent_45%,rgba(184,134,75,.10))] [background-size:13px_13px,100%_100%]" />
      <Leaf className="pointer-events-none absolute -left-4 bottom-6 h-20 w-20 rotate-[-28deg] text-[var(--organic-primary)]/10" />

      <div className="relative z-10 flex min-w-0 flex-col py-1">
        {badges.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {badges.map((badge) => (
              <span key={badge.key} className="inline-flex items-center gap-1 rounded-full border border-[var(--organic-primary)]/18 bg-[var(--organic-primary)]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--organic-primary)]">
                {badge.icon}{highlightSettings.show_badge_text_on_cards && <span>{badge.label}</span>}
              </span>
            ))}
          </div>
        )}
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="font-serif text-[1.35rem] leading-[1.04] tracking-[-0.025em] sm:text-[1.55rem]">{item.name}</h3>
          <span className="whitespace-nowrap pt-0.5 font-serif text-lg text-[var(--organic-accent)] sm:text-xl">{formatCurrency(item.price)}</span>
        </div>
        <p className="mb-3 text-[0.93rem] leading-relaxed text-[var(--organic-muted)] sm:text-[0.98rem]">{truncateText(item.description || '', 98)}</p>
        <div className="mt-auto flex items-end justify-between gap-2">
          <FoodAttributeTags halal={item.halal} vegetarian={item.vegetarian} vegan={item.vegan} allergens={item.allergens} allergyTags={item.allergy_tags} compact />
          <button type="button" onClick={onAdd} disabled={!isAvailable} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--organic-primary)] text-[#FFF9EF] shadow-[0_8px_18px_rgba(84,92,58,.24)] transition group-hover:scale-105 disabled:cursor-not-allowed disabled:bg-[#BDB49D] disabled:shadow-none" aria-label={`Add ${item.name}`}>
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="relative z-10 my-auto h-[132px] overflow-hidden border border-white/65 bg-[#EFE3CA] shadow-inner sm:h-[150px]" style={{ borderRadius: '42% 58% 45% 55% / 55% 42% 58% 45%' }}>
        <OptimizedImage src={image} alt={item.name} fill className={`object-cover transition duration-700 group-hover:scale-105 ${isAvailable ? '' : 'opacity-70 saturate-[.75]'}`} />
        {!isAvailable && (
          <div className="absolute right-2 top-2 rotate-3 rounded-full border border-[#B8864B]/40 bg-[#FFF9EF]/92 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--organic-accent)] shadow-sm">
            Sold out
          </div>
        )}
      </div>
    </article>
  )
}
