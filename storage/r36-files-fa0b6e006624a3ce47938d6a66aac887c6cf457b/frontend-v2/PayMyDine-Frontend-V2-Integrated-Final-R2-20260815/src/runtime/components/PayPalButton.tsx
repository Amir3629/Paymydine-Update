'use client'

import { useEffect, useRef, useState } from 'react'
import type { TableContext } from '@/src/domain/model'
import {
  cancelBillingGroupPayment,
  payExistingOrder,
  reserveExistingOrderGroupPayment,
  settleExistingOrderGroup,
  type BillingGroupPaymentReservation,
  type BillingGroupSummary,
  type ExistingOrderPaymentAllocation,
  type SplitPaymentIntent,
} from '@/src/lib/client-api'
import styles from './RuntimeOverlays.module.css'

type PayPalWindow = Window & {
  paypal?: {
    Buttons(options: Record<string, unknown>): {
      render(target: HTMLElement): Promise<void>
      close?: () => Promise<void> | void
    }
  }
}

type Props = {
  orderId: number
  table: TableContext
  methodCode: string
  providerCode: string | null
  amount: number
  currency: string
  tipAmount: number
  couponCode: string | null
  couponDiscount: number
  selectedItems: Array<{ order_menu_id: number; quantity: number }> | null
  payerLabel: string | null
  items: Array<{ id: string; name: string; quantity: number; price: number }>
  orderAllocations?: ExistingOrderPaymentAllocation[] | null
  prepareSplitIntent?: (() => Promise<SplitPaymentIntent>) | undefined
  guestSessionId?: string | null
  onSuccess: () => void | Promise<void>
  onError: (message: string) => void
}

type R36Reservation = { group: BillingGroupSummary; payment: BillingGroupPaymentReservation }

const sdkPromises = new Map<string, Promise<void>>()

function loadPayPalSdk(clientId: string, currency: string): Promise<void> {
  const key = `${clientId}:${currency}`
  const existing = sdkPromises.get(key)
  if (existing) return existing
  const promise = new Promise<void>((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>('script[data-pmd-paypal-sdk="1"]')
    if ((window as PayPalWindow).paypal?.Buttons) { resolve(); return }
    if (current) {
      current.addEventListener('load', () => resolve(), { once: true })
      current.addEventListener('error', () => reject(new Error('PayPal SDK could not be loaded.')), { once: true })
      return
    }
    const params = new URLSearchParams({ 'client-id': clientId, currency: currency.toUpperCase(), intent: 'capture', components: 'buttons', 'enable-funding': 'paypal,card' })
    const script = document.createElement('script')
    script.src = `https://www.paypal.com/sdk/js?${params.toString()}`
    script.async = true
    script.dataset.pmdPaypalSdk = '1'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('PayPal SDK could not be loaded.')), { once: true })
    document.head.appendChild(script)
  })
  sdkPromises.set(key, promise)
  return promise
}

