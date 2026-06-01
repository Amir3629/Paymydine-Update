import { CustomerButton } from "../components/CustomerButton"
import type { CheckoutFlowGoldProps } from "./types"

export function CheckoutSplitBillGold(props: CheckoutFlowGoldProps) {
  const split = props.split
  const isReview = props.step === "split-review"

  return (
    <div className="pmd-checkout-gold">
      <section className="pmd-checkout-gold__card pmd-checkout-gold__stack">
        <div className="pmd-checkout-gold__row">
          <div>
            <h3 className="pmd-checkout-gold__section-title">{isReview ? "Review split" : "Split bill"}</h3>
            <p className="pmd-checkout-gold__muted">Split total: {split.grandTotal}</p>
          </div>
          <span className="pmd-customer-badge">{split.guestCount} guests</span>
        </div>

        {!isReview ? (
          <>
            <div className="pmd-checkout-gold__actions">
              <CustomerButton variant={split.method === "equal" ? "primary" : "secondary"} onClick={() => props.onSplitMethod("equal")}>Equal</CustomerButton>
              <CustomerButton variant={split.method === "items" ? "primary" : "secondary"} onClick={() => props.onSplitMethod("items")}>By item</CustomerButton>
              <CustomerButton variant={split.method === "shares" ? "primary" : "secondary"} onClick={() => props.onSplitMethod("shares")}>By share</CustomerButton>
            </div>
            <div className="pmd-checkout-gold__row">
              <CustomerButton variant="secondary" onClick={() => props.onSplitGuestCountChange(Math.max(2, split.guestCount - 1))}>− Guest</CustomerButton>
              <strong>{split.guestCount}</strong>
              <CustomerButton variant="secondary" onClick={() => props.onSplitGuestCountChange(Math.min(10, split.guestCount + 1))}>+ Guest</CustomerButton>
            </div>
            {split.method === "items" && split.sourceItems ? (
              <div className="pmd-checkout-gold__stack">
                {split.sourceItems.map((item) => (
                  <div key={item.key} className="pmd-checkout-gold__item">
                    <div><strong>{item.name}</strong><div className="pmd-checkout-gold__muted">{item.value}</div></div>
                    <select className="pmd-customer-select" value={item.assignedGuestIndex ?? ""} onChange={(event) => props.onAssignSplitItem?.(item.key, event.target.value === "" ? null : Number(event.target.value))}>
                      <option value="">Assign</option>
                      {Array.from({ length: split.guestCount }, (_, idx) => <option key={idx} value={idx}>Guest {idx + 1}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            ) : null}
            {split.method === "shares" && split.sharePercents ? (
              <div className="pmd-checkout-gold__stack">
                {split.sharePercents.map((percent, idx) => (
                  <label key={idx} className="pmd-checkout-gold__card pmd-checkout-gold__card--soft">
                    <div className="pmd-checkout-gold__row"><span>Guest {idx + 1}</span><strong>{percent}%</strong></div>
                    <input type="range" min="0" max="100" step="1" value={percent} onChange={(event) => props.onSharePercentChange?.(idx, Number(event.target.value))} />
                  </label>
                ))}
                <span className="pmd-customer-badge">{split.sharePercentTotal === 100 ? "100% ready" : `${split.sharePercentTotal || 0}% assigned`}</span>
              </div>
            ) : null}
            <CustomerButton variant="primary" disabled={!split.canReview} onClick={props.onGoToSplitReview}>Review split</CustomerButton>
          </>
        ) : null}
      </section>

      {isReview ? (
        <section className="pmd-checkout-gold__split-grid">
          {split.people.map((person) => (
            <div key={person.id} className="pmd-checkout-gold__split-person pmd-checkout-gold__stack">
              <div className="pmd-checkout-gold__row">
                <div className="pmd-checkout-gold__heading-inline"><span className="pmd-checkout-gold__status-icon">{person.avatar || person.name.slice(0, 1)}</span><strong>{person.name}</strong></div>
                <span className="pmd-customer-badge">{person.status || "Pending"}</span>
              </div>
              {(person.items || []).map((item, idx) => <div key={idx} className="pmd-checkout-gold__row pmd-checkout-gold__muted"><span>{item.name}</span><span>{item.value}</span></div>)}
              <div className="pmd-checkout-gold__total-row"><span>Total</span><span>{person.total}</span></div>
              {person.selected ? (
                <CustomerButton variant="primary" onClick={props.onPaySelectedSplitPerson}>Pay my share</CustomerButton>
              ) : (
                <CustomerButton variant="secondary" onClick={() => props.onSelectSplitPerson(person.id)}>Select payer</CustomerButton>
              )}
            </div>
          ))}
          <div className="pmd-checkout-gold__actions">
            <CustomerButton variant="secondary" onClick={props.onSendPaymentLinks}>Send payment link to others</CustomerButton>
            <CustomerButton variant="secondary" onClick={props.onShowSplitQr}>Show QR/share link</CustomerButton>
          </div>
        </section>
      ) : null}
    </div>
  )
}
