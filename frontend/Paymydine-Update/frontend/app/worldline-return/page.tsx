"use client"

import { useEffect, useMemo, useState } from "react"

type ReturnResult = any

export default function WorldlineReturnPage() {
  const [result, setResult] = useState<ReturnResult | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)

  const qs = useMemo(() => {
    if (typeof window === "undefined") return ""
    return window.location.search || ""
  }, [])

  const hostedCheckoutId = useMemo(() => {
    if (typeof window === "undefined") return ""
    const p = new URLSearchParams(window.location.search)
    return p.get("hostedCheckoutId") || ""
  }, [])

  const paymentStatus =
    result?.status_result?.payment_status ||
    result?.status_result?.hosted_checkout_status ||
    null

  const isTerminal =
    paymentStatus === "PAID" ||
    paymentStatus === "CAPTURED" ||
    paymentStatus === "AUTHORISED" ||
    paymentStatus === "REJECTED" ||
    paymentStatus === "CANCELLED"

  useEffect(() => {
    let cancelled = false
    let tries = 0
    const maxTries = 12

    async function hitReturn() {
      const res = await fetch(`/api/v1/payments/worldline/return${qs}`)
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || "Worldline return validation failed")
      }

      return data
    }

    async function hitStatus() {
      if (!hostedCheckoutId) return null

      const res = await fetch(`/api/v1/payments/worldline/status/${hostedCheckoutId}`)
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || "Worldline status fetch failed")
      }

      return data
    }

    async function loop() {
      try {
        setLoading(true)
        setError("")

        const returnData = await hitReturn()
        if (cancelled) return
        setResult(returnData)
        setAttempt(1)

        let currentStatus =
          returnData?.status_result?.payment_status ||
          returnData?.status_result?.hosted_checkout_status ||
          null

        while (!cancelled && tries < maxTries) {
          const terminal =
            currentStatus === "PAID" ||
            currentStatus === "CAPTURED" ||
            currentStatus === "AUTHORISED" ||
            currentStatus === "REJECTED" ||
            currentStatus === "CANCELLED"

          if (terminal) break

          await new Promise((r) => setTimeout(r, 3000))
          tries += 1

          const statusData = await hitStatus()
          if (cancelled) return

          if (statusData) {
            setResult((prev: any) => ({
              ...(prev || {}),
              polled_status: statusData,
              status_result: statusData?.result || prev?.status_result || null,
            }))
            setAttempt(tries + 1)

            currentStatus =
              statusData?.result?.payment_status ||
              statusData?.result?.hosted_checkout_status ||
              currentStatus
          }
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message || "Worldline return failed")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loop()

    return () => {
      cancelled = true
    }
  }, [qs, hostedCheckoutId])

  return (
    <main className="min-h-screen bg-black text-white p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="text-2xl font-bold">Worldline Return</h1>

        <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
          <p className="text-sm opacity-80">Hosted Checkout ID</p>
          <p className="font-mono text-sm break-all">{hostedCheckoutId || "N/A"}</p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
            <p className="font-semibold">Checking payment status...</p>
            <p className="text-sm text-white/70 mt-1">Polling attempt: {attempt}</p>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-500/30 p-4 bg-red-500/10">
            <p className="font-semibold mb-2">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
              <p className="text-sm opacity-80 mb-2">Resolved status</p>
              <p className="text-lg font-semibold">{paymentStatus || "UNKNOWN"}</p>
              <p className="text-xs text-white/60 mt-2">
                Terminal status: {isTerminal ? "YES" : "NO"}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 p-4 bg-white/5">
              <p className="text-sm opacity-80 mb-2">Full result</p>
              <pre className="text-xs overflow-auto whitespace-pre-wrap">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </>
        ) : null}
      </div>
    </main>
  )
}
