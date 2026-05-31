import type { ReactNode } from "react"

export function CustomerShell({ children }: { children: ReactNode }) {
  return (
    <div data-pmd-customer-app="gold-v1" className="pmd-customer-shell">
      {children}
    </div>
  )
}
