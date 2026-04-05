"use client"

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react"
import type { ReactNode } from "react"
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
import { Session, PaymentRequest } from "onlinepayments-sdk-client-js"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PaymentSecurity, PaymentData, PaymentResult } from "@/lib/payment-service"
import { Lock, CreditCard, AlertCircle, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface SecurePaymentFormProps {
  paymentData: PaymentData
  onPaymentComplete: (result: PaymentResult) => void
  onPaymentError: (error: string) => void
  className?: string
  footerSlot?: React.ReactNode
  paypalFundingSource?: "paypal" | "card"
}

interface WorldlineInlineCardFormProps extends SecurePaymentFormProps {
  countryCode?: string
  currency?: string
}

const worldlineInlineInitPromiseByKey = new Map<string, Promise<{ sdk: any; paymentProduct: any }>>()
const worldlineInlineInitResultByKey = new Map<string, { sdk: any; paymentProduct: any }>()

// Stripe Card Form Component
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
  const stripeSubmitButtonRef = useRef<HTMLButtonElement | null>(null)
  const cardholderInputRef = useRef<HTMLInputElement | null>(null)
  const emailInputRef = useRef<HTMLInputElement | null>(null)
  const phoneInputRef = useRef<HTMLInputElement | null>(null)
  const stripeCardWrapRef = useRef<HTMLDivElement | null>(null)
  const stripeFormRef = useRef<HTMLFormElement | null>(null)

  const fieldTheme = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        text: "#111827",
        muted: "#6B7280",
        border: "rgba(17,24,39,0.12)",
        bg: "rgba(255,255,255,0.96)",
        label: "#111827",
      }
    }

    try {
      const bodyBg = window.getComputedStyle(document.body).backgroundColor || ""
      const m = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
      const r = m ? Number(m[1]) : 255
      const g = m ? Number(m[2]) : 255
      const b = m ? Number(m[3]) : 255
      const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
      const dark = luminance < 0.45

      if (dark) {
        return {
          text: "#F8FAFC",
          muted: "rgba(248,250,252,0.60)",
          border: "rgba(255,255,255,0.14)",
          bg: "rgba(255,255,255,0.06)",
          label: "#F8FAFC",
        }
      }

      return {
        text: "#111827",
        muted: "#6B7280",
        border: "rgba(17,24,39,0.12)",
        bg: "rgba(255,255,255,0.96)",
        label: "#111827",
      }
    } catch {
      return {
        text: "#111827",
        muted: "#6B7280",
        border: "rgba(17,24,39,0.12)",
        bg: "rgba(255,255,255,0.96)",
        label: "#111827",
      }
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!stripe || !elements) {
      onPaymentError("Payment system not ready")
      return
    }

    setIsProcessing(true)
    setCardError(null)

    const safeName = (formData.cardholderName || "").trim() || (paymentData.customerInfo?.name || "Guest")
    const safeEmail = (formData.email || "").trim() || (paymentData.customerInfo?.email || "")
    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error("Card element not found")
      }

      // Create payment intent via Laravel (tenant secret in backend only)
      const response = await fetch('/api/v1/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentData,
          preferredMethod: 'card',
          customerInfo: {
            ...paymentData.customerInfo,
            name: safeName,
            email: safeEmail,
            phone: formData.phone,
          },
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to create payment intent')
      }
      const { clientSecret } = data

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: safeName,
            ...(safeEmail ? { email: safeEmail } : {}),
            ...(formData.phone ? { phone: formData.phone } : {}),
          },
        },
      })

      if (error) {
        setCardError(error.message || "Payment failed")
        onPaymentError(error.message || "Payment failed")
      } else if (paymentIntent?.status === 'succeeded') {
        onPaymentComplete({
          success: true,
          transactionId: paymentIntent.id,
          paymentMethod: 'stripe',
        })
      }
    } catch (error: any) {
      const errorMessage = error.message || "Payment processing failed"
      setCardError(errorMessage)
      onPaymentError(errorMessage)
    } finally {
      setIsProcessing(false)
    }
  }



  const cleanupStripeDuplicateFooter = () => {
    if (typeof window === "undefined") return

    const formEl = stripeFormRef.current
    if (!formEl) return

    const submitBtn = formEl.querySelector('button[data-pmd-stripe-native-button="1"]') as HTMLButtonElement | null
    if (!submitBtn) return

    const scope =
      formEl.closest(".max-w-md") ||
      formEl.closest(".rounded-3xl") ||
      formEl.parentElement ||
      document.body

    const allDivs = Array.from(scope.querySelectorAll("div")) as HTMLDivElement[]

    for (const div of allDivs) {
      if (formEl.contains(div)) continue

      const pos = formEl.compareDocumentPosition(div)
      const isAfterForm = Boolean(pos & Node.DOCUMENT_POSITION_FOLLOWING)
      if (!isAfterForm) continue

      const cls = typeof div.className === "string" ? div.className : ""
      const txt = (div.textContent || "").trim().toLowerCase()
      const hasArrow = !!div.querySelector("svg.lucide-arrow-left")
      const hasStripeImg = !!div.querySelector('img[src*="stripe"]')

      // duplicate lower row: back + logo
      if (hasArrow && hasStripeImg) {
        div.style.setProperty("display", "none", "important")
        div.style.setProperty("height", "0", "important")
        div.style.setProperty("margin", "0", "important")
        div.style.setProperty("padding", "0", "important")
        div.style.setProperty("overflow", "hidden", "important")
        continue
      }

      // empty wrapper
      const onlyWhitespace = txt == ""
      const hasNoUsefulChildren = !div.querySelector("input,button,img,svg,.StripeElement")

      const looksEmptyGap = (
        cls.includes("pt-2 max-h-[300px] overflow-y-auto") ||
        cls == "pt-4" ||
        cls.includes("p-4 divider surface-sub rounded-full")
      )

      if (looksEmptyGap && (onlyWhitespace || hasNoUsefulChildren)) {
        div.style.setProperty("display", "none", "important")
        div.style.setProperty("height", "0", "important")
        div.style.setProperty("margin", "0", "important")
        div.style.setProperty("padding", "0", "important")
        div.style.setProperty("overflow", "hidden", "important")
      }
    }
  }

  const applyForcedStripeFieldStyles = () => {
    const bodyBg = typeof window !== "undefined"
      ? (window.getComputedStyle(document.body).backgroundColor || "")
      : ""

    const m = bodyBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
    const r = m ? Number(m[1]) : 255
    const g = m ? Number(m[2]) : 255
    const b = m ? Number(m[3]) : 255
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
    const dark = luminance < 0.45

    const bg = dark ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.96)"
    const text = dark ? "#F8FAFC" : "#111827"
    const muted = dark ? "rgba(248,250,252,0.60)" : "#6B7280"
    const border = dark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.12)"
    const focus = "rgba(99,91,255,0.70)"
    const focusShadow = "0 0 0 3px rgba(99,91,255,0.18)"

    const inputs = [
      cardholderInputRef.current,
      emailInputRef.current,
      phoneInputRef.current,
    ].filter(Boolean) as HTMLInputElement[]

    for (const el of inputs) {
      el.style.setProperty("box-sizing", "border-box", "important")
      el.style.setProperty("width", "100%", "important")
      el.style.setProperty("min-height", "44px", "important")
      el.style.setProperty("padding", "10px 14px", "important")
      el.style.setProperty("border-radius", "16px", "important")
      el.style.setProperty("background", bg, "important")
      el.style.setProperty("background-color", bg, "important")
      el.style.setProperty("color", text, "important")
      el.style.setProperty("-webkit-text-fill-color", text, "important")
      el.style.setProperty("border", `1px solid ${border}`, "important")
      el.style.setProperty("box-shadow", "none", "important")
      el.style.setProperty("outline", "none", "important")
      el.style.setProperty("caret-color", text, "important")
    }

    const wrap = stripeCardWrapRef.current
    if (wrap) {
      wrap.style.setProperty("background", bg, "important")
      wrap.style.setProperty("background-color", bg, "important")
      wrap.style.setProperty("border", `1px solid ${border}`, "important")
      wrap.style.setProperty("border-radius", "16px", "important")
      wrap.style.setProperty("box-shadow", "none", "important")
      wrap.style.setProperty("width", "100%", "important")
    }

    if (typeof document !== "undefined") {
      let styleEl = document.getElementById("pmd-force-stripe-placeholders") as HTMLStyleElement | null
      if (!styleEl) {
        styleEl = document.createElement("style")
        styleEl.id = "pmd-force-stripe-placeholders"
        document.head.appendChild(styleEl)
      }

      styleEl.textContent = `
        form[data-pmd-stripe-form="1"] input#cardholderName::placeholder,
        form[data-pmd-stripe-form="1"] input#email::placeholder,
        form[data-pmd-stripe-form="1"] input#phone::placeholder {
          color: ${muted} !important;
          -webkit-text-fill-color: ${muted} !important;
          opacity: 1 !important;
        }

        form[data-pmd-stripe-form="1"] input#cardholderName:focus,
        form[data-pmd-stripe-form="1"] input#email:focus,
        form[data-pmd-stripe-form="1"] input#phone:focus {
          border: 1px solid ${focus} !important;
          box-shadow: ${focusShadow} !important;
          outline: none !important;
        }
      `
    }
  }

  useLayoutEffect(() => {
    applyForcedStripeFieldStyles()
    cleanupStripeDuplicateFooter()

    const t1 = window.setTimeout(() => {
      applyForcedStripeFieldStyles()
      cleanupStripeDuplicateFooter()
    }, 0)
    const t2 = window.setTimeout(() => {
      applyForcedStripeFieldStyles()
      cleanupStripeDuplicateFooter()
    }, 150)
    const t3 = window.setTimeout(() => {
      applyForcedStripeFieldStyles()
      cleanupStripeDuplicateFooter()
    }, 500)

    const observer = new MutationObserver(() => {
      applyForcedStripeFieldStyles()
      cleanupStripeDuplicateFooter()
    })

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"]
    })

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [fieldTheme, formData.cardholderName, formData.email, formData.phone])

  const handleCardChange = (event: any) => {
    setCardError(event.error ? event.error.message : null)
  }


  useEffect(() => {
    const el = stripeSubmitButtonRef.current
    if (!el) return

    const apply = () => {
      el.style.setProperty("width", "100%", "important")
      el.style.setProperty("min-width", "100%", "important")
      el.style.setProperty("max-width", "100%", "important")
      el.style.setProperty("height", "54px", "important")
      el.style.setProperty("display", "flex", "important")
      el.style.setProperty("align-items", "center", "important")
      el.style.setProperty("justify-content", "center", "important")
      el.style.setProperty("gap", "8px", "important")
      el.style.setProperty("padding", "0 18px", "important")
      el.style.setProperty("margin", "0", "important")
      el.style.setProperty("border-radius", "16px", "important")
      el.style.setProperty("border", "0", "important")
      el.style.setProperty("outline", "none", "important")
      el.style.setProperty("appearance", "none", "important")
      el.style.setProperty("-webkit-appearance", "none", "important")
      el.style.setProperty("background", "linear-gradient(135deg, #635BFF 0%, #4F46E5 100%)", "important")
      el.style.setProperty("background-color", "#635BFF", "important")
      el.style.setProperty("background-image", "linear-gradient(135deg, #635BFF 0%, #4F46E5 100%)", "important")
      el.style.setProperty("box-shadow", "0 8px 22px rgba(99, 91, 255, 0.35)", "important")
      el.style.setProperty("color", "#FFFFFF", "important")
      el.style.setProperty("font-size", "16px", "important")
      el.style.setProperty("font-weight", "700", "important")
      el.style.setProperty("cursor", (!stripe || isProcessing) ? "not-allowed" : "pointer", "important")
      el.style.setProperty("opacity", (!stripe || isProcessing) ? "0.6" : "1", "important")
    }

    apply()
    const t = window.setTimeout(apply, 50)
    return () => window.clearTimeout(t)
  }, [stripe, isProcessing])


  return (
    <form ref={stripeFormRef} data-pmd-stripe-form="1" onSubmit={handleSubmit} className={cn("space-y-4 bg-transparent w-full", className)}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="cardholderName" className="text-sm font-medium" style={{ color: fieldTheme.label }}>
            Cardholder Name
          </Label>
          <Input
            id="cardholderName"
            ref={cardholderInputRef}
            type="text"
            placeholder="John Doe"
            value={formData.cardholderName}
            onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value }))}
            className="mt-1 rounded-2xl"
            style={{
              background: fieldTheme.bg,
              color: fieldTheme.text,
              borderColor: fieldTheme.border,
            }}
            style={{
              background: fieldTheme.bg,
              color: fieldTheme.text,
              borderColor: fieldTheme.border,
            }}
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium" style={{ color: fieldTheme.label }}>
            Email Address
          </Label>
          <Input
            id="email"
            ref={emailInputRef}
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="mt-1 rounded-2xl"
            style={{
              background: fieldTheme.bg,
              color: fieldTheme.text,
              borderColor: fieldTheme.border,
            }}
            style={{
              background: fieldTheme.bg,
              color: fieldTheme.text,
              borderColor: fieldTheme.border,
            }}
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium" style={{ color: fieldTheme.label }}>
            Phone Number (Optional)
          </Label>
          <Input
            id="phone"
            ref={phoneInputRef}
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="mt-1 rounded-2xl"
            style={{
              background: fieldTheme.bg,
              color: fieldTheme.text,
              borderColor: fieldTheme.border,
            }}
            style={{
              background: fieldTheme.bg,
              color: fieldTheme.text,
              borderColor: fieldTheme.border,
            }}
          />
        </div>

        <div>
          <Label className="text-sm font-medium" style={{ color: fieldTheme.label }}>
            Card Information
          </Label>
          <div ref={stripeCardWrapRef} className="mt-1 p-3 border rounded-2xl w-full" style={{ background: fieldTheme.bg, borderColor: fieldTheme.border }}>
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: fieldTheme.text,
                    iconColor: fieldTheme.text,
                    '::placeholder': {
                      color: fieldTheme.muted,
                    },
                  },
                  invalid: {
                    color: '#EF4444',
                    iconColor: '#EF4444',
                  },
                },
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


      <button
        type="submit"
        disabled={!stripe || isProcessing}
        data-pmd-stripe-native-button="1"
        ref={stripeSubmitButtonRef}
        style={{
          width: "100%",
          minWidth: "100%",
          maxWidth: "100%",
          height: "54px",
          borderRadius: "16px",
          border: "0",
          outline: "none",
          appearance: "none",
          WebkitAppearance: "none",
          background: "transparent",
          backgroundColor: "transparent",
          backgroundImage: "none",
          boxShadow: "none",
          padding: "0 18px",
          margin: "0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
          cursor: (!stripe || isProcessing) ? "not-allowed" : "pointer",
          opacity: (!stripe || isProcessing) ? 0.6 : 1,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            borderRadius: "16px",
            background: "linear-gradient(135deg, #635BFF 0%, #4F46E5 100%)",
            boxShadow: "0 8px 22px rgba(99, 91, 255, 0.35)",
            pointerEvents: "none",
          }}
        />
        {isProcessing ? (
          <span
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 700,
              width: "100%",
            }}
          >
            <span
              className="animate-spin"
              style={{
                width: "16px",
                height: "16px",
                border: "2px solid rgba(255,255,255,0.35)",
                borderTopColor: "#FFFFFF",
                borderRadius: "9999px",
                flex: "0 0 auto",
              }}
            />
            <span style={{ color: "#FFFFFF", fontWeight: 700 }}>Processing...</span>
          </span>
        ) : (
          <span
            style={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              color: "#FFFFFF",
              fontSize: "16px",
              fontWeight: 700,
              width: "100%",
            }}
          >
            <Lock className="h-4 w-4" style={{ color: "#FFFFFF", flex: "0 0 auto" }} />
            <span style={{ color: "#FFFFFF", fontWeight: 700 }}>Pay</span>
          </span>
        )}
      </button>
    </form>
  )
}

