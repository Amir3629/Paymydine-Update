import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({
    success: false,
    error: 'Deprecated. Use Laravel /api/v1/payments/paypal/* endpoints instead.'
  }, { status: 410 })
}
