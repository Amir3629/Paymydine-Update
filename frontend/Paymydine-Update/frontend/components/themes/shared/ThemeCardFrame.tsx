import { createElement, type ElementType, type ReactNode } from "react"

export type ThemeCardFrameProps = {
  as?: ElementType
  className?: string
  children?: ReactNode
  [key: string]: any
}

export function ThemeCardFrame({ as, className, children, ...props }: ThemeCardFrameProps) {
  return createElement(
    as ?? "div",
    {
      ...props,
      className,
    },
    children,
  )
}