export function WorldlineInlineCardForm({
  paymentData,
  onPaymentComplete,
  onPaymentError,
  className,
  countryCode = "DE",
  currency = "EUR",
}: WorldlineInlineCardFormProps) {
  const initFailureShownRef = useRef(false)
  const onPaymentErrorRef = useRef(onPaymentError)
  const initKeyRef = useRef<string | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sdk, setSdk] = useState<any>(null)
  const [paymentProduct, setPaymentProduct] = useState<any>(null)
  const [formData, setFormData] = useState({
    cardholderName: "",
    email: "",
    phone: "",
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const amountMinor = Math.round(Number(paymentData?.amount || 0) * 100)
  const formIsValid = useMemo(() => {
    return Boolean(
      formData.cardholderName.trim() &&
      formData.email.trim() &&
      formData.cardNumber.trim() &&
      formData.expiryDate.trim() &&
      formData.cvv.trim() &&
      Object.values(fieldErrors).every((err) => !err)
    )
  }, [fieldErrors, formData])
  const currencyCode = String(currency || "EUR").toUpperCase()

  const normalizeCardNumber = (value: string) => (value || "").replace(/\D/g, "")
  const normalizeExpiry = (value: string) => {
    const digits = (value || "").replace(/\D/g, "")
    if (digits.length <= 4) return digits
    // handle MMYYYY -> MMYY
    if (digits.length >= 6) {
      return `${digits.slice(0, 2)}${digits.slice(-2)}`
    }
    return digits.slice(0, 4)
  }
  const normalizeCvv = (value: string) => (value || "").replace(/\D/g, "")

  const buildPaymentRequest = (nextData: typeof formData) => {
    if (!paymentProduct) return null
    const paymentRequest = new PaymentRequest(paymentProduct)
    paymentRequest.setValue("cardholderName", (nextData.cardholderName || "").trim())
    paymentRequest.setValue("cardNumber", normalizeCardNumber(nextData.cardNumber))
    paymentRequest.setValue("expiryDate", normalizeExpiry(nextData.expiryDate))
    paymentRequest.setValue("cvv", normalizeCvv(nextData.cvv))
    return paymentRequest
  }

  const extractFieldErrorMessage = (validationErrors: any, fallback: string) => {
    if (!Array.isArray(validationErrors) || validationErrors.length === 0) return ""
    const first =
      validationErrors?.[0]?.errorMessage ||
      validationErrors?.[0]?.message ||
      validationErrors?.[0]?.id
    return typeof first === "string" && first.trim() ? first : fallback
  }

  const validateWorldlineFields = (nextData: typeof formData) => {
    if (!paymentProduct?.getField) return

    const cardNumberValidation = paymentProduct.getField("cardNumber")?.validate?.(normalizeCardNumber(nextData.cardNumber))
    const expiryValidation = paymentProduct.getField("expiryDate")?.validate?.(normalizeExpiry(nextData.expiryDate))
    const cvvValidation = paymentProduct.getField("cvv")?.validate?.(normalizeCvv(nextData.cvv))

    setFieldErrors({
      cardNumber: extractFieldErrorMessage(cardNumberValidation, "Invalid card number"),
      expiryDate: extractFieldErrorMessage(expiryValidation, "Invalid expiry date"),
      cvv: extractFieldErrorMessage(cvvValidation, "Invalid CVV"),
    })
  }

  const applyFieldMask = (fieldId: "cardNumber" | "expiryDate" | "cvv", value: string) => {
    if (!paymentProduct?.getField) return value
    const field = paymentProduct.getField(fieldId)
    if (!field?.applyMask) return value
    try {
      return field.applyMask(value)
    } catch {
      return value
    }
  }

  const updateField = (name: keyof typeof formData, value: string) => {
    const formattedValue =
      name === "cardNumber" || name === "expiryDate" || name === "cvv"
        ? applyFieldMask(name, value)
        : value
    const nextData = { ...formData, [name]: formattedValue }
    setFormData(nextData)
    if (paymentProduct) {
      validateWorldlineFields(nextData)
    }
  }

  useEffect(() => {
    onPaymentErrorRef.current = onPaymentError
  }, [onPaymentError])

  useEffect(() => {
    let active = true
    const initKey = `${countryCode}:${currencyCode}:${amountMinor}`
    ;(async () => {
      try {
        if (typeof window === "undefined") return
        if (initKeyRef.current === initKey) {
          return
        }

        initKeyRef.current = initKey
        setIsLoadingSession(true)
        setError(null)

        const cachedInit = worldlineInlineInitResultByKey.get(initKey)
        if (cachedInit) {
          if (!active) return
          setSdk(cachedInit.sdk)
          setPaymentProduct(cachedInit.paymentProduct)
          return
        }

        const inFlightInit = worldlineInlineInitPromiseByKey.get(initKey)
        const initPromise = inFlightInit ?? (async () => {
          const res = await fetch("/api/v1/payments/worldline/inline/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: Number(paymentData?.amount || 0),
              currency: currencyCode,
            }),
          })
          const json = await res.json().catch(() => ({}))
          if (!res.ok || !json?.success || !json?.session) {
            throw new Error(json?.error || "Failed to initialize Worldline inline session")
          }
          const sessionData = json.session
          let worldlineSession: any = null
          try {
            worldlineSession = new (Session as any)({
              clientSessionId: sessionData.clientSessionId,
              customerId: sessionData.customerId,
              clientApiUrl: sessionData.clientApiUrl,
              assetUrl: sessionData.assetUrl,
              appIdentifier: "PayMyDine-Checkout",
            })
          } catch {
            worldlineSession = new (Session as any)(
              sessionData.clientSessionId,
              sessionData.customerId,
              sessionData.clientApiUrl,
              sessionData.assetUrl,
              {
                environment: sessionData.environment || "TEST",
                appIdentifier: "PayMyDine-Checkout",
              }
            )
          }
          console.info("[WorldlineInlineCardForm] Session initialized")

          const paymentContext = {
            countryCode,
            amountOfMoney: {
              amount: amountMinor,
              currencyCode,
            },
            isRecurring: false,
          }

          let product: any = null
          try {
            product = await worldlineSession.getPaymentProduct({
              productId: 1,
              paymentContext,
            })
          } catch {
            product = await worldlineSession.getPaymentProduct(1, paymentContext)
          }

          return { sdk: worldlineSession, paymentProduct: product }
        })()

        if (!inFlightInit) {
          worldlineInlineInitPromiseByKey.set(initKey, initPromise)
        }

        const resolvedInit = await initPromise
        worldlineInlineInitResultByKey.set(initKey, resolvedInit)
        worldlineInlineInitPromiseByKey.delete(initKey)
        if (!active) return
        setSdk(resolvedInit.sdk)
        setPaymentProduct(resolvedInit.paymentProduct)
        validateWorldlineFields(formData)
      } catch (err: any) {
        worldlineInlineInitPromiseByKey.delete(initKey)
        worldlineInlineInitResultByKey.delete(initKey)
        if (!initFailureShownRef.current) {
          console.error("[WorldlineInlineCardForm][session-init]", err)
          initFailureShownRef.current = true
        }
        if (!active) return
        const msg = "Could not initialize secure card payment."
        setError(msg)
        onPaymentErrorRef.current(msg)
      } finally {
        if (active) setIsLoadingSession(false)
      }
    })()
    return () => {
      active = false
    }
  }, [amountMinor, countryCode, currencyCode])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!sdk || !paymentProduct) {
      onPaymentError("Worldline SDK not ready")
      return
    }
    try {
      setIsProcessing(true)
      setError(null)
      const paymentRequest = buildPaymentRequest(formData)
      if (!paymentRequest) {
        throw new Error("Worldline payment form is not ready")
      }
      const validationResult = paymentRequest.validate?.()
      if (validationResult && typeof validationResult === "object" && "isValid" in validationResult && (validationResult as any).isValid === false) {
        validateWorldlineFields(formData)
        throw new Error("Please check your card details")
      }

      console.info("[WorldlineInlineCardForm] submit runtime keys", Object.keys(sdk || {}))
      console.info("[WorldlineInlineCardForm] typeof sdk.preparePaymentRequest", typeof sdk?.preparePaymentRequest)
      console.info("[WorldlineInlineCardForm] typeof sdk.encryptPaymentRequest", typeof sdk?.encryptPaymentRequest)
      console.info("[WorldlineInlineCardForm] typeof sdk.getEncryptor", typeof sdk?.getEncryptor)

      let preparedOrEncrypted: any = undefined
      if (typeof sdk?.preparePaymentRequest === "function") {
        console.info("[WorldlineInlineCardForm] using encryption method: sdk.preparePaymentRequest")
        preparedOrEncrypted = await sdk.preparePaymentRequest(paymentRequest)
      } else if (typeof sdk?.encryptPaymentRequest === "function") {
        console.info("[WorldlineInlineCardForm] using encryption method: sdk.encryptPaymentRequest")
        preparedOrEncrypted = await sdk.encryptPaymentRequest(paymentRequest)
      } else if (typeof sdk?.getEncryptor === "function") {
        const encryptor = sdk.getEncryptor()
        console.info("[WorldlineInlineCardForm] encryptor keys", Object.keys(encryptor || {}))
        console.info("[WorldlineInlineCardForm] typeof encryptor.encrypt", typeof encryptor?.encrypt)
        if (typeof encryptor?.encrypt === "function") {
          console.info("[WorldlineInlineCardForm] using encryption method: sdk.getEncryptor().encrypt")
          preparedOrEncrypted = await encryptor.encrypt(paymentRequest)
        }
      }

      console.info("[WorldlineInlineCardForm] encryption result", preparedOrEncrypted)

      const encryptedCustomerInput =
        preparedOrEncrypted?.encryptedCustomerInput ??
        preparedOrEncrypted?.encryptedFields ??
        preparedOrEncrypted?.payload?.encryptedCustomerInput ??
        preparedOrEncrypted?.paymentRequest?.encryptedCustomerInput ??
        ""

      const encodedClientMetaInfo =
        preparedOrEncrypted?.encodedClientMetaInfo ??
        preparedOrEncrypted?.payload?.encodedClientMetaInfo ??
        preparedOrEncrypted?.paymentRequest?.encodedClientMetaInfo ??
        ""

      if (!encryptedCustomerInput || typeof encryptedCustomerInput !== "string") {
        console.error("[WorldlineInlineCardForm] unexpected encryption payload", preparedOrEncrypted)
        throw new Error("Worldline encryption returned empty payload")
      }

      const payRes = await fetch("/api/v1/payments/worldline/inline/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentData?.amount || 0),
          currency: String(currency || "EUR").toUpperCase(),
          paymentProductId: Number(paymentProduct?.id || 1),
          encryptedCustomerInput,
          encodedClientMetaInfo,
          cardholderName: formData.cardholderName,
          email: formData.email,
          phone: formData.phone,
        }),
      })
      const payJson = await payRes.json().catch(() => ({}))
      if (!payRes.ok || !payJson?.success || !payJson?.payment_id) {
        throw new Error(payJson?.error || "Worldline inline payment failed")
      }

      const verifyRes = await fetch("/api/v1/payments/worldline/inline/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_id: String(payJson.payment_id) }),
      })
      const verifyJson = await verifyRes.json().catch(() => ({}))
      if (!verifyRes.ok || !verifyJson?.success || !verifyJson?.is_paid) {
        throw new Error("Worldline payment is not finalized yet")
      }

      onPaymentComplete({
        success: true,
        transactionId: String(verifyJson.payment_id),
        paymentMethod: "worldline",
      } as any)
    } catch (e: any) {
      console.error("[WorldlineInlineCardForm][submit]", e)
      const rawMsg = typeof e?.message === "string" ? e.message : ""
      const msg = rawMsg.includes("payment request is not valid")
        ? "Card details are invalid. Please check card number, expiry (MM/YY), and CVV."
        : (rawMsg || "Payment could not be completed. Please check your details and try again.")
      setError(msg)
      onPaymentErrorRef.current(msg)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <div className="space-y-2">
        <Label htmlFor="wlCardNumber">Card number</Label>
        <Input
          id="wlCardNumber"
          value={formData.cardNumber}
          onChange={(e) => updateField("cardNumber", e.target.value)}
          required
          autoComplete="cc-number"
          className="h-11 rounded-xl text-[15px]"
        />
        {fieldErrors.cardNumber ? <p className="text-xs text-red-500">{fieldErrors.cardNumber}</p> : null}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="wlExpiry">Expiry (MM/YY)</Label>
          <Input
            id="wlExpiry"
            value={formData.expiryDate}
            onChange={(e) => updateField("expiryDate", e.target.value)}
            required
            autoComplete="cc-exp"
            className="h-11 rounded-xl"
          />
          {fieldErrors.expiryDate ? <p className="text-xs text-red-500">{fieldErrors.expiryDate}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="wlCvv">CVV</Label>
          <Input
            id="wlCvv"
            value={formData.cvv}
            onChange={(e) => updateField("cvv", e.target.value)}
            required
            autoComplete="cc-csc"
            className="h-11 rounded-xl"
          />
          {fieldErrors.cvv ? <p className="text-xs text-red-500">{fieldErrors.cvv}</p> : null}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="wlCardholder">Cardholder name</Label>
          <Input
            id="wlCardholder"
            value={formData.cardholderName}
            onChange={(e) => updateField("cardholderName", e.target.value)}
            required
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wlEmail">Email</Label>
          <Input
            id="wlEmail"
            type="email"
            value={formData.email}
            onChange={(e) => updateField("email", e.target.value)}
            required
            className="h-11 rounded-xl"
          />
        </div>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={isLoadingSession || isProcessing || !sdk || !paymentProduct || !formIsValid}
        className="relative w-full min-w-full max-w-full h-[54px] rounded-2xl border-0 overflow-hidden disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: "transparent",
          boxShadow: "none",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            borderRadius: "16px",
            background: "linear-gradient(135deg, #635BFF 0%, #4F46E5 100%)",
            boxShadow: "0 8px 22px rgba(99, 91, 255, 0.35)",
            pointerEvents: "none",
          }}
        />
        <span
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            color: "#FFFFFF",
            fontSize: "16px",
            fontWeight: 700,
            width: "100%",
          }}
        >
          {isProcessing ? (
            <>
              <span
                className="animate-spin"
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255,255,255,0.35)",
                  borderTopColor: "#FFFFFF",
                  borderRadius: "9999px",
                }}
              />
              <span>Processing...</span>
            </>
          ) : isLoadingSession ? (
            <span>Initializing...</span>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              <span>Pay</span>
            </>
          )}
        </span>
      </button>
    </form>
  )
}

