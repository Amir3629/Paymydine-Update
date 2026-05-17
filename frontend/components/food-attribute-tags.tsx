"use client"

import { AlertTriangle, Leaf, ShieldCheck, Sprout } from "lucide-react"
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

const badgeBase = "inline-flex items-center rounded-full border font-medium leading-none"

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

  if (!halal && !vegetarian && !vegan && normalizedAllergens.length === 0) {
    return null
  }

  const sizeClass = compact ? "gap-1 px-2 py-1 text-[11px]" : "gap-1.5 px-2.5 py-1.5 text-xs"
  const iconClass = compact ? "h-3 w-3" : "h-3.5 w-3.5"

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label="Food attributes and allergies"
    >
      {halal && (
        <span
          className={cn(badgeBase, sizeClass, "border-sky-200 bg-sky-50 text-sky-700")}
          aria-label="Halal"
          title="Halal"
        >
          <ShieldCheck className={iconClass} aria-hidden="true" />
          Halal
        </span>
      )}

      {vegetarian && (
        <span
          className={cn(badgeBase, sizeClass, "border-emerald-200 bg-emerald-50 text-emerald-700")}
          aria-label="Vegetarian"
          title="Vegetarian"
        >
          <Leaf className={iconClass} aria-hidden="true" />
          {compact ? "Veg" : "Vegetarian"}
        </span>
      )}

      {vegan && (
        <span
          className={cn(badgeBase, sizeClass, "border-lime-200 bg-lime-50 text-lime-700")}
          aria-label="Vegan"
          title="Vegan"
        >
          <Sprout className={iconClass} aria-hidden="true" />
          Vegan
        </span>
      )}

      {normalizedAllergens.length > 0 && (
        <span
          className={cn(
            badgeBase,
            sizeClass,
            "border-amber-200 bg-amber-50 text-amber-800",
            !compact && "w-full justify-start sm:w-auto",
          )}
          aria-label={`Allergy information: ${normalizedAllergens.join(", ")}`}
          title={`Allergies: ${normalizedAllergens.join(", ")}`}
        >
          <AlertTriangle className={iconClass} aria-hidden="true" />
          {compact ? `${normalizedAllergens.length} allergen${normalizedAllergens.length === 1 ? "" : "s"}` : `Allergies: ${normalizedAllergens.join(", ")}`}
        </span>
      )}
    </div>
  )
}
