"use client"

import React, { useEffect, useMemo, useState } from "react"

type Props = {
  amount?: number
  currency?: string
  description?: string
  className?: string
}

function detectAmountFromDom(): number | null {
  if (typeof window === "undefined") return null
  const body = document.body?.innerText || ""
  const matches = [...body.matchAll(/[€$£]\s?(\d+[.,]\d{2})/g)]
    .map((m) => Number((m[1] || "").replace(",", ".")))
    .filter((n) => !Number.isNaN(n) && n > 0)

  return matches.length ? Math.max(...matches) : null
}

export default function SumUpHostedCheckout(props: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [domAmount, setDomAmount] = useState<number | null>(null)
  const [manualAmount, setManualAmount] = useState("")

  useEffect(() => {
    if (!props.amount) {
      const found = detectAmountFromDom()
      if (found) setDomAmount(found)
    }
  }, [props.amount])

  const amount = useMemo(() => {
    if (typeof props.amount === "number" && props.amount > 0) return props.amount
    if (domAmount && domAmount > 0) return domAmount
    const n = Number((manualAmount || "").replace(",", "."))
    return !Number.isNaN(n) && n > 0 ? n : 0
  }, [props.amount, domAmount, manualAmount])

  const currency = props.currency || "EUR"
  const description = props.description || "PayMyDine SumUp checkout"

  async function handleStart() {
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
        throw new Error(json?.error || "Could not create SumUp checkout")
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
      <div className="rounded-2xl border border-white/10 p-4 space-y-4">
        <div className="flex items-center gap-3">
          <img
            src="/images/payments/sumup_dark.svg"
            alt="SumUp"
            className="h-12 w-auto object-contain"
          />
          <div>
            <div className="text-base font-semibold">Pay with SumUp</div>
            <div className="text-sm opacity-70">
              You will be redirected to SumUp secure checkout.
            </div>
          </div>
        </div>

        {amount > 0 ? (
          <div className="text-sm">
            Amount: <strong>{currency} {amount.toFixed(2)}</strong>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm opacity-80">Amount</label>
            <input
              value={manualAmount}
              onChange={(e) => setManualAmount(e.target.value)}
              placeholder="29.90"
              className="w-full rounded-xl border px-3 py-2 bg-transparent"
            />
          </div>
        )}

        {error ? <div className="text-sm text-red-400">{error}</div> : null}

        <button
          type="button"
          onClick={handleStart}
          disabled={loading || amount <= 0}
          className="w-full rounded-2xl px-4 py-3 font-semibold border disabled:opacity-50"
        >
          {loading ? "Opening SumUp..." : "Pay with SumUp"}
        </button>
      </div>
    </div>
  )
}
