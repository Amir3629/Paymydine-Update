'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
}

type BridgeState = 'idle' | 'loading' | 'ready' | 'settling' | 'paid' | 'failed'

const PENDING_KEY = 'pmd-v2:pending-payment:worldline'
const CREATE_SESSION_PATTERN = /^\/api\/v1\/payments\/worldline\/runtime\/(card|apple-pay|google-pay|paypal|wero)\/create-session$/
const PROVIDER_HOST_SUFFIX = '.worldline-solutions.com'
const INLINE_HOST_ATTRIBUTE = 'data-pmd-worldline-inline-host'
const HIDDEN_PAY_ATTRIBUTE = 'data-pmd-worldline-hidden-pay-button'

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
    if (readPending(expectedCheckoutId)) window.localStorage.removeItem(PENDING_KEY)
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
  const method = normalizeMethod(String(pending.methodCode || status?.method_code || 'card'))

  if ((pending.settlementMode || 'pay-existing') === 'start-finalize') {
    await requestJson('/api/v1/orders/finalize-payment', {
      order_id: orderId,
      payment_intent_id: reference,
      payment_method: method,
      provider: 'worldline',
    })
    return
  }

  await requestJson('/api/v1/orders/pay-existing', {
    order_id: orderId,
    payment_method: method,
    payment_method_raw: method,
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
  if (code === 'paypal') return 'PayPal'
  if (code === 'wero') return 'Wero'
  return 'Card / Wallet'
}

function isCompactWallet(code: string): boolean {
  return ['apple_pay', 'google_pay', 'paypal', 'wero'].includes(code)
}

function frameHeight(code: string): string {
  if (code === 'card') return 'min(54vh, 520px)'
  if (code === 'paypal' || code === 'wero') return 'min(42vh, 390px)'
  return 'min(36vh, 330px)'
}

function visiblePaymentPanel(): HTMLElement | null {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-payment-order-id]'))
  if (!panels.length) return null
  return panels.find((panel) => panel.getClientRects().length > 0) || panels[panels.length - 1] || null
}

function ensureInlineHost(): HTMLElement | null {
  const panel = visiblePaymentPanel()
  if (!panel) return null

  const existing = panel.querySelector<HTMLElement>(`:scope > [${INLINE_HOST_ATTRIBUTE}="true"]`)
  if (existing) return existing

  const host = document.createElement('div')
  host.setAttribute(INLINE_HOST_ATTRIBUTE, 'true')
  host.style.width = '100%'
  host.style.minWidth = '0'
  host.style.margin = '0'
  host.style.padding = '0'
  host.style.background = 'transparent'

  const directButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>(':scope > button'))
  const payButton = directButtons.length ? directButtons[directButtons.length - 1] : null
  if (payButton) {
    payButton.setAttribute(HIDDEN_PAY_ATTRIBUTE, 'true')
    payButton.style.display = 'none'
    panel.insertBefore(host, payButton)
  } else {
    panel.appendChild(host)
  }

  return host
}

function removeInlineHost() {
  const hosts = Array.from(document.querySelectorAll<HTMLElement>(`[${INLINE_HOST_ATTRIBUTE}="true"]`))
  for (const host of hosts) {
    const panel = host.parentElement
    host.remove()
    const hidden = panel?.querySelector<HTMLButtonElement>(`:scope > button[${HIDDEN_PAY_ATTRIBUTE}="true"]`)
    if (hidden) {
      hidden.style.removeProperty('display')
      hidden.removeAttribute(HIDDEN_PAY_ATTRIBUTE)
    }
  }
}

