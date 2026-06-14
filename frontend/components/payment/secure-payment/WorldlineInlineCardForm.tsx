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

const worldlineInlineInitPromiseByKey = new Map<string, Promise<{ sdk: any; paymentProduct: any }>>()
const worldlineInlineInitResultByKey = new Map<string, { sdk: any; paymentProduct: any }>()

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

  const normalizeCardNumber = (value: any) => String(value ?? "").replace(/\D/g, "")
  const normalizeExpiry = (value: any) => {
    return String(value ?? "").replace(/\D/g, "").slice(0, 4)
  }
  const normalizeCvv = (value: any) => String(value ?? "").replace(/\D/g, "")

  const getExpiryDigits = (value: any) => String(value ?? "").replace(/\D/g, "").slice(0, 4)

  const getPaymentRequestProbe = (paymentRequest: any) => {
    const safeGet = (key: string) => {
      try {
        if (typeof paymentRequest?.getValue === "function") {
          return paymentRequest.getValue(key)
        }
      } catch {}
      try {
        return paymentRequest?.[key]
      } catch {}
      return undefined
    }

    let validationSummary: any = null
    try {
      const vr = paymentRequest?.validate?.()
      validationSummary =
        vr && typeof vr === "object"
          ? {
              isValid: (vr as any).isValid,
              errorCount: Array.isArray((vr as any).errors) ? (vr as any).errors.length : undefined,
              errors: (vr as any).errors ?? undefined,
            }
          : vr
    } catch (e: any) {
      validationSummary = { threw: true, message: String(e?.message || e) }
    }

    return {
      cardNumber: safeGet("cardNumber"),
      expiryDate: safeGet("expiryDate"),
      cvv: safeGet("cvv"),
      cardholderName: safeGet("cardholderName"),
      securityCode: safeGet("securityCode"),
      expiryMonth: safeGet("expiryMonth"),
      expiryYear: safeGet("expiryYear"),
      keys: (() => {
        try { return Object.keys(paymentRequest || {}) } catch { return [] }
      })(),
      validation: validationSummary,
    }
  }

  const getProductField = (product: any, fieldId: string) => {
    try {
      if (typeof product?.getField === "function") {
        return product.getField(fieldId)
      }
    } catch {}

    if (product?.paymentProductFieldById?.[fieldId]) {
      return product.paymentProductFieldById[fieldId]
    }

    if (Array.isArray(product?.paymentProductFields)) {
      return product.paymentProductFields.find((f: any) => f?.id === fieldId) || null
    }

    return null
  }

  const buildPaymentRequest = (nextData: typeof formData) => {
    if (!paymentProduct) return null

    const paymentRequest = paymentProduct?.createPaymentRequest?.() || sdk?.createPaymentRequest?.(paymentProduct?.id)

    const maybeSet = (fieldId: string, value: any) => {
      const normalizedValue = String(value ?? "")
      if (!normalizedValue) return
      try {
        const field = getProductField(paymentProduct, fieldId)
        if (!field) return
        paymentRequest?.setValue?.(fieldId, normalizedValue)
      } catch {}
    }

    const cardholderName = String(nextData.cardholderName ?? "").trim()
    const cardNumber = normalizeCardNumber(nextData.cardNumber)
    const expiryMasked = normalizeExpiry(nextData.expiryDate)
    const expiryDigits = getExpiryDigits(nextData.expiryDate)
    const cvv = normalizeCvv(nextData.cvv)

    maybeSet("cardholderName", cardholderName)
    maybeSet("cardNumber", cardNumber)
    maybeSet("expiryDate", expiryDigits) // FIX: Worldline requires MMYY
    maybeSet("cvv", cvv)

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
    if (!paymentProduct) return

    const cardNumberValue = normalizeCardNumber(nextData.cardNumber)
    const expiryMasked = normalizeExpiry(nextData.expiryDate)
    const expiryDigits = getExpiryDigits(nextData.expiryDate)
    const cvvValue = normalizeCvv(nextData.cvv)

    const cardNumberField = getProductField(paymentProduct, "cardNumber")
    const expiryDateField = getProductField(paymentProduct, "expiryDate")
    const cvvField = getProductField(paymentProduct, "cvv") || getProductField(paymentProduct, "securityCode")

    const cardNumberValidation = cardNumberField?.validate?.(cardNumberValue)
    const expiryValidation = expiryDateField?.validate?.(expiryDigits)
    const cvvValidation = cvvField?.validate?.(cvvValue)

    setFieldErrors({
      cardNumber: extractFieldErrorMessage(cardNumberValidation, "Invalid card number"),
      expiryDate: extractFieldErrorMessage(expiryValidation, "Invalid expiry date"),
      cvv: extractFieldErrorMessage(cvvValidation, "Invalid CVV"),
    })
  }

  const applyFieldMask = (fieldId: "cardNumber" | "expiryDate" | "cvv", value: any) => {
    const raw = String(value ?? "")
    const field = getProductField(paymentProduct, fieldId)

    try {
      if (field && typeof field.applyMask === "function" && fieldId !== "expiryDate") {
        const masked: any = field.applyMask(raw)

        if (typeof masked === "string") return masked

        if (masked && typeof masked === "object") {
          if (typeof masked.formattedValue === "string") return masked.formattedValue
          if (typeof masked.value === "string") return masked.value
          if (typeof masked.maskedValue === "string") return masked.maskedValue
        }
      }
    } catch {}

    if (fieldId === "cardNumber") {
      const digits = raw.replace(/\D/g, "").slice(0, 16)
      return digits.replace(/(.{4})/g, "$1 ").trim()
    }

    if (fieldId === "expiryDate") {
      return raw.replace(/\D/g, "").slice(0, 4)
    }

    if (fieldId === "cvv") {
      return raw.replace(/\D/g, "").slice(0, 4)
    }

    return raw
  }

  const updateField = (name: keyof typeof formData, value: any) => {
    let nextValue = String(value ?? "")

    if (name === "cardNumber") {
      const digits = nextValue.replace(/\D/g, "").slice(0, 19)
      nextValue = digits.replace(/(.{4})/g, "$1 ").trim()
    } else if (name === "expiryDate") {
      const digits = nextValue.replace(/\D/g, "").slice(0, 4)
      nextValue = digits.length > 2 ? digits.slice(0, 2) + "/" + digits.slice(2) : digits
    } else if (name === "cvv") {
      nextValue = nextValue.replace(/\D/g, "").slice(0, 4)
    }

    setFormData((prev) => {
      const next = { ...prev, [name]: nextValue }
      validateWorldlineFields(next)
      return next
    })
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
          ;(window as any).__pmdWorldlineSessionData = sessionData
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

          try {
            ;(window as any).__pmdWorldlineSdkDebug = {
              constructorName: worldlineSession?.constructor?.name ?? null,
              ownKeys: Object.keys(worldlineSession || {}),
              hasGetPaymentRequest: typeof worldlineSession?.getPaymentRequest === "function",
              hasGetEncryptor: typeof worldlineSession?.getEncryptor === "function",
              hasEncryptPaymentRequest: typeof worldlineSession?.encryptPaymentRequest === "function",
              hasPreparePaymentRequest: typeof worldlineSession?.preparePaymentRequest === "function",
              hasGetPaymentProduct: typeof worldlineSession?.getPaymentProduct === "function",
              protoKeys: Object.getOwnPropertyNames(Object.getPrototypeOf(worldlineSession || {})),
            }
          } catch {}

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

          try {
            ;(window as any).__pmdWorldlineProductDebug = {
              id: product?.id ?? null,
              constructorName: product?.constructor?.name ?? null,
              ownKeys: Object.keys(product || {}),
              hasCreatePaymentRequest: typeof product?.createPaymentRequest === "function",
              hasGetField: typeof product?.getField === "function",
              fieldIds: Array.isArray(product?.paymentProductFields)
                ? product.paymentProductFields.map((f: any) => f?.id)
                : [],
            }
          } catch {}

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

        try {
          const pp: any = resolvedInit.paymentProduct
          const fields =
            Array.isArray(pp?.paymentProductFields)
              ? pp.paymentProductFields.map((f: any) => ({
                  id: f?.id,
                  type: f?.type,
                  dataType: f?.dataType,
                  preferredInputType: f?.displayHints?.preferredInputType,
                  obfuscate: f?.displayHints?.obfuscate,
                }))
              : []
          console.info("[WorldlineInlineCardForm] PRODUCT DEBUG", {
            productId: pp?.id,
            fields,
            hasCreatePaymentRequest: typeof pp?.createPaymentRequest === "function",
            hasGetField: typeof pp?.getField === "function",
          })
        } catch (e) {
          console.warn("[WorldlineInlineCardForm] PRODUCT DEBUG failed", e)
        }

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
      const msg = "Worldline SDK not ready"
      setError(msg)
      onPaymentErrorRef.current(msg)
      return
    }

    let constructorAttempts: any[] = []
    let chosenStrategy: string | null = null
    let chosenRequest: any = null
    let chosenEncrypted: any = null
    let requestValuesAfterSet: any = null

    try {
      setIsProcessing(true)
      setError(null)

      const rawCardNumber = normalizeCardNumber(formData.cardNumber)
      const expiryInput = String(formData.expiryDate ?? "")
      const expiryDigits = getExpiryDigits(expiryInput)
      const rawCvv = normalizeCvv(formData.cvv)
      const rawCardholder = String(formData.cardholderName ?? "").trim()

      if (rawCardNumber.length < 12) throw new Error("Card number is incomplete")
      if (expiryDigits.length !== 4) throw new Error("Expiry date must be MM/YY")
      if (rawCvv.length < 3) throw new Error("CVV is incomplete")
      if (!rawCardholder) throw new Error("Cardholder name is required")

      const buildCandidates = () => {
        const out: Array<{ name: string; build: () => any }> = []

        out.push({
          name: "new PaymentRequest()+setPaymentProduct(paymentProduct)",
          build: () => {
            const req = new PaymentRequest()

            try {
              if (typeof req?.setPaymentProduct === "function") {
                req.setPaymentProduct(paymentProduct)
              }
            } catch {}

            return req
          }
        })

        return out
      }

      const safeSet = (paymentRequest: any, fieldId: string, value: string) => {
        const result: any = { fieldId, value, ok: false, errors: [] }

        if (!value) return result

        try {
          if (typeof paymentRequest?.setValue === "function") {
            paymentRequest.setValue(fieldId, value)
            result.ok = true
          } else {
            result.errors.push("setValue is unavailable")
          }
        } catch (e: any) {
          result.errors.push(String(e?.message || e))
        }

        return result
      }

      const safeGet = (paymentRequest: any, fieldId: string) => {
        try {
          if (typeof paymentRequest?.getValue === "function") {
            return paymentRequest.getValue(fieldId)
          }
        } catch {}

        try {
          return paymentRequest?.[fieldId]
        } catch {}

        return undefined
      }

      const encryptWithSdk = async (paymentRequest: any) => {
        if (typeof sdk?.encryptPaymentRequest === "function") {
          return await sdk.encryptPaymentRequest(paymentRequest)
        }

        if (typeof sdk?.preparePaymentRequest === "function") {
          return await sdk.preparePaymentRequest(paymentRequest)
        }

        if (typeof sdk?.getEncryptor === "function") {
          const encryptor = sdk.getEncryptor()
          if (typeof encryptor?.encrypt === "function") {
            return await encryptor.encrypt(paymentRequest)
          }
        }

        throw new Error("No supported Worldline encryption method found")
      }

      const candidates = buildCandidates().filter((x) => typeof x?.build === "function")

      for (const candidate of candidates) {
        const attempt: any = {
          strategy: candidate.name,
          buildOk: false,
          setResults: null,
          requestValuesAfterSet: null,
          encryptOk: false,
          encryptError: null,
        }

        try {
          const paymentRequest = candidate.build()
          if (!paymentRequest) {
            attempt.encryptError = "builder returned null"
            constructorAttempts.push(attempt)
            continue
          }

          attempt.buildOk = true

          const setResults = {
            cardNumber: safeSet(paymentRequest, "cardNumber", rawCardNumber),
            expiryDate: safeSet(paymentRequest, "expiryDate", expiryDigits),
            cvv: safeSet(paymentRequest, "cvv", rawCvv),
            cardholderName: safeSet(paymentRequest, "cardholderName", rawCardholder),
          }

          attempt.setResults = setResults
          attempt.requestValuesAfterSet = {
            cardNumber: safeGet(paymentRequest, "cardNumber"),
            expiryDate: safeGet(paymentRequest, "expiryDate"),
            cvv: safeGet(paymentRequest, "cvv"),
            cardholderName: safeGet(paymentRequest, "cardholderName"),
          }

          const encrypted = await encryptWithSdk(paymentRequest)

          attempt.encryptOk = true
          chosenStrategy = candidate.name
          chosenRequest = paymentRequest
          chosenEncrypted = encrypted
          requestValuesAfterSet = attempt.requestValuesAfterSet

          constructorAttempts.push(attempt)
          break
        } catch (e: any) {
          attempt.encryptError = String(e?.message || e)
          try {
            attempt.encryptErrorValidationErrors = e?.validationErrors ?? null
          } catch {}
          try {
            attempt.validationProbeAfterError = getPaymentRequestProbe(paymentRequest)
          } catch {}
          constructorAttempts.push(attempt)
        }
      }

      console.info("[WorldlineInlineCardForm] CONSTRUCTOR ATTEMPTS", constructorAttempts)

      try {
        const validateResult =
          typeof chosenRequest?.validate === "function"
            ? chosenRequest.validate()
            : null

        console.info("[WorldlineInlineCardForm] FINAL REQUEST VALIDATION", {
          chosenStrategy,
          requestValuesAfterSet,
          validateResult,
          probe: getPaymentRequestProbe(chosenRequest),
        })
      } catch (e) {
        console.warn("[WorldlineInlineCardForm] FINAL REQUEST VALIDATION failed", e)
      }

      if (!chosenRequest || !chosenEncrypted) {
        throw new Error("All PaymentRequest construction strategies failed")
      }

      const parsedPreparedOrEncrypted =
        typeof chosenEncrypted === "string"
          ? (() => {
              try {
                return JSON.parse(chosenEncrypted)
              } catch {
                return { encryptedCustomerInput: chosenEncrypted }
              }
            })()
          : chosenEncrypted

      const encryptedCustomerInput =
        parsedPreparedOrEncrypted?.encryptedCustomerInput ??
        parsedPreparedOrEncrypted?.encryptedFields ??
        parsedPreparedOrEncrypted?.payload?.encryptedCustomerInput ??
        parsedPreparedOrEncrypted?.paymentRequest?.encryptedCustomerInput ??
        chosenRequest?.encryptedCustomerInput ??
        ""

      const encodedClientMetaInfo =
        parsedPreparedOrEncrypted?.encodedClientMetaInfo ??
        parsedPreparedOrEncrypted?.payload?.encodedClientMetaInfo ??
        parsedPreparedOrEncrypted?.paymentRequest?.encodedClientMetaInfo ??
        chosenRequest?.encodedClientMetaInfo ??
        ""

      if (!encryptedCustomerInput || typeof encryptedCustomerInput !== "string") {
        throw new Error("Worldline encryption failed: encrypted customer payload is missing")
      }

      console.info('PMD FRONT CREATE PAYMENT PAYLOAD', {
  url: "/api/v1/payments/worldline/inline/create-payment",
  payloadPreview: (typeof payload !== 'undefined' ? payload : (typeof requestBody !== 'undefined' ? requestBody : (typeof body !== 'undefined' ? body : null))),
  encryptedRequestPreview: (typeof encryptedRequest !== 'undefined' ? encryptedRequest : null)
});
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
        transactionId: String(verifyJson.payment_id || payJson.payment_id),
        paymentMethod: "worldline",
      } as any)
    } catch (e: any) {
      const rawMsg = typeof e?.message === "string" ? e.message : ""

      const expiryInput = String(formData.expiryDate ?? "")
      const expiryDigits = getExpiryDigits(expiryInput)
      const expiryMasked = expiryDigits.length >= 4 ? `${expiryDigits.slice(0, 2)}/${expiryDigits.slice(2, 4)}` : expiryInput

      const availableFieldIds = Array.isArray(paymentProduct?.paymentProductFields)
        ? paymentProduct.paymentProductFields.map((f: any) => String(f?.id ?? "")).filter(Boolean)
        : (
            typeof paymentProduct?.getFields === "function"
              ? paymentProduct.getFields().map((f: any) => String(f?.id ?? "")).filter(Boolean)
              : Object.keys(paymentProduct?.paymentProductFieldById || {})
          )

      const debugPayload = {
        rawError: rawMsg,
        paymentProductId: Number(paymentProduct?.id || 0),
        sdkDebug: (() => {
          try {
            return (window as any).__pmdWorldlineSdkDebug ?? null
          } catch (e: any) {
            return { threw: true, message: String(e?.message || e) }
          }
        })(),
        sessionDataDebug: (() => {
          try {
            const s = (window as any).__pmdWorldlineSessionData
            if (!s) return null
            return {
              keys: Object.keys(s || {}),
              clientSessionIdPresent: Boolean(s?.clientSessionId),
              customerIdPresent: Boolean(s?.customerId),
              clientApiUrl: s?.clientApiUrl ?? null,
              assetUrl: s?.assetUrl ?? null,
              environment: s?.environment ?? null,
            }
          } catch (e: any) {
            return { threw: true, message: String(e?.message || e) }
          }
        })(),
        paymentProductDebug: (() => {
          try {
            return (window as any).__pmdWorldlineProductDebug ?? null
          } catch (e: any) {
            return { threw: true, message: String(e?.message || e) }
          }
        })(),        availableFieldIds,
        sentValues: {
          cardNumber: String(formData.cardNumber ?? ""),
          expiryDate: expiryInput,
          expiryDigits,
          expiryMasked,
          cvv: String(formData.cvv ?? ""),
          cardholderName: String(formData.cardholderName ?? ""),
          email: String(formData.email ?? ""),
        },
        chosenStrategy,
        requestValuesAfterSet,
        constructorAttempts,
      }

      const msg =
        (rawMsg || "Payment could not be completed. Please check your details and try again.") +
        "\n\nDEBUG:\n" +
        JSON.stringify(debugPayload, null, 2)

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
          <Label htmlFor="wlExpiry">Expiry (MMYY)</Label>
          <Input
            id="wlExpiry"
            value={formData.expiryDate}
            onChange={(e) => updateField("expiryDate", e.target.value)}
            required
            autoComplete="off"
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
      {error && (
        <pre className="text-xs text-red-500 whitespace-pre-wrap break-all rounded-xl p-3 bg-red-50 border border-red-200 overflow-auto">
{error}
        </pre>
      )}
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
            borderRadius: "9999px",
            background: "linear-gradient(135deg, #063F2F 0%, #062F2A 100%)",
            boxShadow: "0 8px 22px rgba(6, 47, 42, 0.24)",
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
