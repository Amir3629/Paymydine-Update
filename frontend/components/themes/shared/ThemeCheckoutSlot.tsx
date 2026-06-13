import { createElement, type ElementType, type ReactNode } from "react"

export type ThemeCheckoutSlotProps = {
  as?: ElementType
  className?: string
  children?: ReactNode
  [key: string]: any
}

export function ThemeCheckoutSlot({ as, className, children, ...props }: ThemeCheckoutSlotProps) {
  return createElement(
    as ?? "div",
    {
      ...props,
      className,
    },
    children,
  )
}
