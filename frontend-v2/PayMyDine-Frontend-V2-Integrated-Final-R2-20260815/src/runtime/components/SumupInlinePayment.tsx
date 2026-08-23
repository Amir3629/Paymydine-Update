'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CreditCard, LoaderCircle, ShieldCheck } from 'lucide-react'
import type { TableContext } from '@/src/domain/model'
import {
  payExistingOrder,
  settleExistingOrderGroup,
  type ExistingOrderPaymentAllocation,
  type SplitPaymentIntent,
} from '@/src/lib/client-api'
import styles from './RuntimeOverlays.module.css'

type SumupWidget = {
  submit?: () => void
  unmount?: () => void
  update?: (config: Record<string, unknown>) => void
}

type SumupWindow = Window & {
  SumUpCard?: {
    mount: (config: Record<string, unknown>) => SumupWidget
  }
}

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

type WidgetCheckout = {
  checkout_id: string
  checkout_reference: string
  environment: string
  available_payment_methods: string[]
  widget?: {
    sdk_url?: string
    allowed_payment_methods?: string[]
    google_pay?: { merchantId: string; merchantName: string } | null
  }
}

const DEFAULT_SDK = 'https://gateway.sumup.com/gateway/ecom/card/v2/sdk.js'
const PMD_METHOD_ALLOWLIST = ['card', 'apple_pay', 'google_pay']
let sumupScriptPromise: Promise<void> | null = null

function loadSumupScript(src: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SumUp is only available in the browser.'))
  if ((window as SumupWindow).SumUpCard?.mount) return Promise.resolve()
  if (sumupScriptPromise) return sumupScriptPromise

  sumupScriptPromise = new Promise<void>((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>('script[data-pmd-sumup-widget="1"]')
    if (current) {
      current.addEventListener('load', () => resolve(), { once: true })
      current.addEventListener('error', () => reject(new Error('SumUp Payment Widget could not be loaded.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = src || DEFAULT_SDK
    script.async = true
    script.dataset.pmdSumupWidget = '1'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('SumUp Payment Widget could not be loaded.')), { once: true })
    document.head.appendChild(script)
  })

  return sumupScriptPromise
}

async function requestJson(url: string, body: unknown): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    throw new Error(String(data?.message || data?.error || `HTTP ${response.status}`))
  }
  return data
}

function widgetLocale(locale = 'en'): string {
  const normalized = String(locale || 'en').replace('_', '-').toLowerCase()
  if (normalized.startsWith('de')) return 'de-DE'
  if (normalized.startsWith('fr')) return 'fr-FR'
  if (normalized.startsWith('it')) return 'it-IT'
  if (normalized.startsWith('es')) return 'es-ES'
  if (normalized.startsWith('nl')) return 'nl-NL'
  if (normalized.startsWith('pt')) return 'pt-PT'
  if (normalized.startsWith('pl')) return 'pl-PL'
  return 'en-GB'
}

function copyFor(locale = 'en') {
  const code = String(locale || 'en').toLowerCase().split('-')[0]
  if (code === 'de') return {
    secure: 'Sichere Karten- oder Wallet-Zahlung',
    loading: 'SumUp wird geladen…',
    pay: 'Bezahlen',
    processing: 'Zahlung wird verarbeitet…',
    verify: 'Zahlung wird bei SumUp bestätigt…',
    pending: 'SumUp verarbeitet diese Zahlung noch. Bitte nicht erneut bezahlen; aktualisieren Sie den Bestellstatus in Kürze.',
    methods: 'Karte, Apple Pay und Google Pay werden von SumUp je nach Verfügbarkeit angezeigt.',
  }
  return {
    secure: 'Secure card or wallet payment',
    loading: 'Loading SumUp…',
    pay: 'Pay',
    processing: 'Processing payment…',
    verify: 'Confirming payment with SumUp…',
    pending: 'SumUp is still processing this payment. Do not pay again; refresh the order status shortly.',
    methods: 'Card, Apple Pay and Google Pay are shown by SumUp when available.',
  }
}

function money(value: number, currency: string, locale = 'en') {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency: String(currency || 'EUR').toUpperCase() }).format(value) }
  catch { return `${Number(value || 0).toFixed(2)} ${String(currency || 'EUR').toUpperCase()}` }
}

