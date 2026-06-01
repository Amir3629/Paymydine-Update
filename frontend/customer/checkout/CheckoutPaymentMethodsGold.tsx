import type { CheckoutGoldPaymentMethod } from "./types"

type CheckoutPaymentMethodsGoldProps = {
  loading: boolean
  methods: CheckoutGoldPaymentMethod[]
  selectedMethod: string | null
  onSelect: (code: string) => void
}

export function CheckoutPaymentMethodsGold({ loading, methods, selectedMethod, onSelect }: CheckoutPaymentMethodsGoldProps) {
  return (
    <section className="pmd-checkout-gold__card pmd-checkout-gold__stack">
      <h3 className="pmd-checkout-gold__section-title">Payment methods</h3>
      {loading ? (
        <p className="pmd-checkout-gold__muted">Loading payment methods...</p>
      ) : methods.length === 0 ? (
        <p className="pmd-checkout-gold__muted">No payment methods available.</p>
      ) : (
        <div className="pmd-checkout-gold__method-grid">
          {methods.map((method) => (
            <button
              key={method.code}
              type="button"
              className="pmd-checkout-gold__method"
              aria-pressed={selectedMethod === method.code}
              onClick={() => onSelect(method.code)}
            >
              {method.imageSrc ? (
                <img src={method.imageSrc} alt={method.name} width={method.imageWidth || 44} height={method.imageHeight || 26} />
              ) : (
                <span>{method.name}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  )
}
