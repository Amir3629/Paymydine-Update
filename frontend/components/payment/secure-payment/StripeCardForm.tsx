"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { Session, PaymentRequest } from "onlinepayments-sdk-client-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ThemedButton, ThemedInput } from "@/components/theme-ui"
import { PaymentSecurity } from "@/lib/payment-service"
import { Lock, CreditCard, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { SecurePaymentFormProps, WorldlineInlineCardFormProps } from "./types"

export function StripeCardForm({
  paymentData,
  onPaymentComplete,
  onPaymentError,
  className,
  footerSlot
}: SecurePaymentFormProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [isProcessing, setIsProcessing] = useState(false)
  const [cardError, setCardError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    cardholderName: "",
    email: "",
    phone: "",
  })
  const isSubmittingRef = useRef(false)
  const pmdKazenStripeFormRef = useRef<HTMLFormElement | null>(null)
  const cardMountedRef = useRef(false)
  const [cardMounted, setCardMounted] = useState(false)
  const [cardReady, setCardReady] = useState(false)
  const [cardComplete, setCardComplete] = useState(false)
  const [useKazenStripeSkin, setUseKazenStripeSkin] = useState(false)

  const fieldTheme = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        text: "#111827",
        muted: "#6B7280",
      }
    }

    try {
      const checkoutTheme = document
        .querySelector('[data-pmd-checkout-theme-root="1"]')
        ?.getAttribute("data-pmd-checkout-theme")

      if (checkoutTheme === "kazen_japanese" || checkoutTheme === "kazen-japanese") {
        return { text: "#242320", muted: "rgba(36, 35, 32, 0.52)" }
      }

      if (checkoutTheme === "gold-luxury") {
        return { text: "#FFF8DC", muted: "rgba(255, 248, 220, 0.58)" }
      }

      if (checkoutTheme === "modern_green" || checkoutTheme === "modern-green") {
        return { text: "#F5FFF8", muted: "#92c7ac" }
      }

      return {
        text: "var(--pmd-checkout-input-fg, #111827)",
        muted: "var(--pmd-checkout-card-muted, #6B7280)",
      }
    } catch {
      return {
        text: "var(--pmd-checkout-input-fg, #111827)",
        muted: "var(--pmd-checkout-card-muted, #6B7280)",
      }
    }
  }, [])

  const cardElementOptions = useMemo(() => ({
    style: {
      base: {
        fontSize: "16px",
        color: fieldTheme.text,
        iconColor: fieldTheme.text,
        "::placeholder": {
          color: fieldTheme.muted,
        },
      },
      invalid: {
        color: "#EF4444",
        iconColor: "#EF4444",
      },
    },
  }), [fieldTheme])

  const canSubmitCardPayment = Boolean(
    stripe &&
    elements &&
    cardMounted &&
    cardReady &&
    cardComplete &&
    !isProcessing &&
    !isSubmittingRef.current,
  )

  useEffect(() => {
    try {
      const checkoutTheme = document
        .querySelector('[data-pmd-checkout-theme-root="1"]')
        ?.getAttribute("data-pmd-checkout-theme")

      const isKazenTheme =
        checkoutTheme === "kazen_japanese" ||
        checkoutTheme === "kazen-japanese" ||
        Boolean(document.querySelector('.kzco-overlay[data-kzco-root="1"]')) ||
        Boolean(document.querySelector('[data-pmd-checkout-kazen-skin="1"]'))

      setUseKazenStripeSkin(isKazenTheme)
    } catch {
      setUseKazenStripeSkin(false)
    }

    return () => {
      cardMountedRef.current = false
    }
  }, [])


  // PMD_KAZEN_STRIPE_BILLING_SHARP_FIELDS_V2_START
  // Kazen checkout uses strict square fields. Some shared payment styles force
  // rounded-xl/9999px on ThemedInput after CSS loads, so set the final computed
  // radius directly for the three Stripe billing fields inside Kazen only.
  useEffect(() => {
    const form = pmdKazenStripeFormRef.current
    if (!form || typeof document === "undefined") return

    const kazenRoot = form.closest(
      '[data-pmd-checkout-theme="kazen_japanese"], [data-pmd-checkout-theme="kazen-japanese"], .kzco-overlay',
    )
    if (!kazenRoot) return

    const fields = form.querySelectorAll<HTMLInputElement>("#cardholderName, #email, #phone")
    fields.forEach((field) => {
      field.setAttribute("data-pmd-kazen-billing-field", "1")
      field.style.setProperty("border-radius", "0px", "important")
      field.style.setProperty("-webkit-border-radius", "0px", "important")
      field.style.setProperty("background", "rgba(255, 251, 243, .78)", "important")
      field.style.setProperty("background-color", "rgba(255, 251, 243, .78)", "important")
      field.style.setProperty("border", "1px solid rgba(36, 35, 32, .24)", "important")
      field.style.setProperty("box-shadow", "none", "important")
      field.style.setProperty("outline", "none", "important")
    })
  })
  // PMD_KAZEN_STRIPE_BILLING_SHARP_FIELDS_V2_END

  const handleCardChange = (event: any) => {
    setCardComplete(Boolean(event?.complete))
    setCardError(event.error ? event.error.message : null)
  }



  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (isSubmittingRef.current || isProcessing) {
      return
    }

    setCardError(null)

    if (!stripe || !elements) {
      const msg = "Secure card payment is still loading. Please wait a moment and try again."
      setCardError(msg)
      onPaymentError(msg)
      return
    }

    const cardElement = elements.getElement(CardElement)
    if (!cardElement || !cardReady || !cardMountedRef.current) {
      const msg = "Secure card field is not ready yet. Please wait a moment and try again."
      setCardError(msg)
      onPaymentError(msg)
      return
    }

    isSubmittingRef.current = true
    setIsProcessing(true)

    try {
      const amount = Number(paymentData?.amount || 0)
      const currency = String(paymentData?.currency || "EUR").toUpperCase()

      if (!amount || amount <= 0) {
        throw new Error("Invalid payment amount")
      }

      const response = await fetch("/api/v1/payments/stripe/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency,
          restaurantId: String((paymentData as any)?.restaurantId || "1"),
          tableNumber: (paymentData as any)?.tableNumber ?? null,
          cartId: (paymentData as any)?.cartId ?? null,
          userId: (paymentData as any)?.userId ?? null,
          items: Array.isArray((paymentData as any)?.items) ? (paymentData as any)?.items : [],
          customerInfo: (paymentData as any)?.customerInfo || {},
        }),
      })

      const payload = await response.json().catch(() => ({} as any))

      if (!response.ok || !payload?.clientSecret) {
        throw new Error(payload?.error || "Failed to create Stripe payment intent")
      }

      const billingName =
        String(formData.cardholderName || "").trim() ||
        String((paymentData as any)?.customerInfo?.name || "").trim() ||
        "Customer"

      const billingEmail = String(formData.email || "").trim() || undefined
      const billingPhone = String(formData.phone || "").trim() || undefined

      const { error, paymentIntent } = await stripe.confirmCardPayment(payload.clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: billingName,
            email: billingEmail,
            phone: billingPhone,
          },
        },
      })

      if (error) {
        throw new Error(error.message || "Stripe payment confirmation failed")
      }

      const status = String(paymentIntent?.status || "")
      if (!paymentIntent || !["succeeded", "processing", "requires_capture"].includes(status)) {
        throw new Error(`Unexpected Stripe payment status: ${status || "unknown"}`)
      }

      onPaymentComplete({
        success: true,
        transactionId: String(paymentIntent.id),
        paymentMethod: "stripe",
      } as any)
    } catch (error: any) {
      const msg = typeof error?.message === "string" ? error.message : "Stripe payment failed"
      setCardError(msg)
      onPaymentError(msg)
    } finally {
      isSubmittingRef.current = false
      setIsProcessing(false)
    }
  }


  return (
    <form
      data-pmd-stripe-form="1"
      data-pmd-stripe-kazen-form={useKazenStripeSkin ? "1" : undefined}
      onSubmit={handleSubmit}
      className={cn("space-y-4 bg-transparent w-full", className)}
    >
      <style
        data-pmd-kazen-stripe-native-form-style="1"
        dangerouslySetInnerHTML={{
          __html: `
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] {
              --pmd-kazen-card-red: #b85d59;
              --pmd-kazen-card-red-border: rgba(143, 55, 51, .68);
              --pmd-kazen-card-ink: #242320;
              --pmd-kazen-card-muted: rgba(36, 35, 32, .56);
              --pmd-kazen-card-field-bg: rgba(255, 251, 243, .72);
              --pmd-kazen-card-field-border: rgba(36, 35, 32, .22);
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] label,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-themed-label {
              color: var(--pmd-kazen-card-ink) !important;
              -webkit-text-fill-color: var(--pmd-kazen-card-ink) !important;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
              font-size: .86rem !important;
              font-weight: 800 !important;
              letter-spacing: -.02em !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input.pmd-themed-input,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input[data-pmd-themed-input],
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-stripe-card-frame {
              height: 52px !important;
              min-height: 52px !important;
              width: 100% !important;
              border-radius: 0 !important;
              background: var(--pmd-kazen-card-field-bg) !important;
              background-color: var(--pmd-kazen-card-field-bg) !important;
              border: 1px solid var(--pmd-kazen-card-field-border) !important;
              box-shadow: none !important;
              outline: none !important;
              color: var(--pmd-kazen-card-ink) !important;
              -webkit-text-fill-color: var(--pmd-kazen-card-ink) !important;
              font-size: 1rem !important;
              font-weight: 700 !important;
              letter-spacing: -.015em !important;
              transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input.pmd-themed-input,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input[data-pmd-themed-input] {
              padding: 0 16px !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-stripe-card-frame {
              display: flex !important;
              align-items: center !important;
              padding: 0 14px !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-stripe-card-frame .StripeElement,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-stripe-card-frame .__PrivateStripeElement {
              width: 100% !important;
              min-height: 22px !important;
              border: 0 !important;
              border-radius: 0 !important;
              background: transparent !important;
              box-shadow: none !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input.pmd-themed-input::placeholder,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input[data-pmd-themed-input]::placeholder {
              color: var(--pmd-kazen-card-muted) !important;
              -webkit-text-fill-color: var(--pmd-kazen-card-muted) !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input.pmd-themed-input:focus,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] input[data-pmd-themed-input]:focus,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] .pmd-stripe-card-frame:focus-within {
              border-color: rgba(184, 93, 89, .72) !important;
              background: rgba(255, 250, 242, .92) !important;
              box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .72) !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[data-pmd-stripe-native-button="1"],
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"],
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[type="submit"] {
              width: 100% !important;
              height: 52px !important;
              min-height: 52px !important;
              border-radius: 0 !important;
              background: var(--pmd-kazen-card-red) !important;
              background-color: var(--pmd-kazen-card-red) !important;
              background-image: none !important;
              border: 1px solid var(--pmd-kazen-card-red-border) !important;
              color: #fffaf3 !important;
              -webkit-text-fill-color: #fffaf3 !important;
              box-shadow: none !important;
              filter: none !important;
              opacity: 1 !important;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
              font-size: .82rem !important;
              font-weight: 850 !important;
              letter-spacing: .14em !important;
              line-height: 1 !important;
              text-transform: uppercase !important;
              padding: .86rem 1rem !important;
              transition: background-color .16s ease, border-color .16s ease, transform .16s ease !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[data-pmd-stripe-native-button="1"] *,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"] *,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[type="submit"] * {
              color: #fffaf3 !important;
              -webkit-text-fill-color: #fffaf3 !important;
              stroke: currentColor !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[data-pmd-stripe-native-button="1"]:not(:disabled):hover,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"]:not(:disabled):hover,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[type="submit"]:not(:disabled):hover {
              background: #c86460 !important;
              background-color: #c86460 !important;
              transform: translateY(-1px) !important;
            }

            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[data-pmd-stripe-native-button="1"]:disabled,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"]:disabled,
            html body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] button[type="submit"]:disabled {
              background: var(--pmd-kazen-card-red) !important;
              background-color: var(--pmd-kazen-card-red) !important;
              background-image: none !important;
              border-color: var(--pmd-kazen-card-red-border) !important;
              color: #fffaf3 !important;
              -webkit-text-fill-color: #fffaf3 !important;
              opacity: .58 !important;
              cursor: not-allowed !important;
              transform: none !important;
            }

            html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"],
            html[data-pmd-kazen-mode="dark"] body form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"],
            body[data-pmd-kazen-mode="dark"] form[data-pmd-stripe-form="1"][data-pmd-stripe-kazen-form="1"] {
              --pmd-kazen-card-ink: #f4e7c8;
              --pmd-kazen-card-muted: rgba(244, 231, 200, .60);
              --pmd-kazen-card-field-bg: rgba(246, 232, 200, .055);
              --pmd-kazen-card-field-border: rgba(198, 164, 93, .36);
            }
          `,
        }}
      />
      <div className="space-y-3">
        <div>
          <Label htmlFor="cardholderName" className="pmd-themed-label text-sm font-medium">
            Cardholder Name
          </Label>
          <ThemedInput
            id="cardholderName"
            type="text"
            placeholder="John Doe"
            value={formData.cardholderName}
            onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value }))}
            className="mt-1 pmd-kazen-stripe-billing-input"
          
            data-pmd-kazen-billing-field="1"/>
        </div>

        <div>
          <Label htmlFor="email" className="pmd-themed-label text-sm font-medium">
            Email Address
          </Label>
          <ThemedInput
            id="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="mt-1 pmd-kazen-stripe-billing-input"
          
            data-pmd-kazen-billing-field="1"/>
        </div>

        <div>
          <Label htmlFor="phone" className="pmd-themed-label text-sm font-medium">
            Phone Number (Optional)
          </Label>
          <ThemedInput
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="mt-1 pmd-kazen-stripe-billing-input"
          
            data-pmd-kazen-billing-field="1"/>
        </div>

        <div>
          <Label className="pmd-themed-label text-sm font-medium">
            Card Information
          </Label>
          <div className="pmd-stripe-card-frame mt-1">
            <CardElement
              options={cardElementOptions}
              onReady={() => {
                cardMountedRef.current = true
                setCardMounted(true)
                setCardReady(true)
                setCardError(null)
              }}
              onChange={handleCardChange}
            />
          </div>
          {cardError && (
            <div className="flex items-center gap-2 mt-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              {cardError}
            </div>
          )}
        </div>
      </div>
      {footerSlot ? <div className="pt-3 pb-2 flex items-center gap-2">{footerSlot}</div> : null}


      <ThemedButton
        type="submit"
        disabled={!canSubmitCardPayment}
        data-pmd-stripe-native-button="1"
        variant="primary"
        fullWidth
      >
        {isProcessing ? (
          <span className="flex w-full items-center justify-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/35 border-t-current" />
            <span>Processing...</span>
          </span>
        ) : (
          <span className="flex w-full items-center justify-center gap-2">
            <Lock className="h-4 w-4 flex-none" />
            <span>Pay</span>
          </span>
        )}
      </ThemedButton>
    </form>
  )
}