export function SumupInlinePayment(props: Props) {
  // PMD_SUMUP_INLINE_WIDGET_R1
  const copy = copyFor(props.locale)
  const groupedAllocations = useMemo(
    () => (props.orderAllocations || []).filter((entry) => entry.orderId > 0 && entry.amount > 0),
    [props.orderAllocations],
  )
  const isMultiOrder = groupedAllocations.length > 1
  const mountIdRef = useRef(`pmd-sumup-card-${props.orderId}-${Math.random().toString(36).slice(2, 9)}`)
  const widgetRef = useRef<SumupWidget | null>(null)
  const preparedIntentRef = useRef<SplitPaymentIntent | null>(null)
  const checkoutRef = useRef<WidgetCheckout | null>(null)
  const settledRef = useRef(false)
  const submittedRef = useRef(false)
  const mountedRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [availableMethods, setAvailableMethods] = useState<string[]>([])

  const reportError = (message: string) => {
    setError(message)
    setInfo('')
    props.onError?.(message)
  }

  const cancelPreparedIntent = async () => {
    const intent = preparedIntentRef.current
    if (!intent || settledRef.current || submittedRef.current) return
    preparedIntentRef.current = null
    try {
      await requestJson('/api/v1/orders/split-intent/cancel', {
        intent_token: intent.token,
        guest_session_id: props.guestSessionId || null,
      })
    } catch {}
  }

  const prepareIntent = async () => {
    if (!props.prepareSplitIntent) return null
    if (preparedIntentRef.current) return preparedIntentRef.current
    const intent = await props.prepareSplitIntent()
    preparedIntentRef.current = intent
    return intent
  }

  const settle = async (reference: string, intent: SplitPaymentIntent | null, amount: number) => {
    if (isMultiOrder) {
      await settleExistingOrderGroup({
        allocations: groupedAllocations,
        table: props.table,
        method: props.methodCode,
        providerCode: props.providerCode || 'sumup',
        paymentReference: reference,
      })
    } else {
      await payExistingOrder({
        orderId: props.orderId,
        table: props.table,
        method: props.methodCode,
        providerCode: props.providerCode || 'sumup',
        paymentReference: reference,
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
    preparedIntentRef.current = null
    setInfo('')
    setError('')
    await props.onSuccess(amount)
  }

  const verifyAndSettle = async (intent: SplitPaymentIntent | null, amount: number) => {
    const checkoutId = String(checkoutRef.current?.checkout_id || '')
    if (!checkoutId) throw new Error('SumUp checkout reference is missing.')

    setInfo(copy.verify)
    let last: any = null
    for (let attempt = 0; attempt < 8; attempt += 1) {
      last = await requestJson('/api/v1/payments/sumup/widget/status', { checkout_id: checkoutId })
      if (last?.is_paid === true || String(last?.status || '').toLowerCase() === 'paid') break
      if (['failed', 'cancelled', 'expired'].includes(String(last?.status || '').toLowerCase())) break
      await new Promise((resolve) => window.setTimeout(resolve, 650))
    }

    if (!(last?.is_paid === true || String(last?.status || '').toLowerCase() === 'paid')) {
      const status = String(last?.status || 'pending').toLowerCase()
      if (status === 'pending') throw new Error(copy.pending)
      throw new Error(`SumUp payment is not complete (${status}).`)
    }

    const reference = String(last?.transaction_code || last?.payment_id || checkoutId)
    try {
      await settle(reference, intent, amount)
    } catch (settlementError) {
      throw new Error(`SumUp confirmed the payment, but PayMyDine could not finish settlement. Do not pay again. ${settlementError instanceof Error ? settlementError.message : ''}`.trim())
    }
  }

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      setReady(false)
      setError('')
      setInfo(copy.loading)
      submittedRef.current = false
      settledRef.current = false

      try {
        const intent = await prepareIntent()
        if (cancelled) return
        const amount = Number((intent?.payableAmount ?? props.amount).toFixed(2))
        if (!(amount > 0)) throw new Error('Payment amount must be greater than zero.')

        const returnUrl = typeof window !== 'undefined'
          ? window.location.href
          : '/'
        const checkout: WidgetCheckout = await requestJson('/api/v1/payments/sumup/widget/create-checkout', {
          order_id: props.orderId,
          amount,
          currency: String(props.currency || 'EUR').toUpperCase(),
          return_url: returnUrl,
          description: `PayMyDine order #${props.orderId}`,
          items: intent?.providerItems?.length ? intent.providerItems : props.items,
        })
        if (cancelled) return
        if (!checkout?.checkout_id) throw new Error('SumUp did not return a checkout ID.')
        checkoutRef.current = checkout

        const methods = (checkout.widget?.allowed_payment_methods || checkout.available_payment_methods || ['card'])
          .map((value) => String(value || '').toLowerCase())
          .filter((value) => PMD_METHOD_ALLOWLIST.includes(value))
        const allowedMethods = methods.length ? Array.from(new Set(methods)) : ['card']
        setAvailableMethods(allowedMethods)

        await loadSumupScript(String(checkout.widget?.sdk_url || DEFAULT_SDK))
        if (cancelled) return
        const cardApi = (window as SumupWindow).SumUpCard
        if (!cardApi?.mount) throw new Error('SumUp Payment Widget is unavailable.')

        try { widgetRef.current?.unmount?.() } catch {}
        const config: Record<string, unknown> = {
          id: mountIdRef.current,
          checkoutId: checkout.checkout_id,
          amount: amount.toFixed(2),
          currency: String(props.currency || 'EUR').toUpperCase(),
          locale: widgetLocale(props.locale),
          showSubmitButton: false,
          showFooter: true,
          onPaymentMethodsLoad: () => allowedMethods,
          onLoad: () => {
            if (cancelled) return
            mountedRef.current = true
            setInfo('')
            setReady(true)
          },
          onResponse: async (type: string, body: any) => {
            if (cancelled || settledRef.current) return
            const responseType = String(type || '').toLowerCase()
            if (responseType === 'sent' || responseType === 'auth-screen') {
              setBusy(true)
              setInfo(copy.processing)
              setError('')
              return
            }
            if (responseType === 'invalid') {
              setBusy(false)
              reportError(String(body?.message || 'Please check the payment details.'))
              return
            }
            if (responseType === 'error' || responseType === 'fail') {
              setBusy(false)
              submittedRef.current = false
              reportError(String(body?.message || body?.error_message || body?.error || 'SumUp could not complete the payment.'))
              return
            }
            if (responseType === 'success') {
              submittedRef.current = true
              setBusy(true)
              try {
                await verifyAndSettle(intent, amount)
              } catch (verificationError) {
                reportError(verificationError instanceof Error ? verificationError.message : 'SumUp payment verification failed.')
              } finally {
                if (!settledRef.current) setBusy(false)
              }
            }
          },
        }

        if (checkout.widget?.google_pay?.merchantId && checkout.widget?.google_pay?.merchantName) {
          config.googlePay = checkout.widget.google_pay
        }

        widgetRef.current = cardApi.mount(config)
      } catch (setupError) {
        if (cancelled) return
        await cancelPreparedIntent()
        reportError(setupError instanceof Error ? setupError.message : 'SumUp Payment Widget could not be prepared.')
        setReady(false)
      }
    }

    void setup()
    return () => {
      cancelled = true
      try { widgetRef.current?.unmount?.() } catch {}
      widgetRef.current = null
      mountedRef.current = false
      if (!settledRef.current && !submittedRef.current) void cancelPreparedIntent()
    }
    // A new checkout must be created if the payable amount or selected order changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.orderId, props.amount, props.currency, props.methodCode, props.providerCode])

  const submit = async () => {
    if (!ready || busy || submittedRef.current || settledRef.current) return
    if (!widgetRef.current?.submit) {
      reportError('SumUp Payment Widget is not ready.')
      return
    }
    setBusy(true)
    setError('')
    setInfo(copy.processing)
    try {
      widgetRef.current.submit()
    } catch (submitError) {
      setBusy(false)
      reportError(submitError instanceof Error ? submitError.message : 'SumUp could not submit the payment.')
    }
  }

  const payableAmount = preparedIntentRef.current?.payableAmount ?? props.amount
  const methodSummary = availableMethods
    .map((id) => id === 'apple_pay' ? 'Apple Pay' : id === 'google_pay' ? 'Google Pay' : 'Card')
    .join(' · ')

  return (
    <section className={styles.stripeInlineBox} data-pmd-sumup-inline-widget="r1">
      <div className={styles.stripeSecureTitle}><ShieldCheck aria-hidden="true" /> {copy.secure}</div>
      <div className={styles.stripeHint}>{methodSummary || copy.methods}</div>
      <div className={styles.stripeCardFrame}>
        <div id={mountIdRef.current} data-pmd-sumup-widget-mount="1" />
      </div>
      {info ? <div className={styles.stripeHint}>{info}</div> : null}
      {error ? <div className={`${styles.statusMessage} ${styles.statusError}`}>{error}</div> : null}
      <button className={styles.primary} type="button" onClick={() => void submit()} disabled={!ready || busy || submittedRef.current || settledRef.current}>
        {busy ? <LoaderCircle /> : <CreditCard />} {busy ? copy.processing : `${copy.pay} ${money(payableAmount, props.currency, props.locale)}`}
      </button>
    </section>
  )
}
