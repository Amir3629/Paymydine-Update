'use client'

import { useEffect, useRef, useState } from 'react'
import type { PaymentMethod, TableContext } from '@/src/domain/model'
import {
  finalizeExistingOrderPayment,
  payExistingOrder,
  type SplitPaymentIntent,
} from '@/src/lib/client-api'

type SquareWindow = Window & { Square?: any }
type SupportedMethod = 'apple_pay' | 'google_pay'

type Props = {
  method: PaymentMethod
  className: string
  selected: boolean
  disabled?: boolean
  orderId: number
  table: TableContext
  settlementMode: 'pay-existing' | 'start-finalize'
  amount: number
  currency: string
  tipAmount: number
  couponCode: string | null
  couponDiscount: number
  selectedItems: Array<{ order_menu_id: number; quantity: number }> | null
  payerLabel: string | null
  guestSessionId: string
  locale: string
  prepareSplitIntent?: (() => Promise<SplitPaymentIntent>) | undefined
  onSelect: () => void
  onSuccess: (amount: number) => void | Promise<void>
  onError: (message: string) => void
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

function normalize(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function supportedMethod(method: PaymentMethod): SupportedMethod | null {
  const code = normalize(method.code)
  return code === 'apple_pay' || code === 'google_pay' ? code : null
}

function loadSquareScript(url: string): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Square is only available in the browser.'))
  if ((window as SquareWindow).Square) return Promise.resolve()
  const existing = squareScripts.get(url)
  if (existing) return existing

  const promise = new Promise<void>((resolve, reject) => {
    const prior = Array.from(document.scripts).find((entry) => entry.src === url)
    if (prior) {
      if ((window as SquareWindow).Square) { resolve(); return }
      prior.addEventListener('load', () => resolve(), { once: true })
      prior.addEventListener('error', () => reject(new Error('Square Web Payments SDK could not be loaded.')), { once: true })
      return
    }
    const script = document.createElement('script')
    script.src = url
    script.async = true
    script.dataset.pmdSquareWebPayments = 'direct-wallet-r5'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Square Web Payments SDK could not be loaded.'))
    document.head.appendChild(script)
  }).catch((error) => {
    squareScripts.delete(url)
    throw error
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

function safeMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : typeof error === 'string' ? error : fallback
  if (/domain is not registered|domain.*apple pay|apple pay.*domain/i.test(raw)) {
    return 'Square Apple Pay is not registered for this PayMyDine domain yet. Register the HTTPS domain in Square Developer Console > Apple Pay, then try again.'
  }
  return String(raw || fallback)
}

function glyph(code: SupportedMethod) {
  if (code === 'apple_pay') {
    return <span aria-hidden="true" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif", fontSize: 24, lineHeight: 1 }}></span>
  }
  return <span aria-hidden="true" style={{ display: 'inline-grid', width: 24, height: 24, placeItems: 'center', border: '2px solid currentColor', borderRadius: '50%', fontFamily: 'Arial, sans-serif', fontSize: 14, fontWeight: 900, boxSizing: 'border-box' }}>G</span>
}

export function SquareDirectMethodButton(props: Props) {
  const code = supportedMethod(props.method)
  const [ready, setReady] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [localError, setLocalError] = useState('')
  const configRef = useRef<SquareConfig | null>(null)
  const walletRef = useRef<any>(null)
  const hiddenGoogleMountRef = useRef<HTMLDivElement | null>(null)
  const settledRef = useRef(false)
  const generationRef = useRef(0)

  const prepareIntent = async () => {
    if (!props.prepareSplitIntent) return null
    return props.prepareSplitIntent()
  }

  const settle = async (paymentId: string, intent: SplitPaymentIntent | null, amount: number) => {
    if (settledRef.current) return
    settledRef.current = true
    try {
      if (props.settlementMode === 'start-finalize') {
        await finalizeExistingOrderPayment({
          orderId: props.orderId,
          paymentReference: paymentId,
          methodCode: code,
          providerCode: 'square',
        })
      } else {
        await payExistingOrder({
          orderId: props.orderId,
          table: props.table,
          method: code || normalize(props.method.code),
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
      await props.onSuccess(amount)
    } catch (error) {
      settledRef.current = false
      throw new Error(`Square confirmed the payment, but PayMyDine could not finish settlement. Do not pay again. ${safeMessage(error, '')}`.trim())
    }
  }

  const chargeToken = async (token: string, intent: SplitPaymentIntent | null) => {
    const amount = intent?.payableAmount ?? props.amount
    const result = await requestJson('/api/v1/payments/square/create-payment', {
      source_id: token,
      order_id: props.orderId,
      payment_method: code,
      provider: 'square',
      location_id: props.table.locationId || null,
      currency: String(props.currency || '').toUpperCase(),
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

  useEffect(() => {
    if (!code) return
    let cancelled = false
    const generation = ++generationRef.current
    setReady(false)
    setPreparing(true)
    setLocalError('')
    settledRef.current = false

    const cleanup = async () => {
      try { await walletRef.current?.destroy?.() } catch {}
      walletRef.current = null
      configRef.current = null
    }

    const setup = async () => {
      try {
        await cleanup()
        const query = new URLSearchParams({
          method: code,
          location_id: String(props.table.locationId || ''),
          currency: String(props.currency || '').toUpperCase(),
        })
        const loaded = await requestJson(`/api/v1/payments/square/runtime-config?${query.toString()}`) as SquareConfig
        if (cancelled || generation !== generationRef.current) return

        const expectedCurrency = String(props.currency || '').toUpperCase()
        const squareCurrency = String(loaded.currency || '').toUpperCase()
        if (expectedCurrency && squareCurrency && expectedCurrency !== squareCurrency) {
          throw new Error(`Square location currency ${squareCurrency} does not match this order currency ${expectedCurrency}.`)
        }

        await loadSquareScript(String(loaded.script_url || ''))
        if (cancelled || generation !== generationRef.current) return
        const Square = (window as SquareWindow).Square
        if (!Square?.payments) throw new Error('Square Web Payments SDK did not initialize.')

        const payments = Square.payments(loaded.application_id, loaded.location_id)
        try { await payments.setLocale?.(props.locale || navigator.language || 'en-US') } catch {}
        const paymentRequest = payments.paymentRequest({
          countryCode: loaded.country_code,
          currencyCode: loaded.currency,
          total: {
            amount: Number(props.amount).toFixed(loaded.currency === 'JPY' ? 0 : 2),
            label: 'PayMyDine',
          },
        })

        let wallet: any
        if (code === 'apple_pay') {
          wallet = await payments.applePay(paymentRequest)
        } else {
          wallet = await payments.googlePay(paymentRequest)
          const mount = hiddenGoogleMountRef.current
          if (!mount) throw new Error('Google Pay secure button target is unavailable.')
          mount.replaceChildren()
          await wallet.attach(mount, { buttonColor: 'default', buttonType: 'long' })
        }

        if (cancelled || generation !== generationRef.current) {
          try { await wallet?.destroy?.() } catch {}
          return
        }
        configRef.current = loaded
        walletRef.current = wallet
        setReady(true)
      } catch (error) {
        if (!cancelled && generation === generationRef.current) {
          setLocalError(safeMessage(error, `${props.method.name} could not be prepared with Square.`))
        }
      } finally {
        if (!cancelled && generation === generationRef.current) setPreparing(false)
      }
    }

    void setup()
    return () => {
      cancelled = true
      generationRef.current += 1
      void cleanup()
    }
  }, [code, props.orderId, props.table.locationId, props.amount, props.currency, props.locale, props.method.name])

  const onClick = async () => {
    if (!code || props.disabled || busy) return
    props.onSelect()
    const wallet = walletRef.current
    if (!ready || !wallet || !configRef.current) {
      props.onError(localError || `${props.method.name} is still preparing. Please wait a moment and try again.`)
      return
    }

    setBusy(true)
    setLocalError('')
    try {
      // Apple Pay requires tokenize() to be called immediately in the user-click
      // call stack. Do not await network or split-intent preparation before it.
      const tokenResultPromise = wallet.tokenize()
      const tokenResult = await tokenResultPromise
      if (String(tokenResult?.status || '') !== 'OK' || !tokenResult?.token) {
        throw new Error(String(tokenResult?.errors?.[0]?.message || `${props.method.name} tokenization failed.`))
      }
      const intent = await prepareIntent()
      await chargeToken(String(tokenResult.token), intent)
    } catch (error) {
      const message = safeMessage(error, `${props.method.name} payment failed.`)
      setLocalError(message)
      props.onError(message)
    } finally {
      if (!settledRef.current) setBusy(false)
    }
  }

  if (!code) return null
  const label = props.method.name || (code === 'apple_pay' ? 'Apple Pay' : 'Google Pay')
  const temporarilyDisabled = Boolean(props.disabled || (preparing && !localError))

  return (
    <>
      <button
        type="button"
        className={props.className}
        data-pmd-square-direct-method={code}
        data-pmd-square-ready={ready ? 'true' : 'false'}
        aria-pressed={props.selected}
        aria-busy={busy || preparing}
        disabled={temporarilyDisabled}
        onClick={() => { void onClick() }}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.65rem', opacity: 1 }}
      >
        {busy || preparing ? <span aria-hidden="true" className="pmd-square-direct-spinner" /> : glyph(code)}
        <span>{label}</span>
      </button>

      {code === 'google_pay' && (
        <div
          ref={hiddenGoogleMountRef}
          aria-hidden="true"
          data-pmd-square-google-native-anchor="true"
          style={{ position: 'fixed', left: '-10000px', top: 0, width: 320, height: 64, opacity: 0, overflow: 'hidden', pointerEvents: 'none' }}
        />
      )}

      <style>{`
        @keyframes pmdSquareDirectSpin { to { transform: rotate(360deg); } }
        .pmd-square-direct-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: pmdSquareDirectSpin .7s linear infinite;
        }
      `}</style>
    </>
  )
}