// PayPal Form Component
export function PayPalForm({ 
  paymentData, 
  onPaymentComplete, 
  onPaymentError,
  className,
  paypalFundingSource = "paypal",
}: SecurePaymentFormProps) {
  const [{ isPending }] = usePayPalScriptReducer()
  const [isProcessing, setIsProcessing] = useState(false)

  const createOrder = async () => {
    try {
      const response = await fetch('/api/v1/payments/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })

      const json = await response.json().catch(() => ({}))
      console.log('[PMD][PayPalForm][createOrder] =>', json)

      const paypalOrderId = json?.orderID || json?.orderId || json?.id || json?.paypal?.id

      if (!response.ok || !json?.success || !paypalOrderId) {
        throw new Error(json?.error || 'Failed to create PayPal order')
      }

      return paypalOrderId
    } catch (error: any) {
      onPaymentError(error?.message || 'Failed to create PayPal order')
      throw error
    }
  }

  const onApprove = async (data: any) => {
    setIsProcessing(true)

    try {
      const response = await fetch('/api/v1/payments/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderID: data?.orderID || data?.orderId,
          orderId: data?.orderID || data?.orderId,
          paymentData,
        }),
      })

      const result = await response.json().catch(() => ({}))
      console.log('[PMD][PayPalForm][onApprove] =>', result)

      if (response.ok && result?.success) {
        onPaymentComplete({
          success: true,
          transactionId: result.transactionId || result.captureID || result.orderID || data?.orderID,
          paymentMethod: 'paypal',
        })
      } else {
        onPaymentError(result?.error || 'Payment failed')
      }
    } catch (error: any) {
      onPaymentError(error?.message || 'Payment failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const onError = (error: any) => {
    onPaymentError(error?.message || 'PayPal payment failed')
  }

  if (isPending) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <span className="ml-2">Loading PayPal...</span>
      </div>
    )
  }

  return (
    <div className={cn("space-y-4 bg-transparent w-full", className)}>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          
        </p>
      </div>

      <div className="paypal-clean-wrap">
        <PayPalButtons
        fundingSource={paypalFundingSource}
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
        disabled={isProcessing}
        
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'pill',
          label: 'paypal',
          tagline: false,
          height: 45,
          borderRadius: 14,
        }}
        
      
      />
      </div>
      <style jsx>{`
        .paypal-clean-wrap {
          background: transparent !important;
          border-radius: 12px;
          overflow: hidden;
          padding: 0;
          margin: 0;
          line-height: 0;
        }

        .paypal-clean-wrap :global(div),
        .paypal-clean-wrap :global(.paypal-buttons),
        .paypal-clean-wrap :global(.paypal-button-container),
        .paypal-clean-wrap :global(.paypal-button-row),
        .paypal-clean-wrap :global(iframe) {
          background: transparent !important;
        }

        .paypal-clean-wrap :global(.paypal-button-container) {
          border-radius: 12px !important;
          overflow: hidden !important;
          min-width: 100% !important;
          max-width: 100% !important;
        }

        .paypal-clean-wrap :global(.paypal-button-row) {
          border-radius: 12px !important;
          overflow: hidden !important;
        }

        .paypal-clean-wrap :global(iframe) {
          border-radius: 12px !important;
          display: block !important;
        }
      `}</style>
    </div>
  )
}
        
