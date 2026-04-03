"use client"

import { useState } from "react"

type Props = {
  amount: number
  currency?: string
  countryCode?: string
  buttonLabel?: string
  className?: string
  merchantCustomerId?: string
  returnUrl?: string
}

export default function WorldlineHostedCheckout({
  amount,
  currency = "EUR",
  countryCode = "DE",
  buttonLabel = "Pay with Worldline",
  className = "",
  merchantCustomerId,
  returnUrl,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handlePay() {
    try {
      setLoading(true)
      setError("")

      const amountMinor = Math.round(Number(amount || 0) * 100)

      if (!amountMinor || amountMinor <= 0) {
        throw new Error("Invalid amount")
      }

      const lang = (typeof navigator !== "undefined" && navigator.language) ? navigator.language : "de-DE"
      const locale = lang.replace("-", "_")
      const finalReturnUrl =
        returnUrl ||
        `${window.location.origin}/worldline-return`

      const res = await fetch("/api/v1/payments/worldline/create-hosted-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_minor: amountMinor,
          currency,
          locale,
          country_code: countryCode,
          merchant_customer_id:
            merchantCustomerId || `PMD-${Date.now()}`,
          return_url: finalReturnUrl,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.redirect_url) {
        throw new Error(data?.error || "Worldline checkout creation failed")
      }

      window.location.href = data.redirect_url
    } catch (e: any) {
      setError(e?.message || "Worldline payment failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className={
          className ||
          "w-full rounded-xl px-4 py-3 font-semibold border border-white/10 bg-white text-black hover:opacity-90 disabled:opacity-60"
        }
      >
        {loading ? "Redirecting to Worldline..." : buttonLabel}
      </button>

      {error ? (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      ) : null}
    </div>
  )
}
