import { createElement, type ElementType, type ReactNode } from "react"

export type ThemeMenuSectionProps = {
  as?: ElementType
  className?: string
  children?: ReactNode
  [key: string]: any
}

export function ThemeMenuSection({ as, className, children, ...props }: ThemeMenuSectionProps) {
  return createElement(
    as ?? "section",
    {
      ...props,
      className,
    },
    children,
  )
}
