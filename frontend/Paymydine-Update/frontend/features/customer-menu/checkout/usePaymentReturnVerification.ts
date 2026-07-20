"use client"

import { useEffect } from "react"
import { pmdForceKazenFrontendThemePayload } from "@/features/customer-menu/theme/kazenThemePayload"

type PaymentReturnContext = {
  method_code?: string | null
  provider_code?: string | null
}

type ToastFn = (options: {
  title: string
  description?: string
  variant?: "default" | "destructive" | null
}) => void

type UsePaymentReturnVerificationOptions = {
  handlePayment: (
    paymentReference?: string,
    forcedPaymentContext?: PaymentReturnContext
  ) => Promise<void> | void
  setProviderInlineError: (message: string | null) => void
  toast: ToastFn
}

export function usePaymentReturnVerification({
  handlePayment,
  setProviderInlineError,
  toast,
}: UsePaymentReturnVerificationOptions) {
  useEffect(() => {
    const run = async () => {
      if (typeof window === "undefined") return

      const params = new URLSearchParams(window.location.search)
      const provider = params.get("payment_return_provider")

      if (!["worldline", "sumup", "square", "wero", "vr_payment"].includes(provider || "")) return

      const pendingKey =
        provider === "worldline"
          ? "pmd_worldline_pending_checkout"
          : provider === "sumup"
            ? "pmd_sumup_pending_checkout"
            : provider === "square"
              ? "pmd_square_pending_checkout"
              : provider === "vr_payment"
                ? "pmd_vr_payment_pending_checkout"
                : "pmd_wero_pending_checkout"

      const pendingRaw = localStorage.getItem(pendingKey)
      if (!pendingRaw) return

      let pending: any = null
      try {
        pending = JSON.parse(pendingRaw)
      } catch {
        return
      }

      const verificationPayload =
        provider === "worldline"
          ? { hosted_checkout_id: String(pending?.hosted_checkout_id || "") }
          : provider === "sumup"
            ? { checkout_id: String(pending?.checkout_id || params.get("checkout_id") || "") }
            : provider === "square"
              ? { payment_link_id: String(pending?.payment_link_id || "") }
              : provider === "vr_payment"
                ? {
                    session_id: String(pending?.session_id || params.get("session_id") || ""),
                    transaction_id: String(params.get("transaction_id") || ""),
                    provider_reference: String(params.get("provider_reference") || ""),
                    merchant_reference: String(pending?.merchant_reference || ""),
                  }
                : { session_id: String(pending?.session_id || params.get("session_id") || "") }

      const verificationUrl =
        provider === "worldline"
          ? "/api/v1/payments/worldline/checkout-status"
          : provider === "sumup"
            ? "/api/v1/payments/sumup/checkout-status"
            : provider === "square"
              ? "/api/v1/payments/square/checkout-status"
              : provider === "vr_payment"
                ? "/api/v1/payments/vr-payment/return-status"
                : "/api/v1/payments/wero/checkout-status"

      const hasReference = Object.values(verificationPayload).some(
        (value) => String(value || "").trim() !== ""
      )

      if (!hasReference) return

      try {
        const res = await fetch(verificationUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(verificationPayload),
        })

        const json = await res.json()
        pmdForceKazenFrontendThemePayload(json)

        if (res.ok && json?.success && json?.is_paid) {
          localStorage.removeItem(pendingKey)

          const fallbackReference = String(
            (verificationPayload as any)?.session_id ||
              (verificationPayload as any)?.transaction_id ||
              (verificationPayload as any)?.provider_reference ||
              ""
          )

          const txId = String(
            json?.payment_intent_id ||
              json?.payment_id ||
              json?.transaction_code ||
              json?.order_id ||
              fallbackReference
          )

          const forcedMethodCode = pending?.method_code
            ? String(pending.method_code)
            : provider === "wero"
              ? "wero"
              : "card"

          const forcedProviderCode = pending?.provider_code
            ? String(pending.provider_code)
            : String(json?.provider || (provider === "wero" ? "stripe" : provider))

          await handlePayment(txId, {
            method_code: forcedMethodCode,
            provider_code: forcedProviderCode,
          })

          params.delete("payment_return_provider")
          const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
          window.history.replaceState({}, "", next)
          return
        }

        if (res.ok && json?.success && json?.status === "pending") {
          setProviderInlineError("Your payment is still pending confirmation. Please refresh in a moment.")
          return
        }

        if (res.ok && json?.success && (json?.status === "cancelled" || json?.status === "expired")) {
          localStorage.removeItem(pendingKey)
          setProviderInlineError("Payment was cancelled. Please choose another method to continue.")
          return
        }

        toast({
          title: "Payment Not Confirmed",
          description: `${provider} payment is not confirmed yet. Please check your payment status and retry.`,
          variant: "destructive",
        })
      } catch {
        toast({
          title: "Payment Verification Failed",
          description: `Could not verify ${provider} payment status.`,
          variant: "destructive",
        })
      }
    }

    void run()
    // Keep dependency behavior same as old inline effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
