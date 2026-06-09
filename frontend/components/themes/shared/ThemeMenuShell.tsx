import { createElement, type ElementType, type ReactNode } from "react"

export type ThemeMenuShellProps = {
  as?: ElementType
  className?: string
  children?: ReactNode
  [key: string]: any
}

export function ThemeMenuShell({ as, className, children, ...props }: ThemeMenuShellProps) {
  return createElement(
    as ?? "div",
    {
      ...props,
      className,
    },
    children,
  )
}
