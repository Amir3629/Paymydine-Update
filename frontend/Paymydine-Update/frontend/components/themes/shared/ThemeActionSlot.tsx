import { createElement, type ElementType, type ReactNode } from "react"

export type ThemeActionSlotProps = {
  as?: ElementType
  className?: string
  children?: ReactNode
  [key: string]: any
}

export function ThemeActionSlot({ as, className, children, ...props }: ThemeActionSlotProps) {
  return createElement(
    as ?? "div",
    {
      ...props,
      className,
    },
    children,
  )
}
