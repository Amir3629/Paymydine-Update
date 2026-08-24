'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'
import type { TableContext } from '@/src/domain/model'
import {
  payExistingOrder,
  settleExistingOrderGroup,
  type ExistingOrderPaymentAllocation,
  type SplitPaymentIntent,
} from '@/src/lib/client-api'
import styles from './RuntimeOverlays.module.css'

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

type SwiftConfig = {
  success: boolean
  provider: 'sumup'
  integration_mode: 'swift_checkout'
  environment: string
  sdk_url: string
  public_key: string
  country_code: string
  merchant_name?: string | null
  google_pay?: { merchantId: string; merchantName: string } | null
}

type WidgetCheckout = {
  checkout_id: string
  checkout_reference?: string
}

type SwiftPaymentMethod = {
  id?: string
  [key: string]: unknown
}

type SwiftPaymentRequest = {
  canMakePayment: () => Promise<boolean>
  availablePaymentMethods: () => Promise<SwiftPaymentMethod[]>
  show: (event: unknown) => Promise<unknown>
}

type SwiftElements = {
  onSubmit: (handler: (event: unknown) => void | Promise<void>) => SwiftElements | void
  mount: (config: { paymentMethods: SwiftPaymentMethod[]; container: Element }) => void
  unmount?: () => void
}

type SwiftClient = {
  paymentRequest: (config: Record<string, unknown>) => SwiftPaymentRequest
  elements: (config?: Record<string, unknown>) => SwiftElements
  processCheckout: (checkoutId: string, paymentResponse: unknown) => Promise<Record<string, unknown>>
}

type SwiftWindow = Window & {
  SumUp?: {
    SwiftCheckout?: new (publicKey: string) => SwiftClient
  }
}

const DEFAULT_SWIFT_SDK = 'https://js.sumup.com/swift-checkout/v1/sdk.js'
let swiftScriptPromise: Promise<void> | null = null

function loadSwiftScript(src: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SumUp wallets are only available in the browser.'))
  if ((window as SwiftWindow).SumUp?.SwiftCheckout) return Promise.resolve()
  if (swiftScriptPromise) return swiftScriptPromise

  swiftScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-pmd-sumup-swift="1"]')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('SumUp Swift Checkout SDK could not be loaded.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = src || DEFAULT_SWIFT_SDK
    script.async = true
    script.dataset.pmdSumupSwift = '1'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('SumUp Swift Checkout SDK could not be loaded.')), { once: true })
    document.head.appendChild(script)
  })

  return swiftScriptPromise
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

async function getJson(url: string): Promise<any> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    throw new Error(String(data?.message || data?.error || `HTTP ${response.status}`))
  }
  return data
}

function walletLocale(locale = 'en'): string {
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

function copyFor(locale = 'en', methodCode = 'apple_pay') {
  const de = String(locale || 'en').toLowerCase().startsWith('de')
  const wallet = methodCode === 'google_pay' ? 'Google Pay' : 'Apple Pay'
  if (de) return {
    title: wallet,
    checking: `${wallet} wird geprüft…`,
    processing: `${wallet}-Zahlung wird verarbeitet…`,
    unavailable: `${wallet} ist für dieses Gerät, diese Domain oder dieses SumUp-Konto noch nicht verfügbar. Es werden keine Kartenfelder als Ersatz angezeigt.`,
    publicKey: 'SumUp Wallet Public Key fehlt. Öffnen Sie in SumUp: Einstellungen → Für Entwickler → Toolkit → API Keys und kopieren Sie den Schlüssel sup_pk_… in PayMyDine.',
    pending: 'SumUp verarbeitet diese Zahlung noch. Bitte nicht erneut bezahlen.',
  }
  return {
    title: wallet,
    checking: `Checking ${wallet}…`,
    processing: `Processing ${wallet} payment…`,
    unavailable: `${wallet} is not available for this device, domain or SumUp merchant yet. Card fields will not be shown as a fallback.`,
    publicKey: 'SumUp Wallet Public Key is missing. In SumUp open Settings → For Developers → Toolkit → API Keys and copy the sup_pk_… key into PayMyDine.',
    pending: 'SumUp is still processing this payment. Do not pay again.',
  }
}

function money(value: number, currency: string, locale = 'en') {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency: String(currency || 'EUR').toUpperCase() }).format(value) }
  catch { return `${Number(value || 0).toFixed(2)} ${String(currency || 'EUR').toUpperCase()}` }
}

