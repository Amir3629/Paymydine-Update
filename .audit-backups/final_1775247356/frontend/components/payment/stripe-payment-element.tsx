"use client"

import { useEffect, useMemo, useState } from "react"
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { Button } from "@/components/ui/button"
import { AlertCircle, Lock } from "lucide-react"

type Props = {
  paymentData: any
  preferredMethod: "card" | "paypal" | "apple_pay" | "google_pay"
  onSuccess: (paymentIntentId: string) => void
  onError: (msg: string) => void
}

export default function StripePaymentElementBox({
  paymentData,
  preferredMethod,
  onSuccess,
  onError,
}: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setErr(null)
    setClientSecret(null)

    fetch("/api/v1/payments/stripe/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...paymentData,
        preferredMethod, // فقط hint برای ترتیب نمایش
      }),
    })
      .then(async (r) => {
        const j = await r.json()
        if (!r.ok || !j?.success) throw new Error(j?.error || "Failed to create payment intent")
        return j
      })
      .then((j) => {
        if (!cancelled) setClientSecret(j.clientSecret)
      })
      .catch((e) => {
        if (!cancelled) {
          const m = e?.message || "Failed to create payment intent"
          setErr(m)
          onError(m)
        }
      })

    return () => {
      cancelled = true
    }
  }, [paymentData?.amount, paymentData?.items?.length, preferredMethod])

  const paymentElementOptions = useMemo(() => {
    const order =
      preferredMethod === "paypal"
        ? ["paypal", "card"]
        : preferredMethod === "apple_pay"
          ? ["apple_pay", "card", "paypal"]
          : preferredMethod === "google_pay"
            ? ["google_pay", "card", "paypal"]
            : ["card", "apple_pay", "google_pay", "paypal"]

    return {
      layout: "tabs" as const,
      paymentMethodOrder: order,
    }
  }, [preferredMethod])

  const handlePay = async () => {
    if (!stripe || !elements || !clientSecret) return
    setLoading(true)
    setErr(null)

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.href,
        },
        redirect: "if_required",
      })

      if (error) throw new Error(error.message || "Payment failed")

      if (paymentIntent?.id) {
        onSuccess(paymentIntent.id)
        return
      }

      throw new Error("Payment not completed")
    } catch (e: any) {
      const m = e?.message || "Payment failed"
      setErr(m)
      onError(m)
    } finally {
      setLoading(false)
    }
  }

  if (!clientSecret) {
    return (
      <div className="text-sm text-slate-600">
        {err ? (
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            {err}
          </div>
        ) : (
          "در حال آماده‌سازی پرداخت..."
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <PaymentElement options={paymentElementOptions} />
      {err && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          {err}
        </div>
      )}
      <Button onClick={handlePay} disabled={!stripe || loading} className="w-full">
        <span className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {loading ? "در حال پردازش..." : `پرداخت ${Number(paymentData?.amount || 0).toFixed(2)}`}
        </span>
      </Button>
    </div>
  )
}
