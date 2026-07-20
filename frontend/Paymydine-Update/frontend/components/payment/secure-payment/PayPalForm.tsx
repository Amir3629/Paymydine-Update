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
