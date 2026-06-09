"use client"

import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react"

type ThemeActionButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "disabled" | "onClick" | "type"> & {
  children?: ReactNode
  onClick?: MouseEventHandler<HTMLButtonElement>
  "aria-label"?: string
  disabled?: boolean
  className?: string
  type?: "button" | "submit" | "reset"
}

export function ThemeActionButton({
  children,
  onClick,
  "aria-label": ariaLabel,
  disabled = false,
  className,
  type = "button",
  ...buttonProps
}: ThemeActionButtonProps) {
  return (
    <button
      {...buttonProps}
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      className={className}
      onClick={onClick}
    >
      {children}
    </button>
  )
}
