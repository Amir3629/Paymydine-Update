"use client"

import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

export function ActionTooltip({
  label,
  children,
  position = "top",
}: {
  label: string
  children: ReactNode
  position?: "top" | "bottom"
}) {
  const posClass =
    position === "bottom"
      ? "top-full mt-2"
      : "bottom-full mb-2"

  return (
    <span className="relative inline-flex group/action-tooltip">
      {children}
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium",
          "bg-black/55 text-white backdrop-blur-md ring-1 ring-white/30",
          "opacity-0 translate-y-1 transition-all duration-200 ease-out",
          "group-hover/action-tooltip:opacity-100 group-hover/action-tooltip:translate-y-0",
          "group-focus-within/action-tooltip:opacity-100 group-focus-within/action-tooltip:translate-y-0",
          posClass,
        )}
      >
        {label}
      </span>
    </span>
  )
}
