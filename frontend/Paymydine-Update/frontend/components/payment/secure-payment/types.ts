import type React from "react"
import type { PaymentData, PaymentResult } from "@/lib/payment-service"

export interface SecurePaymentFormProps {
  paymentData: PaymentData
  onPaymentComplete: (result: PaymentResult) => void
  onPaymentError: (error: string) => void
  className?: string
  footerSlot?: React.ReactNode
  paypalFundingSource?: "paypal" | "card"
}

export interface WorldlineInlineCardFormProps extends SecurePaymentFormProps {
  countryCode?: string
  currency?: string
}

