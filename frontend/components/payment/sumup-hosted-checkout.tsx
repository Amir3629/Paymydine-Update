"use client"

import { useEffect, useMemo, useRef, useState } from "react"

declare global {
  interface Window {
    SumUpCard?: {
      mount: (config: Record<string, any>) => void
    }
  }
}

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
  const [widgetCheckoutId, setWidgetCheckoutId] = useState<string | null>(null)
  const widgetMountedRef = useRef(false)
  const checkoutStartedRef = useRef(false)
  const widgetContainerId = useMemo(
    () => `sumup-card-${Math.random().toString(36).slice(2, 10)}`,
    []
  )

  async function reportWidgetEvent(checkoutId: string, eventType: string, eventBody?: any) {
    try {
      await fetch("/api/v1/payments/sumup/widget-event", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          checkout_id: checkoutId,
          event_type: eventType,
          event_body: eventBody ?? null,
          event_meta: {
            origin: window.location.origin,
            pathname: window.location.pathname,
          },
        }),
      })
    } catch (e) {
      console.warn("[PMD-SUMUP] widget-event logging failed", e)
    }
  }

  async function verifyCheckoutStatus(checkoutId: string) {
    const res = await fetch("/api/v1/payments/sumup/checkout-status", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ checkout_id: checkoutId }),
    })
    const data = await res.json().catch(() => null)
    return { ok: res.ok, data }
  }

  async function ensureWidgetScriptLoaded() {
    if (window.SumUpCard?.mount) return
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-pmd-sumup-sdk="1"]'
    )
    if (existing) {
      await new Promise<void>((resolve, reject) => {
        const done = () => resolve()
        existing.addEventListener("load", done, { once: true })
        existing.addEventListener("error", () => reject(new Error("SumUp SDK failed to load")), {
          once: true,
        })
        setTimeout(done, 1200)
      })
      return
    }
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script")
      script.src = "https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js"
      script.async = true
      script.defer = true
      script.dataset.pmdSumupSdk = "1"
      script.onload = () => resolve()
      script.onerror = () => reject(new Error("SumUp SDK failed to load"))
      document.head.appendChild(script)
    })
  }

  async function mountWidget(checkoutId: string) {
    if (widgetMountedRef.current) return
    await ensureWidgetScriptLoaded()
    if (!window.SumUpCard?.mount) {
      throw new Error("SumUp Payment Widget is unavailable")
    }

    widgetMountedRef.current = true
    console.info("[PMD-SUMUP] widget mount start", { checkoutId, containerId: widgetContainerId })
    await reportWidgetEvent(checkoutId, "widget_mount_start")

    window.SumUpCard.mount({
      id: widgetContainerId,
      checkoutId,
      onResponse: async (type: string, body: any) => {
        const normalizedType = String(type || "").toLowerCase()
        console.log("[PMD-SUMUP] widget response", { type: normalizedType, body })
        await reportWidgetEvent(checkoutId, normalizedType || "unknown", body)

        if (normalizedType === "sent") {
          console.info("[PMD-SUMUP] widget submit sent", { checkoutId })
          return
        }
        if (normalizedType === "auth-screen") {
          console.info("[PMD-SUMUP] widget auth screen", { checkoutId })
          return
        }
        if (normalizedType === "invalid") {
          console.warn("[PMD-SUMUP] widget invalid form", { checkoutId, body })
          setError("Please review the card form fields.")
          return
        }

        if (["success", "fail", "error"].includes(normalizedType)) {
          if (normalizedType === "error") {
            console.error("[PMD-SUMUP] widget error callback", { checkoutId, body })
          } else {
            console.info("[PMD-SUMUP] widget terminal callback", { checkoutId, type: normalizedType })
          }
          const verify = await verifyCheckoutStatus(checkoutId)
          const isPaid = verify.ok && !!verify.data?.is_paid
          if (isPaid) {
            const successTarget = props.successUrl ?? `${window.location.origin}/order-placed`
            window.location.href = successTarget
            return
          }

          if (normalizedType === "fail") {
            setError("Payment was cancelled or failed. Please try again.")
          } else {
            setError(
              verify?.data?.error ||
                "Payment could not be confirmed. Please retry your payment."
            )
          }
        }
      },
    })
    console.info("[PMD-SUMUP] widget mount success", { checkoutId, containerId: widgetContainerId })
  }

  async function handleCheckout() {
    if (checkoutStartedRef.current || loading || widgetCheckoutId) return
    checkoutStartedRef.current = true
    try {
      setLoading(true)
      setError(null)
      console.info("[PMD-SUMUP] checkout init trigger")

      const payload = {
        amount: props.amount,
        currency: props.currency,
        order_id: props.orderId ?? null,
        order_type: props.orderType ?? "guest",
        description: props.description ?? "PayMyDine SumUp checkout",
        return_url: props.successUrl ?? `${window.location.origin}/order-placed`,
        cancel_url: props.cancelUrl ?? `${window.location.origin}/menu`,
      }

      console.log("[PMD-SUMUP] create-checkout payload", payload)

      const res = await fetch("/api/v1/payments/card/create-session", {
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

      const success = json?.success === true
      const redirectUrl =
        json?.redirect_url ||
        json?.hosted_checkout_url ||
        json?.checkout_url ||
        json?.data?.redirect_url ||
        json?.data?.hosted_checkout_url ||
        json?.data?.checkout_url

      if (success && redirectUrl) {
        window.location.href = String(redirectUrl)
        return
      }

      if (success && json?.checkout_id) {
        const checkoutId = String(json.checkout_id)
        if (typeof window !== "undefined") {
          localStorage.setItem("pmd_sumup_pending_checkout", JSON.stringify({
            checkout_id: checkoutId,
            created_at: Date.now(),
          }))
        }
        setWidgetCheckoutId(checkoutId)
        await mountWidget(checkoutId)
        return
      }

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

  useEffect(() => {
    if (widgetCheckoutId || loading) return
    void handleCheckout()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetCheckoutId, loading])

  return (
    <div
      data-pmd-sumup-checkout="1"
      className={`w-full rounded-xl border p-2 sm:p-3 ${props.className ?? ""}`}
      style={{
        borderColor: "var(--theme-border)",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <div className="mb-2">
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
        <div className="text-sm font-semibold mt-1">Secure card payment</div>
        <div className="text-xs opacity-80">Your payment is processed securely by SumUp.</div>
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

      <div
        id={widgetContainerId}
        className={widgetCheckoutId ? "min-h-[420px] sm:min-h-[460px]" : "hidden"}
      />
    </div>
  )
}
