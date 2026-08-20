'use client'

import { useEffect, useRef, useState } from 'react'
import type { TableContext } from '@/src/domain/model'
import { payExistingOrder, settleExistingOrderGroup, type ExistingOrderPaymentAllocation } from '@/src/lib/client-api'
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
  onSuccess: () => void | Promise<void>
  onError: (message: string) => void
}

const sdkPromises = new Map<string, Promise<void>>()

function loadPayPalSdk(clientId: string, currency: string): Promise<void> {
  const key = `${clientId}:${currency}`
  const existing = sdkPromises.get(key)
  if (existing) return existing

  const promise = new Promise<void>((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>('script[data-pmd-paypal-sdk="1"]')
    if ((window as PayPalWindow).paypal?.Buttons) {
      resolve()
      return
    }

    if (current) {
      current.addEventListener('load', () => resolve(), { once: true })
      current.addEventListener('error', () => reject(new Error('PayPal SDK could not be loaded.')), { once: true })
      return
    }

    const params = new URLSearchParams({
      'client-id': clientId,
      currency: currency.toUpperCase(),
      intent: 'capture',
      components: 'buttons',
      'enable-funding': 'paypal,card',
    })
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
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    throw new Error(String(data?.error || data?.message || `HTTP ${response.status}`))
  }
  return data
}

export function PayPalButton(props: Props) {
  // PMD_MULTI_ORDER_PAYMENT_R32
  const groupedAllocations = (props.orderAllocations || []).filter((entry) => entry.orderId > 0 && entry.amount > 0)
  const isMultiOrder = groupedAllocations.length > 1
  const multiOrderCaptureLockedRef = useRef(false)
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

    const paymentData = {
      amount: props.amount,
      currency: props.currency.toUpperCase(),
      payment_method: props.methodCode,
      order_id: isMultiOrder ? undefined : props.orderId,
      items: props.items,
      tableNumber: props.table.number || props.table.id,
      table_id: props.table.id,
      table_no: props.table.number,
      qr: props.table.qr,
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
            if (isMultiOrder && multiOrderCaptureLockedRef.current) throw new Error('This PayPal payment was already captured. Refresh the order status instead of paying again.')
            const data = await requestJson('/api/v1/payments/paypal/create-order', paymentData)
            const id = String(data?.orderID || data?.orderId || data?.id || data?.paypal?.id || '')
            if (!id) throw new Error('PayPal did not return an order ID.')
            return id
          },
          onApprove: async (data: any) => {
            try {
              setStatus('loading')
              setMessage('Confirming PayPal payment…')
              const capture = await requestJson('/api/v1/payments/paypal/capture-order', {
                orderID: data?.orderID || data?.orderId,
                orderId: data?.orderID || data?.orderId,
                paymentData,
              })
              const reference = String(
                capture?.transactionId ||
                capture?.captureID ||
                capture?.orderID ||
                data?.orderID ||
                '',
              )
              if (!reference) throw new Error('PayPal capture reference is missing.')
              if (isMultiOrder) multiOrderCaptureLockedRef.current = true

              if (isMultiOrder) {
                await settleExistingOrderGroup({
                  allocations: groupedAllocations,
                  table: props.table,
                  method: props.methodCode,
                  providerCode: props.providerCode || 'paypal',
                  paymentReference: reference,
                })
              } else {
                await payExistingOrder({
                  orderId: props.orderId,
                  table: props.table,
                  method: props.methodCode,
                  providerCode: props.providerCode || 'paypal',
                  paymentReference: reference,
                  amount: props.amount,
                  tipAmount: props.tipAmount,
                  couponCode: props.couponCode,
                  couponDiscount: props.couponDiscount,
                  selectedItems: props.selectedItems,
                  payerLabel: props.payerLabel,
                })
              }

              if (cancelled) return
              setStatus('ready')
              setMessage('PayPal payment confirmed.')
              await onSuccessRef.current()
            } catch (error) {
              const baseText = error instanceof Error ? error.message : 'PayPal payment failed.'
              const text = isMultiOrder && multiOrderCaptureLockedRef.current
                ? `PayPal payment was captured, but the selected orders are still synchronizing: ${baseText} Do not pay again.`
                : baseText
              if (isMultiOrder && multiOrderCaptureLockedRef.current) {
                try { await buttons?.close?.() } catch {}
                containerRef.current?.replaceChildren()
              }
              if (!cancelled) {
                setStatus('error')
                setMessage(text)
                onErrorRef.current(text)
              }
            }
          },
          onCancel: () => {
            if (!cancelled) {
              setStatus('ready')
              setMessage('PayPal checkout was cancelled.')
            }
          },
          onError: (error: any) => {
            const text = String(error?.message || 'PayPal payment failed.')
            if (!cancelled) {
              setStatus('error')
              setMessage(text)
              onErrorRef.current(text)
            }
          },
        })

        await buttons.render(containerRef.current)
        if (!cancelled) {
          setStatus('ready')
          setMessage('')
        }
      } catch (error) {
        const text = error instanceof Error ? error.message : 'PayPal payment is unavailable.'
        if (!cancelled) {
          setStatus('error')
          setMessage(text)
          onErrorRef.current(text)
        }
      }
    }

    void mount()
    return () => {
      cancelled = true
      try { void buttons?.close?.() } catch {}
      containerRef.current?.replaceChildren()
    }
  }, [
    props.amount,
    props.couponCode,
    props.couponDiscount,
    props.currency,
    props.items,
    props.methodCode,
    props.orderId,
    props.orderAllocations,
    props.payerLabel,
    props.providerCode,
    props.selectedItems,
    props.table,
    props.tipAmount,
  ])

  return (
    <div className={styles.paypalBox}>
      <div ref={containerRef} aria-label="PayPal checkout" />
      {message && <p className={status === 'error' ? styles.providerError : styles.providerHint}>{message}</p>}
    </div>
  )
}
