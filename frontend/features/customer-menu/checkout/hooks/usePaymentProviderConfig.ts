"use client"

import { useEffect, useMemo, useState } from "react"
import { loadStripe } from "@stripe/stripe-js"
import { ApiClient, type PaymentMethod } from "@/lib/api-client"
import {
  getVisiblePaymentMethods,
  isPaymentMethodAvailable,
  isStripePaymentMethodForConfig,
  mapPaymentMethodsByCode,
} from "@/features/checkout/payment-method-utils"

type StripeConfig = {
  publishableKey: string
  mode: string
  currency?: string
  countryCode?: string
  methods?: {
    card?: boolean
    apple_pay?: boolean
    google_pay?: boolean
  }
}

type PayPalPublicConfig = {
  enabled: boolean
  clientId: string
  currency: string
}

export function usePaymentProviderConfig({
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  merchantCurrency,
}: {
  selectedPaymentMethod: string | null
  setSelectedPaymentMethod: (method: string | null) => void
  merchantCurrency?: string | null
}) {
  const [paypalPublicConfig, setPaypalPublicConfig] = useState<PayPalPublicConfig | null>(null)
  const [paypalConfigLoading, setPaypalConfigLoading] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loadingPayments, setLoadingPayments] = useState(true)
  const [stripeConfig, setStripeConfig] = useState<StripeConfig | null>(null)
  const [stripeConfigError, setStripeConfigError] = useState<string | null>(null)

  const visiblePaymentMethods = useMemo(
    () => getVisiblePaymentMethods(paymentMethods),
    [paymentMethods]
  )

  const methodByCode = useMemo(
    () => mapPaymentMethodsByCode(visiblePaymentMethods),
    [visiblePaymentMethods]
  )

  const stripePromise = useMemo(
    () => (stripeConfig?.publishableKey ? loadStripe(stripeConfig.publishableKey) : null),
    [stripeConfig?.publishableKey]
  )

  const effectivePayPalClientId =
    paypalPublicConfig?.enabled && paypalPublicConfig?.clientId
      ? paypalPublicConfig.clientId
      : ""

  const effectivePayPalCurrency = String(
    paypalPublicConfig?.currency ||
      merchantCurrency ||
      "EUR"
  ).toUpperCase()

  useEffect(() => {
    if (!selectedPaymentMethod) return

    if (!isPaymentMethodAvailable(visiblePaymentMethods, selectedPaymentMethod)) {
      setSelectedPaymentMethod(null)
    }
  }, [selectedPaymentMethod, visiblePaymentMethods, setSelectedPaymentMethod])

  useEffect(() => {
    const selected = selectedPaymentMethod ? methodByCode.get(selectedPaymentMethod) : null

    if (!isStripePaymentMethodForConfig(selected)) return

    let cancelled = false

    fetch("/api/v1/payments/stripe/config")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return

        if (data?.success && data.publishableKey) {
          setStripeConfig({
            publishableKey: data.publishableKey,
            mode: data.mode || "test",
            currency: data.currency || "EUR",
            countryCode: data.countryCode || "DE",
            methods: {
              card: !!data?.methods?.card,
              apple_pay: !!data?.methods?.apple_pay,
              google_pay: !!data?.methods?.google_pay,
            },
          })
          setStripeConfigError(null)
        } else {
          setStripeConfig(null)
          setStripeConfigError(data?.error || "Stripe is not configured")
        }
      })
      .catch(() => {
        if (!cancelled) setStripeConfigError("Failed to load Stripe configuration")
      })

    return () => {
      cancelled = true
    }
  }, [selectedPaymentMethod, methodByCode])

  useEffect(() => {
    const api = new ApiClient()

    api.getPaymentMethods()
      .then(setPaymentMethods)
      .finally(() => setLoadingPayments(false))
  }, [])

  useEffect(() => {
    let cancelled = false
    setPaypalConfigLoading(true)

    fetch("/api/v1/payments/config-public")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return

        setPaypalPublicConfig({
          enabled: !!data?.paypalEnabled,
          clientId: data?.paypalClientId || "",
          currency: data?.currency || "EUR",
        })
      })
      .catch(() => {
        if (!cancelled) {
          setPaypalPublicConfig({
            enabled: false,
            clientId: "",
            currency: "EUR",
          })
        }
      })
      .finally(() => {
        if (!cancelled) setPaypalConfigLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return {
    paymentMethods,
    loadingPayments,
    visiblePaymentMethods,
    methodByCode,
    stripeConfig,
    stripeConfigError,
    stripePromise,
    paypalPublicConfig,
    paypalConfigLoading,
    effectivePayPalClientId,
    effectivePayPalCurrency,
  }
}
