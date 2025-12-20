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
    const { orderId, paymentData } = body

    if (!orderId) {
      return NextResponse.json({
        error: 'Order ID is required'
      }, { status: 400 })
    }

    // Get restaurant's PayPal configuration
    const restaurantConfig = await getRestaurantPayPalConfig(paymentData.restaurantId)
    
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

    // Capture the PayPal order
    const response = await fetch(`${getPayPalBaseURL()}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    const captureData = await response.json()

    if (!response.ok) {
      throw new Error(captureData.message || 'Failed to capture PayPal order')
    }

    if (captureData.status === 'COMPLETED') {
      // Process the successful payment
      const transactionId = captureData.id
      
      // Store transaction details
      await storeTransactionDetails(transactionId, {
        orderId,
        restaurantId: paymentData.restaurantId,
        amount: paymentData.amount,
        currency: paymentData.currency,
        items: paymentData.items,
        customerInfo: paymentData.customerInfo,
        tableNumber: paymentData.tableNumber,
        paymentMethod: 'paypal',
        status: 'completed',
      })

      // Calculate and process platform fee
      await processPlatformFee(transactionId, paymentData.amount, paymentData.restaurantId)

      return NextResponse.json({
        success: true,
        transactionId,
        message: 'Payment captured successfully',
      })
    } else {
      return NextResponse.json({
        success: false,
        error: `Payment not completed: ${captureData.status}`,
      }, { status: 400 })
    }

  } catch (error: any) {
    console.error('PayPal order capture error:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to capture PayPal order'
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

async function storeTransactionDetails(transactionId: string, details: any) {
  // This would typically store in your database
  console.log('Storing transaction details:', { transactionId, details })
}

async function processPlatformFee(transactionId: string, amount: number, restaurantId: string) {
  // Calculate platform fee (e.g., 3% of total)
  const platformFee = amount * 0.03
  
  // This would typically process the fee to your platform account
  console.log('Processing platform fee:', { transactionId, platformFee, restaurantId })
}