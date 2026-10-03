"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from "lucide-react"

type SafeStatus = {
  hosted_checkout_id?: string | null
  hosted_checkout_status?: string | null
  payment_id?: string | null
  payment_status?: string | null
}

export default function WorldlineReturnPage() {
  const [status, setStatus] = useState<SafeStatus | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  const queryString = useMemo(() => {
    if (typeof window === "undefined") return ""
    return window.location.search || ""
  }, [])

  const hostedCheckoutId = useMemo(() => {
    if (typeof window === "undefined") return ""
    return new URLSearchParams(window.location.search).get("hostedCheckoutId") || ""
  }, [])

  const paymentStatus = String(status?.payment_status || status?.hosted_checkout_status || "UNKNOWN").toUpperCase()
  const isPaid = ["PAID", "CAPTURED", "CAPTURE_REQUESTED"].includes(paymentStatus)
  const isFailed = ["REJECTED", "CANCELLED", "CANCELED", "REJECTED_CAPTURE"].includes(paymentStatus)
  const isTerminal = isPaid || isFailed

  useEffect(() => {
    let cancelled = false

    const verifyReturn = async () => {
      const response = await fetch(`/api/v1/payments/worldline/return${queryString}`, {
        cache: "no-store",
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok || !payload?.return_mac_verified) {
        throw new Error(payload?.error || "Worldline return authentication failed.")
      }
      return payload?.status_result || null
    }

    const fetchStatus = async () => {
      if (!hostedCheckoutId) return null
      const response = await fetch(`/api/v1/payments/worldline/status/${encodeURIComponent(hostedCheckoutId)}`, {
        cache: "no-store",
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.ok) {
        throw new Error(payload?.error || "Worldline status verification failed.")
      }
      return payload?.result || null
    }

    const run = async () => {
      try {
        setLoading(true)
        setError("")

        let current = await verifyReturn()
        if (cancelled) return
        setStatus(current)
        setAttempt(1)

        for (let index = 0; index < 10 && !cancelled; index += 1) {
          const normalized = String(current?.payment_status || current?.hosted_checkout_status || "").toUpperCase()
          if (["PAID", "CAPTURED", "CAPTURE_REQUESTED", "REJECTED", "CANCELLED", "CANCELED", "REJECTED_CAPTURE"].includes(normalized)) {
            break
          }

          await new Promise((resolve) => setTimeout(resolve, 3000))
          current = await fetchStatus()
          if (cancelled) return
          setStatus(current)
          setAttempt(index + 2)
        }
      } catch (caught: any) {
        if (!cancelled) setError(String(caught?.message || "Worldline payment verification failed."))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [hostedCheckoutId, queryString])

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white">
      <div className="mx-auto max-w-xl space-y-5">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-emerald-400" aria-hidden="true" />
          <div>
            <h1 className="text-2xl font-bold">Worldline payment</h1>
            <p className="text-sm text-white/60">PayMyDine verifies the result directly with Worldline.</p>
          </div>
        </div>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
          {loading ? (
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-5 w-5 animate-pulse text-amber-300" aria-hidden="true" />
              <div>
                <p className="font-semibold">Checking payment status…</p>
                <p className="mt-1 text-sm text-white/60">Verification attempt {Math.max(attempt, 1)}</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 text-red-200">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Payment could not be verified</p>
                <p className="mt-1 text-sm text-red-100/80">{error}</p>
              </div>
            </div>
          ) : isPaid ? (
            <div className="flex items-start gap-3 text-emerald-200">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Payment confirmed</p>
                <p className="mt-1 text-sm text-emerald-100/80">Worldline status: {paymentStatus}</p>
              </div>
            </div>
          ) : isFailed ? (
            <div className="flex items-start gap-3 text-red-200">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Payment not completed</p>
                <p className="mt-1 text-sm text-red-100/80">Worldline status: {paymentStatus}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 text-amber-100">
              <Clock3 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold">Payment is still pending</p>
                <p className="mt-1 text-sm text-amber-50/70">Worldline status: {paymentStatus}</p>
              </div>
            </div>
          )}
        </section>

        <div className="rounded-xl border border-white/10 px-4 py-3 text-xs text-white/50">
          Reference: {hostedCheckoutId || "Unavailable"}{isTerminal && status?.payment_id ? ` · Payment ${status.payment_id}` : ""}
        </div>

        <a href="/menu" className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 font-semibold text-slate-950">
          Return to menu
        </a>
      </div>
    </main>
  )
}