export function SumupSwiftWalletPayment(props: Props) {
  // PMD_SUMUP_SWIFT_WALLET_R5
  const methodCode = String(props.methodCode || '').toLowerCase()
  const copy = copyFor(props.locale, methodCode)
  const groupedAllocations = useMemo(
    () => (props.orderAllocations || []).filter((entry) => entry.orderId > 0 && entry.amount > 0),
    [props.orderAllocations],
  )
  const isMultiOrder = groupedAllocations.length > 1
  const mountIdRef = useRef(`pmd-sumup-swift-${props.orderId}-${Math.random().toString(36).slice(2, 9)}`)
  const elementsRef = useRef<SwiftElements | null>(null)
  const preparedIntentRef = useRef<SplitPaymentIntent | null>(null)
  const checkoutRef = useRef<WidgetCheckout | null>(null)
  const settledRef = useRef(false)
  const submittedRef = useRef(false)
  const busyRef = useRef(false)
  const [busy, setBusy] = useState(false)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState(copy.checking)

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

    let last: any = null
    for (let attempt = 0; attempt < 10; attempt += 1) {
      last = await requestJson('/api/v1/payments/sumup/widget/status', {
        checkout_id: checkoutId,
        order_id: props.orderId,
        amount,
        currency: String(props.currency || 'EUR').toUpperCase(),
      })
      if (last?.is_paid === true || String(last?.status || '').toLowerCase() === 'paid') break
      if (['failed', 'cancelled', 'expired'].includes(String(last?.status || '').toLowerCase())) break
      await new Promise((resolve) => window.setTimeout(resolve, 700))
    }

    if (!(last?.is_paid === true || String(last?.status || '').toLowerCase() === 'paid')) {
      const status = String(last?.status || 'pending').toLowerCase()
      if (status === 'pending') throw new Error(copy.pending)
      throw new Error(`SumUp payment is not complete (${status}).`)
    }

    const reference = String(last?.transaction_code || last?.payment_id || checkoutId)
    await settle(reference, intent, amount)
  }

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      setReady(false)
      setError('')
      setInfo(copy.checking)
      settledRef.current = false
      submittedRef.current = false
      busyRef.current = false

      try {
        if (!['apple_pay', 'google_pay'].includes(methodCode)) {
          throw new Error('SumUp Swift Checkout is only used for Apple Pay and Google Pay.')
        }

        const intent = await prepareIntent()
        if (cancelled) return
        const amount = Number((intent?.payableAmount ?? props.amount).toFixed(2))
        if (!(amount > 0)) throw new Error('Payment amount must be greater than zero.')

        const config = await getJson('/api/v1/payments/sumup/swift/config') as SwiftConfig
        if (cancelled) return
        const publicKey = String(config.public_key || '').trim()
        if (!publicKey.startsWith('sup_pk_')) throw new Error(copy.publicKey)
        if (!/^[A-Z]{2}$/.test(String(config.country_code || ''))) {
          throw new Error('SumUp merchant country could not be resolved.')
        }
        if (methodCode === 'google_pay' && (!config.google_pay?.merchantId || !config.google_pay?.merchantName)) {
          throw new Error('Google Pay Merchant ID and Merchant Name are not configured in PayMyDine yet.')
        }

        await loadSwiftScript(String(config.sdk_url || DEFAULT_SWIFT_SDK))
        if (cancelled) return
        const SwiftCheckout = (window as SwiftWindow).SumUp?.SwiftCheckout
        if (!SwiftCheckout) throw new Error('SumUp Swift Checkout SDK is unavailable.')
        const client = new SwiftCheckout(publicKey)

        const requestConfig: Record<string, unknown> = {
          countryCode: String(config.country_code).toUpperCase(),
          locale: walletLocale(props.locale),
          total: {
            label: props.payerLabel || config.merchant_name || `PayMyDine order #${props.orderId}`,
            amount: {
              currency: String(props.currency || 'EUR').toUpperCase(),
              value: amount.toFixed(2),
            },
          },
        }

        if (methodCode === 'google_pay' && config.google_pay) {
          requestConfig.methodData = [{
            supportedMethods: 'google_pay',
            data: {
              merchantInfo: {
                merchantId: config.google_pay.merchantId,
                merchantName: config.google_pay.merchantName,
              },
            },
          }]
        }

        const paymentRequest = client.paymentRequest(requestConfig)
        const canMakePayment = await paymentRequest.canMakePayment()
        if (cancelled) return
        if (!canMakePayment) throw new Error(copy.unavailable)

        const available = await paymentRequest.availablePaymentMethods()
        if (cancelled) return
        const requested = (Array.isArray(available) ? available : []).filter(
          (entry) => String(entry?.id || '').toLowerCase() === methodCode,
        )
        if (!requested.length) throw new Error(copy.unavailable)

        const host = document.getElementById(mountIdRef.current)
        if (!host) throw new Error('SumUp wallet button container is missing.')
        host.replaceChildren()

        const elements = client.elements({ label: 'pay' })
        elementsRef.current = elements
        elements.onSubmit(async (paymentMethodEvent: unknown) => {
          if (busyRef.current || cancelled || settledRef.current) return
          busyRef.current = true
          setBusy(true)
          setError('')
          setInfo(copy.processing)

          try {
            const paymentResponse = await paymentRequest.show(paymentMethodEvent)
            if (cancelled) return

            const returnUrl = typeof window !== 'undefined' ? window.location.href : '/'
            const checkout: WidgetCheckout = await requestJson('/api/v1/payments/sumup/widget/create-checkout', {
              order_id: props.orderId,
              payment_method: methodCode,
              amount,
              currency: String(props.currency || 'EUR').toUpperCase(),
              return_url: returnUrl,
              description: `PayMyDine order #${props.orderId}`,
              items: intent?.providerItems?.length ? intent.providerItems : props.items,
            })
            if (!checkout?.checkout_id) throw new Error('SumUp did not return a checkout ID.')
            checkoutRef.current = checkout
            submittedRef.current = true

            await client.processCheckout(String(checkout.checkout_id), paymentResponse)
            if (cancelled) return
            await verifyAndSettle(intent, amount)
          } catch (paymentError) {
            if (cancelled) return
            submittedRef.current = false
            const message = paymentError instanceof Error ? paymentError.message : `${copy.title} payment failed.`
            reportError(message)
          } finally {
            busyRef.current = false
            if (!cancelled && !settledRef.current) setBusy(false)
          }
        })

        elements.mount({ paymentMethods: requested, container: host })
        setInfo('')
        setReady(true)
      } catch (setupError) {
        if (cancelled) return
        await cancelPreparedIntent()
        reportError(setupError instanceof Error ? setupError.message : 'SumUp wallet could not be prepared.')
        setReady(false)
      }
    }

    void setup()
    return () => {
      cancelled = true
      try { elementsRef.current?.unmount?.() } catch {}
      elementsRef.current = null
      const host = document.getElementById(mountIdRef.current)
      if (host) host.replaceChildren()
      if (!settledRef.current && !submittedRef.current) void cancelPreparedIntent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.orderId, props.amount, props.currency, props.methodCode, props.providerCode])

  const payableAmount = preparedIntentRef.current?.payableAmount ?? props.amount

  return (
    <section className={`${styles.stripeInlineBox} ${styles.sumupInlineBox}`} data-pmd-sumup-swift-wallet="r5" data-pmd-sumup-method={methodCode}>
      <div className={styles.stripeSecureTitle}>{copy.title}</div>
      <div className={styles.stripeHint}>{ready ? `${copy.title} · ${money(payableAmount, props.currency, props.locale)}` : info}</div>
      <div className={`${styles.stripeCardFrame} ${styles.sumupCardFrame}`}>
        <div id={mountIdRef.current} data-pmd-sumup-swift-mount="1" />
      </div>
      {busy ? <div className={styles.stripeHint}><LoaderCircle aria-hidden="true" /> {copy.processing}</div> : null}
      {error ? <div className={`${styles.statusMessage} ${styles.statusError}`}>{error}</div> : null}
    </section>
  )
}
