"use client"

/**
 * Modern Green theme — sections, menu item cards, and item detail card.
 *
 * Pure presentation. The host owns cart state, item detail state, and math.
 * Item rows/cards can call onSelectItem(item) to open a detail card, while
 * the plus button calls onAddItem(item.id).
 */

import { cn } from "@/lib/utils"
import { Flame, Leaf, Plus, ShoppingBag } from "lucide-react"
import Image from "next/image"
import { ThemeActionButton, ThemeBadgeChip, ThemeDivider } from "./primitives"
import type { FormatPrice, MenuItem, MenuSection } from "./types"

function MenuItemCard({
  item,
  formatPrice,
  onAddItem,
  onSelectItem,
}: {
  item: MenuItem
  formatPrice: FormatPrice
  onAddItem?: (itemId: string) => void
  onSelectItem?: (item: MenuItem) => void
}) {
  return (
    <article
      className={cn(
        "mg-glass group flex gap-4 rounded-3xl p-3 transition-all",
        onSelectItem && "cursor-pointer hover:border-[var(--mg-border-strong)] hover:bg-[var(--mg-hover)]",
      )}
      onClick={() => onSelectItem?.(item)}
      role={onSelectItem ? "button" : undefined}
      tabIndex={onSelectItem ? 0 : undefined}
      onKeyDown={(event) => {
        if (!onSelectItem) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelectItem(item)
        }
      }}
      aria-label={onSelectItem ? `Open ${item.name}` : undefined}
    >
      {item.imageUrl && (
        <div className="relative size-24 shrink-0 overflow-hidden rounded-2xl bg-[var(--mg-hover)]">
          <Image
            src={item.imageUrl || "/placeholder.svg"}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-2">
          <h3 className="truncate text-sm font-semibold text-[var(--mg-text)]">
            {item.name}
          </h3>
          {item.badge && (
            <ThemeBadgeChip label={item.badge.label} tone={item.badge.tone} />
          )}
        </div>
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[var(--mg-text-soft)] text-pretty">
            {item.description}
          </p>
        )}
        <div className="mt-auto flex items-end justify-between pt-2">
          <span className="text-sm font-bold text-[var(--mg-text)]">
            {formatPrice(item.price)}
          </span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation()
              onAddItem?.(item.id)
            }}
            aria-label={`Add ${item.name}`}
            className="flex size-9 items-center justify-center rounded-full bg-[var(--mg-green)] text-[var(--mg-on-green)] shadow-[0_8px_20px_-8px_var(--mg-green-ring)] transition-all hover:bg-[var(--mg-green-strong)] active:translate-y-px"
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </article>
  )
}

export function ThemeMenuSection({
  section,
  formatPrice,
  onAddItem,
  onSelectItem,
}: {
  section: MenuSection
  formatPrice: FormatPrice
  onAddItem?: (itemId: string) => void
  onSelectItem?: (item: MenuItem) => void
}) {
  return (
    <section className="space-y-3" aria-labelledby={`section-${section.id}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id={`section-${section.id}`}
          className="text-lg font-bold tracking-tight text-[var(--mg-text)]"
        >
          {section.title}
        </h2>
        {section.subtitle && (
          <p className="truncate text-xs text-[var(--mg-text-dim)]">
            {section.subtitle}
          </p>
        )}
      </div>
      <div className="grid gap-3">
        {section.items.map((item) => (
          <MenuItemCard
            key={item.id}
            item={item}
            formatPrice={formatPrice}
            onAddItem={onAddItem}
            onSelectItem={onSelectItem}
          />
        ))}
      </div>
    </section>
  )
}

export function ModernGreenMenuSections({
  sections,
  formatPrice,
  onAddItem,
  onSelectItem,
  className,
}: {
  sections: MenuSection[]
  formatPrice: FormatPrice
  onAddItem?: (itemId: string) => void
  onSelectItem?: (item: MenuItem) => void
  className?: string
}) {
  return (
    <div className={cn("space-y-8", className)}>
      {sections.map((section) => (
        <ThemeMenuSection
          key={section.id}
          section={section}
          formatPrice={formatPrice}
          onAddItem={onAddItem}
          onSelectItem={onSelectItem}
        />
      ))}
    </div>
  )
}

export function ModernGreenItemDetailCard({
  item,
  formatPrice,
  onAddItem,
  onClose,
}: {
  item: MenuItem
  formatPrice: FormatPrice
  onAddItem?: (itemId: string) => void
  onClose?: () => void
}) {
  return (
    <div className="space-y-5">
      {item.imageUrl && (
        <div className="relative h-56 overflow-hidden rounded-3xl bg-[var(--mg-hover)]">
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 640px) 100vw, 448px"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
          {item.badge && (
            <div className="absolute left-4 top-4">
              <ThemeBadgeChip label={item.badge.label} tone={item.badge.tone} />
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--mg-text)]">
              {item.name}
            </h2>
            {item.description && (
              <p className="mt-2 text-sm leading-relaxed text-[var(--mg-text-soft)]">
                {item.description}
              </p>
            )}
          </div>
          <span className="shrink-0 text-xl font-bold text-[var(--mg-text)]">
            {formatPrice(item.price)}
          </span>
        </div>
      </div>

      {item.tags?.length ? (
        <div className="flex flex-wrap gap-2">
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="mg-glass inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-[var(--mg-text-soft)]"
            >
              {tag.toLowerCase().includes("gluten") ? (
                <Leaf className="size-3.5 text-[var(--mg-green)]" />
              ) : (
                <Flame className="size-3.5 text-[var(--mg-green)]" />
              )}
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      <ThemeDivider />

      <div className="grid gap-2 sm:grid-cols-2">
        <ThemeActionButton
          fullWidth
          size="lg"
          leadingIcon={<ShoppingBag className="size-5" />}
          onClick={() => onAddItem?.(item.id)}
        >
          Add to order
        </ThemeActionButton>
        <ThemeActionButton fullWidth size="lg" variant="outline" onClick={onClose}>
          Continue browsing
        </ThemeActionButton>
      </div>
    </div>
  )
}
