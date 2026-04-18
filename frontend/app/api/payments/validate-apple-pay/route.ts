import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Check if Apple Pay is configured
    if (!process.env.APPLE_PAY_MERCHANT_ID) {
      return NextResponse.json({
        success: false,
        error: 'Payment system not configured'
      }, { status: 503 })
    }

    const body = await request.json()
    const { validationURL } = body

    if (!validationURL) {
      return NextResponse.json({
        error: 'Validation URL is required'
      }, { status: 400 })
    }

    // Forward the validation request to Apple
    const response = await fetch(validationURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        merchantIdentifier: process.env.APPLE_PAY_MERCHANT_ID,
        domainName: process.env.NEXT_PUBLIC_APP_URL?.replace('https://', ''),
        displayName: 'PayMyDine',
      }),
    })

    const merchantSession = await response.json()

    if (!response.ok) {
      throw new Error(merchantSession.message || 'Failed to validate with Apple Pay')
    }

    return NextResponse.json({
      merchantSession,
    })

  } catch (error: any) {
    console.error('Apple Pay validation error:', error)
    return NextResponse.json({
      error: error.message || 'Failed to validate Apple Pay'
    }, { status: 500 })
  }
}