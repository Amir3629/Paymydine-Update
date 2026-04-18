import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { PayPalScriptProvider, PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js'
import CryptoJS from 'crypto-js'

// Payment gateway configuration
export interface PaymentConfig {
  stripePublishableKey: string
  paypalClientId: string
  environment: 'sandbox' | 'production'
}

// Payment data interfaces
export interface PaymentData {
  amount: number
  currency: string
  items: Array<{
    id: string
    name: string
    price: number
    quantity: number
    restaurantId: string
  }>
  customerInfo: {
    email: string
    name: string
    phone?: string
  }
  restaurantId: string
  tableNumber: number
}

export interface PaymentResult {
  success: boolean
  transactionId?: string
  error?: string
  paymentMethod: string
}

// Security utilities
export class PaymentSecurity {
  private static readonly ENCRYPTION_KEY = process.env.NEXT_PUBLIC_PAYMENT_ENCRYPTION_KEY || 'default-key-change-in-production'
  
  static encrypt(data: any): string {
    return CryptoJS.AES.encrypt(JSON.stringify(data), this.ENCRYPTION_KEY).toString()
  }
  
  static decrypt(encryptedData: string): any {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY)
    return JSON.parse(bytes.toString(CryptoJS.enc.Utf8))
  }
  
  static generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
  
  static validateCardNumber(cardNumber: string): boolean {
    // Luhn algorithm validation
    const cleaned = cardNumber.replace(/\s/g, '')
    if (!/^\d{13,19}$/.test(cleaned)) return false
    
    let sum = 0
    let isEven = false
    
    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i])
      
      if (isEven) {
        digit *= 2
        if (digit > 9) digit -= 9
      }
      
      sum += digit
      isEven = !isEven
    }
    
    return sum % 10 === 0
  }
  
  static validateExpiryDate(expiryDate: string): boolean {
    const [month, year] = expiryDate.split('/').map(Number)
    if (!month || !year || month < 1 || month > 12) return false
    
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear() % 100
    const currentMonth = currentDate.getMonth() + 1
    
    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      return false
    }
    
    return true
  }
}

// Stripe payment processor
export class StripePaymentProcessor {
  private stripe: Stripe | null = null
  
  async initialize(publishableKey: string): Promise<void> {
    this.stripe = await loadStripe(publishableKey)
  }
  
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    if (!this.stripe) {
      throw new Error('Stripe not initialized')
    }
    
    try {
      // Create payment intent on backend
      const response = await fetch('/api/payments/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(paymentData.amount * 100), // Convert to cents
          currency: paymentData.currency,
          restaurantId: paymentData.restaurantId,
          items: paymentData.items,
          customerInfo: paymentData.customerInfo,
          tableNumber: paymentData.tableNumber,
        }),
      })
      
      const { clientSecret } = await response.json()
      
      if (!clientSecret) {
        throw new Error('Failed to create payment intent')
      }
      
      // Confirm payment with Stripe
      const { error, paymentIntent } = await this.stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: {
            number: '', // This will be handled by Stripe Elements
            exp_month: 0,
            exp_year: 0,
            cvc: '',
          },
          billing_details: {
            name: paymentData.customerInfo.name,
            email: paymentData.customerInfo.email,
          },
        },
      })
      
      if (error) {
        return {
          success: false,
          error: error.message,
          paymentMethod: 'stripe',
        }
      }
      
      return {
        success: true,
        transactionId: paymentIntent?.id,
        paymentMethod: 'stripe',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        paymentMethod: 'stripe',
      }
    }
  }
}

// PayPal payment processor
export class PayPalPaymentProcessor {
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      // Create order on backend
      const response = await fetch('/api/payments/create-paypal-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentData),
      })
      
      const { orderId } = await response.json()
      
      if (!orderId) {
        throw new Error('Failed to create PayPal order')
      }
      
      // The actual payment confirmation will be handled by PayPal SDK
      return {
        success: true,
        transactionId: orderId,
        paymentMethod: 'paypal',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        paymentMethod: 'paypal',
      }
    }
  }
}

