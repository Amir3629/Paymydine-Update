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
