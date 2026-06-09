"use client"

import { createElement, type ButtonHTMLAttributes, type ElementType, type MouseEventHandler, type ReactNode } from "react"

export type ThemeActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "disabled" | "onClick" | "type"> & {
  as?: ElementType
  children?: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  "aria-label"?: string
  disabled?: boolean
  className?: string
  type?: "button" | "submit" | "reset"
  [key: string]: any
}

export function ThemeActionButton({
  as,
  children,
  onClick,
  "aria-label": ariaLabel,
  disabled = false,
  className,
  type = "button",
  ...buttonProps
}: ThemeActionButtonProps) {
  return createElement(
    as ?? "button",
    {
      ...buttonProps,
      type,
      "aria-label": ariaLabel,
      disabled,
      className,
      onClick,
    },
    children,
  )
}
