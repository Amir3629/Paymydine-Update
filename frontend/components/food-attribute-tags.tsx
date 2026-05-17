"use client"

import type { ReactNode } from "react"
import { AlertTriangle, Leaf, Sprout } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FoodAttributeTagsProps {
  halal?: boolean
  vegetarian?: boolean
  vegan?: boolean
  allergens?: string[]
  allergyTags?: string[]
  compact?: boolean
  className?: string
}

type AttributeTag = {
  key: string
  label: string
  shortLabel?: string
  title: string
  icon: ReactNode
  compactClassName: string
  expandedClassName: string
  iconClassName: string
}

const baseCompactTag =
  "inline-flex h-7 w-7 items-center justify-center rounded-full border shadow-sm ring-1 ring-white/70 backdrop-blur-sm transition-transform duration-200 hover:-translate-y-0.5"
const baseExpandedTag =
  "inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs font-medium leading-none shadow-sm ring-1 ring-white/70 backdrop-blur-sm"
const baseExpandedIcon = "inline-flex h-6 w-6 items-center justify-center rounded-full"

export function FoodAttributeTags({
  halal = false,
  vegetarian = false,
  vegan = false,
  allergens = [],
  allergyTags = [],
  compact = false,
  className,
}: FoodAttributeTagsProps) {
  const normalizedAllergens = Array.from(
    new Set([...(allergyTags || []), ...(allergens || [])].filter(Boolean)),
  )

  const tags: AttributeTag[] = [
    ...(halal
      ? [
          {
            key: "halal",
            label: "Halal",
            title: "Halal",
            icon: <span className="text-[9px] font-bold leading-none tracking-tight">حلال</span>,
            compactClassName: "border-sky-200/80 bg-sky-50/95 text-sky-700",
            expandedClassName: "border-sky-200/80 bg-sky-50/95 text-sky-800",
            iconClassName: "bg-white/85 text-sky-700",
          },
        ]
      : []),
    ...(vegetarian
      ? [
          {
            key: "vegetarian",
            label: "Vegetarian",
            shortLabel: "Veg",
            title: "Vegetarian",
            icon: <Leaf className="h-3.5 w-3.5" aria-hidden="true" />,
            compactClassName: "border-emerald-200/80 bg-emerald-50/95 text-emerald-700",
            expandedClassName: "border-emerald-200/80 bg-emerald-50/95 text-emerald-800",
            iconClassName: "bg-white/85 text-emerald-700",
          },
        ]
      : []),
    ...(vegan
      ? [
          {
            key: "vegan",
            label: "Vegan",
            title: "Vegan",
            icon: <Sprout className="h-3.5 w-3.5" aria-hidden="true" />,
            compactClassName: "border-lime-200/80 bg-lime-50/95 text-lime-700",
            expandedClassName: "border-lime-200/80 bg-lime-50/95 text-lime-800",
            iconClassName: "bg-white/85 text-lime-700",
          },
        ]
      : []),
    ...(normalizedAllergens.length > 0
      ? [
          {
            key: "allergens",
            label: compact ? `${normalizedAllergens.length}` : `Allergens: ${normalizedAllergens.join(", ")}`,
            title: `Allergens: ${normalizedAllergens.join(", ")}`,
            icon: <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />,
            compactClassName: "border-amber-200/80 bg-amber-50/95 text-amber-700",
            expandedClassName: "border-amber-200/80 bg-amber-50/95 text-amber-900",
            iconClassName: "bg-white/85 text-amber-700",
          },
        ]
      : []),
  ]

  if (tags.length === 0) {
    return null
  }

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label="Food attributes and allergies"
    >
      {tags.map((tag) => (
        <span
          key={tag.key}
          className={cn(compact ? baseCompactTag : baseExpandedTag, compact ? tag.compactClassName : tag.expandedClassName)}
          aria-label={tag.title}
          title={tag.title}
        >
          <span className={cn(compact ? "inline-flex items-center justify-center" : baseExpandedIcon, !compact && tag.iconClassName)}>
            {tag.icon}
          </span>
          {!compact && <span>{tag.label}</span>}
        </span>
      ))}
    </div>
  )
}
