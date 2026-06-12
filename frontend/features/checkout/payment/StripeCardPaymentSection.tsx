"use client"

import { Elements } from "@stripe/react-stripe-js"
import type { Stripe } from "@stripe/stripe-js"
import { AlertCircle } from "lucide-react"
import { StripeCardForm } from "@/components/payment/secure-payment-form"
import type { PaymentData, PaymentResult } from "@/lib/payment-service"

type StripeCardPaymentSectionProps = {
  methodName?: string | null
  stripeConfigError?: string | null
  stripePromise: PromiseLike<Stripe | null> | null
  cardEnabled: boolean
  paymentData: PaymentData
  onPaymentSuccess: (transactionId: string) => void
  onPaymentError: (message: string) => void
}

export function StripeCardPaymentSection({
  methodName,
  stripeConfigError,
  stripePromise,
  cardEnabled,
  paymentData,
  onPaymentSuccess,
  onPaymentError,
}: StripeCardPaymentSectionProps) {
  return (
    <div className="space-y-3 overflow-hidden">
      <div className="mb-4">
        <span className="font-semibold text-paydine-elegant-gray">{methodName || "Card Payment"}</span>
      </div>

      {stripeConfigError && (
        <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-3">
          <p className="text-xs text-red-300">{stripeConfigError}</p>
        </div>
      )}

      {!stripeConfigError && !stripePromise && (
        <div className="py-2 text-xs text-paydine-elegant-gray/70">
          Loading Stripe...
        </div>
      )}

      {cardEnabled && stripePromise && (
        <Elements stripe={stripePromise}>
          <StripeCardForm
            paymentData={paymentData}
            onPaymentComplete={(result: PaymentResult) => {
              if (result?.success && result?.transactionId) {
                onPaymentSuccess(result.transactionId)
              }
            }}
            onPaymentError={onPaymentError}
          />
        </Elements>
      )}

      {!cardEnabled && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-50 p-3 text-xs text-amber-800">
          <span className="inline-flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Stripe card checkout is not enabled for this restaurant.
          </span>
        </div>
      )}
    </div>
  )
}
