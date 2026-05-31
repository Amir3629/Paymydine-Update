import { CustomerButton } from "../components/CustomerButton"
import { CustomerInput } from "../components/CustomerInput"
import type { CheckoutFlowGoldProps } from "./types"
import { CheckoutPaymentMethodsGold } from "./CheckoutPaymentMethodsGold"
import { CheckoutSummaryGold } from "./CheckoutSummaryGold"

export function CheckoutPaymentGold(props: CheckoutFlowGoldProps) {
  const payment = props.payment
  return (
    <div className="pmd-checkout-gold">
      <section className="pmd-checkout-gold__card pmd-checkout-gold__stack">
        <div className="pmd-checkout-gold__row">
          <div>
            <h3 className="pmd-checkout-gold__section-title">{payment.compactTitle}</h3>
            <p className="pmd-checkout-gold__muted">Choose a payment method and confirm securely.</p>
          </div>
          <strong>{payment.total}</strong>
        </div>
      </section>

      <CheckoutSummaryGold rows={payment.subtotalRows} />

      {payment.tipEnabled ? (
        <section className="pmd-checkout-gold__card pmd-checkout-gold__stack">
          <h3 className="pmd-checkout-gold__section-title">Tip</h3>
          <div className="pmd-checkout-gold__tip-grid">
            {payment.tipPercentages.map((value) => (
              <CustomerButton key={value} type="button" variant={payment.selectedTipPercentage === value && !payment.customTip ? "primary" : "secondary"} onClick={() => props.onTipPercentage(value)}>
                {value}%
              </CustomerButton>
            ))}
            <CustomerInput type="number" placeholder="Custom" value={payment.customTip} onChange={(event) => props.onCustomTipChange(event.target.value)} />
          </div>
        </section>
      ) : null}

      <section className="pmd-checkout-gold__card pmd-checkout-gold__stack">
        <h3 className="pmd-checkout-gold__section-title">Coupon</h3>
        {payment.appliedCouponLabel ? (
          <div className="pmd-checkout-gold__row">
            <span>{payment.appliedCouponLabel}</span>
            <CustomerButton type="button" variant="secondary" onClick={props.onRemoveCoupon}>Remove</CustomerButton>
          </div>
        ) : (
          <div className="pmd-checkout-gold__row">
            <CustomerInput value={payment.couponCode} placeholder="Coupon code" onChange={(event) => props.onCouponCodeChange(event.target.value.toUpperCase())} disabled={payment.couponLoading} />
            <CustomerButton type="button" variant="secondary" onClick={props.onApplyCoupon} disabled={payment.couponLoading || !payment.couponCode.trim()}>
              {payment.couponLoading ? "..." : "Apply"}
            </CustomerButton>
          </div>
        )}
        {payment.couponError ? <p className="pmd-checkout-gold__muted">{payment.couponError}</p> : null}
      </section>

      <CheckoutPaymentMethodsGold loading={payment.loadingMethods} methods={payment.methods} selectedMethod={payment.selectedMethod} onSelect={props.onSelectPaymentMethod} />

      {payment.selectedMethod ? (
        <section className="pmd-checkout-gold__provider">
          {payment.providerForm}
          {payment.fallbackPayButton}
        </section>
      ) : null}
    </div>
  )
}
