"use client"

import { useState } from "react"

type Props = {
  amount?: number
  currency?: string
  countryCode?: string
  className?: string
}

export default function WorldlineInlineGridButton({
  amount = 1,
  currency = "EUR",
  countryCode = "DE",
  className = "",
}: Props) {
  const [loading, setLoading] = useState(false)

  async function onClick() {
    try {
      setLoading(true)

      const amountMinor = Math.round(Number(amount || 0) * 100)
      if (!amountMinor || amountMinor <= 0) {
        alert("Worldline amount is invalid")
        setLoading(false)
        return
      }

      const res = await fetch("/api/v1/payments/worldline/create-hosted-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount_minor: amountMinor,
          currency,
          locale: "de_DE",
          country_code: countryCode,
          merchant_customer_id: `PMD-${Date.now()}`,
          return_url: `${window.location.origin}/worldline-return`,
        }),
      })

      const data = await res.json().catch(() => null)

      if (!res.ok || !data?.redirect_url) {
        throw new Error(data?.error || "Worldline checkout creation failed")
      }

      window.location.href = data.redirect_url
    } catch (e: any) {
      alert(e?.message || "Worldline error")
      setLoading(false)
    }
  }

  return (
    <div tabIndex={0} style={{ transform: "none" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className={`gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground px-4 py-2 h-14 w-20 surface-sub hover:opacity-90 shadow-sm flex items-center justify-center rounded-full ${className}`}
        title="Worldline"
      >
        <span className="text-xs font-semibold">Worldline</span>
      </button>
    </div>
  )
}
