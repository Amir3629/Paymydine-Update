import { AlertTriangle, Leaf, MoonStar, Sprout } from "lucide-react"
import { cn } from "@/lib/utils"

export type FoodAttributeSource = {
  halal?: boolean
  vegetarian?: boolean
  vegan?: boolean
  allergy_tags?: string[]
  allergens?: string[]
}

interface FoodAttributeTagsProps {
  item: FoodAttributeSource
  compact?: boolean
  showAllergies?: boolean
  className?: string
}

const dietaryTags = [
  { key: "halal", label: "Halal", Icon: MoonStar },
  { key: "vegetarian", label: "Vegetarian", Icon: Leaf },
  { key: "vegan", label: "Vegan", Icon: Sprout },
] as const

function normalizeAllergies(item: FoodAttributeSource): string[] {
  const rawTags = item.allergy_tags ?? item.allergens ?? []

  return Array.from(
    new Set(
      rawTags
        .map((tag) => `${tag ?? ""}`.trim())
        .filter(Boolean),
    ),
  )
}

export function FoodAttributeTags({
  item,
  compact = false,
  showAllergies = true,
  className,
}: FoodAttributeTagsProps) {
  const enabledDietaryTags = dietaryTags.filter(({ key }) => Boolean(item[key]))
  const allergyTags = normalizeAllergies(item)
  const visibleAllergies = compact ? allergyTags.slice(0, 2) : allergyTags
  const hiddenAllergyCount = allergyTags.length - visibleAllergies.length

  if (!enabledDietaryTags.length && (!showAllergies || !allergyTags.length)) {
    return null
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Food attributes and allergy tags">
      {enabledDietaryTags.map(({ key, label, Icon }) => (
        <span
          key={key}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800"
          title={label}
        >
          <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>{compact ? label.replace("Vegetarian", "Veg") : label}</span>
        </span>
      ))}

      {showAllergies && visibleAllergies.map((tag) => (
        <span
          key={tag}
          className="inline-flex max-w-full items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800"
          title={`Contains or may contain ${tag}`}
        >
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">{tag}</span>
        </span>
      ))}

      {showAllergies && hiddenAllergyCount > 0 && (
        <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800">
          +{hiddenAllergyCount} allergies
        </span>
      )}
    </div>
  )
}
