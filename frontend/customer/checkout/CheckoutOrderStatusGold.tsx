import { CustomerButton } from "../components/CustomerButton"
import type { CheckoutFlowGoldProps } from "./types"

export function CheckoutOrderStatusGold(props: CheckoutFlowGoldProps) {
  const status = props.orderStatus
  if (!status) return null

  return (
    <div className="pmd-checkout-gold">
      <section className="pmd-checkout-gold__card pmd-checkout-gold__stack">
        <div className="pmd-checkout-gold__status-head">
          <div className="pmd-checkout-gold__heading-inline">
            <span className="pmd-checkout-gold__status-icon">✓</span>
            <div>
              <h3 className="pmd-checkout-gold__section-title">{status.title}</h3>
              {status.description ? <p className="pmd-checkout-gold__muted">{status.description}</p> : null}
            </div>
          </div>
          {status.eta ? <span className="pmd-checkout-gold__eta">{status.eta}</span> : null}
        </div>
        <div className="pmd-checkout-gold__card pmd-checkout-gold__card--soft pmd-checkout-gold__stack">
          <div className="pmd-checkout-gold__row"><span className="pmd-checkout-gold__muted">Order</span><strong>{status.orderId ? `#${status.orderId}` : "In progress"}</strong></div>
          {status.paymentStatus ? <div className="pmd-checkout-gold__row"><span className="pmd-checkout-gold__muted">Payment</span><strong>{status.paymentStatus}</strong></div> : null}
          {status.settlementStatus ? <div className="pmd-checkout-gold__row"><span className="pmd-checkout-gold__muted">Settlement</span><strong>{status.settlementStatus}</strong></div> : null}
        </div>
      </section>

      <section className="pmd-checkout-gold__card pmd-checkout-gold__stack">
        <h3 className="pmd-checkout-gold__section-title">Order summary</h3>
        <div className="pmd-checkout-gold__items">
          {status.items.map((item) => (
            <div key={item.id} className="pmd-checkout-gold__item">
              <span>{item.quantity}× {item.name}</span>
              <strong>{item.total}</strong>
            </div>
          ))}
        </div>
        <div className="pmd-checkout-gold__total-row"><span>Total</span><span>{status.total}</span></div>
      </section>

      {status.isPaid ? (
        <div className="pmd-checkout-gold__actions pmd-checkout-gold__actions--single">
          <CustomerButton variant="secondary" onClick={props.onClose}>Back to menu</CustomerButton>
        </div>
      ) : (
        <div className="pmd-checkout-gold__actions">
          <CustomerButton variant="primary" onClick={props.onGoToPayment}>Pay in full</CustomerButton>
          <CustomerButton variant="secondary" onClick={props.onGoToSplit}>Split bill</CustomerButton>
          <CustomerButton variant="ghost" onClick={props.onClose}>Continue ordering</CustomerButton>
        </div>
      )}
    </div>
  )
}
