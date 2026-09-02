'use client'

import { useRef, useState, type CSSProperties, type FormEvent } from 'react'
import {
  IinDetailsStatus,
  Session,
  type PaymentDetails,
  type SessionDetails,
} from 'connect-sdk-client-js'

type NativeCardSession = {
  sessionId: string
  clientSession: SessionDetails
  paymentDetails: PaymentDetails
  allowedPaymentProductIds: number[]
  orderId: number
  returnTo: string
}

type NativeCardResult = {
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

type Props = NativeCardSession & {
  onResult: (result: NativeCardResult) => void | Promise<void>
  onError?: (message: string) => void
}

function expiryForWorldline(value: string): string {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length !== 4) return ''
  const month = Number(digits.slice(0, 2))
  if (month < 1 || month > 12) return ''
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

function friendlyValidationMessage(errors: Array<{ fieldId?: string; errorMessageId?: string }>): string {
  const fields = Array.from(new Set(errors.map((entry) => String(entry?.fieldId || '').trim()).filter(Boolean)))
  if (fields.length) return `Check your ${fields.join(', ')} and try again.`
  return 'Check your card details and try again.'
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

export function WorldlineNativeCardForm(props: Props) {
  // Raw card values are intentionally never stored in React state, storage, logs,
  // analytics, or network payloads. They are read from DOM refs only at submit,
  // placed directly into Worldline's PaymentRequest, encrypted, then cleared.
  const cardNumberRef = useRef<HTMLInputElement>(null)
  const expiryRef = useRef<HTMLInputElement>(null)
  const cvvRef = useRef<HTMLInputElement>(null)
  const cardholderRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const currency = String(props.paymentDetails.currency || 'EUR').toUpperCase()
  const locale = String(props.paymentDetails.locale || 'de_DE')
  const totalAmount = Number(props.paymentDetails.totalAmount || 0)

  const clearSensitiveInputs = () => {
    if (cardNumberRef.current) cardNumberRef.current.value = ''
    if (expiryRef.current) expiryRef.current.value = ''
    if (cvvRef.current) cvvRef.current.value = ''
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')

    try {
      const cardNumber = String(cardNumberRef.current?.value || '').replace(/\s+/g, '')
      const expiryDate = expiryForWorldline(String(expiryRef.current?.value || ''))
      const cvv = String(cvvRef.current?.value || '').replace(/\D/g, '')
      const cardholderName = String(cardholderRef.current?.value || '').trim()

      if (cardNumber.length < 12 || !expiryDate || cvv.length < 3 || !cardholderName) {
        throw new Error('Enter a valid card number, expiry date, security code and cardholder name.')
      }

      const session = new Session(props.clientSession)
      const iinDetails = await session.getIinDetails(cardNumber, props.paymentDetails)
      if (iinDetails.status !== IinDetailsStatus.SUPPORTED) {
        throw new Error('This card is not supported by the configured Worldline merchant account.')
      }

      const paymentProductId = Number(iinDetails.paymentProductId || 0)
      if (!paymentProductId || !props.allowedPaymentProductIds.includes(paymentProductId)) {
        throw new Error('This card product is not enabled for this Worldline checkout.')
      }

      const product = await session.getPaymentProduct(paymentProductId, props.paymentDetails)
      const paymentRequest = session.getPaymentRequest()
      paymentRequest.setPaymentProduct(product)
      paymentRequest.setValue('cardNumber', cardNumber)
      paymentRequest.setValue('expiryDate', expiryDate)
      paymentRequest.setValue('cvv', cvv)
      paymentRequest.setValue('cardholderName', cardholderName)

      const validationErrors = paymentRequest.validate() as Array<{ fieldId?: string; errorMessageId?: string }>
      if (validationErrors.length) {
        throw new Error(friendlyValidationMessage(validationErrors))
      }

      const encryptedCustomerInput = await session.getEncryptor().encrypt(paymentRequest)
      if (!encryptedCustomerInput || String(encryptedCustomerInput).length < 32) {
        throw new Error('Worldline could not encrypt the card details. Please try again.')
      }

      // The plaintext card number/CVV are no longer needed after this point.
      clearSensitiveInputs()

      const returnUrl = new URL('/payment/worldline-embedded-return', window.location.origin)
      returnUrl.searchParams.set('native_session_id', props.sessionId)
      returnUrl.searchParams.set('return_to', props.returnTo || '/')

      const response = await fetch('/api/v1/payments/worldline/native/card/submit', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: props.sessionId,
          encrypted_customer_input: String(encryptedCustomerInput),
          payment_product_id: paymentProductId,
          return_url: returnUrl.toString(),
        }),
      })
      const data = await response.json().catch(() => ({})) as NativeCardResult & { error?: string }
      if (!response.ok || data.success === false) {
        throw new Error(String(data.error || data.message || `HTTP ${response.status}`))
      }
      await props.onResult(data)
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Worldline card payment could not be started.'
      setError(message)
      props.onError?.(message)
    } finally {
      setBusy(false)
    }
  }

  const inputStyle: CSSProperties = {
    width: '100%',
    minWidth: 0,
    height: 50,
    borderRadius: 12,
    border: '1px solid rgba(255,31,112,.55)',
    background: 'rgba(7,8,13,.82)',
    color: '#f8fafc',
    padding: '0 14px',
    fontSize: 16,
    outline: 'none',
  }

  return (
    <form
      onSubmit={submit}
      autoComplete="off"
      data-pmd-worldline-native-card="client-sdk-v1"
      style={{
        width: '100%',
        border: '1px solid rgba(255,31,112,.55)',
        borderRadius: 16,
        background: 'rgba(12,12,18,.96)',
        padding: 16,
        display: 'grid',
        gap: 14,
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <strong style={{ display: 'block', color: '#fff', fontSize: 17 }}>Card / Wallet</strong>
          <span style={{ color: '#a1a1aa', fontSize: 12 }}>Encrypted securely by Worldline in this browser</span>
        </div>
        <strong style={{ color: '#fff', fontSize: 17 }}>{money(totalAmount, currency, locale)}</strong>
      </div>

      <label style={{ display: 'grid', gap: 6, color: '#d4d4d8', fontSize: 12 }}>
        Cardholder name
        <input
          ref={cardholderRef}
          style={inputStyle}
          type="text"
          inputMode="text"
          autoComplete="cc-name"
          maxLength={70}
          placeholder="Name on card"
          required
        />
      </label>

      <label style={{ display: 'grid', gap: 6, color: '#d4d4d8', fontSize: 12 }}>
        Card number
        <input
          ref={cardNumberRef}
          style={inputStyle}
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          maxLength={23}
          placeholder="1234 5678 9012 3456"
          required
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 10 }}>
        <label style={{ display: 'grid', gap: 6, color: '#d4d4d8', fontSize: 12 }}>
          Expiry
          <input
            ref={expiryRef}
            style={inputStyle}
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            maxLength={5}
            placeholder="MM/YY"
            required
          />
        </label>
        <label style={{ display: 'grid', gap: 6, color: '#d4d4d8', fontSize: 12 }}>
          Security code
          <input
            ref={cvvRef}
            style={inputStyle}
            type="password"
            inputMode="numeric"
            autoComplete="cc-csc"
            maxLength={4}
            placeholder="CVV"
            required
          />
        </label>
      </div>

      {error ? (
        <div role="alert" style={{ color: '#fda4af', fontSize: 13, lineHeight: 1.45 }}>{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={busy}
        style={{
          width: '100%',
          height: 54,
          border: 0,
          borderRadius: 999,
          background: busy ? 'rgba(255,31,112,.55)' : '#ff1f70',
          color: '#fff',
          fontSize: 17,
          fontWeight: 800,
          cursor: busy ? 'wait' : 'pointer',
        }}
      >
        {busy ? 'Encrypting & starting payment…' : `Pay ${money(totalAmount, currency, locale)}`}
      </button>

      <div style={{ color: '#8f8f9b', fontSize: 11, lineHeight: 1.5, textAlign: 'center' }}>
        PayMyDine never sends your raw card number or security code to its server. Worldline may open a bank verification step when 3-D Secure is required.
      </div>
    </form>
  )
}