export function WorldlineEmbeddedCheckoutBridge() {
  const [session, setSession] = useState<EmbeddedSession | null>(null)
  const [hostElement, setHostElement] = useState<HTMLElement | null>(null)
  const [state, setState] = useState<BridgeState>('idle')
  const [message, setMessage] = useState('')
  const [providerStatus, setProviderStatus] = useState('')
  const generationRef = useRef(0)
  const settlingRef = useRef(false)

  const close = () => {
    if (state === 'settling' || state === 'paid') return
    generationRef.current += 1
    settlingRef.current = false
    setSession(null)
    setHostElement(null)
    setState('idle')
    setMessage('')
    setProviderStatus('')
    removeInlineHost()
  }

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

      removeInlineHost()
      const inlineHost = ensureInlineHost()
      if (!inlineHost) return response

      generationRef.current += 1
      settlingRef.current = false
      setProviderStatus('')
      setMessage('')
      setState('loading')
      setHostElement(inlineHost)
      setSession({
        redirectUrl,
        hostedCheckoutId,
        orderId: Number(data?.order_id || orderId || 0),
        methodCode: normalizeMethod(String(data?.payment_method || requestedMethod)),
      })
      window.requestAnimationFrame(() => inlineHost.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))

      const sanitized = {
        ...data,
        redirect_url: null,
        redirectUrl: null,
        flow: 'embedded',
        message: 'Worldline secure checkout opened inside the PayMyDine payment card.',
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
      removeInlineHost()
    }
  }, [])

  useEffect(() => {
    if (!session || !hostElement) return

    const onPanelClick = (event: MouseEvent) => {
      if (state === 'settling' || state === 'paid') return
      const target = event.target instanceof Element ? event.target : null
      if (!target || hostElement.contains(target)) return
      const button = target.closest('button')
      if (!button) return
      const panel = visiblePaymentPanel()
      if (panel && panel.contains(button)) close()
    }

    document.addEventListener('click', onPanelClick, true)
    return () => document.removeEventListener('click', onPanelClick, true)
  }, [hostElement, session, state])

  useEffect(() => {
    if (!session) return
    const generation = generationRef.current
    let cancelled = false
    let timer: number | null = null

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
          setMessage('Payment confirmed. Finishing your order…')
          try {
            await settleVerifiedWorldlinePayment(pending, status)
            clearPending(session.hostedCheckoutId)
            if (cancelled || generation !== generationRef.current) return
            setState('paid')
            setMessage('Payment complete.')
            window.setTimeout(() => window.location.reload(), 650)
          } catch (error) {
            settlingRef.current = false
            setState('failed')
            setMessage(`Worldline confirmed payment, but PayMyDine could not finish settlement. Do not pay again. ${error instanceof Error ? error.message : ''}`.trim())
          }
          return
        }

        if (['CANCELLED', 'CANCELED', 'REJECTED', 'REJECTED_CAPTURE', 'FAILED', 'EXPIRED'].includes(statusName)) {
          setState('failed')
          setMessage(`Payment not completed (${statusName}). Choose another method or try again.`)
          return
        }

        setState('ready')
      } catch (error) {
        if (cancelled || generation !== generationRef.current) return
        setState('ready')
        if (error instanceof Error && /bind the Worldline checkout/i.test(error.message)) setMessage(error.message)
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
      if (timer !== null) window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }
  }, [session])

  if (!session || !hostElement) return null

  const compact = isCompactWallet(session.methodCode)
  const content = (
    <div
      data-pmd-worldline-embedded="mycheckout-inline-v3"
      aria-label={`Secure ${methodLabel(session.methodCode)} payment`}
      style={{
        width: '100%',
        minWidth: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        border: 0,
        borderRadius: compact ? 12 : 14,
        background: 'transparent',
        boxShadow: 'none',
      }}
    >
      <div
        style={{
          width: '100%',
          height: frameHeight(session.methodCode),
          minHeight: compact ? 250 : 380,
          maxHeight: session.methodCode === 'card' ? 520 : 390,
          overflow: 'hidden',
          borderRadius: compact ? 12 : 14,
          background: 'transparent',
        }}
      >
        <iframe
          src={session.redirectUrl}
          title={`Worldline ${methodLabel(session.methodCode)} checkout`}
          allow="payment"
          sandbox="allow-scripts allow-popups allow-same-origin allow-forms"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => {
            if (state === 'loading') setState('ready')
          }}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            minHeight: compact ? 250 : 380,
            border: 0,
            borderRadius: compact ? 12 : 14,
            background: 'transparent',
          }}
        />
      </div>

      {(state === 'settling' || state === 'paid' || state === 'failed' || message || providerStatus) ? (
        <div
          role="status"
          style={{
            padding: '8px 4px 2px',
            color: state === 'failed' ? '#ef4444' : 'inherit',
            fontSize: 12,
            lineHeight: 1.4,
            background: 'transparent',
          }}
        >
          {message ? <span>{message}</span> : null}
          {providerStatus ? <strong style={{ marginLeft: message ? 8 : 0 }}>Worldline: {providerStatus}</strong> : null}
        </div>
      ) : null}
    </div>
  )

  return createPortal(content, hostElement)
}
