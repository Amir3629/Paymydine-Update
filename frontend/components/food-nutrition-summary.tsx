"use client"

import { cn } from "@/lib/utils"

type NutritionValue = number | string | null | undefined

export interface FoodNutritionSummaryProps {
  calories?: NutritionValue
  protein?: NutritionValue
  carbs?: NutritionValue
  fat?: NutritionValue
  sugar?: NutritionValue
  servingSize?: string | null
  compact?: boolean
  className?: string
}

const toNumber = (value: NutritionValue): number | null => {
  if (value === null || value === undefined || value === "") return null
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

const formatMacro = (value: NutritionValue): string | null => {
  const numberValue = toNumber(value)
  if (numberValue === null) return null
  return `${Number.isInteger(numberValue) ? numberValue : numberValue.toFixed(1)}g`
}

export function FoodNutritionSummary({
  calories,
  protein,
  carbs,
  fat,
  sugar,
  servingSize,
  compact = false,
  className,
}: FoodNutritionSummaryProps) {
  const caloriesValue = toNumber(calories)
  const macros = [
    { label: "Protein", value: formatMacro(protein) },
    { label: "Carbs", value: formatMacro(carbs) },
    { label: "Fat", value: formatMacro(fat) },
    { label: "Sugar", value: formatMacro(sugar) },
  ].filter((item) => item.value)

  if (caloriesValue === null && macros.length === 0 && !servingSize) {
    return null
  }

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Nutrition estimates">
        {caloriesValue !== null && (
          <span className="inline-flex h-6 items-center rounded-full bg-black/5 px-2 text-[11px] font-medium text-neutral-700" title="Estimated calories per serving" aria-label={`Estimated calories: ${caloriesValue} kcal`}>{caloriesValue} kcal</span>
        )}
      </div>
    )
  }

  const facts = [
    caloriesValue !== null ? `${caloriesValue} kcal` : null,
    ...macros.map((macro) => `${macro.label} ${macro.value}`),
  ].filter(Boolean)

  return (
    <div className={cn("text-left text-sm text-neutral-700", className)}>
      <p className="leading-relaxed">
        <span className="font-medium text-neutral-700">Nutrition</span>
        {facts.length > 0 ? ` · ${facts.join(" · ")}` : ""}
      </p>
      {servingSize ? <p className="mt-1 text-xs text-neutral-700">Serving: {servingSize}</p> : null}
      <p className="mt-1 text-[10px] text-neutral-700">Estimated values. Actual values may vary.</p>
    </div>
  )
}
