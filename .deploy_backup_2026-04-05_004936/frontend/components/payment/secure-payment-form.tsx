"use client"

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react"
import type { ReactNode } from "react"
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js"
import { PayPalButtons, usePayPalScriptReducer } from "@paypal/react-paypal-js"
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

type WorldlineRuntimeSdk = {
  init: (...args: any[]) => any
  PaymentRequest: new (...args: any[]) => any
  source:
    | "esm:init"
    | "esm:default.init"
    | "umd:window.onlinepaymentssdk"
    | "umd:window.OnlinePaymentsSdk"
    | "umd:window.Worldline"
}

const WORLDLINE_UMD_SOURCES = [
  "https://cdn.jsdelivr.net/npm/onlinepayments-sdk-client-js@3.4.0/dist/onlinepayments-sdk-client-js.js",
  "https://unpkg.com/onlinepayments-sdk-client-js@3.4.0/dist/onlinepayments-sdk-client-js.js",
]

let worldlineUmdLoadPromise: Promise<boolean> | null = null
const worldlineInlineInitPromiseByKey = new Map<string, Promise<{ sdk: any; paymentProduct: any; runtimeSdk: WorldlineRuntimeSdk }>>()
const worldlineInlineInitResultByKey = new Map<string, { sdk: any; paymentProduct: any; runtimeSdk: WorldlineRuntimeSdk }>()

function resolveWorldlineRuntimeSdk(mod: any): WorldlineRuntimeSdk | null {
  const onlinePaymentsGlobal = typeof window !== "undefined" ? (window as any)?.onlinepaymentssdk : null
  const onlinePaymentsSdkGlobal = typeof window !== "undefined" ? (window as any)?.OnlinePaymentsSdk : null
  const worldlineGlobal = typeof window !== "undefined" ? (window as any)?.Worldline : null

  const globalCandidates = [
    { value: onlinePaymentsGlobal, source: "umd:window.onlinepaymentssdk" as const },
    { value: onlinePaymentsSdkGlobal, source: "umd:window.OnlinePaymentsSdk" as const },
    { value: worldlineGlobal, source: "umd:window.Worldline" as const },
    { value: worldlineGlobal?.onlinepaymentssdk, source: "umd:window.Worldline" as const },
    { value: worldlineGlobal?.OnlinePaymentsSdk, source: "umd:window.Worldline" as const },
  ]

  const esmInit = mod?.init
  const esmDefaultInit = mod?.default?.init
  const esmPaymentRequest = mod?.PaymentRequest
  const esmDefaultPaymentRequest = mod?.default?.PaymentRequest

  if (typeof esmInit === "function" && typeof esmPaymentRequest === "function") {
    return { init: esmInit, PaymentRequest: esmPaymentRequest, source: "esm:init" }
  }
  if (typeof esmDefaultInit === "function" && typeof esmDefaultPaymentRequest === "function") {
    return { init: esmDefaultInit, PaymentRequest: esmDefaultPaymentRequest, source: "esm:default.init" }
  }

  for (const candidate of globalCandidates) {
    if (typeof candidate?.value?.init === "function" && typeof candidate?.value?.PaymentRequest === "function") {
      return { init: candidate.value.init, PaymentRequest: candidate.value.PaymentRequest, source: candidate.source }
    }
  }

  return null
}