// Apple Pay Button Component
export function ApplePayButton({ 
  paymentData, 
  onPaymentComplete, 
  onPaymentError,
  className 
}: SecurePaymentFormProps) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Check if Apple Pay is available
    if (typeof window !== 'undefined' && window.ApplePaySession) {
      setIsAvailable(ApplePaySession.canMakePayments())
    }
  }, [])

  const handleApplePay = async () => {
    if (!isAvailable) {
      onPaymentError('Apple Pay is not available on this device')
      return
    }

    setIsProcessing(true)

    try {
      const paymentRequest = {
        countryCode: 'US',
        currencyCode: paymentData.currency,
        supportedNetworks: ['visa', 'masterCard', 'amex'],
        merchantCapabilities: ['supports3DS'],
        total: {
          label: 'PayMyDine',
          amount: paymentData.amount.toFixed(2),
        },
      }

      const session = new ApplePaySession(3, paymentRequest)

      session.onvalidatemerchant = async (event) => {
        try {
          const response = await fetch('/api/payments/validate-apple-pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ validationURL: event.validationURL }),
          })

          const { merchantSession } = await response.json()
          session.completeMerchantValidation(merchantSession)
        } catch (error) {
          session.abort()
          onPaymentError('Failed to validate merchant')
        }
      }

      session.onpaymentauthorized = async (event) => {
        try {
          const response = await fetch('/api/payments/process-apple-pay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...paymentData,
              paymentData: event.payment,
            }),
          })

          const result = await response.json()

          if (result.success) {
            session.completePayment(ApplePaySession.STATUS_SUCCESS)
            onPaymentComplete({
              success: true,
              transactionId: result.transactionId,
              paymentMethod: 'applepay',
            })
          } else {
            session.completePayment(ApplePaySession.STATUS_FAILURE)
            onPaymentError(result.error || 'Payment failed')
          }
        } catch (error) {
          session.completePayment(ApplePaySession.STATUS_FAILURE)
          onPaymentError('Payment processing failed')
        }
      }

      session.begin()
    } catch (error: any) {
      onPaymentError(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isAvailable) {
    return null
  }

  return (
    <div className={cn("space-y-4 bg-transparent w-full", className)}>
      <Button
        onClick={handleApplePay}
        disabled={isProcessing}
        className="w-full bg-black text-white hover:bg-gray-800"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5">🍎</div>
            Pay with Apple Pay
          </div>
        )}
      </Button>
    </div>
  )
}

