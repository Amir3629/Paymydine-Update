'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { WorldlineNativeCardForm } from './WorldlineNativeCardForm'

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
  sessionId?: string | null
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

type NativeCardSession = {
  sessionId: string
  orderId: number
  returnTo: string
  clientSession: {
    clientSessionId: string
    customerId: string
    clientApiUrl: string
    assetUrl: string
  }
  paymentDetails: {
    totalAmount: number
    countryCode: string
    locale: string
    currency: string
    isRecurring: boolean
  }
  allowedPaymentProductIds: number[]
}

type BridgeState = 'idle' | 'loading' | 'ready' | 'settling' | 'paid' | 'failed'

const PENDING_KEY = 'pmd-v2:pending-payment:worldline'
const CREATE_SESSION_PATTERN = /^\/api\/v1\/payments\/worldline\/runtime\/(card|apple-pay|google-pay|paypal|wero)\/create-session$/
const NATIVE_CARD_CREATE_ENDPOINT = '/api/v1/payments/worldline/native/card/create-session'
const PROVIDER_HOST_SUFFIX = '.worldline-solutions.com'
const INLINE_HOST_ATTRIBUTE = 'data-pmd-worldline-inline-host'
const HIDDEN_PAY_ATTRIBUTE = 'data-pmd-worldline-hidden-pay-button'
const AUTO_START_ATTRIBUTE = 'data-pmd-worldline-auto-start'
const RUNTIME_METHODS_ENDPOINT = '/api/v1/payments/worldline/runtime-methods'

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

function safeHttpsUrl(value: unknown): string | null {
  try {
    const parsed = new URL(String(value || ''))
    return parsed.protocol === 'https:' ? parsed.toString() : null
  } catch {
    return null
  }
}

function readPending(expectedId: string): PendingWorldlinePayment | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingWorldlinePayment
    const hosted = String(parsed.hostedCheckoutId || '')
    const native = String(parsed.sessionId || '')
    if (hosted !== expectedId && native !== expectedId) return null
    return parsed
  } catch {
    return null
  }
}

function clearPending(expectedId: string) {
  try {
    if (readPending(expectedId)) window.localStorage.removeItem(PENDING_KEY)
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

async function waitForPending(identity: string): Promise<PendingWorldlinePayment> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const pending = readPending(identity)
    if (pending) return pending
    await sleep(50)
  }
  throw new Error('PayMyDine could not bind the Worldline payment session to this order.')
}

async function settleVerifiedWorldlinePayment(pending: PendingWorldlinePayment, status: any) {
  const orderId = Number(pending.orderId || status?.order_id || 0)
  const reference = String(status?.payment_id || status?.provider_reference || pending.hostedCheckoutId || pending.sessionId || '')
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
  return '400px'
}

function visiblePaymentPanel(): HTMLElement | null {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-payment-order-id]'))
  if (!panels.length) return null
  return panels.find((panel) => panel.getClientRects().length > 0) || panels[panels.length - 1] || null
}

