"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  amount: number
  currency: string
  orderId?: number | string | null
  orderType?: string
  description?: string
  successUrl?: string
  cancelUrl?: string
  className?: string
}

export default function SumUpHostedCheckout(props: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        console.info("SUMUP_HOSTED_CHECKOUT_REDIRECT", { stage: "init" })

        const payload = {
          amount: props.amount,
          currency: props.currency,
          order_id: props.orderId ?? null,
          order_type: props.orderType ?? "guest",
          description: props.description ?? "PayMyDine SumUp hosted checkout",
          return_url: props.successUrl ?? `${window.location.origin}/payment/sumup/complete`,
          cancel_url: props.cancelUrl ?? `${window.location.origin}/menu`,
        }

        const res = await fetch("/api/v1/payments/card/create-session", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
          body: JSON.stringify(payload),
        })

        const json = await res.json().catch(() => null)
        if (!res.ok || !json?.success) {
          throw new Error(json?.message || json?.error || `HTTP ${res.status}`)
        }

        const redirectUrl = String(
          json?.redirect_url ||
          json?.hosted_checkout_url ||
          json?.checkout_url ||
          "",
        ).trim()
        const checkoutId = String(json?.checkout_id || "").trim()

        if (checkoutId && typeof window !== "undefined") {
          localStorage.setItem("pmd_sumup_pending_checkout", JSON.stringify({
            checkout_id: checkoutId,
            return_to: `${window.location.pathname}${window.location.search}`,
            created_at: Date.now(),
          }))
        }

        if (!redirectUrl) {
          throw new Error("No hosted checkout URL returned from SumUp")
        }

        console.info("SUMUP_HOSTED_CHECKOUT_REDIRECT", {
          stage: "redirect",
          checkout_id: checkoutId || null,
          has_redirect_url: true,
        })
        window.location.href = redirectUrl
      } catch (e: any) {
        console.error("SUMUP_HOSTED_CHECKOUT_REDIRECT", { stage: "error", message: e?.message || String(e) })
        setError(e?.message || "Unable to start SumUp hosted checkout")
      } finally {
        setLoading(false)
      }
    }

    void run()
  }, [props.amount, props.cancelUrl, props.currency, props.description, props.orderId, props.orderType, props.successUrl])

  return (
    <div
      data-pmd-sumup-hosted-checkout="1"
      className={`w-full rounded-xl border p-3 ${props.className ?? ""}`}
      style={{ borderColor: "var(--theme-border)", background: "rgba(255,255,255,0.04)" }}
    >
      <div className="text-sm font-semibold">Secure card payment</div>
      <div className="text-xs opacity-80">Redirecting to secure SumUp checkout…</div>
      {loading && <div className="text-xs mt-2 opacity-70">Preparing secure checkout…</div>}
      {error ? (
        <div className="mt-2 rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(255,0,0,0.08)", color: "#ff6b6b" }}>
          {error}
        </div>
      ) : null}
    </div>
  )
}
