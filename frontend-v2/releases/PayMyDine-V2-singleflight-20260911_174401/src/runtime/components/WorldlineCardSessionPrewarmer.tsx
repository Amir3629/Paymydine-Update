'use client'

import { useEffect } from 'react'
import { primeWorldlineCardSession } from './WorldlineCardSessionPrewarm'

type Props = {
  enabled: boolean
  orderId: number
  amount: number
  currency: string
  tipAmount: number
  locale: string
}

function returnUrl(): string {
  const target = new URL('/payment/worldline-embedded-return', window.location.origin)
  target.searchParams.set('return_to', `${window.location.pathname}${window.location.search}`)
  return target.toString()
}

export function WorldlineCardSessionPrewarmer(props: Props) {
  useEffect(() => {
    if (!props.enabled || props.orderId <= 0 || props.amount <= 0) return
    if (typeof window === 'undefined' || window.location.protocol !== 'https:') return

    void primeWorldlineCardSession({
      order_id: props.orderId,
      payment_method: 'card',
      provider: 'worldline',
      return_url: returnUrl(),
      tip_amount: props.tipAmount,
      locale: String(props.locale || 'de-DE').replace('-', '_'),
      amount: props.amount,
      currency: props.currency,
      coupon_code: null,
      coupon_discount: 0,
      selected_items: null,
      payment_intent_token: null,
    }).catch(() => {
      // Prewarm is an optimization only. The canonical click path remains the
      // fail-closed fallback if Worldline is temporarily unavailable here.
    })
  }, [
    props.enabled,
    props.orderId,
    props.amount,
    props.currency,
    props.tipAmount,
    props.locale,
  ])

  return null
}