// Google Pay Button Component
export function GooglePayButton({ 
  paymentData, 
  onPaymentComplete, 
  onPaymentError,
  className 
}: SecurePaymentFormProps) {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    // Check if Google Pay is available
    if (typeof window !== 'undefined' && window.google) {
      const paymentsClient = new window.google.payments.api.PaymentsClient({
        environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST',
      })

      paymentsClient.isReadyToPay({
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
          },
        }],
      }).then((result: any) => {
        setIsAvailable(result.result)
      }).catch(() => {
        setIsAvailable(false)
      })
    }
  }, [])

  const handleGooglePay = async () => {
    if (!isAvailable) {
      onPaymentError('Google Pay is not available on this device')
      return
    }

    setIsProcessing(true)

    try {
      const paymentsClient = new window.google.payments.api.PaymentsClient({
        environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST',
      })

      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [{
          type: 'CARD',
          parameters: {
            allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
            allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX'],
          },
          tokenizationSpecification: {
            type: 'PAYMENT_GATEWAY',
            parameters: {
              gateway: 'stripe',
              gatewayMerchantId: process.env.NEXT_PUBLIC_STRIPE_ACCOUNT_ID,
            },
          },
        }],
        transactionInfo: {
          totalPriceStatus: 'FINAL',
          totalPrice: paymentData.amount.toFixed(2),
          currencyCode: paymentData.currency,
        },
        merchantInfo: {
          merchantId: paymentData.restaurantId,
          merchantName: 'PayMyDine',
        },
      }

      const paymentDataResponse = await paymentsClient.loadPaymentData(paymentDataRequest)

      const response = await fetch('/api/payments/process-google-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentData,
          paymentData: paymentDataResponse,
        }),
      })

      const result = await response.json()

      if (result.success) {
        onPaymentComplete({
          success: true,
          transactionId: result.transactionId,
          paymentMethod: 'googlepay',
        })
      } else {
        onPaymentError(result.error || 'Payment failed')
      }
    } catch (error: any) {
      onPaymentError(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isAvailable) {
    return null
  }

  return (
    <div className={cn("space-y-4 bg-transparent w-full", className)}>
      <Button
        onClick={handleGooglePay}
        disabled={isProcessing}
        className="w-full bg-blue-600 text-white hover:bg-blue-700"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5">G</div>
            Pay with Google Pay
          </div>
        )}
      </Button>
    </div>
  )
}

// Cash Payment Component
export function CashPaymentForm({ 
  paymentData, 
  onPaymentComplete, 
  onPaymentError,
  className 
}: SecurePaymentFormProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCashPayment = async () => {
    setIsProcessing(true)

    try {
      const response = await fetch('/api/payments/process-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })

      const result = await response.json()

      if (result.success) {
        onPaymentComplete({
          success: true,
          transactionId: result.transactionId,
          paymentMethod: 'cash',
        })
      } else {
        onPaymentError(result.error || 'Payment recording failed')
      }
    } catch (error: any) {
      onPaymentError(error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className={cn("space-y-4 bg-transparent w-full", className)}>
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CreditCard className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Cash Payment</h3>
        <p className="text-sm text-gray-600 mb-4">
          A waiter will come to collect payment at your table.
        </p>
        <div className="text-2xl font-bold text-green-600">
          ${paymentData.amount.toFixed(2)}
        </div>
      </div>

      <Button
        onClick={handleCashPayment}
        disabled={isProcessing}
        className="w-full bg-green-600 text-white hover:bg-green-700"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Recording...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Confirm Cash Payment
          </div>
        )}
      </Button>
    </div>
  )
}
