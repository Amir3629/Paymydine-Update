import { CustomerButton } from "../components/CustomerButton"
import type { CheckoutFlowGoldProps, CheckoutGoldItem } from "./types"
import { CheckoutSummaryGold } from "./CheckoutSummaryGold"

function ItemRow({ item }: { item: CheckoutGoldItem }) {
  return (
    <div className="pmd-checkout-gold__item">
      <div>
        <div className="pmd-checkout-gold__item-title">{item.quantity}× {item.name}</div>
        {item.subtitle ? <div className="pmd-checkout-gold__muted">{item.subtitle}</div> : null}
      </div>
      <strong>{item.total}</strong>
    </div>
  )
}

export function CheckoutMyOrderGold(props: CheckoutFlowGoldProps) {
  const isTableDraft = props.reviewMode === "table-draft"
  const primaryLabel = isTableDraft ? (props.submitDraftLoading ? "Sending..." : "Send to kitchen") : (props.isLoading ? "Confirming..." : "Confirm")
  const primaryAction = isTableDraft ? props.onSubmitTableDraft : props.onConfirmItems
  const disabled = isTableDraft ? !!props.submitDraftLoading || !!props.draftLoading || !props.canSubmitDraft : !!props.isLoading || !props.canConfirmItems
  const fallbackSubtotal = props.tableGroups && props.tableGroups.length > 0
    ? props.tableGroups.reduce((sum, group) => sum + group.items.reduce((itemSum, item) => itemSum + Number(item.amount || 0), 0), 0)
    : props.items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
  const displayedTotals = fallbackSubtotal > 0 && props.totals.every((row) => !row.strong || /0[,.]00/.test(row.value))
    ? props.totals.map((row) => row.strong || row.label.toLowerCase().includes("subtotal") ? { ...row, value: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(fallbackSubtotal) } : row)
    : props.totals

  return (
    <div className="pmd-checkout-gold">
      <section className="pmd-checkout-gold__card pmd-checkout-gold__stack">
        <div className="pmd-checkout-gold__row">
          <div>
            <h3 className="pmd-checkout-gold__section-title">{isTableDraft ? "Table Order" : "My Order"}</h3>
            <p className="pmd-checkout-gold__muted">{isTableDraft ? "Review the items sent for this table." : "Review your items before confirming."}</p>
          </div>
          <span className="pmd-customer-badge">{props.tableLabel}</span>
        </div>
        {props.tableGroups && props.tableGroups.length > 0 ? (
          <div className="pmd-checkout-gold__items">
            {props.tableGroups.map((group) => (
              <div key={group.id} className="pmd-checkout-gold__card pmd-checkout-gold__card--soft pmd-checkout-gold__stack">
                <div className="pmd-checkout-gold__row"><strong>{group.label}</strong><strong>{group.total}</strong></div>
                {group.items.map((item) => <ItemRow key={`${group.id}-${item.id}`} item={item} />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="pmd-checkout-gold__items">
            {props.items.length > 0 ? props.items.map((item) => <ItemRow key={item.id} item={item} />) : <p className="pmd-checkout-gold__muted">No items yet.</p>}
          </div>
        )}
      </section>
      <CheckoutSummaryGold rows={displayedTotals} />
      <div className="pmd-checkout-gold__actions">
        <CustomerButton variant="primary" onClick={primaryAction} disabled={disabled}>{primaryLabel}</CustomerButton>
        <CustomerButton variant="secondary" onClick={props.onClose}>Continue ordering</CustomerButton>
      </div>
      {props.reviewMode === "table-submitted" && props.onUseSubmittedOrder ? (
        <CustomerButton variant="secondary" onClick={props.onUseSubmittedOrder}>View order status</CustomerButton>
      ) : null}
    </div>
  )
}
