'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  Session,
  type PaymentDetails,
  type SessionDetails,
} from 'connect-sdk-client-js'

type WalletMethod = 'apple_pay' | 'google_pay'

type WalletConfig = {
  merchantName: string
  googleMerchantId: string | null
  gatewayMerchantId: string
  environment: 'TEST' | 'PROD'
}

type NativeWalletResult = {
  success?: boolean
  session_id?: string
  payment_id?: string | null
  payment_status?: string
  is_paid?: boolean
  verification_ok?: boolean
  redirect_url?: string | null
  return_mac_required?: boolean
  message?: string
}

type Props = {
  methodCode: WalletMethod
  sessionId: string
  clientSession: SessionDetails
  paymentDetails: PaymentDetails
  paymentProductId: number
  walletConfiguration: WalletConfig
  orderId: number
  returnTo: string
  onResult: (result: NativeWalletResult) => void | Promise<void>
  onError?: (message: string) => void
}

type PreparedWallet = {
  session: Session
  product: any
  paymentDetails: PaymentDetails
}

let googlePayScriptPromise: Promise<void> | null = null

function getGooglePaymentsClientConstructor(): any {
  if (typeof window === 'undefined') return null
  const google = (window as any).google
  return google && google.payments && google.payments.api
    ? google.payments.api.PaymentsClient
    : null
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
      window.setTimeout(() => {
        if (getGooglePaymentsClientConstructor()) resolve()
      }, 50)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://pay.google.com/gp/p/js/pay.js'
    script.async = true
    script.dataset.pmdWorldlineGooglePay = 'own-checkout-v1'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Google Pay could not be loaded.'))
    document.head.appendChild(script)
  })

  googlePayScriptPromise = googlePayScriptPromise.catch((error) => {
    googlePayScriptPromise = null
    throw error
  })
  return googlePayScriptPromise
}

function money(amountMinor: number, currency: string, locale: string): string {
  try {
    return new Intl.NumberFormat(String(locale || 'de-DE').replace('_', '-'), {
      style: 'currency',
      currency: String(currency || 'EUR').toUpperCase(),
    }).format(Math.max(0, Number(amountMinor || 0)) / 100)
  } catch {
    return `${(Math.max(0, Number(amountMinor || 0)) / 100).toFixed(2)} ${String(currency || 'EUR').toUpperCase()}`
  }
}

function errorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message) return value.message
  if (typeof value === 'string' && value.trim()) return value.trim()
  return fallback
}

