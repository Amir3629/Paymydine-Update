import { cn } from "@/lib/utils"
import type { MenuItem } from "./types"
import { LeafGlyph } from "./botanical-icons"

/**
 * Wavy, torn-paper style divider. `flip` points the wave the other way,
 * `color` sets the fill (defaults to the soft paper tone).
 */
export function WavyDivider({
  className,
  flip,
  color = "var(--pmd-paper)",
}: {
  className?: string
  flip?: boolean
  color?: string
}) {
  return (
    <div className={cn("pointer-events-none w-full leading-[0]", className)} aria-hidden="true">
      <svg
        viewBox="0 0 1440 48"
        preserveAspectRatio="none"
        className="block h-6 w-full md:h-9"
        style={flip ? { transform: "scaleY(-1)" } : undefined}
      >
        <path
          d="M0 24C180 4 320 4 480 20s300 28 480 22 360-30 480-26v32H0Z"
          fill={color}
        />
      </svg>
    </div>
  )
}

const BADGE_STYLES: Record<string, string> = {
  new: "text-[var(--pmd-primary)]",
  chef: "bg-[var(--pmd-primary)] text-[var(--pmd-paper-soft)]",
  best: "bg-[var(--pmd-accent)] text-[var(--pmd-paper-soft)]",
  diet: "text-[var(--pmd-muted)] border border-[var(--pmd-line)]",
}

export function Badge({
  variant = "diet",
  withLeaf,
  className,
  children,
}: {
  variant?: keyof typeof BADGE_STYLES
  withLeaf?: boolean
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em]",
        BADGE_STYLES[variant],
        className,
      )}
    >
      {withLeaf && <LeafGlyph className="size-3" />}
      {children}
    </span>
  )
}

/** Collects the dietary/state badges for a menu item into a single list. */
export function ItemBadges({ item, className }: { item: MenuItem; className?: string }) {
  const diet: string[] = []
  if (item.isVegan) diet.push("Vegan")
  else if (item.isVegetarian) diet.push("Vegetarian")
  if (item.isGlutenFree) diet.push("Gluten Free")
  if (item.isHalal) diet.push("Halal")

  if (diet.length === 0) return null

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {diet.map((d, i) => (
        <span
          key={d}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--pmd-primary)]"
        >
          {i === 0 && <LeafGlyph className="size-3.5" />}
          {d}
        </span>
      ))}
    </div>
  )
}
