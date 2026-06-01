import type { HTMLAttributes, ReactNode } from "react"

type CustomerCardProps = HTMLAttributes<HTMLDivElement> & {
  soft?: boolean
  children: ReactNode
}

export function CustomerCard({ soft = false, className = "", children, ...props }: CustomerCardProps) {
  return (
    <div className={["pmd-customer-card", soft ? "pmd-customer-card--soft" : "", className].filter(Boolean).join(" ")} {...props}>
      {children}
    </div>
  )
}