export function WorldlineNativeWalletForm(props: Props) {
  const preparedRef = useRef<PreparedWallet | null>(null)
  const googleClientRef = useRef<any>(null)
  const googleButtonHostRef = useRef<HTMLDivElement | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const currency = String(props.paymentDetails.currency || 'EUR').toUpperCase()
  const locale = String(props.paymentDetails.locale || 'de_DE')
  const amountMinor = Number(props.paymentDetails.totalAmount || 0)
  const label = props.methodCode === 'apple_pay' ? 'Apple Pay' : 'Google Pay'

  useEffect(() => {
    let cancelled = false
    preparedRef.current = null
    googleClientRef.current = null
    setReady(false)
    setError('')

    const prepare = async () => {
      try {
        const paymentDetails: PaymentDetails = {
          ...props.paymentDetails,
          environment: props.walletConfiguration.environment === 'PROD' ? 'PROD' : 'TEST',
        }
        if (props.methodCode === 'google_pay') {
          await loadGooglePayScript()
        }

        const session = new Session(props.clientSession)
        const specificInputs = props.methodCode === 'apple_pay'
          ? {
              applePay: {
                merchantName: props.walletConfiguration.merchantName,
              },
            }
          : {
              googlePay: {
                merchantId: String(props.walletConfiguration.googleMerchantId || ''),
                merchantName: props.walletConfiguration.merchantName,
                gatewayMerchantId: props.walletConfiguration.gatewayMerchantId,
              },
            }

        const product = await session.getPaymentProduct(
          props.paymentProductId,
          paymentDetails,
          specificInputs,
        )
        const paymentRequest = session.getPaymentRequest()
        paymentRequest.setPaymentProduct(product)

        if (cancelled) return
        preparedRef.current = { session, product, paymentDetails }
        setReady(true)
      } catch (prepareError) {
        if (cancelled) return
        const message = errorMessage(prepareError, `${label} is not available on this device or Worldline merchant configuration.`)
        setError(message)
        props.onError?.(message)
      }
    }

    void prepare()
    return () => {
      cancelled = true
      preparedRef.current = null
      googleClientRef.current = null
    }
  }, [
    props.clientSession.assetUrl,
    props.clientSession.clientApiUrl,
    props.clientSession.clientSessionId,
    props.clientSession.customerId,
    props.methodCode,
    props.paymentDetails.countryCode,
    props.paymentDetails.currency,
    props.paymentDetails.locale,
    props.paymentDetails.totalAmount,
    props.paymentProductId,
    props.walletConfiguration.environment,
    props.walletConfiguration.gatewayMerchantId,
    props.walletConfiguration.googleMerchantId,
    props.walletConfiguration.merchantName,
  ])

  const submitEncrypted = async (encryptedCustomerInput: string) => {
    const returnUrl = new URL('/payment/worldline-embedded-return', window.location.origin)
    returnUrl.searchParams.set('native_alt_session_id', props.sessionId)
    returnUrl.searchParams.set('return_to', props.returnTo || '/')

    const response = await fetch('/api/v1/payments/worldline/native/wallet/submit', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: props.sessionId,
        encrypted_customer_input: encryptedCustomerInput,
        return_url: returnUrl.toString(),
      }),
    })
    const data = await response.json().catch(() => ({})) as NativeWalletResult & { error?: string }
    if (!response.ok || data.success === false) {
      throw new Error(String(data.error || data.message || `HTTP ${response.status}`))
    }
    await props.onResult(data)
  }

  const payApple = async () => {
    if (!ready || busy) return
    const prepared = preparedRef.current
    if (!prepared) return
    setBusy(true)
    setError('')
    try {
      const networks = Array.isArray(prepared.product?.paymentProduct302SpecificData?.networks)
        ? prepared.product.paymentProduct302SpecificData.networks.map((value: unknown) => String(value))
        : []
      if (!networks.length) throw new Error('Worldline did not return Apple Pay card networks for this transaction.')

      const result = await prepared.session.createApplePayPayment(
        prepared.paymentDetails,
        {
          merchantName: props.walletConfiguration.merchantName,
          acquirerCountry: prepared.product?.acquirerCountry || undefined,
        },
        networks,
      )
      const paymentData = (result as any)?.data?.paymentData
      if (!paymentData) throw new Error('Apple Pay did not return payment data.')

      const paymentRequest = prepared.session.getPaymentRequest()
      paymentRequest.setValue('encryptedPaymentData', JSON.stringify(paymentData))
      const encrypted = await prepared.session.getEncryptor().encrypt(paymentRequest)
      if (!encrypted || String(encrypted).length < 32) throw new Error('Worldline could not encrypt the Apple Pay token.')
      await submitEncrypted(String(encrypted))
    } catch (payError) {
      const message = errorMessage(payError, 'Apple Pay could not be started.')
      setError(message)
      props.onError?.(message)
    } finally {
      setBusy(false)
    }
  }

  const payGoogle = async () => {
    if (!ready || busy) return
    const prepared = preparedRef.current
    if (!prepared) return
    setBusy(true)
    setError('')
    try {
      await loadGooglePayScript()
      const GooglePaymentsClient = getGooglePaymentsClientConstructor()
      if (!GooglePaymentsClient) throw new Error('Google Pay API is unavailable in this browser.')

      const specific = prepared.product?.paymentProduct320SpecificData
      const networks = Array.isArray(specific?.networks)
        ? specific.networks.map((value: unknown) => String(value))
        : []
      const gateway = String(specific?.gateway || '')
      if (!networks.length || !gateway) throw new Error('Worldline did not return complete Google Pay configuration.')

      const merchantId = String(props.walletConfiguration.googleMerchantId || '')
      if (!merchantId) throw new Error('Google Pay Merchant ID is not configured for this restaurant.')

      const paymentsClient = googleClientRef.current || new GooglePaymentsClient({
        environment: props.walletConfiguration.environment === 'PROD' ? 'PRODUCTION' : 'TEST',
      })
      googleClientRef.current = paymentsClient

      const paymentData = await paymentsClient.loadPaymentData({
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
              gatewayMerchantId: props.walletConfiguration.gatewayMerchantId,
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
          merchantId,
          merchantName: props.walletConfiguration.merchantName,
        },
      })

      const token = String(paymentData?.paymentMethodData?.tokenizationData?.token || '')
      if (!token) throw new Error('Google Pay did not return a payment token.')

      const paymentRequest = prepared.session.getPaymentRequest()
      paymentRequest.setValue('encryptedPaymentData', token)
      const encrypted = await prepared.session.getEncryptor().encrypt(paymentRequest)
      if (!encrypted || String(encrypted).length < 32) throw new Error('Worldline could not encrypt the Google Pay token.')
      await submitEncrypted(String(encrypted))
    } catch (payError) {
      const message = errorMessage(payError, 'Google Pay could not be started.')
      setError(message)
      props.onError?.(message)
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (props.methodCode !== 'google_pay' || !ready || !googleButtonHostRef.current) return
    const host = googleButtonHostRef.current
    host.replaceChildren()

    try {
      const GooglePaymentsClient = getGooglePaymentsClientConstructor()
      if (!GooglePaymentsClient) return
      const paymentsClient = googleClientRef.current || new GooglePaymentsClient({
        environment: props.walletConfiguration.environment === 'PROD' ? 'PRODUCTION' : 'TEST',
      })
      googleClientRef.current = paymentsClient
      const button = paymentsClient.createButton({
        onClick: () => { void payGoogle() },
        buttonColor: 'black',
        buttonType: 'pay',
        buttonSizeMode: 'fill',
      })
      button.style.width = '100%'
      button.style.minHeight = '52px'
      host.appendChild(button)
    } catch (buttonError) {
      const message = errorMessage(buttonError, 'Google Pay button could not be rendered.')
      setError(message)
      props.onError?.(message)
    }

    return () => host.replaceChildren()
  }, [ready, props.methodCode, props.walletConfiguration.environment])

  const panelStyle: CSSProperties = {
    width: '100%',
    minWidth: 0,
    border: '1px solid rgba(255,31,112,.55)',
    borderRadius: 16,
    background: 'rgba(12,12,18,.96)',
    padding: 16,
    display: 'grid',
    gap: 14,
    boxSizing: 'border-box',
  }

  return (
    <section data-pmd-worldline-native-wallet={`own-checkout-${props.methodCode}-v1`} style={panelStyle}>
      <style>{`
        .pmd-worldline-apple-pay-button {
          -webkit-appearance: -apple-pay-button;
          -apple-pay-button-type: pay;
          -apple-pay-button-style: black;
          appearance: none;
          width: 100%;
          height: 52px;
          min-height: 52px;
          border: 0;
          border-radius: 10px;
          cursor: pointer;
          overflow: hidden;
        }
        .pmd-worldline-apple-pay-button:disabled { opacity: .55; cursor: wait; }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <strong style={{ display: 'block', color: '#fff', fontSize: 17 }}>{label}</strong>
          <span style={{ color: '#a1a1aa', fontSize: 12 }}>Secure Worldline own-checkout inside PayMyDine</span>
        </div>
        <strong style={{ color: '#fff', fontSize: 17 }}>{money(amountMinor, currency, locale)}</strong>
      </div>

      {!ready && !error ? (
        <div style={{ minHeight: 52, display: 'grid', placeItems: 'center', color: '#a1a1aa', fontSize: 13 }}>
          Preparing {label}…
        </div>
      ) : null}

      {props.methodCode === 'apple_pay' && ready ? (
        <button
          type="button"
          aria-label={`Pay ${money(amountMinor, currency, locale)} with Apple Pay`}
          className="pmd-worldline-apple-pay-button"
          disabled={busy}
          onClick={() => { void payApple() }}
        />
      ) : null}

      {props.methodCode === 'google_pay' && ready ? (
        <div ref={googleButtonHostRef} style={{ width: '100%', minHeight: 52 }} />
      ) : null}

      {busy ? (
        <div role="status" style={{ color: '#d4d4d8', fontSize: 12, textAlign: 'center' }}>
          Confirming {label} securely…
        </div>
      ) : null}

      {error ? (
        <div role="alert" style={{ color: '#fda4af', fontSize: 13, lineHeight: 1.45 }}>{error}</div>
      ) : null}

      <div style={{ color: '#8f8f9b', fontSize: 11, lineHeight: 1.5, textAlign: 'center' }}>
        Your wallet credential is tokenized by {label} and encrypted through Worldline. PayMyDine never receives raw card data.
      </div>
    </section>
  )
}
