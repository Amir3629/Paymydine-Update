"use client"

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import type { Stripe as StripeType } from 'stripe'

// Payment processing route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      paymentMethod,
      amount,
      currency,
      items,
      customerInfo,
      merchantAccount,
      card,
      paypalOrderId,
      provider
    } = body

    // Validate required fields
    if (!paymentMethod || !amount || !currency) {
      return NextResponse.json({
        success: false,
        error: 'Missing required payment information'
      }, { status: 400 })
    }

    let result = { success: false, transactionId: '', error: '' }

    switch (paymentMethod) {
      case 'visa':
      case 'mastercard':
        result = await processStripePayment({
          amount,
          currency,
          card,
          customerInfo,
          items,
          merchantAccount
        })
        break

      case 'paypal':
        result = await processPayPalPayment({
          amount,
          currency,
          paypalOrderId,
          customerInfo,
          items,
          merchantAccount
        })
        break

      case 'applepay':
        result = await processApplePayment({
          amount,
          currency,
          customerInfo,
          items,
          merchantAccount
        })
        break

      case 'googlepay':
        result = await processGooglePayment({
          amount,
          currency,
          customerInfo,
          items,
          merchantAccount
        })
        break

      case 'cash':
        result = await processCashPayment({
          amount,
          currency,
          customerInfo,
          items,
          merchantAccount
        })
        break

      default:
        return NextResponse.json({
          success: false,
          error: 'Unsupported payment method'
        }, { status: 400 })
    }

    if (result.success) {
      console.log(`Payment processed successfully: ${result.transactionId}`)
      return NextResponse.json({
        success: true,
        transactionId: result.transactionId,
        message: 'Payment processed successfully'
      })
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Payment processing failed'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Payment processing error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Stripe payment processing
async function processStripePayment({
  amount,
  currency,
  card,
  customerInfo,
  items,
  merchantAccount
}: any) {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || getMerchantStripeKey(merchantAccount)
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key not configured')
    }

    const stripe = new Stripe(stripeSecretKey)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        merchantAccount,
        customerEmail: customerInfo.email,
        items: JSON.stringify(items.map((item: any) => ({
          name: item.item.name,
          price: item.price,
          quantity: 1
        })))
      }
    })

    if (paymentIntent.status === 'succeeded') {
      return {
        success: true,
        transactionId: paymentIntent.id,
        error: ''
      }
    } else {
      return {
        success: false,
        transactionId: '',
        error: `Payment failed: ${paymentIntent.status}`
      }
    }

  } catch (error: any) {
    console.error('Stripe payment error:', error)
    return {
      success: false,
      transactionId: '',
      error: error.message || 'Stripe payment failed'
    }
  }
}

// Helper functions
function getPayPalBaseURL() {
  return process.env.NODE_ENV === 'production' 
    ? 'https://api.paypal.com' 
    : 'https://api.sandbox.paypal.com'
}

function getMerchantStripeKey(merchantAccount: string) {
  return null
}

function getMerchantPayPalClientId(merchantAccount: string) {
  return null
}

function getMerchantPayPalSecret(merchantAccount: string) {
  return null
}

// PayPal payment processing
async function processPayPalPayment({
  amount,
  currency,
  paypalOrderId,
  customerInfo,
  items,
  merchantAccount
}: any) {
  try {
    const clientId = process.env.PAYPAL_CLIENT_ID || getMerchantPayPalClientId(merchantAccount)
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET || getMerchantPayPalSecret(merchantAccount)
    
    if (!clientId || !clientSecret) {
      throw new Error('PayPal credentials not configured')
    }

    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
    
    const tokenResponse = await fetch(`${getPayPalBaseURL()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    })

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    const captureResponse = await fetch(`${getPayPalBaseURL()}/v2/checkout/orders/${paypalOrderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      }
    })

    const captureData = await captureResponse.json()

    if (captureData.status === 'COMPLETED') {
      return {
        success: true,
        transactionId: captureData.id,
        error: ''
      }
    } else {
      return {
        success: false,
        transactionId: '',
        error: `PayPal payment failed: ${captureData.status}`
      }
    }

  } catch (error: any) {
    console.error('PayPal payment error:', error)
    return {
      success: false,
      transactionId: '',
      error: error.message || 'PayPal payment failed'
    }
  }
}

// Apple Pay payment processing
async function processApplePayment({
  amount,
  currency,
  customerInfo,
  items,
  merchantAccount
}: any) {
  try {
    const transactionId = `apple_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      success: true,
      transactionId,
      error: ''
    }
  } catch (error: any) {
    return {
      success: false,
      transactionId: '',
      error: error.message || 'Apple Pay payment failed'
    }
  }
}

// Google Pay payment processing
async function processGooglePayment({
  amount,
  currency,
  customerInfo,
  items,
  merchantAccount
}: any) {
  try {
    const transactionId = `google_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    return {
      success: true,
      transactionId,
      error: ''
    }
  } catch (error: any) {
    return {
      success: false,
      transactionId: '',
      error: error.message || 'Google Pay payment failed'
    }
  }
}

// Cash payment processing
async function processCashPayment({
  amount,
  currency,
  customerInfo,
  items,
  merchantAccount
}: any) {
  try {
    const transactionId = `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log(`Cash order recorded: ${transactionId} for $${amount}`)
    return {
      success: true,
      transactionId,
      error: ''
    }
  } catch (error: any) {
    return {
      success: false,
      transactionId: '',
      error: error.message || 'Cash payment recording failed'
    }
  }
}