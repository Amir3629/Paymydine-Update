"use client"

import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MenuItem } from "./types"
import { Badge, ItemBadges } from "./botanical-ui"
import { LeafGlyph } from "./botanical-icons"

export type BotanicalMenuCardProps = {
  item: MenuItem
  /** alternate cards get a clay-toned paper surface like the reference */
  tone?: "paper" | "clay"
  onSelectItem?: (item: MenuItem) => void
  onAddItem?: (item: MenuItem) => void
  currency?: string
}

export function BotanicalMenuCard({
  item,
  tone = "paper",
  onSelectItem,
  onAddItem,
  currency = "$",
}: BotanicalMenuCardProps) {
  const soldOut = item.isSoldOut
  const dir = item.rtl ? "rtl" : "ltr"

  return (
    <article
      dir={dir}
      className={cn(
        "pmd-card-grain group relative overflow-hidden rounded-[1.75rem] border transition-shadow duration-300",
        tone === "clay"
          ? "border-[color-mix(in_srgb,var(--pmd-accent)_30%,transparent)] bg-[var(--pmd-clay)]"
          : "border-[var(--pmd-line)] bg-[var(--pmd-paper-soft)]",
        "shadow-[0_14px_30px_-22px_rgba(60,53,41,0.55)] hover:shadow-[0_20px_38px_-20px_rgba(60,53,41,0.5)]",
      )}
    >
      <button
        type="button"
        onClick={() => onSelectItem?.(item)}
        className="flex w-full items-stretch gap-4 p-4 text-left outline-none sm:gap-5 sm:p-5"
      >
        {/* text column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {item.isNew && (
            <Badge variant="new" withLeaf className="mb-1.5 self-start px-0">
              New
            </Badge>
          )}

          <div className="flex items-start justify-between gap-3">
            <h3 className="font-serif text-xl font-semibold leading-snug text-[var(--pmd-ink)] text-balance">
              {item.name}
            </h3>
            <span className="shrink-0 font-serif text-lg font-semibold text-[var(--pmd-ink)]">
              {currency}
              {item.price}
            </span>
          </div>

          {(item.isChefRecommended || item.isBestSeller) && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {item.isChefRecommended && <Badge variant="chef">Chef&apos;s Choice</Badge>}
              {item.isBestSeller && <Badge variant="best">Best Seller</Badge>}
            </div>
          )}

          {item.description && (
            <p className="mt-2 text-pretty text-sm leading-relaxed text-[var(--pmd-muted)]">
              {item.description}
            </p>
          )}

          <div className="mt-auto pt-3">
            <ItemBadges item={item} />
          </div>
        </div>

        {/* organic image frame */}
        <div className="relative shrink-0 self-center">
          <div
            className={cn(
              "size-28 overflow-hidden border border-[var(--pmd-paper-soft)] shadow-[0_10px_22px_-14px_rgba(60,53,41,0.6)] sm:size-32",
              "rounded-[42%_58%_56%_44%/52%_44%_56%_48%]",
            )}
          >
            <img
              src={item.image || "/placeholder.svg?height=160&width=160&query=dish"}
              alt={item.name}
              className={cn(
                "size-full object-cover transition-transform duration-500 group-hover:scale-105",
                soldOut && "saturate-[0.55]",
              )}
            />
          </div>

          {!soldOut && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation()
                onAddItem?.(item)
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  e.stopPropagation()
                  onAddItem?.(item)
                }
              }}
              aria-label={`Add ${item.name}`}
              className="absolute -bottom-1 right-0 flex size-9 items-center justify-center rounded-full bg-[var(--pmd-primary)] text-[var(--pmd-paper-soft)] shadow-[0_8px_18px_-8px_rgba(60,53,41,0.7)] transition-transform hover:scale-110 active:scale-95"
            >
              <Plus className="size-5" />
            </span>
          )}
        </div>
      </button>

      {/* sold-out paper stamp */}
      {soldOut && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex -rotate-[8deg] items-center gap-2 rounded-md border-2 border-dashed border-[color-mix(in_srgb,var(--pmd-accent)_75%,transparent)] bg-[color-mix(in_srgb,var(--pmd-paper-soft)_82%,transparent)] px-4 py-1.5 font-serif text-base font-semibold uppercase tracking-[0.2em] text-[var(--pmd-accent)] shadow-sm">
            <LeafGlyph className="size-4" />
            Sold Out
          </span>
        </div>
      )}
    </article>
  )
}
