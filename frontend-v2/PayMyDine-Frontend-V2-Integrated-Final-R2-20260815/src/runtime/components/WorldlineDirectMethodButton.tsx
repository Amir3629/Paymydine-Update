'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Session, type PaymentDetails, type SessionDetails } from 'connect-sdk-client-js'
import type { PaymentMethod, TableContext } from '@/src/domain/model'
import {
  clearPendingProviderPayment,
  finalizeExistingOrderPayment,
  payExistingOrder,
  savePendingProviderPayment,
} from '@/src/lib/client-api'

type SupportedMethod = 'apple_pay' | 'google_pay' | 'paypal' | 'wero'

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
  onSelect: () => void
  onSuccess: (amount: number) => void | Promise<void>
  onError: (message: string) => void
}

type WalletSessionPayload = {
  success?: boolean
  flow?: string
  session_id?: string
  order_id?: number
  payment_product_id?: number
  amount_minor?: number
  currency?: string
  client_session?: SessionDetails
  payment_details?: PaymentDetails
  wallet_configuration?: {
    merchant_name?: string
    google_merchant_id?: string | null
    gateway_merchant_id?: string
    environment?: 'TEST' | 'PROD'
  }
  error?: string
  message?: string
}

type PreparedWallet = {
  sessionId: string
  clientSession: SessionDetails
  session: Session
  product: any
  paymentDetails: PaymentDetails
  productId: number
  merchantName: string
  googleMerchantId: string
  gatewayMerchantId: string
  environment: 'TEST' | 'PROD'
}

type ProviderResult = {
  success?: boolean
  session_id?: string
  payment_id?: string | null
  provider_reference?: string | null
  payment_status?: string
  status?: string
  is_paid?: boolean
  verification_ok?: boolean
  redirect_url?: string | null
  expected_amount_minor?: number
  tip_amount_minor?: number
  error?: string
  message?: string
}

let googlePayScriptPromise: Promise<void> | null = null

function normalize(value: unknown): string {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function methodCode(method: PaymentMethod): SupportedMethod | null {
  const code = normalize(method.code)
  return ['apple_pay', 'google_pay', 'paypal', 'wero'].includes(code) ? code as SupportedMethod : null
}

function safeMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message) return value.message
  if (typeof value === 'string' && value.trim()) return value.trim()
  return fallback
}

async function requestJson(url: string, body: Record<string, unknown>): Promise<any> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data?.success === false) {
    throw new Error(String(data?.error || data?.message || `HTTP ${response.status}`))
  }
  return data
}

function getGooglePaymentsClientConstructor(): any {
  if (typeof window === 'undefined') return null
  const google = (window as any).google
  return google?.payments?.api?.PaymentsClient || null
}

function loadGooglePayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Pay is only available in the browser.'))
  if (getGooglePaymentsClientConstructor()) return Promise.resolve()
  if (googlePayScriptPromise) return googlePayScriptPromise

  googlePayScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = Array.from(document.scripts).find((script) => script.src === 'https://pay.google.com/gp/p/js/pay.js')
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Google Pay could not be loaded.')), { once: true })
      window.setTimeout(() => { if (getGooglePaymentsClientConstructor()) resolve() }, 50)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://pay.google.com/gp/p/js/pay.js'
    script.async = true
    script.dataset.pmdWorldlineGooglePay = 'direct-method-r1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Pay could not be loaded.'))
    document.head.appendChild(script)
  }).catch((error) => {
    googlePayScriptPromise = null
    throw error
  })

  return googlePayScriptPromise
}

function returnPath(): string {
  return `${window.location.pathname}${window.location.search}`
}

function returnUrl(sessionId = ''): string {
  const url = new URL('/payment/worldline-embedded-return', window.location.origin)
  if (sessionId) url.searchParams.set('native_alt_session_id', sessionId)
  url.searchParams.set('return_to', returnPath())
  return url.toString()
}

