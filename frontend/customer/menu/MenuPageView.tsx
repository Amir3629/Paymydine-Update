import type { ReactNode } from "react"
import { CustomerShell } from "../components/CustomerShell"
import { CustomerHeader } from "../components/CustomerHeader"

export function MenuPageView({ title = "Menu", subtitle, children }: { title?: string; subtitle?: string; children: ReactNode }) {
  return (
    <CustomerShell page="menu">
      <main className="pmd-customer-shell__inner">
        <CustomerHeader eyebrow="PayMyDine" title={title} subtitle={subtitle} />
        {children}
      </main>
    </CustomerShell>
  )
}
