import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check if PayPal is configured
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
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

    // Get restaurant's PayPal configuration
    const restaurantConfig = await getRestaurantPayPalConfig(restaurantId)
    
    if (!restaurantConfig) {
      return NextResponse.json({
        error: 'Restaurant PayPal account not configured'
      }, { status: 400 })
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken(restaurantConfig)
    
    if (!accessToken) {
      return NextResponse.json({
        error: 'Failed to get PayPal access token'
      }, { status: 500 })
    }

    // Create PayPal order
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: currency.toUpperCase(),
            value: amount.toFixed(2),
          },
          payee: {
            merchant_id: restaurantConfig.merchantId,
          },
          items: items.map((item: any) => ({
            name: item.name,
            unit_amount: {
              currency_code: currency.toUpperCase(),
              value: item.price.toFixed(2),
            },
            quantity: item.quantity.toString(),
          })),
        },
      ],
      application_context: {
        brand_name: 'PayMyDine',
        landing_page: 'NO_PREFERENCE',
        user_action: 'PAY_NOW',
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment/cancel`,
      },
    }

    const response = await fetch(`${getPayPalBaseURL()}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'PayPal-Request-Id': `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      },
      body: JSON.stringify(orderData),
    })

    const order = await response.json()

    if (!response.ok) {
      throw new Error(order.message || 'Failed to create PayPal order')
    }

    // Store order details for later processing
    await storeOrderDetails(order.id, {
      restaurantId,
      amount,
      currency,
      items,
      customerInfo,
      tableNumber,
    })

    return NextResponse.json({
      orderId: order.id,
      approvalUrl: order.links?.find((link: any) => link.rel === 'approve')?.href,
    })

  } catch (error: any) {
    console.error('PayPal order creation error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to create PayPal order'
    }, { status: 500 })
  }
}

function getPayPalBaseURL() {
  return process.env.NODE_ENV === 'production' 
    ? 'https://api.paypal.com' 
    : 'https://api.sandbox.paypal.com'
}

async function getRestaurantPayPalConfig(restaurantId: string) {
  // This would typically fetch from your database
  // For now, return environment variables
  return {
    clientId: process.env.PAYPAL_CLIENT_ID,
    clientSecret: process.env.PAYPAL_CLIENT_SECRET,
    merchantId: process.env.PAYPAL_MERCHANT_ID,
  }
}

async function getPayPalAccessToken(config: any) {
  try {
    const auth = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')
    
    const response = await fetch(`${getPayPalBaseURL()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    })

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('PayPal token error:', error)
    return null
  }
}

async function storeOrderDetails(orderId: string, orderData: any) {
  // This would typically store in your database
  // For now, just log it
  console.log('Storing order details:', { orderId, orderData })
}