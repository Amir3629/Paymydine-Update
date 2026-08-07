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