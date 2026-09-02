"use client"

import React, { useMemo, useState } from "react"
import { CreditCard, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { WorldlineInlineCardFormProps } from "./types"

/**
 * Worldline card checkout deliberately uses the provider-hosted MyCheckout flow.
 *
 * Security invariant: PayMyDine must never render, read, store, log, or transmit
 * PAN, expiry, CVC/CVV, or other card authentication data from merchant-owned
 * inputs. Sensitive fields live only on Worldline-controlled pages/components.
 *
 * The historical inline Connect SDK experiment collected card data in React
 * state before encrypting it. That design expanded PCI scope and could expose
 * sensitive values through browser diagnostics, so it has been retired.
 */
export function WorldlineInlineCardForm({
  paymentData,
  onPaymentError,
  className,
  countryCode = "DE",
  currency = "EUR",
}: WorldlineInlineCardFormProps) {
  const [isOpening, setIsOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currencyCode = String(currency || paymentData?.currency || "EUR").trim().toUpperCase()
  const country = String(countryCode || "DE").trim().toUpperCase()
  const amount = Number(paymentData?.amount || 0)

  const supported = useMemo(() => currencyCode === "EUR" && country === "DE", [currencyCode, country])

  const openSecureCheckout = async () => {
    if (!supported) {
      const message = "Worldline checkout is currently enabled only for Germany in EUR."
      setError(message)
      onPaymentError(message)
      return
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      const message = "The payment amount is not available yet. Please reopen the order and try again."
      setError(message)
      onPaymentError(message)
      return
    }

    setIsOpening(true)
    setError(null)

    try {
      const returnUrl = typeof window !== "undefined"
        ? `${window.location.origin}${window.location.pathname}${window.location.search ? `${window.location.search}&` : "?"}payment_return_provider=worldline`
        : "/menu?payment_return_provider=worldline"
      const cancelUrl = typeof window !== "undefined" ? window.location.href : "/menu"
      const merchantReference = `PMD-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

      // Use the canonical hosted-provider endpoint. The backend resolves the
      // configured provider for the card method and creates the Worldline
      // MyCheckout session when Worldline is selected.
      const response = await fetch("/api/v1/payments/card/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: currencyCode,
          return_url: returnUrl,
          cancel_url: cancelUrl,
          customer_email: String(paymentData?.customerInfo?.email || ""),
          merchant_reference: merchantReference,
          description: "PayMyDine order",
          items: Array.isArray(paymentData?.items)
            ? paymentData.items.map((item: any) => ({
                id: String(item?.id || ""),
                name: String(item?.name || "Item"),
                quantity: Number(item?.quantity || 1),
                price: Number(item?.price || 0),
              }))
            : [],
        }),
      })

      const rawBody = await response.text()
      let payload: any = null
      try {
        payload = rawBody ? JSON.parse(rawBody) : null
      } catch {
        payload = null
      }

      if (!response.ok || !payload?.success || !payload?.redirect_url) {
        const safeMessage = String(
          payload?.message || payload?.error || "Worldline secure checkout could not be opened."
        )
        throw new Error(safeMessage)
      }

      if (typeof window !== "undefined" && payload?.hosted_checkout_id) {
        localStorage.setItem("pmd_worldline_pending_checkout", JSON.stringify({
          hosted_checkout_id: String(payload.hosted_checkout_id),
          method_code: "card",
          provider_code: "worldline",
          created_at: Date.now(),
        }))
      }

      if (typeof window !== "undefined") {
        window.location.assign(String(payload.redirect_url))
      }
    } catch (caught: any) {
      const message = String(caught?.message || "Worldline secure checkout could not be opened.")
      setError(message)
      onPaymentError(message)
      setIsOpening(false)
    }
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
        <div className="flex items-start gap-3">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-semibold">Secure Worldline checkout</div>
            <p className="mt-1 text-emerald-900/80">
              Your card details are entered only on Worldline's secure checkout. PayMyDine never receives your card number or security code.
            </p>
          </div>
        </div>
      </div>

      <Button
        type="button"
        onClick={openSecureCheckout}
        disabled={isOpening || !supported}
        className="w-full rounded-xl py-3 font-semibold"
      >
        <CreditCard className="mr-2 h-4 w-4" aria-hidden="true" />
        {isOpening ? "Opening Worldline..." : "Continue to secure payment"}
      </Button>

      {!supported ? (
        <p className="text-sm text-amber-700">Worldline is currently available only for German EUR checkouts.</p>
      ) : null}

      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
    </div>
  )
}
