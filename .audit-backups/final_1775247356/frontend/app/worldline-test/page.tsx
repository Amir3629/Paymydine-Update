"use client"

import { useEffect, useState } from "react"
import WorldlineHostedCheckout from "@/components/payment/worldline-hosted-checkout"

export default function WorldlineTestPage() {
  const [diag, setDiag] = useState<any>(null)
  const [diagError, setDiagError] = useState("")

  useEffect(() => {
    let mounted = true

    fetch("/api/v1/payments/worldline/auth-diagnostic")
      .then(async (r) => {
        const j = await r.json().catch(() => null)
        if (!mounted) return
        if (!r.ok) throw new Error(j?.error || "Diagnostic failed")
        setDiag(j)
      })
      .catch((e: any) => {
        if (!mounted) return
        setDiagError(e?.message || "Diagnostic failed")
      })

    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold">Worldline Test Checkout</h1>

        <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
          <p className="text-sm opacity-80 mb-2">
            This page is only for safe browser-side testing of the Worldline hosted checkout flow.
          </p>

          {diagError ? (
            <p className="text-sm text-red-400">{diagError}</p>
          ) : (
            <pre className="text-xs overflow-auto whitespace-pre-wrap">
              {JSON.stringify(diag, null, 2)}
            </pre>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 p-4 bg-white/5 space-y-4">
          <p className="text-sm opacity-80">
            Test amount: <strong>1.00 EUR</strong>
          </p>

          <WorldlineHostedCheckout
            amount={1}
            currency="EUR"
            countryCode="DE"
            merchantCustomerId="PMD-MIMOZA-TEST"
            returnUrl={`${typeof window !== "undefined" ? window.location.origin : "https://mimoza.paymydine.com"}/worldline-return`}
            buttonLabel="Start Worldline Checkout Test"
          />
        </div>
      </div>
    </main>
  )
}
