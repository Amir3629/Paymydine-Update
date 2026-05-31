import { CustomerShell } from "./CustomerShell"
import type { CustomerPageType } from "../theme/themeTypes"

export function CustomerLoadingState({
  page = "menu",
  label = "Loading...",
  compact = false,
}: {
  page?: CustomerPageType
  label?: string
  compact?: boolean
}) {
  return (
    <CustomerShell page={page}>
      <main className="pmd-customer-shell__inner pmd-customer-loading-state">
        <div className={["pmd-customer-loading-card", compact ? "pmd-customer-loading-card--compact" : ""].filter(Boolean).join(" ")}>
          <span className="pmd-customer-loading-spinner" aria-hidden="true" />
          <p>{label}</p>
        </div>
      </main>
    </CustomerShell>
  )
}