function methodCodeFromButton(button: HTMLButtonElement): string | null {
  const text = String(button.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ')
  if (!text) return null
  if (text.includes('apple pay')) return 'apple_pay'
  if (text.includes('google pay')) return 'google_pay'
  if (text.includes('paypal')) return 'paypal'
  if (text.includes('wero')) return 'wero'
  if (text.includes('card / wallet') || text === 'card' || text.includes('card /')) return 'card'
  return null
}

function genericPayButton(panel: HTMLElement): HTMLButtonElement | null {
  const directButtons = Array.from(panel.querySelectorAll<HTMLButtonElement>(':scope > button'))
  if (!directButtons.length) return null
  const visible = directButtons.filter((button) => button.getClientRects().length > 0 && button.style.display !== 'none')
  return visible.length ? visible[visible.length - 1] : directButtons[directButtons.length - 1] || null
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

  const payButton = genericPayButton(panel)
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
  const [nativeCard, setNativeCard] = useState<NativeCardSession | null>(null)
  const [nativeChallengeUrl, setNativeChallengeUrl] = useState<string | null>(null)
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
    setNativeCard(null)
    setNativeChallengeUrl(null)
    setHostElement(null)
    setState('idle')
    setMessage('')
    setProviderStatus('')
    removeInlineHost()
  }

  useEffect(() => {
    const originalFetch = window.fetch
    let disposed = false
    let runtimeMethodsPromise: Promise<Set<string>> | null = null

    const loadRuntimeMethods = () => {
      if (runtimeMethodsPromise) return runtimeMethodsPromise
      runtimeMethodsPromise = originalFetch.call(window, RUNTIME_METHODS_ENDPOINT, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }).then(async (response) => {
        if (!response.ok) return new Set<string>()
        const data = await response.json().catch(() => ({}))
        const rows = Array.isArray(data?.methods) ? data.methods : []
        const methods = rows
          .filter((row: any) => {
            const provider = normalizeMethod(String(row?.provider_code || row?.provider || 'worldline'))
            return provider === 'worldline' && row?.enabled !== false && Number(row?.status ?? 1) !== 0
          })
          .map((row: any) => normalizeMethod(String(row?.code || '')))
          .filter(Boolean)
        return new Set<string>(methods)
      }).catch(() => new Set<string>())
      return runtimeMethodsPromise
    }

    const triggerGenericPay = (panel: HTMLElement, attempt = 0) => {
      if (disposed) return
      const payButton = genericPayButton(panel)
      if (!payButton || payButton.disabled) {
        if (attempt < 6) window.setTimeout(() => triggerGenericPay(panel, attempt + 1), 70)
        return
      }
      if (payButton.getAttribute(AUTO_START_ATTRIBUTE) === 'true') return
      payButton.setAttribute(AUTO_START_ATTRIBUTE, 'true')
      payButton.click()
      window.setTimeout(() => payButton.removeAttribute(AUTO_START_ATTRIBUTE), 1200)
    }

    const onPaymentMethodClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const button = target?.closest<HTMLButtonElement>('button') || null
      if (!button) return
      const methodCode = methodCodeFromButton(button)
      if (!methodCode) return
      const panel = button.closest<HTMLElement>('[data-pmd-payment-order-id]')
      if (!panel) return

      void loadRuntimeMethods().then((methods) => {
        if (disposed || !methods.has(methodCode)) return
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => triggerGenericPay(panel))
        })
      })
    }

    void loadRuntimeMethods()
    document.addEventListener('click', onPaymentMethodClick, true)

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
          payload.integration_preference = requestedMethod === 'card' ? 'native_client_sdk' : 'embedded_mycheckout'
          nextInit = { ...init, body: JSON.stringify(payload) }
        } catch {}
      }

      const requestTarget = requestedMethod === 'card' ? NATIVE_CARD_CREATE_ENDPOINT : input
      const response = await originalFetch.call(window, requestTarget as any, nextInit)
      if (!response.ok) return response

      const data = await response.clone().json().catch(() => null)
      if (!data) return response

      if (requestedMethod === 'card' && String(data?.flow || '').toLowerCase() === 'native_card') {
        const sessionId = String(data?.session_id || '')
        const clientSession = data?.client_session || {}
        const paymentDetails = data?.payment_details || {}
        const allowed = Array.isArray(data?.allowed_payment_product_ids)
          ? data.allowed_payment_product_ids.map((value: unknown) => Number(value || 0)).filter((value: number) => value > 0)
          : []
        if (!/^[a-f0-9]{48}$/i.test(sessionId)
          || !clientSession.clientSessionId
          || !clientSession.customerId
          || !clientSession.clientApiUrl
          || !clientSession.assetUrl
          || !allowed.length) {
          return response
        }

        removeInlineHost()
        const inlineHost = ensureInlineHost()
        if (!inlineHost) return response

        generationRef.current += 1
        settlingRef.current = false
        setSession(null)
        setNativeChallengeUrl(null)
        setProviderStatus('')
        setMessage('')
        setState('ready')
        setHostElement(inlineHost)
        setNativeCard({
          sessionId: sessionId.toLowerCase(),
          orderId: Number(data?.order_id || orderId || 0),
          returnTo,
          clientSession: {
            clientSessionId: String(clientSession.clientSessionId),
            customerId: String(clientSession.customerId),
            clientApiUrl: String(clientSession.clientApiUrl),
            assetUrl: String(clientSession.assetUrl),
          },
          paymentDetails: {
            totalAmount: Number(paymentDetails.totalAmount || data?.amount_minor || 0),
            countryCode: String(paymentDetails.countryCode || 'DE'),
            locale: String(paymentDetails.locale || 'de_DE'),
            currency: String(paymentDetails.currency || data?.currency || 'EUR'),
            isRecurring: Boolean(paymentDetails.isRecurring),
          },
          allowedPaymentProductIds: allowed,
        })
        window.requestAnimationFrame(() => inlineHost.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))

        const sanitized = {
          ...data,
          redirect_url: null,
          redirectUrl: null,
          flow: 'native_card',
          message: String(data?.message || 'Enter your card details below.'),
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

      const redirectUrl = safeWorldlineUrl(data?.redirect_url || data?.redirectUrl)
      const hostedCheckoutId = String(data?.hosted_checkout_id || data?.hostedCheckoutId || '')
      if (!redirectUrl || !hostedCheckoutId) return response

      removeInlineHost()
      const inlineHost = ensureInlineHost()
      if (!inlineHost) return response

      generationRef.current += 1
      settlingRef.current = false
      setNativeCard(null)
      setNativeChallengeUrl(null)
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
      disposed = true
      document.removeEventListener('click', onPaymentMethodClick, true)
      if (window.fetch === patchedFetch) window.fetch = originalFetch
      removeInlineHost()
    }
  }, [])

  useEffect(() => {
    if ((!session && !nativeCard) || !hostElement) return

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
  }, [hostElement, nativeCard, session, state])

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
        if (error instanceof Error && /bind the Worldline/i.test(error.message)) setMessage(error.message)
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

  useEffect(() => {
    if (!nativeCard) return
    const generation = generationRef.current
    let cancelled = false
    let timer: number | null = null

    const poll = async () => {
      if (cancelled || generation !== generationRef.current || settlingRef.current) return
      try {
        const pending = await waitForPending(nativeCard.sessionId)
        if (cancelled || generation !== generationRef.current) return
        const status = await requestJson('/api/v1/payments/worldline/native/card/status', {
          session_id: nativeCard.sessionId,
          order_id: Number(pending.orderId || nativeCard.orderId || 0),
        })
        if (cancelled || generation !== generationRef.current) return

        const statusName = String(status?.payment_status || status?.status || '').toUpperCase()
        if (statusName && !['PENDING', 'CREATED'].includes(statusName)) setProviderStatus(statusName)

        if (status?.is_paid === true && status?.verification_ok === true) {
          settlingRef.current = true
          setNativeChallengeUrl(null)
          setState('settling')
          setMessage('Payment confirmed. Finishing your order…')
          try {
            await settleVerifiedWorldlinePayment(pending, status)
            clearPending(nativeCard.sessionId)
            if (cancelled || generation !== generationRef.current) return
            setState('paid')
            setMessage('Payment complete.')
            window.setTimeout(() => window.location.reload(), 650)
          } catch (error) {
            settlingRef.current = false
            setState('failed')
            setMessage(`Worldline confirmed the card payment, but PayMyDine could not finish settlement. Do not pay again. ${error instanceof Error ? error.message : ''}`.trim())
          }
          return
        }

        if (['CANCELLED', 'CANCELED', 'REJECTED', 'REJECTED_CAPTURE', 'FAILED', 'EXPIRED'].includes(statusName)) {
          setNativeChallengeUrl(null)
          setState('failed')
          setMessage(`Card payment not completed (${statusName}). Choose another method or try again.`)
          return
        }
      } catch (error) {
        if (cancelled || generation !== generationRef.current) return
        if (error instanceof Error && /bind the Worldline/i.test(error.message)) setMessage(error.message)
      }

      if (!cancelled && generation === generationRef.current && !settlingRef.current) {
        timer = window.setTimeout(poll, 1300)
      }
    }

    void poll()

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'pmd-worldline-embedded-return') return
      const returnedSessionId = String(event.data?.nativeSessionId || '').toLowerCase()
      if (returnedSessionId && returnedSessionId !== nativeCard.sessionId) return
      const returnMac = String(event.data?.returnMac || '')
      if (!returnMac) {
        setState('failed')
        setMessage('Worldline returned from 3-D Secure without the required verification token.')
        return
      }

      void waitForPending(nativeCard.sessionId).then(async (pending) => {
        const result = await requestJson('/api/v1/payments/worldline/native/card/return', {
          session_id: nativeCard.sessionId,
          order_id: Number(pending.orderId || nativeCard.orderId || 0),
          return_mac: returnMac,
        })
        if (cancelled || generation !== generationRef.current) return
        setNativeChallengeUrl(null)
        setProviderStatus(String(result?.payment_status || '').toUpperCase())
        setState('ready')
        setMessage('Bank verification returned. Confirming payment with Worldline…')
        if (timer !== null) window.clearTimeout(timer)
        timer = window.setTimeout(poll, 50)
      }).catch((error) => {
        if (cancelled || generation !== generationRef.current) return
        setState('failed')
        setMessage(error instanceof Error ? error.message : 'Worldline 3-D Secure return could not be verified.')
      })
    }
    window.addEventListener('message', onMessage)

    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }
  }, [nativeCard])

  if (!hostElement || (!session && !nativeCard)) return null

  if (nativeCard) {
    const content = (
      <div
        data-pmd-worldline-embedded="native-card-client-sdk-v1"
        aria-label="Secure Worldline card payment"
        style={{ width: '100%', minWidth: 0, margin: 0, padding: 0, background: 'transparent' }}
      >
        {nativeChallengeUrl ? (
          <div style={{ width: '100%', display: 'grid', gap: 10 }}>
            <div style={{ color: '#d4d4d8', fontSize: 12, lineHeight: 1.5 }}>
              Your bank requires 3-D Secure verification. Complete the verification below; PayMyDine will verify the final payment server-to-server.
            </div>
            <iframe
              src={nativeChallengeUrl}
              title="Worldline 3-D Secure verification"
              allow="payment"
              sandbox="allow-scripts allow-popups allow-same-origin allow-forms allow-modals allow-top-navigation-by-user-activation"
              referrerPolicy="strict-origin-when-cross-origin"
              style={{
                display: 'block',
                width: '100%',
                height: 420,
                minHeight: 400,
                border: '1px solid rgba(255,31,112,.45)',
                borderRadius: 14,
                background: '#fff',
              }}
            />
          </div>
        ) : state === 'settling' || state === 'paid' ? null : (
          <WorldlineNativeCardForm
            sessionId={nativeCard.sessionId}
            clientSession={nativeCard.clientSession}
            paymentDetails={nativeCard.paymentDetails}
            allowedPaymentProductIds={nativeCard.allowedPaymentProductIds}
            orderId={nativeCard.orderId}
            returnTo={nativeCard.returnTo}
            onResult={(result) => {
              const statusName = String(result?.payment_status || '').toUpperCase()
              if (statusName) setProviderStatus(statusName)
              const challenge = safeHttpsUrl(result?.redirect_url)
              if (challenge) {
                setNativeChallengeUrl(challenge)
                setState('loading')
                setMessage('Complete your bank verification to continue.')
              } else {
                setState('ready')
                setMessage(String(result?.message || 'Card details encrypted. Confirming payment with Worldline…'))
              }
            }}
            onError={(value) => {
              setState('failed')
              setMessage(value)
            }}
          />
        )}

        {(state === 'settling' || state === 'paid' || state === 'failed' || message || providerStatus) ? (
          <div
            role="status"
            style={{
              padding: '8px 4px 2px',
              color: state === 'failed' ? '#fda4af' : '#d4d4d8',
              fontSize: 12,
              lineHeight: 1.45,
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

  if (!session) return null
  const compact = isCompactWallet(session.methodCode)
  const content = (
    <div
      data-pmd-worldline-embedded="mycheckout-inline-v5-native-card"
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
          minHeight: 400,
          maxHeight: session.methodCode === 'card' ? 520 : 400,
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
            minHeight: 400,
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
