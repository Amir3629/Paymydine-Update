'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CreditCard, LoaderCircle } from 'lucide-react'
import type { TableContext } from '@/src/domain/model'
import {
  mountVrPaymentIframe,
  startHostedProviderPayment,
  type SplitPaymentIntent,
  type VrPaymentIframeHandler,
} from '@/src/lib/client-api'
import styles from './RuntimeOverlays.module.css'

type Props = {
  orderId: number
  settlementMode: 'pay-existing' | 'start-finalize'
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
  locale?: string
  onError?: (message: string) => void
}

function money(value: number, currency: string, locale = 'en') {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: String(currency || 'EUR').toUpperCase(),
    }).format(value)
  } catch {
    return `${Number(value || 0).toFixed(2)} ${String(currency || 'EUR').toUpperCase()}`
  }
}

function copyFor(methodCode: string, locale = 'en') {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  const isWero = String(methodCode || '').toLowerCase() === 'wero'

  if (lang === 'de') {
    return isWero
      ? {
          title: 'Wero direkt in PayMyDine',
          loading: 'Sichere Wero-Zahlung wird geladen…',
          hint: 'Die von VR Payment bereitgestellte Wero-Oberfläche wird direkt hier eingebettet. Falls Wero für diesen Schritt eine Bank- oder App-Freigabe verlangt, kann die abschließende Autorisierung außerhalb des eingebetteten Bereichs fortgesetzt werden.',
          pay: 'Mit Wero bezahlen',
          validating: 'Wero wird geprüft…',
          unavailable: 'Wero konnte für diese Transaktion nicht als eingebettete Zahlung geladen werden.',
        }
      : {
          title: 'Kartenzahlung direkt in PayMyDine',
          loading: 'Sichere Kartenfelder werden geladen…',
          hint: 'Kartennummer, Ablaufdatum und Sicherheitscode werden sicher von VR Payment in diesem PayMyDine-Bereich erfasst.',
          pay: 'Bezahlen',
          validating: 'Kartendaten werden geprüft…',
          unavailable: 'Die sicheren VR-Payment-Kartenfelder konnten nicht geladen werden.',
        }
  }

  return isWero
    ? {
        title: 'Wero directly in PayMyDine',
        loading: 'Loading secure Wero payment…',
        hint: 'The VR Payment Wero experience is embedded here. If Wero requires bank or app authorization, the final authorization step may continue outside the embedded area.',
        pay: 'Pay with Wero',
        validating: 'Checking Wero…',
        unavailable: 'Wero could not be loaded as an embedded payment for this transaction.',
      }
    : {
        title: 'Card payment directly in PayMyDine',
        loading: 'Loading secure card fields…',
        hint: 'Card number, expiry and security code are collected securely by VR Payment inside this PayMyDine checkout.',
        pay: 'Pay',
        validating: 'Checking card details…',
        unavailable: 'The secure VR Payment card fields could not be loaded.',
      }
}

function validationMessages(result: unknown): string[] {
  if (!result || typeof result !== 'object') return ['The payment details could not be validated.']
  const rows = (result as { errors?: unknown }).errors
  if (!Array.isArray(rows)) return ['The payment details could not be validated.']
  return rows
    .map((row) => {
      if (typeof row === 'string') return row
      if (row && typeof row === 'object') {
        const candidate = row as { message?: unknown; error?: unknown }
        return String(candidate.message || candidate.error || '').trim()
      }
      return ''
    })
    .filter(Boolean)
}

