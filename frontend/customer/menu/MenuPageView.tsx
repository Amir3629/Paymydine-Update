import type { ReactNode } from "react"
import { CustomerShell } from "../components/CustomerShell"
import { CustomerTopBar } from "../components/CustomerTopBar"

export function MenuPageView({
  contextLabel = "Delivery",
  backHref = "/",
  children,
}: {
  title?: string
  subtitle?: string
  contextLabel?: string
  backHref?: string
  children: ReactNode
}) {
  return (
    <CustomerShell page="menu">
      <main className="pmd-customer-shell__inner pmd-customer-menu-page">
        <CustomerTopBar contextLabel={contextLabel} backHref={backHref} />
        {children}
      </main>
    </CustomerShell>
  )
}
