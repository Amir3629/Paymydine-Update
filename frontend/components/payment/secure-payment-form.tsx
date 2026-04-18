"use client"

import { useState, useEffect } from "react"
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
}

// Stripe Card Form Component
export function StripeCardForm({ 
  paymentData, 
  onPaymentComplete, 
  onPaymentError,
  className 
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    
    if (!stripe || !elements) {
      onPaymentError("Payment system not ready")
      return
    }

    setIsProcessing(true)
    setCardError(null)

    try {
      const cardElement = elements.getElement(CardElement)
      if (!cardElement) {
        throw new Error("Card element not found")
      }

      // Create payment intent
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentData,
          customerInfo: {
            ...paymentData.customerInfo,
            name: formData.cardholderName,
            email: formData.email,
            phone: formData.phone,
          },
        }),
      })

      const { clientSecret, error: intentError } = await response.json()
      
      if (intentError) {
        throw new Error(intentError)
      }

      // Confirm payment
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: formData.cardholderName,
            email: formData.email,
            phone: formData.phone,
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

  const handleCardChange = (event: any) => {
    setCardError(event.error ? event.error.message : null)
  }

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-4", className)}>
      <div className="space-y-3">
        <div>
          <Label htmlFor="cardholderName" className="text-sm font-medium">
            Cardholder Name
          </Label>
          <Input
            id="cardholderName"
            type="text"
            placeholder="John Doe"
            value={formData.cardholderName}
            onChange={(e) => setFormData(prev => ({ ...prev, cardholderName: e.target.value }))}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="email" className="text-sm font-medium">
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            required
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor="phone" className="text-sm font-medium">
            Phone Number (Optional)
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 123-4567"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm font-medium">
            Card Information
          </Label>
          <div className="mt-1 p-3 border rounded-md bg-white">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#424770',
                    '::placeholder': {
                      color: '#aab7c4',
                    },
                  },
                  invalid: {
                    color: '#9e2146',
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

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full"
      >
        {isProcessing ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Pay ${paymentData.amount.toFixed(2)}
          </div>
        )}
      </Button>
    </form>
  )
}

// PayPal Form Component
export function PayPalForm({ 
  paymentData, 
  onPaymentComplete, 
  onPaymentError,
  className 
}: SecurePaymentFormProps) {
  const [{ isPending }] = usePayPalScriptReducer()
  const [isProcessing, setIsProcessing] = useState(false)

  const createOrder = async () => {
    try {
      const response = await fetch('/api/payments/create-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })

      const { orderId } = await response.json()
      
      if (!orderId) {
        throw new Error('Failed to create PayPal order')
      }

      return orderId
    } catch (error: any) {
      onPaymentError(error.message)
      throw error
    }
  }

  const onApprove = async (data: any) => {
    setIsProcessing(true)
    
    try {
      const response = await fetch('/api/payments/capture-paypal-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: data.orderID,
          paymentData,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        onPaymentComplete({
          success: true,
          transactionId: result.transactionId,
          paymentMethod: 'paypal',
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

  const onError = (error: any) => {
    onPaymentError(error.message || 'PayPal payment failed')
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
    <div className={cn("space-y-4", className)}>
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-4">
          You will be redirected to PayPal to complete your payment securely.
        </p>
        <div className="text-lg font-semibold">
          Total: ${paymentData.amount.toFixed(2)}
        </div>
      </div>

      <PayPalButtons
        createOrder={createOrder}
        onApprove={onApprove}
        onError={onError}
        disabled={isProcessing}
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal',
        }}
      />
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
    <div className={cn("space-y-4", className)}>
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
    <div className={cn("space-y-4", className)}>
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
    <div className={cn("space-y-4", className)}>
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