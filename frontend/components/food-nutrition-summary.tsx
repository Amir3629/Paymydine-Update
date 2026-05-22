"use client"

import { Flame } from "lucide-react"
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
    { label: "Protein", shortLabel: "P", value: formatMacro(protein) },
    { label: "Carbs", shortLabel: "C", value: formatMacro(carbs) },
    { label: "Fat", shortLabel: "F", value: formatMacro(fat) },
    { label: "Sugar", shortLabel: "Sugar", value: formatMacro(sugar) },
  ].filter((item) => item.value)

  if (caloriesValue === null && macros.length === 0 && !servingSize) {
    return null
  }

  if (compact) {
    return (
      <div className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Nutrition estimates">
        {caloriesValue !== null && (
          <span
            className="inline-flex h-7 items-center gap-1 rounded-full border border-violet-200/80 bg-violet-50/95 px-2 text-[11px] font-semibold leading-none text-violet-800 shadow-sm ring-1 ring-white/70"
            title="Estimated calories per serving"
            aria-label={`Estimated calories: ${caloriesValue} kcal`}
          >
            <Flame className="h-3.5 w-3.5" aria-hidden="true" />
            {caloriesValue} kcal
          </span>
        )}
      </div>
    )
  }

  return (
    <div className={cn("rounded-2xl border border-neutral-200 bg-neutral-50/60 p-3 text-left", className)}>
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-800">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-600">
          <Flame className="h-4 w-4" aria-hidden="true" />
        </span>
        Nutrition
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs text-neutral-700 sm:grid-cols-3">
        {caloriesValue !== null && <NutritionPill label="Calories" value={`${caloriesValue} kcal`} />}
        {servingSize && <NutritionPill label="Serving" value={servingSize} />}
        {macros.map((macro) => (
          <NutritionPill key={macro.label} label={macro.label} value={macro.value!} />
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-neutral-500">
        Restaurant-provided estimates. Values may vary by portion size, ingredients, and preparation.
      </p>
    </div>
  )
}

function NutritionPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white/90 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-neutral-400">{label}</div>
      <div className="font-semibold text-neutral-700">{value}</div>
    </div>
  )
}
