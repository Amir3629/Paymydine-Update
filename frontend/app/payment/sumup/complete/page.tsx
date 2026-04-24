"use client"

import { useEffect, useState } from "react"

export default function SumupHostedCompletePage() {
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(true)
  const [returnTo, setReturnTo] = useState("/menu")

  useEffect(() => {
    const run = async () => {
      try {
        if (typeof window === "undefined") return
        const params = new URLSearchParams(window.location.search)
        const checkoutIdFromQuery = String(params.get("checkout_id") || "").trim()
        const pendingRaw = localStorage.getItem("pmd_sumup_pending_checkout")
        let pending: any = null
        try {
          pending = pendingRaw ? JSON.parse(pendingRaw) : null
        } catch {
          pending = null
        }
        const checkoutId = checkoutIdFromQuery || String(pending?.checkout_id || "").trim()
        const fallbackReturn = String(pending?.return_to || "/menu")
        setReturnTo(fallbackReturn)

        console.info("SUMUP_HOSTED_CHECKOUT_RETURN", {
          checkout_id: checkoutId || null,
          return_to: fallbackReturn,
        })

        if (!checkoutId) {
          throw new Error("Missing checkout reference")
        }

        const res = await fetch("/api/v1/payments/sumup/checkout-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkout_id: checkoutId }),
        })
        const json = await res.json().catch(() => ({}))

        console.info("SUMUP_HOSTED_CHECKOUT_VERIFIED", {
          ok: res.ok,
          success: Boolean(json?.success),
          is_paid: Boolean(json?.is_paid),
          status: json?.status ?? null,
          checkout_id: checkoutId,
        })

        if (res.ok && json?.success && json?.is_paid) {
          const sep = fallbackReturn.includes("?") ? "&" : "?"
          window.location.href = `${fallbackReturn}${sep}payment_return_provider=sumup`
          return
        }

        setError(`Payment status is ${String(json?.status || "unknown")}. Please try again.`)
      } catch (e: any) {
        setError(e?.message || "Unable to verify SumUp payment.")
      } finally {
        setVerifying(false)
      }
    }

    void run()
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border p-4 space-y-3">
        <h1 className="text-lg font-semibold">Checking your payment…</h1>
        {verifying ? (
          <p className="text-sm opacity-80">Please wait while we verify your SumUp payment.</p>
        ) : error ? (
          <>
            <p className="text-sm text-red-500">{error}</p>
            <a className="text-sm underline" href={returnTo}>Return and retry payment</a>
          </>
        ) : null}
      </div>
    </main>
  )
}
