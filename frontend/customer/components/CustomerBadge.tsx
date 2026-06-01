import type { HTMLAttributes, ReactNode } from "react"

export function CustomerBadge({ className = "", children, ...props }: HTMLAttributes<HTMLSpanElement> & { children: ReactNode }) {
  return <span className={["pmd-customer-badge", className].filter(Boolean).join(" ")} {...props}>{children}</span>
}
