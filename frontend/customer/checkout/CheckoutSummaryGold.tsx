import type { CheckoutGoldTotalRow } from "./types"

export function CheckoutSummaryGold({ rows }: { rows: CheckoutGoldTotalRow[] }) {
  return (
    <div className="pmd-checkout-gold__card pmd-checkout-gold__card--soft pmd-checkout-gold__stack">
      {rows.map((row) => (
        <div key={row.label} className={row.strong ? "pmd-checkout-gold__total-row" : "pmd-checkout-gold__row"}>
          <span className={row.strong ? "" : "pmd-checkout-gold__muted"}>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
    </div>
  )
}
