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
  const cardMountedRef = useRef(false)
  const [cardMounted, setCardMounted] = useState(false)
  const [cardReady, setCardReady] = useState(false)
  const [cardComplete, setCardComplete] = useState(false)

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
    return () => {
      cardMountedRef.current = false
    }
  }, [])

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
    <form data-pmd-stripe-form="1" onSubmit={handleSubmit} className={cn("space-y-4 bg-transparent w-full", className)}>
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
            className="mt-1"
          />
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
            className="mt-1"
          />
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
            className="mt-1"
          />
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