async function requestJson(url: string, body?: unknown): Promise<any> {
  const response = await fetch(url, {
    method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) throw new Error(String(data?.error || data?.message || `HTTP ${response.status}`))
  return data
}

export function PayPalButton(props: Props) {
  const groupedAllocations = (props.orderAllocations || []).filter((entry) => entry.orderId > 0 && entry.amount > 0)
  const isMultiOrder = groupedAllocations.length > 1
  const multiOrderCaptureLockedRef = useRef(false)
  const captureLockedRef = useRef(false)
  const preparedSplitIntentRef = useRef<SplitPaymentIntent | null>(null)
  const r36ReservationRef = useRef<R36Reservation | null>(null)
  const r36IdempotencyRef = useRef(`r36:paypal:${props.orderId}:${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const prepareSplitIntentRef = useRef(props.prepareSplitIntent)
  prepareSplitIntentRef.current = props.prepareSplitIntent
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [message, setMessage] = useState('Loading PayPal…')
  const onSuccessRef = useRef(props.onSuccess)
  const onErrorRef = useRef(props.onError)
  onSuccessRef.current = props.onSuccess
  onErrorRef.current = props.onError

  useEffect(() => {
    let cancelled = false
    let buttons: { close?: () => Promise<void> | void; render(target: HTMLElement): Promise<void> } | null = null

    const resetReservation = async () => {
      const paymentId = r36ReservationRef.current?.payment.paymentId || ''
      r36ReservationRef.current = null
      r36IdempotencyRef.current = `r36:paypal:${props.orderId}:${Date.now()}-${Math.random().toString(36).slice(2)}`
      if (paymentId && !captureLockedRef.current && !multiOrderCaptureLockedRef.current) await cancelBillingGroupPayment(paymentId).catch(() => undefined)
    }

    const paymentAllocations = (intent?: SplitPaymentIntent | null): ExistingOrderPaymentAllocation[] => {
      if (groupedAllocations.length) return groupedAllocations
      if (props.orderId < 1) return []
      return [{
        orderId: props.orderId,
        amount: intent?.payableAmount ?? props.amount,
        tipAmount: intent?.tipAmount ?? props.tipAmount,
        couponDiscount: intent ? 0 : props.couponDiscount,
        couponCode: intent ? null : props.couponCode,
        selectedItems: intent?.selectedItems ?? props.selectedItems,
        payerLabel: intent?.payerLabel ?? props.payerLabel,
        paymentIntentToken: intent?.token || null,
        splitMode: intent?.splitMode || null,
        splitPeople: intent?.splitPeople || null,
        sharePercent: intent?.sharePercent || null,
        guestSessionId: props.guestSessionId || null,
      }]
    }

    const ensureR36Reservation = async (intent?: SplitPaymentIntent | null): Promise<R36Reservation | null> => {
      if (r36ReservationRef.current) return r36ReservationRef.current
      const allocations = paymentAllocations(intent)
      if (!allocations.length) return null
      const reservation = await reserveExistingOrderGroupPayment({
        allocations,
        table: props.table,
        method: props.methodCode,
        providerCode: props.providerCode || 'paypal',
        idempotencyKey: r36IdempotencyRef.current,
      })
      r36ReservationRef.current = reservation
      if (reservation) {
        const amount = reservation.payment.payableCents / 100
        setMessage(`Final Bill: ${amount.toFixed(2)} ${reservation.payment.currency}`)
      }
      return reservation
    }

    const buildPaymentData = (intent?: SplitPaymentIntent | null) => {
      const r36 = r36ReservationRef.current
      const allocations = paymentAllocations(intent)
      return {
        amount: r36?.payment.payableCents ? r36.payment.payableCents / 100 : (intent?.payableAmount ?? props.amount),
        currency: (r36?.payment.currency || props.currency).toUpperCase(),
        payment_method: props.methodCode,
        order_id: (isMultiOrder || r36) ? undefined : props.orderId,
        items: intent?.providerItems?.length ? intent.providerItems : props.items,
        tableNumber: props.table.number || props.table.id,
        table_id: props.table.id,
        table_no: props.table.number,
        qr: props.table.qr,
        payment_intent_token: intent?.token || null,
        billing_group_public_id: r36?.group.publicId || null,
        billing_group_payment_id: r36?.payment.paymentId || null,
        order_allocations: (isMultiOrder || r36) ? allocations : undefined,
      }
    }

    const mount = async () => {
      try {
        const publicConfig = await requestJson('/api/v1/payments/config-public')
        const enabled = Boolean(publicConfig?.paypalEnabled ?? publicConfig?.paypal_enabled ?? true)
        const clientId = String(publicConfig?.paypalClientId || publicConfig?.paypal_client_id || '').trim()
        const currency = String(publicConfig?.currency || props.currency || 'EUR').toUpperCase()
        if (!enabled || !clientId) throw new Error('PayPal is not configured for this restaurant.')
        await loadPayPalSdk(clientId, currency)
        if (cancelled || !containerRef.current) return
        const paypal = (window as PayPalWindow).paypal
        if (!paypal?.Buttons) throw new Error('PayPal Buttons are unavailable.')
        containerRef.current.replaceChildren()
        buttons = paypal.Buttons({
          fundingSource: props.methodCode === 'card' ? 'card' : 'paypal',
          style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'paypal', height: 45, tagline: false },
          createOrder: async () => {
            if (captureLockedRef.current || (isMultiOrder && multiOrderCaptureLockedRef.current)) throw new Error('This PayPal payment was already captured. Refresh the order status instead of paying again.')
            if (prepareSplitIntentRef.current && !preparedSplitIntentRef.current) preparedSplitIntentRef.current = await prepareSplitIntentRef.current()
            await ensureR36Reservation(preparedSplitIntentRef.current)
            const paymentData = buildPaymentData(preparedSplitIntentRef.current)
            try {
              const data = await requestJson('/api/v1/payments/paypal/create-order', paymentData)
              const id = String(data?.orderID || data?.orderId || data?.id || data?.paypal?.id || '')
              if (!id) throw new Error('PayPal did not return an order ID.')
              return id
            } catch (error) { await resetReservation(); throw error }
          },
          onApprove: async (data: any) => {
            try {
              setStatus('loading'); setMessage('Confirming PayPal payment…')
              const intent = preparedSplitIntentRef.current
              const allocations = paymentAllocations(intent)
              const paymentData = buildPaymentData(intent)
              const capture = await requestJson('/api/v1/payments/paypal/capture-order', { orderID: data?.orderID || data?.orderId, orderId: data?.orderID || data?.orderId, paymentData })
              const reference = String(capture?.transactionId || capture?.captureID || capture?.orderID || data?.orderID || '')
              if (!reference) throw new Error('PayPal capture reference is missing.')
              captureLockedRef.current = true
              if (isMultiOrder) multiOrderCaptureLockedRef.current = true

              if (r36ReservationRef.current) {
                await settleExistingOrderGroup({
                  allocations,
                  table: props.table,
                  method: props.methodCode,
                  providerCode: props.providerCode || 'paypal',
                  paymentReference: reference,
                  billingGroupPaymentId: r36ReservationRef.current.payment.paymentId,
                  providerEvidence: { provider: 'paypal', capture },
                })
              } else if (isMultiOrder) {
                await settleExistingOrderGroup({ allocations, table: props.table, method: props.methodCode, providerCode: props.providerCode || 'paypal', paymentReference: reference, providerEvidence: { provider: 'paypal', capture } })
              } else {
                await payExistingOrder({
                  orderId: props.orderId, table: props.table, method: props.methodCode, providerCode: props.providerCode || 'paypal', paymentReference: reference,
                  amount: intent?.payableAmount ?? props.amount, tipAmount: intent?.tipAmount ?? props.tipAmount, couponCode: intent ? null : props.couponCode,
                  couponDiscount: intent ? 0 : props.couponDiscount, selectedItems: intent?.selectedItems ?? props.selectedItems, payerLabel: intent?.payerLabel ?? props.payerLabel,
                  paymentIntentToken: intent?.token || null, splitMode: intent?.splitMode || null, splitPeople: intent?.splitPeople || null, sharePercent: intent?.sharePercent || null,
                  guestSessionId: props.guestSessionId || null,
                })
              }
              if (cancelled) return
              setStatus('ready'); setMessage('PayPal payment confirmed.'); await onSuccessRef.current()
            } catch (error) {
              const baseText = error instanceof Error ? error.message : 'PayPal payment failed.'
              const captured = captureLockedRef.current || (isMultiOrder && multiOrderCaptureLockedRef.current)
              const text = captured ? `PayPal payment was captured, but PayMyDine still needs to reconcile it: ${baseText} Do not pay again.` : baseText
              if (captured) { try { await buttons?.close?.() } catch {}; containerRef.current?.replaceChildren() } else await resetReservation()
              if (!cancelled) { setStatus('error'); setMessage(text); onErrorRef.current(text) }
            }
          },
          onCancel: async () => { await resetReservation(); if (!cancelled) { setStatus('ready'); setMessage('PayPal checkout was cancelled.') } },
          onError: async (error: any) => { if (!captureLockedRef.current && !multiOrderCaptureLockedRef.current) await resetReservation(); const text = String(error?.message || 'PayPal payment failed.'); if (!cancelled) { setStatus('error'); setMessage(text); onErrorRef.current(text) } },
        })
        await buttons.render(containerRef.current)
        if (!cancelled) { setStatus('ready'); setMessage('') }
      } catch (error) {
        const text = error instanceof Error ? error.message : 'PayPal payment is unavailable.'
        if (!cancelled) { setStatus('error'); setMessage(text); onErrorRef.current(text) }
      }
    }
    void mount()
    return () => {
      cancelled = true
      try { void buttons?.close?.() } catch {}
      containerRef.current?.replaceChildren()
      if (!captureLockedRef.current) void resetReservation()
    }
  }, [props.amount, props.couponCode, props.couponDiscount, props.currency, props.items, props.methodCode, props.orderId, props.orderAllocations, props.payerLabel, props.providerCode, props.selectedItems, props.table, props.tipAmount])

  return <div className={styles.paypalBox}><div ref={containerRef} aria-label="PayPal checkout" />{message && <p className={status === 'error' ? styles.providerError : styles.providerHint}>{message}</p>}</div>
}
