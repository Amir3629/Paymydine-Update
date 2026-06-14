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
