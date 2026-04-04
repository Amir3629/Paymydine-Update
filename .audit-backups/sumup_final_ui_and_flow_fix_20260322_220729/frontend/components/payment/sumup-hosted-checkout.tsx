"use client"

import React, { useMemo, useState } from "react"

type Props = {
  amount?: number
  currency?: string
  description?: string
  className?: string
}

export default function SumUpHostedCheckout(props: Props) {
  const [manualAmount, setManualAmount] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amount = useMemo(() => {
    if (typeof props.amount === "number" && props.amount > 0) return props.amount
    const n = Number((manualAmount || "").replace(",", "."))
    return !Number.isNaN(n) && n > 0 ? n : 0
  }, [props.amount, manualAmount])

  const currency = props.currency || "EUR"
  const description = props.description || "PayMyDine SumUp hosted checkout"

  async function handlePay() {
    try {
      setLoading(true)
      setError(null)

      const res = await fetch("/api/v1/payments/sumup/create-hosted-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          amount,
          currency,
          description,
          redirect_url: window.location.href,
        }),
      })

      const json = await res.json().catch(() => ({}))
      const hostedUrl =
        json?.hosted_checkout_url ||
        json?.data?.hosted_checkout_url ||
        null

      if (!res.ok || !json?.success || !hostedUrl) {
        throw new Error(json?.error || "Could not create SumUp hosted checkout")
      }

      window.location.href = hostedUrl
    } catch (e: any) {
      setError(e?.message || "Failed to start SumUp checkout")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={props.className || "w-full"}>
      <div
        data-pmd-sumup-checkout="1"
        className="w-full rounded-3xl border p-5 mt-4 space-y-4"
        style={{ borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.03)" }}
      >
        <div className="flex items-center gap-4">
          <img
            src="/images/payments/sumup_dark.svg"
            alt="SumUp"
            className="h-14 w-auto object-contain"
          />
          <div>
            <div className="text-lg font-semibold">Pay with SumUp</div>
            <div className="text-sm opacity-80">
              You will continue on SumUp secure hosted checkout.
            </div>
          </div>
        </div>

        {!props.amount ? (
          <div className="space-y-2">
            <label className="block text-sm opacity-80">Amount</label>
            <input
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder="29.90"
              className="w-full rounded-2xl border px-4 py-3 bg-transparent"
            />
          </div>
        ) : (
          <div className="text-base">
            Amount: <strong>{currency} {amount.toFixed(2)}</strong>
          </div>
        )}

        {error ? (
          <div className="text-sm" style={{ color: "#ff8b8b" }}>
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handlePay}
          disabled={loading || amount <= 0}
          className="w-full rounded-2xl px-4 py-3 font-semibold border disabled:opacity-50"
        >
          {loading ? "Opening SumUp..." : "Pay with SumUp"}
        </button>
      </div>
    </div>
  )
}
