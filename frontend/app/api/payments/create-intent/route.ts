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
    } = body

    // Validate required fields
    if (!amount || !currency || !restaurantId) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 })
    }

    // Get restaurant's Stripe account (for marketplace)
    const restaurantAccount = await getRestaurantStripeAccount(restaurantId)
    
    if (!restaurantAccount) {
      return NextResponse.json({
        error: 'Restaurant payment account not configured'
      }, { status: 400 })
    }

    // Calculate platform fee (e.g., 3% of total)
    const platformFee = Math.round(amount * 0.03)

    // Create payment intent with marketplace configuration
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      application_fee_amount: platformFee,
      transfer_data: {
        destination: restaurantAccount.stripeAccountId,
      },
      metadata: {
        restaurantId,
        tableNumber: tableNumber?.toString() || '',
        customerEmail: customerInfo.email,
        customerName: customerInfo.name,
        items: JSON.stringify(items.map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        }))),
      },
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    })

  } catch (error: any) {
    console.error('Stripe payment intent creation error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to create payment intent'
    }, { status: 500 })
  }
}

async function getRestaurantStripeAccount(restaurantId: string) {
  // This would typically fetch from your database
  // For now, return a mock account
  return {
    stripeAccountId: process.env.STRIPE_RESTAURANT_ACCOUNT_ID,
    isActive: true,
  }
}