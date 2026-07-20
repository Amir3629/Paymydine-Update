import { useRef, useState } from "react"
import { getInitialCheckoutStep } from "@/features/checkout/checkout-state-utils"
import type { CheckoutStep } from "@/features/checkout/types"
import type { PaymentFormData } from "@/features/customer-menu/checkout/paymentModalShared"

type UsePaymentModalRuntimeStateArgs = {
  existingOrderId?: string | number | null
  initialCheckoutStep?: CheckoutStep | null
  initialSubmittedOrder?: any | null
}

export function usePaymentModalRuntimeState({
  existingOrderId,
  initialCheckoutStep,
  initialSubmittedOrder,
}: UsePaymentModalRuntimeStateArgs) {
  const [cashCollectionConfirmed, setCashCollectionConfirmed] = useState(false)
  const [providerInlineError, setProviderInlineError] = useState<string | null>(null)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    email: "",
    phone: "",
  })

  const normalizedExistingOrderId =
    typeof existingOrderId === "number"
      ? existingOrderId
      : typeof existingOrderId === "string" && existingOrderId.trim().length > 0 && Number.isFinite(Number(existingOrderId))
        ? Number(existingOrderId)
        : null

  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(
    getInitialCheckoutStep(initialCheckoutStep, normalizedExistingOrderId),
  )

  const [submittedSnapshot, setSubmittedSnapshot] = useState<any | null>(initialSubmittedOrder || null)
  const pmdLatestSubmittedPaymentOrderIdRef = useRef<number | null>(null)

  return {
    cashCollectionConfirmed,
    setCashCollectionConfirmed,
    providerInlineError,
    setProviderInlineError,
    isDarkTheme,
    setIsDarkTheme,
    paymentFormData,
    setPaymentFormData,
    checkoutStep,
    setCheckoutStep,
    submittedSnapshot,
    setSubmittedSnapshot,
    pmdLatestSubmittedPaymentOrderIdRef,
  }
}