export function VrPaymentInline(props: Props) {
  // PMD_VR_IFRAME_COMPONENT_R1_4_5
  // RuntimeOverlays gives this component a key containing method/order/amount/split
  // inputs. One mount therefore owns exactly one VR transaction + iframe handler.
  const copy = useMemo(() => copyFor(props.methodCode, props.locale), [props.locale, props.methodCode])
  const mountIdRef = useRef(`pmd-vr-iframe-${props.orderId}-${Math.random().toString(36).slice(2, 10)}`)
  const handlerRef = useRef<VrPaymentIframeHandler | null>(null)
  const preparedIntentRef = useRef<SplitPaymentIntent | null>(null)
  const submittedRef = useRef(false)
  const cancelledRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [frameHeight, setFrameHeight] = useState(220)

  const reportError = (message: string) => {
    const normalized = String(message || copy.unavailable).trim() || copy.unavailable
    setError(normalized)
    setBusy(false)
    setLoading(false)
    props.onError?.(normalized)
  }

  useEffect(() => {
    cancelledRef.current = false
    submittedRef.current = false
    handlerRef.current = null
    preparedIntentRef.current = null
    setReady(false)
    setLoading(true)
    setBusy(false)
    setError('')

    const boot = async () => {
      try {
        const intent = props.prepareSplitIntent ? await props.prepareSplitIntent() : null
        if (cancelledRef.current) return
        preparedIntentRef.current = intent

        const response = await startHostedProviderPayment({
          orderId: props.orderId,
          paymentIntentToken: intent?.token || null,
          settlementMode: props.settlementMode,
          table: props.table,
          methodCode: props.methodCode,
          providerCode: props.providerCode,
          guestSessionId: props.guestSessionId,
          amount: intent?.payableAmount ?? props.amount,
          currency: props.currency,
          tipAmount: intent?.tipAmount ?? props.tipAmount,
          couponCode: intent ? null : props.couponCode,
          couponDiscount: intent ? 0 : props.couponDiscount,
          selectedItems: intent?.selectedItems ?? props.selectedItems,
          payerLabel: intent?.payerLabel ?? props.payerLabel,
          items: intent?.providerItems?.length ? intent.providerItems : props.items,
        })
        if (cancelledRef.current) return

        if (response.flow !== 'iframe') {
          throw new Error(String(response.raw?.message || response.raw?.error || copy.unavailable))
        }

        const handler = await mountVrPaymentIframe(response, mountIdRef.current, {
          onInitialize: () => {
            if (cancelledRef.current) return
            setReady(true)
            setLoading(false)
          },
          onHeightChange: (height) => {
            if (cancelledRef.current) return
            const next = Math.min(900, Math.max(160, Number(height || 0)))
            if (Number.isFinite(next)) setFrameHeight(next)
          },
          onValidation: (result, currentHandler) => {
            if (cancelledRef.current) return
            const success = Boolean(result && typeof result === 'object' && (result as { success?: unknown }).success)
            if (!success) {
              reportError(validationMessages(result).join(' '))
              return
            }
            setError('')
            setBusy(true)
            submittedRef.current = true
            currentHandler.submit()
          },
        })

        if (cancelledRef.current) return
        handlerRef.current = handler
      } catch (cause) {
        if (cancelledRef.current) return
        reportError(cause instanceof Error ? cause.message : copy.unavailable)
      }
    }

    void boot()

    return () => {
      cancelledRef.current = true
      handlerRef.current = null

      const intent = preparedIntentRef.current
      if (!intent || submittedRef.current) return
      preparedIntentRef.current = null
      void fetch('/api/v1/orders/split-intent/cancel', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({
          intent_token: intent.token,
          guest_session_id: props.guestSessionId || null,
        }),
        keepalive: true,
      }).catch(() => undefined)
    }
    // One component mount intentionally owns one immutable provider session.
    // RuntimeOverlays remounts this component by key whenever material inputs change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pay = () => {
    if (!ready || busy) return
    const handler = handlerRef.current
    if (!handler) {
      reportError(copy.unavailable)
      return
    }
    setBusy(true)
    setError('')
    try {
      handler.validate()
    } catch (cause) {
      reportError(cause instanceof Error ? cause.message : copy.unavailable)
    }
  }

  return (
    <section className={styles.stack} data-pmd-vr-iframe="r1-4-5" aria-label={copy.title}>
      <div className={styles.statusMessage}>
        <strong>{copy.title}</strong>
        <div>{copy.hint}</div>
      </div>

      <div
        id={mountIdRef.current}
        data-pmd-vr-iframe-container="1"
        style={{ width: '100%', minHeight: `${frameHeight}px`, overflow: 'hidden' }}
      />

      {loading && (
        <div className={styles.statusMessage} role="status">
          <LoaderCircle aria-hidden="true" /> {copy.loading}
        </div>
      )}

      {error && <div className={`${styles.statusMessage} ${styles.statusError}`} role="alert">{error}</div>}

      <button className={styles.primary} type="button" onClick={pay} disabled={!ready || loading || busy}>
        {busy ? <LoaderCircle aria-hidden="true" /> : <CreditCard aria-hidden="true" />}
        {busy ? copy.validating : `${copy.pay} ${money(props.amount, props.currency, props.locale)}`}
      </button>
    </section>
  )
}
