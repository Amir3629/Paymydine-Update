'use client'

import { useEffect, useRef, useState } from 'react'

type PendingWorldlinePayment = {
  provider?: string
  settlementMode?: 'pay-existing' | 'start-finalize'
  methodCode?: string
  providerCode?: string | null
  orderId?: number
  paymentIntentToken?: string | null
  table?: {
    id?: string
    number?: string
    qr?: string
    locationId?: string | number | null
  }
  hostedCheckoutId?: string | null
  amount?: number
  currency?: string
  tipAmount?: number
  couponCode?: string | null
  couponDiscount?: number
  selectedItems?: Array<{ order_menu_id: number; quantity: number }> | null
  payerLabel?: string | null
}

type EmbeddedSession = {
  redirectUrl: string
  hostedCheckoutId: string
  orderId: number
  methodCode: string
  returnTo: string
}

type BridgeState = 'idle' | 'loading' | 'ready' | 'settling' | 'paid' | 'failed'

const PENDING_KEY = 'pmd-v2:pending-payment:worldline'
const CREATE_SESSION_PATTERN = /^\/api\/v1\/payments\/worldline\/runtime\/(card|apple-pay|google-pay)\/create-session$/
const PROVIDER_HOST_SUFFIX = '.worldline-solutions.com'

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function normalizeMethod(value: string): string {
  return String(value || 'card').trim().toLowerCase().replace(/-/g, '_')
}

function safeReturnPath(value: unknown): string {
  const raw = String(value || '/').trim()
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  try {
    const parsed = new URL(raw, 'https://paymydine.invalid')
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/'
  }
}

function safeWorldlineUrl(value: unknown): string | null {
  try {
    const parsed = new URL(String(value || ''))
    const host = parsed.hostname.toLowerCase()
    if (parsed.protocol !== 'https:') return null
    if (!host.endsWith(PROVIDER_HOST_SUFFIX)) return null
    return parsed.toString()
  } catch {
    return null
  }
}

function readPending(expectedCheckoutId: string): PendingWorldlinePayment | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingWorldlinePayment
    if (String(parsed.hostedCheckoutId || '') !== expectedCheckoutId) return null
    return parsed
  } catch {
    return null
  }
}

function clearPending(expectedCheckoutId: string) {
  try {
    const pending = readPending(expectedCheckoutId)
    if (pending) window.localStorage.removeItem(PENDING_KEY)
  } catch {}
}