function glyph(method: SupportedMethod) {
  if (method === 'apple_pay') return <span aria-hidden="true" style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif", fontSize: 23, lineHeight: 1 }}></span>
  if (method === 'google_pay') return <span aria-hidden="true" style={{ display: 'inline-grid', width: 23, height: 23, placeItems: 'center', border: '2px solid currentColor', borderRadius: '50%', fontFamily: 'Arial, sans-serif', fontSize: 13, fontWeight: 900, boxSizing: 'border-box' }}>G</span>
  if (method === 'paypal') return <span aria-hidden="true" style={{ fontFamily: 'Arial, sans-serif', fontSize: 23, fontStyle: 'italic', fontWeight: 900, lineHeight: 1 }}>P</span>
  return <span aria-hidden="true" style={{ display: 'inline-grid', width: 23, height: 23, placeItems: 'center', border: '2px solid currentColor', borderRadius: '50%', fontFamily: 'Arial, sans-serif', fontSize: 12, fontWeight: 900, boxSizing: 'border-box' }}>W</span>
}

export function WorldlineDirectMethodButton(props: Props) {
  const code = methodCode(props.method)
  const [wallet, setWallet] = useState<PreparedWallet | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [challengeUrl, setChallengeUrl] = useState('')
  const [localError, setLocalError] = useState('')
  const generationRef = useRef(0)
  const settledRef = useRef(false)
  const googleClientRef = useRef<any>(null)
  const popupRef = useRef<Window | null>(null)

  const unsupportedContext = props.couponDiscount > 0.0001
    || Boolean(props.couponCode)
    || Boolean(props.selectedItems?.length)

  useEffect(() => {
    if (!code || !['apple_pay', 'google_pay'].includes(code) || props.disabled || unsupportedContext) {
      setWallet(null)
      setPreparing(false)
      return
    }

    const generation = ++generationRef.current
    let cancelled = false
    setPreparing(true)
    setLocalError('')
    settledRef.current = false

    const prepare = async () => {
      try {
        if (code === 'google_pay') await loadGooglePayScript()
        const slug = code.replace(/_/g, '-')
        const payload = await requestJson(`/api/v1/payments/worldline/native/wallet/${slug}/create-session`, {
          order_id: props.orderId,
          payment_method: code,
          provider: 'worldline',
          return_url: returnUrl(),
          tip_amount: props.tipAmount,
          locale: String(props.locale || 'en').replace('-', '_'),
        }) as WalletSessionPayload
        if (cancelled || generation !== generationRef.current) return

        const sessionId = String(payload.session_id || '').toLowerCase()
        const clientSession = payload.client_session
        const paymentDetails = payload.payment_details
        const productId = Number(payload.payment_product_id || 0)
        const configuration = payload.wallet_configuration || {}
        if (!/^[a-f0-9]{48}$/.test(sessionId) || !clientSession || !paymentDetails || productId <= 0) {
          throw new Error('Worldline returned an incomplete wallet session.')
        }

        const environment = String(configuration.environment || 'TEST').toUpperCase() === 'PROD' ? 'PROD' : 'TEST'
        const details: PaymentDetails = { ...paymentDetails, environment }
        const session = new Session(clientSession)
        const merchantName = String(configuration.merchant_name || 'PayMyDine')
        const googleMerchantId = String(configuration.google_merchant_id || '')
        const gatewayMerchantId = String(configuration.gateway_merchant_id || '')
        const specificInputs = code === 'apple_pay'
          ? { applePay: { merchantName } }
          : { googlePay: { merchantId: googleMerchantId, merchantName, gatewayMerchantId } }
        const product = await session.getPaymentProduct(productId, details, specificInputs)
        const paymentRequest = session.getPaymentRequest()
        paymentRequest.setPaymentProduct(product)
        if (cancelled || generation !== generationRef.current) return

        setWallet({
          sessionId,
          clientSession,
          session,
          product,
          paymentDetails: details,
          productId,
          merchantName,
          googleMerchantId,
          gatewayMerchantId,
          environment,
        })
      } catch (error) {
        if (cancelled || generation !== generationRef.current) return
        const message = safeMessage(error, `${props.method.name} could not be prepared.`)
        setLocalError(message)
      } finally {
        if (!cancelled && generation === generationRef.current) setPreparing(false)
      }
    }

    void prepare()
    return () => {
      cancelled = true
      generationRef.current += 1
      setWallet(null)
    }
  }, [
    code,
    props.orderId,
    props.tipAmount,
    props.locale,
    props.disabled,
    unsupportedContext,
  ])

  useEffect(() => () => {
    try { popupRef.current?.close() } catch {}
    popupRef.current = null
  }, [])

  const savePending = (sessionId: string) => {
    savePendingProviderPayment({
      provider: 'worldline',
      settlementMode: props.settlementMode,
      methodCode: code || normalize(props.method.code),
      providerCode: 'worldline',
      orderId: props.orderId,
      paymentIntentToken: null,
      table: props.table,
      returnTo: returnPath(),
      createdAt: new Date().toISOString(),
      sessionId,
      amount: props.amount,
      currency: props.currency,
      tipAmount: props.tipAmount,
      couponCode: props.couponCode,
      couponDiscount: props.couponDiscount,
      selectedItems: props.selectedItems,
      payerLabel: props.payerLabel,
    })
  }

  const settle = async (status: ProviderResult, sessionId: string) => {
    if (settledRef.current) return
    const reference = String(status.payment_id || status.provider_reference || '')
    if (!reference) throw new Error('Worldline payment reference is missing.')
    settledRef.current = true

    const chargedAmount = Number(status.expected_amount_minor || 0) > 0
      ? Number(status.expected_amount_minor) / 100
      : props.amount
    const tipAmount = Number(status.tip_amount_minor || 0) >= 0
      ? Number(status.tip_amount_minor || 0) / 100
      : props.tipAmount

    try {
      if (props.settlementMode === 'start-finalize') {
        await finalizeExistingOrderPayment({
          orderId: props.orderId,
          paymentReference: reference,
          methodCode: code,
          providerCode: 'worldline',
        })
      } else {
        await payExistingOrder({
          orderId: props.orderId,
          table: props.table,
          method: code || normalize(props.method.code),
          providerCode: 'worldline',
          paymentReference: reference,
          amount: chargedAmount,
          tipAmount,
          couponCode: props.couponCode,
          couponDiscount: props.couponDiscount,
          selectedItems: props.selectedItems,
          payerLabel: props.payerLabel,
          guestSessionId: props.guestSessionId || null,
        })
      }
      clearPendingProviderPayment('worldline')
      setChallengeUrl('')
      try { popupRef.current?.close() } catch {}
      popupRef.current = null
      await props.onSuccess(chargedAmount)
    } catch (error) {
      settledRef.current = false
      throw new Error(`Worldline confirmed payment, but PayMyDine could not finish settlement. Do not pay again. ${safeMessage(error, '')}`.trim())
    }
  }

  const pollUntilFinal = async (sessionId: string) => {
    for (let attempt = 0; attempt < 120; attempt += 1) {
      const status = await requestJson('/api/v1/payments/worldline/native/alternative/status', {
        session_id: sessionId,
        order_id: props.orderId,
      }) as ProviderResult
      const name = String(status.payment_status || status.status || '').toUpperCase()
      if (status.is_paid === true && status.verification_ok === true) {
        await settle(status, sessionId)
        return
      }
      if (['CANCELLED', 'CANCELED', 'REJECTED', 'REJECTED_CAPTURE', 'FAILED', 'EXPIRED'].includes(name)) {
        throw new Error(`Payment not completed (${name}).`)
      }
      await new Promise((resolve) => window.setTimeout(resolve, 900))
    }
    throw new Error('Worldline payment is still pending. Do not pay again; refresh the order status shortly.')
  }

  const submitEncryptedWallet = async (prepared: PreparedWallet, encrypted: string) => {
    savePending(prepared.sessionId)
    const result = await requestJson('/api/v1/payments/worldline/native/wallet/submit', {
      session_id: prepared.sessionId,
      encrypted_customer_input: encrypted,
      return_url: returnUrl(prepared.sessionId),
    }) as ProviderResult
    const redirect = String(result.redirect_url || '')
    if (redirect) setChallengeUrl(redirect)
    if (result.is_paid === true && result.verification_ok === true) {
      await settle(result, prepared.sessionId)
      return
    }
    await pollUntilFinal(prepared.sessionId)
  }

  const payApple = async (prepared: PreparedWallet) => {
    const networks = Array.isArray(prepared.product?.paymentProduct302SpecificData?.networks)
      ? prepared.product.paymentProduct302SpecificData.networks.map((value: unknown) => String(value))
      : []
    if (!networks.length) throw new Error('Worldline did not return Apple Pay card networks for this transaction.')

    const result = await prepared.session.createApplePayPayment(
      prepared.paymentDetails,
      {
        merchantName: prepared.merchantName,
        acquirerCountry: prepared.product?.acquirerCountry || undefined,
      },
      networks,
    )
    const paymentData = (result as any)?.data?.paymentData
    if (!paymentData) throw new Error('Apple Pay did not return payment data.')
    const request = prepared.session.getPaymentRequest()
    request.setValue('encryptedPaymentData', JSON.stringify(paymentData))
    const encrypted = await prepared.session.getEncryptor().encrypt(request)
    if (!encrypted || String(encrypted).length < 32) throw new Error('Worldline could not encrypt the Apple Pay token.')
    await submitEncryptedWallet(prepared, String(encrypted))
  }

  const payGoogle = async (prepared: PreparedWallet) => {
    await loadGooglePayScript()
    const Constructor = getGooglePaymentsClientConstructor()
    if (!Constructor) throw new Error('Google Pay API is unavailable in this browser.')
    if (!prepared.googleMerchantId) throw new Error('Google Pay Merchant ID is not configured for this restaurant.')

    const specific = prepared.product?.paymentProduct320SpecificData
    const networks = Array.isArray(specific?.networks) ? specific.networks.map((value: unknown) => String(value)) : []
    const gateway = String(specific?.gateway || '')
    if (!networks.length || !gateway) throw new Error('Worldline did not return complete Google Pay configuration.')

    const client = googleClientRef.current || new Constructor({
      environment: prepared.environment === 'PROD' ? 'PRODUCTION' : 'TEST',
    })
    googleClientRef.current = client
    const amountMinor = Number(prepared.paymentDetails.totalAmount || 0)
    const currency = String(prepared.paymentDetails.currency || props.currency || 'EUR').toUpperCase()
    const paymentData = await client.loadPaymentData({
      apiVersion: 2,
      apiVersionMinor: 0,
      allowedPaymentMethods: [{
        type: 'CARD',
        parameters: {
          allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
          allowedCardNetworks: networks,
        },
        tokenizationSpecification: {
          type: 'PAYMENT_GATEWAY',
          parameters: {
            gateway,
            gatewayMerchantId: prepared.gatewayMerchantId,
          },
        },
      }],
      transactionInfo: {
        totalPriceStatus: 'FINAL',
        totalPrice: (amountMinor / 100).toFixed(2),
        currencyCode: currency,
        ...(prepared.product?.acquirerCountry ? { countryCode: prepared.product.acquirerCountry } : {}),
      },
      merchantInfo: {
        merchantId: prepared.googleMerchantId,
        merchantName: prepared.merchantName,
      },
    })
    const token = String(paymentData?.paymentMethodData?.tokenizationData?.token || '')
    if (!token) throw new Error('Google Pay did not return a payment token.')
    const request = prepared.session.getPaymentRequest()
    request.setValue('encryptedPaymentData', token)
    const encrypted = await prepared.session.getEncryptor().encrypt(request)
    if (!encrypted || String(encrypted).length < 32) throw new Error('Worldline could not encrypt the Google Pay token.')
    await submitEncryptedWallet(prepared, String(encrypted))
  }

  const payRedirect = async (method: 'paypal' | 'wero') => {
    const popup = window.open('about:blank', 'pmd-worldline-authorization', 'popup=yes,width=520,height=760,resizable=yes,scrollbars=yes')
    if (!popup) throw new Error(`Your browser blocked the secure ${props.method.name} window. Allow pop-ups for PayMyDine and try again.`)
    popupRef.current = popup
    try {
      popup.document.title = `Connecting to ${props.method.name}`
      popup.document.body.innerHTML = '<div style="font-family:system-ui;padding:32px;text-align:center">Connecting securely…</div>'
    } catch {}

    const slug = method.replace(/_/g, '-')
    const result = await requestJson(`/api/v1/payments/worldline/native/redirect/${slug}/create`, {
      order_id: props.orderId,
      payment_method: method,
      provider: 'worldline',
      return_url: returnUrl(),
      tip_amount: props.tipAmount,
      locale: String(props.locale || 'en').replace('-', '_'),
    }) as ProviderResult
    const sessionId = String(result.session_id || '').toLowerCase()
    const redirect = String(result.redirect_url || '')
    if (!/^[a-f0-9]{48}$/.test(sessionId) || !/^https:\/\//i.test(redirect)) {
      try { popup.close() } catch {}
      throw new Error(`Worldline did not return a complete ${props.method.name} authorization session.`)
    }

    savePending(sessionId)
    popup.location.href = redirect
    await pollUntilFinal(sessionId)
  }

  const onClick = async () => {
    if (!code || props.disabled || busy) return
    props.onSelect()
    if (unsupportedContext) {
      props.onError('This Worldline one-tap method requires a server payment intent for coupon or item-split adjustments. Remove the adjustment or use Card for this payment.')
      return
    }
    setBusy(true)
    setLocalError('')
    try {
      if (code === 'apple_pay' || code === 'google_pay') {
        if (!wallet) {
          throw new Error(localError || `${props.method.name} is still preparing. Please tap once more when it is ready.`)
        }
        if (code === 'apple_pay') await payApple(wallet)
        else await payGoogle(wallet)
      } else {
        await payRedirect(code)
      }
    } catch (error) {
      const message = safeMessage(error, `${props.method.name} could not be started.`)
      setLocalError(message)
      props.onError(message)
      try { popupRef.current?.close() } catch {}
      popupRef.current = null
    } finally {
      if (!settledRef.current) setBusy(false)
    }
  }

  if (!code) return null
  const label = props.method.name || (code === 'apple_pay' ? 'Apple Pay' : code === 'google_pay' ? 'Google Pay' : code === 'paypal' ? 'PayPal' : 'Wero')
  const notReady = (code === 'apple_pay' || code === 'google_pay') && !wallet

  return (
    <>
      <button
        type="button"
        className={props.className}
        data-pmd-worldline-direct-method={code}
        data-pmd-worldline-ready={notReady ? 'false' : 'true'}
        aria-pressed={props.selected}
        aria-busy={busy || preparing}
        disabled={Boolean(props.disabled)}
        onClick={() => { void onClick() }}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '.65rem', opacity: 1 }}
      >
        {busy ? <span aria-hidden="true" className="pmd-worldline-direct-spinner" /> : glyph(code)}
        <span>{label}</span>
      </button>

      {challengeUrl && typeof document !== 'undefined' ? createPortal((
        <div role="dialog" aria-modal="true" aria-label="Secure bank verification" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(8px)' }}>
          <div style={{ width: 'min(100%, 640px)', background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,.4)' }}>
            <iframe
              src={challengeUrl}
              title="Worldline secure bank verification"
              allow="payment"
              sandbox="allow-scripts allow-popups allow-same-origin allow-forms allow-modals allow-top-navigation-by-user-activation"
              referrerPolicy="strict-origin-when-cross-origin"
              style={{ display: 'block', width: '100%', height: 'min(72vh, 620px)', border: 0, background: '#fff' }}
            />
          </div>
        </div>
      ), document.body) : null}

      <style>{`
        @keyframes pmdWorldlineDirectSpin { to { transform: rotate(360deg); } }
        .pmd-worldline-direct-spinner {
          display: inline-block;
          width: 18px;
          height: 18px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: pmdWorldlineDirectSpin .7s linear infinite;
          box-sizing: border-box;
        }
        [data-pmd-worldline-direct-method][data-pmd-worldline-ready="false"] {
          opacity: .78 !important;
        }
      `}</style>
    </>
  )
}
