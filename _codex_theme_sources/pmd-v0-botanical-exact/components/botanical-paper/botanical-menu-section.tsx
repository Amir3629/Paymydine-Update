"use client"

import { cn } from "@/lib/utils"
import type { MenuItem, MenuSectionData } from "./types"
import { BotanicalMenuCard } from "./botanical-menu-card"
import { OrnamentTwig } from "./botanical-icons"

export type BotanicalMenuSectionProps = {
  section: MenuSectionData
  onSelectItem?: (item: MenuItem) => void
  onAddItem?: (item: MenuItem) => void
  className?: string
}

export function BotanicalMenuSection({
  section,
  onSelectItem,
  onAddItem,
  className,
}: BotanicalMenuSectionProps) {
  return (
    <section className={cn("px-5 py-8 sm:px-6", className)}>
      <header className="mb-6 text-center">
        <div className="flex items-center justify-center gap-3 text-[var(--pmd-primary)]">
          <OrnamentTwig className="h-3.5 w-9" />
          <h2 className="font-serif text-3xl font-semibold uppercase tracking-[0.16em] text-[var(--pmd-ink)]">
            {section.title}
          </h2>
          <OrnamentTwig mirror className="h-3.5 w-9" />
        </div>
        {section.subtitle && (
          <p className="mt-2 text-sm italic leading-relaxed text-[var(--pmd-muted)]">
            {section.subtitle}
          </p>
        )}
      </header>

      <div className="mx-auto flex max-w-xl flex-col gap-5">
        {section.items.map((item, i) => (
          <BotanicalMenuCard
            key={item.id}
            item={item}
            tone={i % 2 === 1 ? "clay" : "paper"}
            onSelectItem={onSelectItem}
            onAddItem={onAddItem}
          />
        ))}
      </div>
    </section>
  )
}
