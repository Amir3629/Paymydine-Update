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
      cartId,
      userId,
      items,
      customerInfo,
      tableNumber,
    } = body

    // Validate required fields (amount in dollars; we convert to cents for Stripe)
    if (!amount || !currency || !restaurantId) {
      return NextResponse.json({
        error: 'Missing required fields'
      }, { status: 400 })
    }

    const amountCents = Math.round(Number(amount) * 100)

    // Get restaurant's Stripe account (for marketplace / Connect)
    const restaurantAccount = await getRestaurantStripeAccount(restaurantId)

    // Build PaymentIntent params (no Connect if no destination)
    const createParams: Record<string, unknown> = {
      amount: amountCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        restaurant_id: String(restaurantId),
        cart_id: cartId ? String(cartId) : '',
        user_id: userId ? String(userId) : '',
        tableNumber: tableNumber?.toString() || '',
        customerEmail: (customerInfo?.email as string) || '',
        customerName: (customerInfo?.name as string) || '',
        items: JSON.stringify((items || []).map((item: any) => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity ?? 1,
        }))),
      },
    }

    // Only add application_fee_amount and transfer_data when using Connect
    if (restaurantAccount?.stripeAccountId) {
      createParams.application_fee_amount = Math.round(amountCents * 0.03)
      createParams.transfer_data = {
        destination: restaurantAccount.stripeAccountId,
      }
    }

    const paymentIntent = await stripe.paymentIntents.create(createParams as Stripe.PaymentIntentCreateParams)

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