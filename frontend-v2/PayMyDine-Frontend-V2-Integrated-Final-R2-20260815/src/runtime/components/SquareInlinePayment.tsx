'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CreditCard, LoaderCircle } from 'lucide-react'
import type { TableContext } from '@/src/domain/model'
import {
  payExistingOrder,
  settleExistingOrderGroup,
  type ExistingOrderPaymentAllocation,
  type SplitPaymentIntent,
} from '@/src/lib/client-api'
import styles from './RuntimeOverlays.module.css'

type SquareWindow = Window & { Square?: any }

type Props = {
  orderId: number
  orderAllocations?: ExistingOrderPaymentAllocation[] | null
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
  guestSessionId: string
  prepareSplitIntent?: (() => Promise<SplitPaymentIntent>) | undefined
  onSuccess: (amount: number) => void | Promise<void>
  onError?: (message: string) => void
  locale?: string
}

type SquareConfig = {
  application_id: string
  location_id: string
  script_url: string
  country_code: string
  currency: string
  sandbox: boolean
  methods: Record<string, boolean>
}

const squareScripts = new Map<string, Promise<void>>()

function loadSquareScript(url: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Square is only available in the browser.'))
  if ((window as SquareWindow).Square) return Promise.resolve()
  const existing = squareScripts.get(url)
  if (existing) return existing
  const promise = new Promise<void>((resolve, reject) => {
    const prior = Array.from(document.scripts).find((entry) => entry.src === url)
    if (prior) {
      prior.addEventListener('load', () => resolve(), { once: true })
      prior.addEventListener('error', () => reject(new Error('Square Web Payments SDK could not be loaded.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.dataset.pmdSquareWebPayments = '1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Square Web Payments SDK could not be loaded.'))
    document.head.appendChild(script)
  })
  squareScripts.set(url, promise)
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

function formatMoney(value: number, currency: string, locale = 'en') {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value) }
  catch { return `${Number(value || 0).toFixed(2)} ${currency}` }
}

export function SquareInlinePayment(props: Props) {
  const method = String(props.methodCode || 'card').trim().toLowerCase()
  const groupedAllocations = useMemo(() => (props.orderAllocations || []).filter((entry) => entry.orderId > 0 && entry.amount > 0), [props.orderAllocations])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [config, setConfig] = useState<SquareConfig | null>(null)
  const paymentsRef = useRef<any>(null)
  const cardRef = useRef<any>(null)
  const applePayRef = useRef<any>(null)
  const googlePayRef = useRef<any>(null)
  const googleMountRef = useRef<HTMLDivElement | null>(null)
  const preparedIntentRef = useRef<SplitPaymentIntent | null>(null)
  const settledRef = useRef(false)
  const cardElementId = `pmd-square-card-${props.orderId}`

  const reportError = (message: string) => {
    setError(message)
    setInfo('')
    props.onError?.(message)
  }

  const prepareIntent = async () => {
    if (!props.prepareSplitIntent) return null
    if (preparedIntentRef.current) return preparedIntentRef.current
    const intent = await props.prepareSplitIntent()
    preparedIntentRef.current = intent
    return intent
  }

  const settle = async (paymentId: string, intent: SplitPaymentIntent | null, amount: number) => {
    if (groupedAllocations.length > 1) {
      await settleExistingOrderGroup({
        allocations: groupedAllocations,
        table: props.table,
        method: props.methodCode,
        providerCode: 'square',
        paymentReference: paymentId,
      })
    } else {
      await payExistingOrder({
        orderId: props.orderId,
        table: props.table,
        method: props.methodCode,
        providerCode: 'square',
        paymentReference: paymentId,
        amount,
        tipAmount: intent?.tipAmount ?? props.tipAmount,
        couponCode: intent ? null : props.couponCode,
        couponDiscount: intent ? 0 : props.couponDiscount,
        selectedItems: intent?.selectedItems ?? props.selectedItems,
        payerLabel: intent?.payerLabel ?? props.payerLabel,
        paymentIntentToken: intent?.token || null,
        splitMode: intent?.splitMode || null,
        splitPeople: intent?.splitPeople || null,
        sharePercent: intent?.sharePercent || null,
        guestSessionId: props.guestSessionId || null,
      })
    }
    settledRef.current = true
    setError('')
    setInfo('')
    await props.onSuccess(amount)
  }

  const chargeToken = async (token: string, intent: SplitPaymentIntent | null) => {
    if (!config) throw new Error('Square configuration is not ready.')
    if (groupedAllocations.length > 1) throw new Error('Square grouped multi-order payment is not enabled yet.')
    const amount = intent?.payableAmount ?? props.amount
    const result = await requestJson('/api/v1/payments/square/create-payment', {
      source_id: token,
      order_id: props.orderId,
      payment_method: method,
      provider: 'square',
      location_id: props.table.locationId || null,
      currency: props.currency,
      tip_amount: intent?.tipAmount ?? props.tipAmount,
      coupon_code: intent ? null : props.couponCode,
      coupon_discount: intent ? 0 : props.couponDiscount,
      selected_items: intent?.selectedItems ?? props.selectedItems,
      payment_intent_token: intent?.token || null,
      guest_session_id: props.guestSessionId || null,
    })
    const paymentId = String(result?.payment_id || '')
    if (!paymentId) throw new Error('Square did not return a payment ID.')
    if (!result?.is_paid || !result?.verification_ok) {
      throw new Error(`Square payment is not complete (${String(result?.status || 'unknown')}). Do not pay again until status is checked.`)
    }
    await settle(paymentId, intent, amount)
  }

  const tokenizeCard = async () => {
    const card = cardRef.current
    if (!card || !config) throw new Error('Square card form is not ready.')
    const intent = await prepareIntent()
    const amount = intent?.payableAmount ?? props.amount
    const tokenResult = await card.tokenize({
      amount: Number(amount).toFixed(config.currency === 'JPY' ? 0 : 2),
      intent: 'CHARGE',
      customerInitiated: true,
      sellerKeyedIn: false,
      currencyCode: config.currency,
    })
    if (String(tokenResult?.status || '') !== 'OK' || !tokenResult?.token) {
      throw new Error(String(tokenResult?.errors?.[0]?.message || 'Square could not tokenize the card.'))
    }
    await chargeToken(String(tokenResult.token), intent)
  }

  // Apple Pay tokenize() must remain directly inside the user click call stack.
  const tokenizeApplePay = async () => {
    const applePay = applePayRef.current
    if (!applePay) throw new Error('Apple Pay is not ready with Square.')
    const tokenResultPromise = applePay.tokenize()
    const tokenResult = await tokenResultPromise
    if (String(tokenResult?.status || '') !== 'OK' || !tokenResult?.token) {
      throw new Error(String(tokenResult?.errors?.[0]?.message || 'Square Apple Pay tokenization failed.'))
    }
    const intent = await prepareIntent()
    await chargeToken(String(tokenResult.token), intent)
  }

  const tokenizeGooglePay = async () => {
    const googlePay = googlePayRef.current
    if (!googlePay) throw new Error('Google Pay is not ready with Square.')
    const tokenResult = await googlePay.tokenize()
    if (String(tokenResult?.status || '') !== 'OK' || !tokenResult?.token) {
      throw new Error(String(tokenResult?.errors?.[0]?.message || 'Square Google Pay tokenization failed.'))
    }
    const intent = await prepareIntent()
    await chargeToken(String(tokenResult.token), intent)
  }

  const run = async (action: () => Promise<void>) => {
    if (busy || settledRef.current) return
    setBusy(true); setError(''); setInfo('Processing Square payment...')
    try { await action() }
    catch (e) { reportError(e instanceof Error ? e.message : 'Square payment failed.') }
    finally { setBusy(false) }
  }

  useEffect(() => {
    let cancelled = false
    setReady(false); setError(''); setInfo(''); setConfig(null)
    preparedIntentRef.current = null; settledRef.current = false
    const cleanup = async () => {
      try { await cardRef.current?.destroy?.() } catch {}
      try { await applePayRef.current?.destroy?.() } catch {}
      try { await googlePayRef.current?.destroy?.() } catch {}
      cardRef.current = null; applePayRef.current = null; googlePayRef.current = null; paymentsRef.current = null
    }

    const setup = async () => {
      try {
        await cleanup()
        const query = new URLSearchParams({ method, location_id: String(props.table.locationId || '') })
        const loaded = await requestJson(`/api/v1/payments/square/runtime-config?${query.toString()}`) as SquareConfig
        if (cancelled) return
        await loadSquareScript(String(loaded.script_url || ''))
        if (cancelled) return
        const Square = (window as SquareWindow).Square
        if (!Square?.payments) throw new Error('Square Web Payments SDK did not initialize.')
        const payments = Square.payments(loaded.application_id, loaded.location_id)
        try { await payments.setLocale?.(props.locale || navigator.language || 'en-US') } catch {}
        paymentsRef.current = payments
        setConfig(loaded)

        if (method === 'card') {
          const card = await payments.card()
          if (cancelled) { try { await card.destroy?.() } catch {}; return }
          cardRef.current = card
          await card.attach(`#${cardElementId}`)
          if (!cancelled) setReady(true)
          return
        }

        const paymentRequest = payments.paymentRequest({
          countryCode: loaded.country_code,
          currencyCode: loaded.currency,
          total: { amount: Number(props.amount).toFixed(loaded.currency === 'JPY' ? 0 : 2), label: 'PayMyDine' },
        })

        if (method === 'apple_pay') {
          applePayRef.current = await payments.applePay(paymentRequest)
          if (!cancelled) setReady(true)
          return
        }

        if (method === 'google_pay') {
          const googlePay = await payments.googlePay(paymentRequest)
          if (cancelled) { try { await googlePay.destroy?.() } catch {}; return }
          googlePayRef.current = googlePay
          const mount = googleMountRef.current
          if (!mount) throw new Error('Google Pay button target is unavailable.')
          mount.replaceChildren()
          await googlePay.attach(mount, { buttonColor: 'default', buttonType: 'long' })
          mount.onclick = () => { void run(tokenizeGooglePay) }
          if (!cancelled) setReady(true)
          return
        }

        throw new Error('Unsupported Square method.')
      } catch (e) {
        if (!cancelled) reportError(e instanceof Error ? e.message : 'Square could not initialize.')
      }
    }

    void setup()
    return () => { cancelled = true; void cleanup() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, props.orderId, props.table.locationId, props.amount, props.currency])

  return (
    <div className={styles.stack} data-pmd-square-inline="r1">
      {method === 'card' && (
        <>
          <div id={cardElementId} style={{ minHeight: 96, borderRadius: 14, overflow: 'hidden' }} />
          <button className={styles.primary} type="button" disabled={!ready || busy} onClick={() => void run(tokenizeCard)}>
            {busy ? <LoaderCircle /> : <CreditCard />} {ready ? `Pay ${formatMoney(props.amount, props.currency, props.locale)}` : 'Preparing Square...'}
          </button>
        </>
      )}
      {method === 'apple_pay' && (
        <button className={styles.primary} type="button" disabled={!ready || busy} onClick={() => void run(tokenizeApplePay)}>
          {busy ? <LoaderCircle /> : <span aria-hidden="true" style={{ fontSize: '1.35em' }}></span>} {ready ? 'Apple Pay' : 'Preparing Apple Pay...'}
        </button>
      )}
      {method === 'google_pay' && <div ref={googleMountRef} style={{ minHeight: 48, opacity: busy ? 0.65 : 1 }} />}
      {config?.sandbox && <div className={styles.statusMessage}>Square Sandbox — no live charge.</div>}
      {info && !error && <div className={styles.statusMessage}>{info}</div>}
      {error && <div className={`${styles.statusMessage} ${styles.statusError}`}>{error}</div>}
    </div>
  )
}