async function requestJson(url: string, body: Record<string, unknown>): Promise<any> {
  const response = await window.fetch(url, {
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

async function waitForPending(checkoutId: string): Promise<PendingWorldlinePayment> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pending = readPending(checkoutId)
    if (pending) return pending
    await sleep(50)
  }
  throw new Error('PayMyDine could not bind the Worldline checkout to this order.')
}

async function settleVerifiedWorldlinePayment(pending: PendingWorldlinePayment, status: any) {
  const orderId = Number(pending.orderId || status?.order_id || 0)
  const reference = String(status?.payment_id || status?.provider_reference || pending.hostedCheckoutId || '')
  if (!orderId || !reference) throw new Error('Worldline payment reference is incomplete.')

  const chargedAmount = Number(status?.expected_amount_minor || 0) > 0
    ? Number(status.expected_amount_minor) / 100
    : Number(pending.amount || 0)
  const tipAmount = Number(status?.tip_amount_minor || 0) >= 0
    ? Number(status.tip_amount_minor || 0) / 100
    : Number(pending.tipAmount || 0)
  const table = pending.table || {}

  if ((pending.settlementMode || 'pay-existing') === 'start-finalize') {
    await requestJson('/api/v1/orders/finalize-payment', {
      order_id: orderId,
      payment_intent_id: reference,
      payment_method: normalizeMethod(String(pending.methodCode || status?.method_code || 'card')),
      provider: 'worldline',
    })
    return
  }

  await requestJson('/api/v1/orders/pay-existing', {
    order_id: orderId,
    payment_method: normalizeMethod(String(pending.methodCode || status?.method_code || 'card')),
    payment_method_raw: normalizeMethod(String(pending.methodCode || status?.method_code || 'card')),
    payment_provider: 'worldline',
    provider: 'worldline',
    payment_reference: reference,
    amount: chargedAmount,
    tip_amount: tipAmount,
    coupon_code: pending.paymentIntentToken ? null : pending.couponCode || null,
    coupon_discount: pending.paymentIntentToken ? 0 : Number(pending.couponDiscount || 0),
    selected_items: pending.selectedItems || null,
    payer_label: pending.payerLabel || null,
    payment_intent_token: pending.paymentIntentToken || null,
    idempotency_key: pending.paymentIntentToken || null,
    guest_session_id: null,
    location_id: table.locationId || null,
    table_id: table.id || null,
    table_no: table.number || null,
    qr: table.qr || null,
  })
}

function methodLabel(code: string): string {
  if (code === 'apple_pay') return 'Apple Pay'
  if (code === 'google_pay') return 'Google Pay'
  return 'Card / Wallet'
}

export function WorldlineEmbeddedCheckoutBridge() {
  const [session, setSession] = useState<EmbeddedSession | null>(null)
  const [state, setState] = useState<BridgeState>('idle')
  const [message, setMessage] = useState('')
  const [providerStatus, setProviderStatus] = useState('')
  const generationRef = useRef(0)
  const settlingRef = useRef(false)

  useEffect(() => {
    const originalFetch = window.fetch

    const patchedFetch: typeof window.fetch = async (input, init) => {
      let parsedUrl: URL | null = null
      try {
        const value = typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
        parsedUrl = new URL(value, window.location.origin)
      } catch {}

      if (!parsedUrl || parsedUrl.origin !== window.location.origin || !CREATE_SESSION_PATTERN.test(parsedUrl.pathname)) {
        return originalFetch.call(window, input as any, init)
      }

      let nextInit = init
      let requestedMethod = normalizeMethod(parsedUrl.pathname.match(CREATE_SESSION_PATTERN)?.[1] || 'card')
      let returnTo = `${window.location.pathname}${window.location.search}`
      let orderId = 0

      if (typeof init?.body === 'string') {
        try {
          const payload = JSON.parse(init.body) as Record<string, unknown>
          requestedMethod = normalizeMethod(String(payload.payment_method || requestedMethod))
          orderId = Number(payload.order_id || 0)
          try {
            const prior = new URL(String(payload.return_url || ''), window.location.origin)
            returnTo = safeReturnPath(prior.searchParams.get('return_to') || returnTo)
          } catch {}
          payload.return_url = `${window.location.origin}/payment/worldline-embedded-return?return_to=${encodeURIComponent(returnTo)}`
          payload.integration_preference = 'embedded_mycheckout'
          nextInit = { ...init, body: JSON.stringify(payload) }
        } catch {}
      }

      const response = await originalFetch.call(window, input as any, nextInit)
      if (!response.ok) return response

      const data = await response.clone().json().catch(() => null)
      const redirectUrl = safeWorldlineUrl(data?.redirect_url || data?.redirectUrl)
      const hostedCheckoutId = String(data?.hosted_checkout_id || data?.hostedCheckoutId || '')
      if (!data || !redirectUrl || !hostedCheckoutId) return response

      generationRef.current += 1
      settlingRef.current = false
      setProviderStatus('')
      setMessage('Loading secure Worldline checkout…')
      setState('loading')
      setSession({
        redirectUrl,
        hostedCheckoutId,
        orderId: Number(data?.order_id || orderId || 0),
        methodCode: normalizeMethod(String(data?.payment_method || requestedMethod)),
        returnTo,
      })

      const sanitized = {
        ...data,
        redirect_url: null,
        redirectUrl: null,
        flow: 'embedded',
        message: 'Worldline secure checkout opened inside PayMyDine.',
      }
      const headers = new Headers(response.headers)
      headers.delete('content-length')
      headers.delete('content-encoding')
      headers.set('content-type', 'application/json; charset=utf-8')
      return new Response(JSON.stringify(sanitized), {
        status: response.status,
        statusText: response.statusText,
        headers,
      })
    }

    window.fetch = patchedFetch
    return () => {
      if (window.fetch === patchedFetch) window.fetch = originalFetch
    }
  }, [])

  useEffect(() => {
    if (!session) return
    const generation = generationRef.current
    let cancelled = false
    let timer: number | null = null
    const priorOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const finish = () => {
      if (timer !== null) window.clearTimeout(timer)
      document.body.style.overflow = priorOverflow
    }

    const poll = async () => {
      if (cancelled || generation !== generationRef.current || settlingRef.current) return
      try {
        const pending = await waitForPending(session.hostedCheckoutId)
        if (cancelled || generation !== generationRef.current) return

        const status = await requestJson('/api/v1/payments/worldline/runtime/status', {
          hosted_checkout_id: session.hostedCheckoutId,
          order_id: Number(pending.orderId || session.orderId || 0),
        })
        if (cancelled || generation !== generationRef.current) return

        const statusName = String(status?.payment_status || status?.status || '').toUpperCase()
        setProviderStatus(statusName && statusName !== 'PENDING' ? statusName : '')

        if (status?.is_paid === true && status?.verification_ok === true) {
          settlingRef.current = true
          setState('settling')
          setMessage('Payment confirmed by Worldline. Finishing your PayMyDine order…')
          try {
            await settleVerifiedWorldlinePayment(pending, status)
            clearPending(session.hostedCheckoutId)
            if (cancelled || generation !== generationRef.current) return
            setState('paid')
            setMessage('Payment complete. Updating your order…')
            window.setTimeout(() => window.location.reload(), 650)
          } catch (error) {
            settlingRef.current = false
            setState('failed')
            setMessage(`Worldline confirmed the payment, but PayMyDine could not finish settlement. Do not pay again. ${error instanceof Error ? error.message : ''}`.trim())
          }
          return
        }

        if (['CANCELLED', 'CANCELED', 'REJECTED', 'REJECTED_CAPTURE', 'FAILED', 'EXPIRED'].includes(statusName)) {
          setState('failed')
          setMessage(`Worldline did not complete this payment (${statusName}). You can close this window and try again.`)
          return
        }

        setState('ready')
        setMessage('Complete the secure payment below. Your card details stay with Worldline.')
      } catch (error) {
        if (cancelled || generation !== generationRef.current) return
        setState('ready')
        setMessage(error instanceof Error && /bind the Worldline checkout/i.test(error.message)
          ? error.message
          : 'Waiting for Worldline payment confirmation…')
      }

      if (!cancelled && generation === generationRef.current && !settlingRef.current) {
        timer = window.setTimeout(poll, 1300)
      }
    }

    void poll()
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type === 'pmd-worldline-embedded-return') {
        if (timer !== null) window.clearTimeout(timer)
        timer = window.setTimeout(poll, 50)
      }
    }
    window.addEventListener('message', onMessage)

    return () => {
      cancelled = true
      window.removeEventListener('message', onMessage)
      finish()
    }
  }, [session])

  const close = () => {
    if (state === 'settling' || state === 'paid') return
    generationRef.current += 1
    settlingRef.current = false
    setSession(null)
    setState('idle')
    setMessage('')
    setProviderStatus('')
  }

  if (!session) return null

  return (
    <div
      data-pmd-worldline-embedded="mycheckout-v1"
      role="dialog"
      aria-modal="true"
      aria-label={`Secure ${methodLabel(session.methodCode)} payment`}
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        background: 'rgba(4, 7, 10, 0.82)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: 'max(10px, env(safe-area-inset-top)) 0 max(10px, env(safe-area-inset-bottom))',
      }}
    >
      <section style={{
        width: 'min(760px, 100vw)', minWidth: 0, height: '100%', maxHeight: '960px',
        background: '#fff', color: '#111827', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        borderRadius: '22px', boxShadow: '0 28px 80px rgba(0,0,0,.42)',
      }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 17 }}>Secure {methodLabel(session.methodCode)}</strong>
            <small style={{ display: 'block', color: '#64748b', marginTop: 3 }}>Powered by Worldline · card data never enters PayMyDine</small>
          </div>
          <button
            type="button"
            onClick={close}
            disabled={state === 'settling' || state === 'paid'}
            aria-label="Close payment"
            style={{ width: 42, height: 42, borderRadius: 999, border: '1px solid #cbd5e1', background: '#fff', color: '#0f172a', fontSize: 26, lineHeight: 1, cursor: state === 'settling' || state === 'paid' ? 'not-allowed' : 'pointer' }}
          >×</button>
        </header>

        <div style={{ flex: 1, minHeight: 400, position: 'relative', background: '#fff' }}>
          <iframe
            src={session.redirectUrl}
            title={`Worldline ${methodLabel(session.methodCode)} checkout`}
            allow="payment"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-forms"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => {
              if (state === 'loading') {
                setState('ready')
                setMessage('Complete the secure payment below. Your card details stay with Worldline.')
              }
            }}
            style={{ display: 'block', width: '100%', height: '100%', minHeight: 400, border: 0, background: '#fff' }}
          />
        </div>

        <footer style={{ padding: '11px 16px 13px', borderTop: '1px solid #e5e7eb', background: '#f8fafc', color: state === 'failed' ? '#991b1b' : '#334155', fontSize: 13, lineHeight: 1.45 }}>
          <span>{message || 'Secure payment session ready.'}</span>
          {providerStatus ? <strong style={{ marginLeft: 8 }}>Worldline: {providerStatus}</strong> : null}
        </footer>
      </section>
    </div>
  )
}