async function ensureWorldlineUmdLoaded(): Promise<boolean> {
  if (typeof window === "undefined") return false
  if ((window as any)?.onlinepaymentssdk?.init) return true
  if (worldlineUmdLoadPromise) return worldlineUmdLoadPromise

  worldlineUmdLoadPromise = (async () => {
    for (const src of WORLDLINE_UMD_SOURCES) {
      try {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector(`script[data-worldline-sdk-src="${src}"]`) as HTMLScriptElement | null
          if (existing) {
            if ((window as any)?.onlinepaymentssdk?.init) return resolve()
            existing.addEventListener("load", () => resolve(), { once: true })
            existing.addEventListener("error", () => reject(new Error("Worldline SDK script failed")), { once: true })
            return
          }

          const script = document.createElement("script")
          script.src = src
          script.async = true
          script.defer = true
          script.dataset.worldlineSdkSrc = src
          script.onload = () => resolve()
          script.onerror = () => reject(new Error("Worldline SDK script failed"))
          document.head.appendChild(script)
        })

        if ((window as any)?.onlinepaymentssdk?.init) {
          return true
        }
      } catch {
        // try the next fallback source
      }
    }

    return Boolean((window as any)?.onlinepaymentssdk?.init)
  })()

  return worldlineUmdLoadPromise
}

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
  const instanceIdRef = useRef<string>(`wl-inline-${Math.random().toString(36).slice(2, 10)}`)
  const renderCountRef = useRef(0)
  const sdkRuntimeRef = useRef<WorldlineRuntimeSdk | null>(null)
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
  const amountMinor = Math.round(Number(paymentData?.amount || 0) * 100)
  const formIsValid = useMemo(() => {
    return Boolean(
      formData.cardholderName.trim() &&
      formData.email.trim() &&
      formData.cardNumber.replace(/\s+/g, "").length >= 12 &&
      formData.expiryDate.trim().length >= 4 &&
      formData.cvv.trim().length >= 3
    )
  }, [formData])
  const currencyCode = String(currency || "EUR").toUpperCase()

  useEffect(() => {
    onPaymentErrorRef.current = onPaymentError
  }, [onPaymentError])

  useEffect(() => {
    console.info(`[WorldlineInlineCardForm][TEMP] mount (${instanceIdRef.current})`)
    return () => {
      console.info(`[WorldlineInlineCardForm][TEMP] unmount (${instanceIdRef.current})`)
    }
  }, [])

  useEffect(() => {
    renderCountRef.current += 1
    console.info(`[WorldlineInlineCardForm][TEMP] render #${renderCountRef.current} (${instanceIdRef.current})`)
  })

  useEffect(() => {
    let active = true
    const initKey = `${countryCode}:${currencyCode}:${amountMinor}`
    ;(async () => {
      try {
        if (typeof window === "undefined") return
        if (initKeyRef.current === initKey) {
          console.info(`[WorldlineInlineCardForm][TEMP] init skip same key (${instanceIdRef.current}): ${initKey}`)
          return
        }

        console.info(`[WorldlineInlineCardForm][TEMP] init key (${instanceIdRef.current}): ${initKey}`)
        initKeyRef.current = initKey
        setIsLoadingSession(true)
        setError(null)

        const cachedInit = worldlineInlineInitResultByKey.get(initKey)
        if (cachedInit) {
          console.info(`[WorldlineInlineCardForm][TEMP] init cache hit (${instanceIdRef.current}): ${initKey}`)
          sdkRuntimeRef.current = cachedInit.runtimeSdk
          if (!active) return
          console.info(`[WorldlineInlineCardForm][TEMP] set sdk/paymentProduct from cache (${instanceIdRef.current})`)
          setSdk(cachedInit.sdk)
          setPaymentProduct(cachedInit.paymentProduct)
          return
        }

        // Root cause: the SDK export shape differs across build/runtime modes in Next.js.
        // We dynamically detect the real shape at runtime, then lock onto a stable path.
        const inFlightInit = worldlineInlineInitPromiseByKey.get(initKey)
        const initPromise = inFlightInit ?? (async () => {
          console.info("[WorldlineInlineCardForm][TEMP] sdk resolution start")
          let sdkModule: any = null
          try {
            // Intentionally avoid a static import string so Next build does not hard-fail
            // when this dependency is missing in a given deployment artifact.
            const runtimeImport = (0, eval)("specifier => import(specifier)") as (specifier: string) => Promise<any>
            sdkModule = await runtimeImport("onlinepayments-sdk-client-js")
            console.info("[WorldlineInlineCardForm][TEMP] sdk import success")
          } catch (importError) {
            console.warn("[WorldlineInlineCardForm] ESM import failed, trying UMD fallback.", importError)
          }

          // TEMP diagnostics to inspect actual runtime shape in production.
          console.info("[WorldlineInlineCardForm][TEMP] Object.keys(mod):", Object.keys(sdkModule || {}))
          console.info("[WorldlineInlineCardForm][TEMP] typeof mod.init:", typeof sdkModule?.init)
          console.info("[WorldlineInlineCardForm][TEMP] typeof mod.default?.init:", typeof sdkModule?.default?.init)
          console.info("[WorldlineInlineCardForm][TEMP] typeof window.onlinepaymentssdk:", typeof (window as any)?.onlinepaymentssdk)
          console.info("[WorldlineInlineCardForm][TEMP] typeof window.OnlinePaymentsSdk:", typeof (window as any)?.OnlinePaymentsSdk)
          console.info("[WorldlineInlineCardForm][TEMP] typeof window.Worldline:", typeof (window as any)?.Worldline)

          let runtimeSdk = resolveWorldlineRuntimeSdk(sdkModule)
          if (!runtimeSdk) {
            const umdLoaded = await ensureWorldlineUmdLoaded()
            if (umdLoaded) {
              console.info("[WorldlineInlineCardForm][TEMP] sdk UMD fallback loaded")
              runtimeSdk = resolveWorldlineRuntimeSdk(sdkModule)
            }
          }

          if (!runtimeSdk) {
            throw new Error("Worldline SDK runtime adapter unavailable")
          }
          console.info(`[WorldlineInlineCardForm][TEMP] sdk resolution result: ${runtimeSdk.source}`)

          console.info("[WorldlineInlineCardForm][TEMP] session fetch start")
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
            console.error("[WorldlineInlineCardForm][TEMP] session fetch fail", { status: res.status, json })
            throw new Error(json?.error || "Failed to initialize Worldline inline session")
          }
          console.info("[WorldlineInlineCardForm][TEMP] session fetch success")

          const paymentContext = {
            countryCode,
            amountOfMoney: {
              amount: amountMinor,
              currencyCode,
            },
            isRecurring: false,
          }

          console.info("[WorldlineInlineCardForm][TEMP] payment product fetch start")
          const worldlineSdk = runtimeSdk.init(
            {
              clientSessionId: json.session.clientSessionId,
              customerId: json.session.customerId,
              clientApiUrl: json.session.clientApiUrl,
              assetUrl: json.session.assetUrl,
            },
            { appIdentifier: "PayMyDine-Checkout" }
          )
          const product = await worldlineSdk.getPaymentProduct(1, paymentContext)
          console.info("[WorldlineInlineCardForm][TEMP] payment product fetch success")

          return { sdk: worldlineSdk, paymentProduct: product, runtimeSdk }
        })()

        if (!inFlightInit) {
          worldlineInlineInitPromiseByKey.set(initKey, initPromise)
        }

        const resolvedInit = await initPromise
        worldlineInlineInitResultByKey.set(initKey, resolvedInit)
        worldlineInlineInitPromiseByKey.delete(initKey)
        sdkRuntimeRef.current = resolvedInit.runtimeSdk
        if (!active) return
        console.info(`[WorldlineInlineCardForm][TEMP] set sdk/paymentProduct state (${instanceIdRef.current})`)
        setSdk(resolvedInit.sdk)
        setPaymentProduct(resolvedInit.paymentProduct)
      } catch (e: any) {
        worldlineInlineInitPromiseByKey.delete(initKey)
        worldlineInlineInitResultByKey.delete(initKey)
        console.error("[WorldlineInlineCardForm][TEMP] payment product/session fail", e)
        if (!initFailureShownRef.current) {
          console.error("[WorldlineInlineCardForm][session-init]", e)
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
      const PaymentRequestCtor = sdkRuntimeRef.current?.PaymentRequest
      if (typeof PaymentRequestCtor !== "function") {
        throw new Error("Worldline PaymentRequest is unavailable in this runtime")
      }
      const paymentRequest = new PaymentRequestCtor(paymentProduct)
      paymentRequest.setValue("cardholderName", (formData.cardholderName || "").trim())
      paymentRequest.setValue("cardNumber", (formData.cardNumber || "").trim())
      paymentRequest.setValue("expiryDate", (formData.expiryDate || "").trim())
      paymentRequest.setValue("cvv", (formData.cvv || "").trim())
      const validationResult = paymentRequest.validate?.()
      if (Array.isArray(validationResult) && validationResult.length > 0) {
        throw new Error("Please check your card details")
      }
      if (validationResult && typeof validationResult === "object" && "isValid" in validationResult && (validationResult as any).isValid === false) {
        throw new Error("Please check your card details")
      }

      const encryptedRequest = await sdk.encryptPaymentRequest(paymentRequest)
      if (!encryptedRequest?.encryptedCustomerInput) {
        throw new Error("Worldline encryption returned empty payload")
      }

      const payRes = await fetch("/api/v1/payments/worldline/inline/create-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(paymentData?.amount || 0),
          currency: String(currency || "EUR").toUpperCase(),
          paymentProductId: Number(paymentProduct?.id || 1),
          encryptedCustomerInput: encryptedRequest.encryptedCustomerInput,
          encodedClientMetaInfo: encryptedRequest.encodedClientMetaInfo || "",
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
      const msg = "Payment could not be completed. Please check your details and try again."
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
          onChange={(e) => setFormData((p) => ({ ...p, cardNumber: e.target.value }))}
          required
          autoComplete="cc-number"
          className="h-11 rounded-xl text-[15px]"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="wlExpiry">Expiry (MM/YY)</Label>
          <Input
            id="wlExpiry"
            value={formData.expiryDate}
            onChange={(e) => setFormData((p) => ({ ...p, expiryDate: e.target.value }))}
            required
            autoComplete="cc-exp"
            className="h-11 rounded-xl"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wlCvv">CVV</Label>
          <Input
            id="wlCvv"
            value={formData.cvv}
            onChange={(e) => setFormData((p) => ({ ...p, cvv: e.target.value }))}
            required
            autoComplete="cc-csc"
            className="h-11 rounded-xl"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="wlCardholder">Cardholder name</Label>
          <Input
            id="wlCardholder"
            value={formData.cardholderName}
            onChange={(e) => setFormData((p) => ({ ...p, cardholderName: e.target.value }))}
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
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
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
