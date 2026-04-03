"use client"

import React, { useState } from "react"

type Props = {
  amount?: number
  currency?: string
  description?: string
  className?: string
}

export default function SumUpHostedCheckout({
  amount,
  currency = "EUR",
  description = "PayMyDine SumUp hosted checkout",
  className = "",
}: Props) {
  const [manualAmount, setManualAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const finalAmount =
    typeof amount === "number" && amount > 0
      ? amount
      : Number((manualAmount || "").replace(",", ".")) || 0

  async function openCheckout() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/v1/payments/sumup/create-hosted-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          amount: finalAmount,
          currency,
          description,
          redirect_url: typeof window !== "undefined" ? window.location.href : "",
        }),
      })

      const json = await res.json().catch(() => ({}))
      const hostedUrl =
        json?.hosted_checkout_url ||
        json?.data?.hosted_checkout_url ||
        json?.checkout_url ||
        null

      if (!res.ok || !json?.success || !hostedUrl) {
        throw new Error(json?.error || "Could not create SumUp checkout")
      }

      window.location.href = hostedUrl
    } catch (e: any) {
      setError(e?.message || "Failed to open SumUp checkout")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`w-full ${className}`}>
      <div
        data-pmd-sumup-checkout="1"
        className="w-full mt-4 rounded-3xl border p-5 space-y-4"
        style={{
          borderColor: "var(--theme-border, rgba(255,255,255,0.2))",
          background: "rgba(255,255,255,0.04)",
        }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/images/payments/sumup_dark.svg"
            alt="SumUp"
            className="h-10 w-auto object-contain"
          />
          <div>
            <div className="text-base font-semibold">Pay with SumUp</div>
            <div className="text-xs opacity-80">
              Secure hosted checkout on SumUp
            </div>
          </div>
        </div>

        {typeof amount !== "number" || amount <= 0 ? (
          <div className="space-y-2">
            <div className="text-sm opacity-80">Amount</div>
            <input
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder="29.90"
              className="w-full rounded-2xl border px-4 py-3 bg-transparent"
              style={{ borderColor: "var(--theme-border, rgba(255,255,255,0.2))" }}
            />
          </div>
        ) : (
          <div className="text-sm">
            Amount: <strong>{currency} {finalAmount.toFixed(2)}</strong>
          </div>
        )}

        {error ? (
          <div className="text-sm" style={{ color: "#ff8b8b" }}>
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={openCheckout}
          disabled={loading || finalAmount <= 0}
          className="w-full rounded-2xl px-4 py-3 font-semibold border disabled:opacity-50"
          style={{
            borderColor: "var(--theme-border, rgba(255,255,255,0.2))",
            background: "var(--theme-payment-button, rgba(255,255,255,0.12))",
            color: "var(--theme-background, #111)",
          }}
        >
          {loading ? "Opening SumUp..." : "Pay with SumUp"}
        </button>
      </div>
    </div>
  )
}