// Apple Pay processor
export class ApplePayProcessor {
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      // Check if Apple Pay is available
      if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
        throw new Error('Apple Pay is not available on this device')
      }
      
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
      
      return new Promise((resolve) => {
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
            resolve({
              success: false,
              error: 'Failed to validate merchant',
              paymentMethod: 'applepay',
            })
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
              resolve({
                success: true,
                transactionId: result.transactionId,
                paymentMethod: 'applepay',
              })
            } else {
              session.completePayment(ApplePaySession.STATUS_FAILURE)
              resolve({
                success: false,
                error: result.error,
                paymentMethod: 'applepay',
              })
            }
          } catch (error) {
            session.completePayment(ApplePaySession.STATUS_FAILURE)
            resolve({
              success: false,
              error: 'Payment processing failed',
              paymentMethod: 'applepay',
            })
          }
        }
        
        session.begin()
      })
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        paymentMethod: 'applepay',
      }
    }
  }
}

// Google Pay processor
export class GooglePayProcessor {
  private paymentsClient: any = null
  
  async initialize(): Promise<void> {
    if (typeof window !== 'undefined' && window.google) {
      this.paymentsClient = new window.google.payments.api.PaymentsClient({
        environment: process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'TEST',
      })
    }
  }
  
  async processPayment(paymentData: PaymentData): Promise<PaymentResult> {
    if (!this.paymentsClient) {
      throw new Error('Google Pay not initialized')
    }
    
    try {
      const paymentDataRequest = {
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: [
          {
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
          },
        ],
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
      
      const paymentDataResponse = await this.paymentsClient.loadPaymentData(paymentDataRequest)
      
      // Process payment on backend
      const response = await fetch('/api/payments/process-google-pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...paymentData,
          paymentData: paymentDataResponse,
        }),
      })
      
      const result = await response.json()
      
      return {
        success: result.success,
        transactionId: result.transactionId,
        error: result.error,
        paymentMethod: 'googlepay',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        paymentMethod: 'googlepay',
      }
    }
  }
}

// Main payment service
export class PaymentService {
  private stripeProcessor: StripePaymentProcessor
  private paypalProcessor: PayPalPaymentProcessor
  private applePayProcessor: ApplePayProcessor
  private googlePayProcessor: GooglePayProcessor
  
  constructor() {
    this.stripeProcessor = new StripePaymentProcessor()
    this.paypalProcessor = new PayPalPaymentProcessor()
    this.applePayProcessor = new ApplePayProcessor()
    this.googlePayProcessor = new GooglePayProcessor()
  }
  
  async initialize(config: PaymentConfig): Promise<void> {
    await this.stripeProcessor.initialize(config.stripePublishableKey)
    await this.googlePayProcessor.initialize()
  }
  
  async processPayment(paymentMethod: string, paymentData: PaymentData): Promise<PaymentResult> {
    // Validate payment data
    if (!this.validatePaymentData(paymentData)) {
      return {
        success: false,
        error: 'Invalid payment data',
        paymentMethod,
      }
    }
    
    // Encrypt sensitive data
    const encryptedData = {
      ...paymentData,
      customerInfo: {
        ...paymentData.customerInfo,
        // Don't encrypt email as it's needed for receipts
      },
    }
    
    switch (paymentMethod) {
      case 'visa':
      case 'mastercard':
        return await this.stripeProcessor.processPayment(paymentData)
      
      case 'paypal':
        return await this.paypalProcessor.processPayment(paymentData)
      
      case 'applepay':
        return await this.applePayProcessor.processPayment(paymentData)
      
      case 'googlepay':
        return await this.googlePayProcessor.processPayment(paymentData)
      
      case 'cash':
        return await this.processCashPayment(paymentData)
      
      default:
        return {
          success: false,
          error: 'Unsupported payment method',
          paymentMethod,
        }
    }
  }
  
  private async processCashPayment(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      const response = await fetch('/api/payments/process-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentData),
      })
      
      const result = await response.json()
      
      return {
        success: result.success,
        transactionId: result.transactionId,
        error: result.error,
        paymentMethod: 'cash',
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        paymentMethod: 'cash',
      }
    }
  }
  
  private validatePaymentData(data: PaymentData): boolean {
    if (!data.amount || data.amount <= 0) return false
    if (!data.currency) return false
    if (!data.items || data.items.length === 0) return false
    if (!data.customerInfo.email) return false
    if (!data.restaurantId) return false
    
    return true
  }
}

// Export singleton instance
export const paymentService = new PaymentService()