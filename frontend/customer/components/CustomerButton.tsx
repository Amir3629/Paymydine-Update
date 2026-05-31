import type { ButtonHTMLAttributes, ReactNode } from "react"

type CustomerButtonVariant = "primary" | "secondary" | "ghost"

type CustomerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: CustomerButtonVariant
  children: ReactNode
}

export function CustomerButton({ variant = "secondary", className = "", children, ...props }: CustomerButtonProps) {
  return (
    <button className={["pmd-customer-button", `pmd-customer-button--${variant}`, className].filter(Boolean).join(" ")} {...props}>
      {children}
    </button>
  )
}
