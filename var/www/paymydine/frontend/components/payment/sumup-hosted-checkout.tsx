"use client"

import { useState } from "react"

type Props = {
  amount?: number
  orderId?: number | string | null
  orderType?: string
  successUrl?: string
  cancelUrl?: string
}

export default function SumUpHostedCheckout(props: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCheckout() {
    try {
      setLoading(true)
      setError(null)

      const payload = {
        order_id: props.orderId ?? null,
        order_type: props.orderType ?? "delivery",
        success_url: props.successUrl ?? `${window.location.origin}/order-placed`,
        cancel_url: props.cancelUrl ?? `${window.location.origin}/menu`,
      }

      console.log("[PMD-SUMUP] create-checkout payload", payload)

      const res = await fetch("/api/v1/payments/sumup/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const raw = await res.text()
      let json: any = null

      try {
        json = JSON.parse(raw)
      } catch {
        json = { raw }
      }

      console.log("[PMD-SUMUP] create-checkout response", {
        status: res.status,
        ok: res.ok,
        json,
      })

      if (!res.ok) {
        throw new Error(json?.message || json?.error || `HTTP ${res.status}`)
      }

      const redirectUrl =
        json?.redirect_url ||
        json?.checkout_url ||
        json?.data?.redirect_url ||
        json?.data?.checkout_url ||
        json?.data?.hosted_checkout_url ||
        json?.hosted_checkout_url

      if (!redirectUrl) {
        throw new Error("No SumUp redirect URL returned from backend")
      }

      window.location.href = redirectUrl
    } catch (e: any) {
      console.error("[PMD-SUMUP] checkout failed", e)
      setError(e?.message || "SumUp checkout failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      data-pmd-sumup-checkout="1"
      className="w-full mt-4 rounded-3xl border p-4 sm:p-5"
      style={{
        borderColor: "var(--theme-border)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <img
          src="/images/payments/sumup_dark.svg"
          alt="SumUp"
          className="object-contain"
          style={{
            width: "140px",
            height: "40px",
            maxWidth: "100%",
          }}
        />
        <div>
          <div className="text-sm font-semibold">پرداخت با SumUp</div>
          <div className="text-xs opacity-80">
            با زدن دکمه، به صفحه امن SumUp منتقل می‌شوی.
          </div>
        </div>
      </div>

      {error ? (
        <div
          className="mb-3 rounded-2xl px-3 py-2 text-sm"
          style={{
            background: "rgba(255,0,0,0.08)",
            color: "#ff6b6b",
          }}
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        className="w-full rounded-2xl px-4 py-3 font-semibold transition"
        style={{
          background: "var(--theme-payment-button, var(--theme-primary))",
          color: "var(--theme-background, #111)",
          opacity: loading ? 0.7 : 1,
          cursor: loading ? "not-allowed" : "pointer",
        }}
      >
        {loading ? "در حال انتقال به SumUp..." : "Pay with SumUp"}
      </button>
    </div>
  )
}
