import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Initialize Stripe only if environment variables are available
let stripe: Stripe | null = null
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
  })
}

export async function POST(request: NextRequest) {
  try {
    // Check if Stripe is configured
    if (!stripe) {
      return NextResponse.json({
        success: false,
        error: 'Payment system not configured'
      }, { status: 503 })
    }

    const body = await request.json()
    const {
      amount,
      currency,
      restaurantId,
      items,
      customerInfo,
      tableNumber,
      paymentData,
    } = body

    // Validate required fields
    if (!amount || !currency || !restaurantId || !paymentData) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Get restaurant's Stripe account
    const restaurantAccount = await getRestaurantStripeAccount(restaurantId)
    
    if (!restaurantAccount) {
      return NextResponse.json({
        success: false,
        error: 'Restaurant payment account not configured'
      }, { status: 400 })
    }

    // Create payment method from Apple Pay token
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        token: paymentData.token.paymentData,
      },
    }, {
      stripeAccount: restaurantAccount.stripeAccountId,
    })

    // Calculate platform fee
    const platformFee = Math.round(amount * 0.03 * 100) // Convert to cents

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      payment_method: paymentMethod.id,
      confirmation_method: 'automatic',
      confirm: true,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: restaurantAccount.stripeAccountId,
      },
      metadata: {
        restaurantId,
        tableNumber: tableNumber?.toString() || '',
        customerEmail: customerInfo.email,
        customerName: customerInfo.name,
        paymentMethod: 'applepay',
        items: JSON.stringify(items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))),
      },
    })

    if (paymentIntent.status === 'succeeded') {
      // Store transaction details
      await storeTransactionDetails(paymentIntent.id, {
        restaurantId,
        amount,
        currency,
        items,
        customerInfo,
        tableNumber,
        paymentMethod: 'applepay',
        status: 'completed',
      })

      return NextResponse.json({
        success: true,
        transactionId: paymentIntent.id,
        message: 'Apple Pay payment processed successfully',
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `Payment failed: ${paymentIntent.status}`,
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('Apple Pay processing error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to process Apple Pay payment'
    }, { status: 500 })
  }
}

async function getRestaurantStripeAccount(restaurantId: string) {
  // This would typically fetch from your database
  return {
    stripeAccountId: process.env.STRIPE_RESTAURANT_ACCOUNT_ID,
    isActive: true,
  }
}

async function storeTransactionDetails(transactionId: string, details: any) {
  // This would typically store in your database
  console.log('Storing Apple Pay transaction details:', { transactionId, details })
}