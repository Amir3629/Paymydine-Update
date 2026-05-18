import { cn } from "@/lib/utils"

interface FoodItemColorDotProps {
  color?: string | null
  label?: string
  className?: string
}

const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/

export function FoodItemColorDot({ color, label = "Menu item color", className }: FoodItemColorDotProps) {
  const safeColor = typeof color === "string" && HEX_COLOR_PATTERN.test(color.trim()) ? color.trim() : null

  if (!safeColor) {
    return null
  }

  return (
    <span
      className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/80 shadow-sm ring-1 ring-black/10", className)}
      style={{ backgroundColor: safeColor }}
      aria-label={`${label}: ${safeColor}`}
      title={`${label}: ${safeColor}`}
      role="img"
    >
      <span className="sr-only">{`${label}: ${safeColor}`}</span>
    </span>
  )
}
