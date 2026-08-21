'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CreditCard, LoaderCircle } from 'lucide-react'
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

type StripeInstance = any
type StripeElement = any
type StripePaymentRequest = any
type R36Reservation = { group: BillingGroupSummary; payment: BillingGroupPaymentReservation }

type StripeWindow = Window & { Stripe?: (publishableKey: string) => StripeInstance }

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

type StripeConfig = {
  publishableKey: string
  countryCode: string
  methods: { card: boolean; apple_pay: boolean; google_pay: boolean }
}

let stripeScriptPromise: Promise<void> | null = null

function loadStripeScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Stripe is only available in the browser.'))
  if ((window as StripeWindow).Stripe) return Promise.resolve()
  if (stripeScriptPromise) return stripeScriptPromise
  stripeScriptPromise = new Promise<void>((resolve, reject) => {
    const current = document.querySelector<HTMLScriptElement>('script[data-pmd-stripe-js="1"]')
    if (current) {
      current.addEventListener('load', () => resolve(), { once: true })
      current.addEventListener('error', () => reject(new Error('Stripe.js could not be loaded.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.async = true
    script.dataset.pmdStripeJs = '1'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Stripe.js could not be loaded.')), { once: true })
    document.head.appendChild(script)
  })
  return stripeScriptPromise
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

function copyFor(locale = 'en') {
  const code = String(locale || 'en').toLowerCase().split('-')[0]
  const rows: Record<string, Record<string, string>> = {
    de: { secure: 'Sichere Kartenzahlung', cardholder: 'Name auf der Karte', card: 'Kartendaten', loading: 'Stripe wird geladen...', pay: 'Bezahlen', preparing: 'Zahlung wird vorbereitet...', processing: 'Zahlung wird verarbeitet...', appleContinue: 'Weiter mit Apple Pay', googleContinue: 'Weiter mit Google Pay', appleUnavailable: 'Apple Pay ist auf diesem Gerät/Browser nicht verfügbar oder nicht eingerichtet.', googleUnavailable: 'Google Pay ist auf diesem Gerät/Browser nicht verfügbar oder nicht eingerichtet.' },
    fa: { secure: 'پرداخت امن با کارت', cardholder: 'نام دارنده کارت', card: 'اطلاعات کارت', loading: 'Stripe در حال بارگذاری...', pay: 'پرداخت', preparing: 'در حال آماده‌سازی پرداخت...', processing: 'در حال پردازش پرداخت...', appleContinue: 'ادامه با Apple Pay', googleContinue: 'ادامه با Google Pay', appleUnavailable: 'Apple Pay در این دستگاه یا مرورگر در دسترس نیست.', googleUnavailable: 'Google Pay در این دستگاه یا مرورگر در دسترس نیست.' },
    tr: { secure: 'Güvenli kart ödemesi', cardholder: 'Kart üzerindeki ad', card: 'Kart bilgileri', loading: 'Stripe yükleniyor...', pay: 'Öde', preparing: 'Ödeme hazırlanıyor...', processing: 'Ödeme işleniyor...', appleContinue: 'Apple Pay ile devam et', googleContinue: 'Google Pay ile devam et', appleUnavailable: 'Apple Pay bu cihazda veya tarayıcıda kullanılamıyor.', googleUnavailable: 'Google Pay bu cihazda veya tarayıcıda kullanılamıyor.' },
    ja: { secure: '安全なカード決済', cardholder: 'カード名義', card: 'カード情報', loading: 'Stripe を読み込んでいます...', pay: '支払う', preparing: '支払いを準備しています...', processing: '支払いを処理しています...', appleContinue: 'Apple Pay で続行', googleContinue: 'Google Pay で続行', appleUnavailable: 'この端末またはブラウザでは Apple Pay を利用できません。', googleUnavailable: 'この端末またはブラウザでは Google Pay を利用できません。' },
  }
  return rows[code] || { secure: 'Secure card payment', cardholder: 'Name on card', card: 'Card details', loading: 'Loading Stripe...', pay: 'Pay', preparing: 'Preparing payment...', processing: 'Processing payment...', appleContinue: 'Continue with Apple Pay', googleContinue: 'Continue with Google Pay', appleUnavailable: 'Apple Pay is not available on this device/browser or is not configured.', googleUnavailable: 'Google Pay is not available on this device/browser or is not configured.' }
}

function money(value: number, currency: string, locale = 'en') {
  try { return new Intl.NumberFormat(locale, { style: 'currency', currency: String(currency || 'EUR').toUpperCase() }).format(value) }
  catch { return `${Number(value || 0).toFixed(2)} ${String(currency || 'EUR').toUpperCase()}` }
}

export function StripeInlinePayment(props: Props) {
  const method = String(props.methodCode || 'card').toLowerCase()
  const isWallet = method === 'apple_pay' || method === 'google_pay'
  const copy = copyFor(props.locale)
  const groupedAllocations = useMemo(() => (props.orderAllocations || []).filter((entry) => entry.orderId > 0 && entry.amount > 0), [props.orderAllocations])
  const isMultiOrder = groupedAllocations.length > 1
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [displayAmount, setDisplayAmount] = useState(props.amount)
  const [displayCurrency, setDisplayCurrency] = useState(props.currency)
  const [cardholderName, setCardholderName] = useState('')
  const [cardComplete, setCardComplete] = useState(false)
  const [walletPrepared, setWalletPrepared] = useState(false)
  const [walletSupported, setWalletSupported] = useState<boolean | null>(null)
  const stripeRef = useRef<StripeInstance | null>(null)
  const cardRef = useRef<StripeElement | null>(null)
  const walletButtonRef = useRef<StripeElement | null>(null)
  const walletRequestRef = useRef<StripePaymentRequest | null>(null)
  const cardMountRef = useRef<HTMLDivElement | null>(null)
  const walletMountRef = useRef<HTMLDivElement | null>(null)
  const preparedIntentRef = useRef<SplitPaymentIntent | null>(null)
  const r36ReservationRef = useRef<R36Reservation | null>(null)
  const r36IdempotencyRef = useRef(`r36:stripe:${props.orderId}:${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const settledRef = useRef(false)
  const capturedRef = useRef(false)
  const configRef = useRef<StripeConfig | null>(null)
  const configuredMethodRef = useRef('')

  const reportError = (message: string) => { setError(message); setInfo(''); props.onError?.(message) }

  const cancelPreparedIntent = async () => {
    const intent = preparedIntentRef.current
    if (!intent || settledRef.current || capturedRef.current) return
    preparedIntentRef.current = null
    try { await requestJson('/api/v1/orders/split-intent/cancel', { intent_token: intent.token, guest_session_id: props.guestSessionId || null }) } catch {}
  }

  const cancelR36Reservation = async () => {
    const paymentId = r36ReservationRef.current?.payment.paymentId || ''
    r36ReservationRef.current = null
    r36IdempotencyRef.current = `r36:stripe:${props.orderId}:${Date.now()}-${Math.random().toString(36).slice(2)}`
    setDisplayAmount(props.amount); setDisplayCurrency(props.currency)
    if (paymentId && !settledRef.current && !capturedRef.current) await cancelBillingGroupPayment(paymentId).catch(() => undefined)
  }

  const prepareIntent = async () => {
    if (!props.prepareSplitIntent) return null
    if (preparedIntentRef.current) return preparedIntentRef.current
    const intent = await props.prepareSplitIntent(); preparedIntentRef.current = intent; return intent
  }

  const prepareR36Reservation = async (): Promise<R36Reservation | null> => {
    if (!isMultiOrder) return null
    if (r36ReservationRef.current) return r36ReservationRef.current
    const reservation = await reserveExistingOrderGroupPayment({ allocations: groupedAllocations, table: props.table, method: props.methodCode, providerCode: props.providerCode || 'stripe', idempotencyKey: r36IdempotencyRef.current })
    r36ReservationRef.current = reservation
    if (reservation) {
      const amount = reservation.payment.payableCents / 100
      setDisplayAmount(amount); setDisplayCurrency(reservation.payment.currency)
      setInfo(`Final Bill: ${money(amount, reservation.payment.currency, props.locale)}`)
    }
    return reservation
  }

  const createStripeIntent = async (amount: number, intent: SplitPaymentIntent | null) => {
    const r36 = r36ReservationRef.current
    return requestJson('/api/v1/payments/stripe/create-intent', {
      amount,
      currency: String(r36?.payment.currency || props.currency || 'EUR').toUpperCase(),
      preferredMethod: method,
      restaurantId: String(props.table.locationId || 1),
      tableNumber: props.table.number || props.table.id || null,
      items: intent?.providerItems?.length ? intent.providerItems : props.items,
      customerInfo: { name: cardholderName.trim() || 'Customer' },
      billing_group_public_id: r36?.group.publicId || null,
      billing_group_payment_id: r36?.payment.paymentId || null,
      order_allocations: isMultiOrder ? groupedAllocations : undefined,
    })
  }

  const settle = async (reference: string, intent: SplitPaymentIntent | null, amount: number, providerEvidence?: Record<string, unknown>) => {
    if (isMultiOrder) {
      await settleExistingOrderGroup({ allocations: groupedAllocations, table: props.table, method: props.methodCode, providerCode: props.providerCode || 'stripe', paymentReference: reference,
        billingGroupPaymentId: r36ReservationRef.current?.payment.paymentId || null, providerEvidence: providerEvidence || { provider: 'stripe' } })
    } else {
      await payExistingOrder({ orderId: props.orderId, table: props.table, method: props.methodCode, providerCode: props.providerCode || 'stripe', paymentReference: reference,
        amount, tipAmount: intent?.tipAmount ?? props.tipAmount, couponCode: intent ? null : props.couponCode, couponDiscount: intent ? 0 : props.couponDiscount,
        selectedItems: intent?.selectedItems ?? props.selectedItems, payerLabel: intent?.payerLabel ?? props.payerLabel, paymentIntentToken: intent?.token || null,
        splitMode: intent?.splitMode || null, splitPeople: intent?.splitPeople || null, sharePercent: intent?.sharePercent || null, guestSessionId: props.guestSessionId || null })
    }
    settledRef.current = true; setInfo(''); setError(''); await props.onSuccess(amount)
  }

  const settleConfirmedStripe = async (paymentIntent: any, intent: SplitPaymentIntent | null, amount: number) => {
    const status = String(paymentIntent?.status || ''); const reference = String(paymentIntent?.id || '')
    if (!reference) throw new Error('Stripe payment reference is missing.')
    if (status !== 'succeeded') {
      if (status === 'processing') { capturedRef.current = true; throw new Error('Stripe is still processing this payment. Do not pay again; refresh the order status shortly.') }
      throw new Error(`Stripe payment is not complete (${status || 'unknown'}).`)
    }
    capturedRef.current = true
    try { await settle(reference, intent, amount, { provider: 'stripe', payment_intent: { id: reference, status } }) }
    catch (settlementError) { throw new Error(`Stripe confirmed the payment, but PayMyDine could not finish settlement. Do not pay again. ${settlementError instanceof Error ? settlementError.message : ''}`.trim()) }
  }

  const mountWallet = async (intent: SplitPaymentIntent | null) => {
    const stripe = stripeRef.current; const config = configRef.current; const mount = walletMountRef.current
    if (!stripe || !config || !mount || configuredMethodRef.current !== method) return
    try { walletButtonRef.current?.destroy?.() } catch {}
    walletButtonRef.current = null; walletRequestRef.current = null; mount.replaceChildren()

    const r36 = await prepareR36Reservation()
    const amount = r36?.payment.payableCents ? r36.payment.payableCents / 100 : (intent?.payableAmount ?? props.amount)
    const currency = r36?.payment.currency || props.currency
    const paymentRequest = stripe.paymentRequest({
      country: config.countryCode || 'DE', currency: String(currency || 'EUR').toLowerCase(),
      total: { label: 'PayMyDine Final Bill', amount: Math.round(amount * 100) }, requestPayerName: true, requestPayerEmail: true,
    })
    const capability = await paymentRequest.canMakePayment()
    const supported = method === 'apple_pay' ? Boolean(capability?.applePay) : Boolean(capability?.googlePay)
    setWalletSupported(supported)
    if (!supported) { setError(''); setInfo(''); await cancelPreparedIntent(); await cancelR36Reservation(); setWalletPrepared(false); return }

    paymentRequest.on('cancel', () => {
      if (!capturedRef.current && !settledRef.current) { void cancelPreparedIntent(); void cancelR36Reservation() }
      setWalletPrepared(false); try { walletButtonRef.current?.destroy?.() } catch {}; walletButtonRef.current = null
    })

    paymentRequest.on('paymentmethod', async (event: any) => {
      setBusy(true); setError(''); setInfo(copy.processing); let completed = false
      try {
        const activeIntent = preparedIntentRef.current || intent
        const activeReservation = r36ReservationRef.current || await prepareR36Reservation()
        const activeAmount = activeReservation?.payment.payableCents ? activeReservation.payment.payableCents / 100 : (activeIntent?.payableAmount ?? props.amount)
        const created = await createStripeIntent(activeAmount, activeIntent)
        if (!created?.clientSecret) throw new Error('Stripe did not return a client secret.')
        const result = await stripe.confirmCardPayment(created.clientSecret, { payment_method: event?.paymentMethod?.id }, { handleActions: true })
        if (result?.error) throw new Error(String(result.error.message || 'Wallet payment failed.'))
        if (String(result?.paymentIntent?.status || '') !== 'succeeded') throw new Error(`Unexpected Stripe status: ${String(result?.paymentIntent?.status || 'unknown')}`)
        capturedRef.current = true; event.complete('success'); completed = true; await settleConfirmedStripe(result.paymentIntent, activeIntent, activeAmount)
      } catch (paymentError) {
        if (!completed) try { event.complete('fail') } catch {}
        if (!capturedRef.current) { await cancelPreparedIntent(); await cancelR36Reservation() }
        reportError(paymentError instanceof Error ? paymentError.message : 'Wallet payment failed.')
      } finally { setBusy(false) }
    })

    walletRequestRef.current = paymentRequest
    const elements = stripe.elements()
    const button = elements.create('paymentRequestButton', { paymentRequest, style: { paymentRequestButton: { type: 'default', theme: 'dark', height: '48px' } } })
    walletButtonRef.current = button; button.mount(mount)
  }

  useEffect(() => {
    let cancelled = false
    setReady(false); setError(''); setInfo(''); setDisplayAmount(props.amount); setDisplayCurrency(props.currency); setWalletSupported(null); setWalletPrepared(false)
    configuredMethodRef.current = ''; settledRef.current = false; capturedRef.current = false; preparedIntentRef.current = null; r36ReservationRef.current = null

    const setup = async () => {
      try {
        const raw = await requestJson('/api/v1/payments/stripe/config')
        if (cancelled) return
        const config: StripeConfig = { publishableKey: String(raw?.publishableKey || ''), countryCode: String(raw?.countryCode || 'DE').toUpperCase(), methods: { card: Boolean(raw?.methods?.card), apple_pay: Boolean(raw?.methods?.apple_pay), google_pay: Boolean(raw?.methods?.google_pay) } }
        if (!config.publishableKey) throw new Error('Stripe publishable key is not configured.')
        const methodEnabled = method === 'card' ? config.methods.card : method === 'apple_pay' ? config.methods.apple_pay : config.methods.google_pay
        if (!methodEnabled) throw new Error(`${method === 'card' ? 'Card' : method === 'apple_pay' ? 'Apple Pay' : 'Google Pay'} is not enabled for Stripe.`)
        configRef.current = config; await loadStripeScript(); if (cancelled) return
        const factory = (window as StripeWindow).Stripe; if (!factory) throw new Error('Stripe.js did not initialize.')
        stripeRef.current = factory(config.publishableKey); configuredMethodRef.current = method
        if (isMultiOrder) await prepareR36Reservation()
        if (!cancelled) setReady(true)
      } catch (setupError) { if (!cancelled) reportError(setupError instanceof Error ? setupError.message : 'Stripe payment is unavailable.') }
    }

    void setup()
    return () => {
      cancelled = true
      try { cardRef.current?.destroy?.() } catch {}; try { walletButtonRef.current?.destroy?.() } catch {}
      cardRef.current = null; walletButtonRef.current = null; walletRequestRef.current = null; stripeRef.current = null; configRef.current = null; configuredMethodRef.current = ''
      if (!settledRef.current && !capturedRef.current) { void cancelPreparedIntent(); void cancelR36Reservation() }
    }
  }, [method, props.orderId])

  useEffect(() => {
    if (!ready || isWallet || !stripeRef.current || !cardMountRef.current) return
    try { cardRef.current?.destroy?.() } catch {}; cardRef.current = null; setCardComplete(false)
    const mount = cardMountRef.current; mount.replaceChildren(); const computed = getComputedStyle(mount)
    const color = computed.getPropertyValue('--pmd-text').trim() || '#161616'; const muted = computed.getPropertyValue('--pmd-muted').trim() || '#777777'
    const elements = stripeRef.current.elements(); const card = elements.create('card', { hidePostalCode: true, style: { base: { fontSize: '16px', color, iconColor: color, '::placeholder': { color: muted } }, invalid: { color: '#b54141', iconColor: '#b54141' } } })
    card.on('change', (event: any) => { setCardComplete(Boolean(event?.complete)); if (event?.error?.message) reportError(String(event.error.message)); else if (!capturedRef.current) setError('') })
    cardRef.current = card; card.mount(mount)
    return () => { try { card.destroy?.() } catch {}; if (cardRef.current === card) cardRef.current = null }
  }, [ready, isWallet, method])

  useEffect(() => {
    if (!ready || !isWallet || props.prepareSplitIntent || configuredMethodRef.current !== method || !walletMountRef.current) return
    setWalletPrepared(true); void mountWallet(null).catch((walletError) => reportError(walletError instanceof Error ? walletError.message : 'Wallet payment is unavailable.'))
    return () => { try { walletButtonRef.current?.destroy?.() } catch {}; walletButtonRef.current = null; walletRequestRef.current = null }
  }, [ready, isWallet, method, props.amount, props.currency, props.prepareSplitIntent])

  const payCard = async () => {
    if (busy || capturedRef.current || !stripeRef.current || !cardRef.current || !cardComplete) return
    setBusy(true); setError(''); setInfo(copy.preparing); let intent: SplitPaymentIntent | null = null
    try {
      intent = await prepareIntent(); const r36 = await prepareR36Reservation(); const amount = r36?.payment.payableCents ? r36.payment.payableCents / 100 : (intent?.payableAmount ?? props.amount)
      const created = await createStripeIntent(amount, intent); if (!created?.clientSecret) throw new Error('Stripe did not return a client secret.')
      setInfo(copy.processing); const result = await stripeRef.current.confirmCardPayment(created.clientSecret, { payment_method: { card: cardRef.current, billing_details: { name: cardholderName.trim() || 'Customer' } } })
      if (result?.error) throw new Error(String(result.error.message || 'Card payment failed.')); await settleConfirmedStripe(result?.paymentIntent, intent, amount)
    } catch (paymentError) {
      if (!capturedRef.current) { await cancelPreparedIntent(); await cancelR36Reservation() }
      reportError(paymentError instanceof Error ? paymentError.message : 'Card payment failed.')
    } finally { setBusy(false) }
  }

  const prepareWallet = async () => {
    if (busy || walletPrepared || !ready) return
    setBusy(true); setError(''); setInfo(copy.preparing)
    try { const intent = await prepareIntent(); await prepareR36Reservation(); setWalletPrepared(true); await mountWallet(intent); setInfo('') }
    catch (prepareError) { await cancelPreparedIntent(); await cancelR36Reservation(); reportError(prepareError instanceof Error ? prepareError.message : 'Wallet payment could not be prepared.') }
    finally { setBusy(false) }
  }

  if (isWallet) {
    const unavailable = walletSupported === false ? (method === 'apple_pay' ? copy.appleUnavailable : copy.googleUnavailable) : ''
    return (
      <div className={styles.stripeInlineBox} data-pmd-stripe-inline="r35b" data-pmd-r36-group-payment="1" data-pmd-stripe-wallet={method}>
        {!ready && !error && <p className={styles.stripeHint}><LoaderCircle className={styles.stripeSpin} /> {copy.loading}</p>}
        {ready && props.prepareSplitIntent && !walletPrepared && walletSupported !== false && (
          <button className={styles.primary} type="button" onClick={() => void prepareWallet()} disabled={busy || capturedRef.current}>
            {busy ? <LoaderCircle /> : <CreditCard />} {method === 'apple_pay' ? copy.appleContinue : copy.googleContinue} {money(displayAmount, displayCurrency, props.locale)}
          </button>
        )}
        <div ref={walletMountRef} className={ready && (walletPrepared || !props.prepareSplitIntent) ? styles.stripeWalletMount : styles.stripeWalletMountHidden} />
        {unavailable && <div className={`${styles.statusMessage} ${styles.statusError}`}>{unavailable}</div>}
        {info && <div className={styles.stripeHint}>{info}</div>}
        {error && <div className={`${styles.statusMessage} ${styles.statusError}`}>{error}</div>}
      </div>
    )
  }

  return (
    <div className={styles.stripeInlineBox} data-pmd-stripe-inline="r35b" data-pmd-r36-group-payment="1" data-pmd-stripe-card="r35b">
      <div className={styles.stripeSecureTitle}><CreditCard /> <strong>{copy.secure}</strong></div>
      {!ready && !error && <p className={styles.stripeHint}><LoaderCircle className={styles.stripeSpin} /> {copy.loading}</p>}
      <label className={styles.label}>{copy.cardholder}<input className={styles.input} autoComplete="cc-name" value={cardholderName} onChange={(event) => setCardholderName(event.target.value)} disabled={!ready || capturedRef.current} /></label>
      <label className={styles.label}>{copy.card}</label>
      <div ref={cardMountRef} className={styles.stripeCardFrame} />
      <button className={styles.primary} type="button" onClick={() => void payCard()} disabled={!ready || busy || capturedRef.current || !cardComplete}>
        {busy ? <LoaderCircle /> : <CreditCard />} {copy.pay} {money(displayAmount, displayCurrency, props.locale)}
      </button>
      {info && <div className={styles.stripeHint}>{info}</div>}
      {error && <div className={`${styles.statusMessage} ${styles.statusError}`}>{error}</div>}
    </div>
  )
}
