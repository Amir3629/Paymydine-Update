import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null

export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json(
      { success: false, error: 'Payment system not configured' },
      { status: 503 }
    )
  }

  try {
    const body = await request.json()
    const { paymentIntentId, order: orderPayload } = body as { paymentIntentId: string; order: Record<string, unknown> }

    if (!paymentIntentId || !orderPayload) {
      return NextResponse.json(
        { success: false, error: 'Missing paymentIntentId or order' },
        { status: 400 }
      )
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { success: false, error: `Payment not succeeded: ${paymentIntent.status}` },
        { status: 400 }
      )
    }

    const order = {
      ...orderPayload,
      payment_method: 'card',
      special_instructions: [orderPayload.special_instructions, `Stripe PaymentIntent: ${paymentIntentId}`].filter(Boolean).join(' | '),
    }

    const ordersUrl = `${new URL('/api/v1/orders', req.nextUrl.origin).toString()}`
    const res = await fetch(ordersUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(order),
    })

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: data.error || data.message || 'Order creation failed' },
        { status: res.status >= 400 ? res.status : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      order_id: data.order_id ?? data.orderId,
      paymentIntentId,
    })
  } catch (err: any) {
    console.error('Orders confirm error:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Order confirmation failed' },
      { status: 500 }
    )
  }
}
