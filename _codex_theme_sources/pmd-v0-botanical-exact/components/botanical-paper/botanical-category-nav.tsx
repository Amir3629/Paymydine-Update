"use client"

import { cn } from "@/lib/utils"
import type { Category } from "./types"

export type BotanicalCategoryNavProps = {
  categories: Category[]
  selectedCategory: string
  onSelectCategory: (id: string) => void
  className?: string
}

export function BotanicalCategoryNav({
  categories,
  selectedCategory,
  onSelectCategory,
  className,
}: BotanicalCategoryNavProps) {
  return (
    <nav aria-label="Menu categories" className={cn("px-2", className)}>
      <ul className="pmd-no-scrollbar flex snap-x gap-2 overflow-x-auto px-4 py-2 sm:justify-center">
        {categories.map((cat, i) => {
          const active = cat.id === selectedCategory
          // alternate the resting tint of the circles like the reference
          const accentRing = i % 2 === 1
          return (
            <li key={cat.id} className="snap-start">
              <button
                type="button"
                onClick={() => onSelectCategory(cat.id)}
                aria-pressed={active}
                className="group flex w-[88px] flex-col items-center gap-2 outline-none"
              >
                <span
                  className={cn(
                    "flex size-[68px] items-center justify-center rounded-full border transition-all duration-300",
                    active
                      ? "border-transparent bg-[var(--pmd-primary)] text-[var(--pmd-paper-soft)] shadow-[0_10px_22px_-12px_rgba(60,53,41,0.6)]"
                      : accentRing
                        ? "border-[var(--pmd-accent-soft)] bg-[color-mix(in_srgb,var(--pmd-accent)_16%,var(--pmd-paper-soft))] text-[var(--pmd-accent)] group-hover:border-[var(--pmd-accent)]"
                        : "border-[var(--pmd-line)] bg-[var(--pmd-paper-soft)] text-[var(--pmd-primary)] group-hover:border-[var(--pmd-primary)]",
                  )}
                >
                  <span className="[&_svg]:size-7 [&_svg]:stroke-current [&_svg]:stroke-[1.7] [&_svg]:fill-none">
                    {cat.icon}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-[11px] font-medium uppercase tracking-[0.14em] transition-colors",
                    active ? "text-[var(--pmd-ink)]" : "text-[var(--pmd-muted)]",
                  )}
                >
                  {cat.name}
                </span>
                <span
                  className={cn(
                    "h-0.5 w-7 rounded-full transition-all duration-300",
                    active ? "bg-[var(--pmd-primary)]" : "bg-transparent",
                  )}
                />
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
