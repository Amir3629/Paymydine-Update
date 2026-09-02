'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { WorldlineNativeCardForm } from './WorldlineNativeCardForm'
import { WorldlineNativeWalletForm } from './WorldlineNativeWalletForm'

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

type HostedAuthorizationSession = {
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

type NativeWalletSession = {
  sessionId: string
  orderId: number
  returnTo: string
  methodCode: 'apple_pay' | 'google_pay'
  paymentProductId: number
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
  walletConfiguration: {
    merchantName: string
    googleMerchantId: string | null
    gatewayMerchantId: string
    environment: 'TEST' | 'PROD'
  }
}

type NativeRedirectSession = {
  sessionId: string
  redirectUrl: string
  orderId: number
  methodCode: 'paypal' | 'wero'
}

type BridgeState = 'idle' | 'loading' | 'ready' | 'settling' | 'paid' | 'failed'

const PENDING_KEY = 'pmd-v2:pending-payment:worldline'
const CREATE_SESSION_PATTERN = /^\/api\/v1\/payments\/worldline\/runtime\/(card|apple-pay|google-pay|paypal|wero)\/create-session$/
const NATIVE_CARD_CREATE_ENDPOINT = '/api/v1/payments/worldline/native/card/create-session'
const NATIVE_WALLET_CREATE_PREFIX = '/api/v1/payments/worldline/native/wallet'
const NATIVE_REDIRECT_CREATE_PREFIX = '/api/v1/payments/worldline/native/redirect'
const PROVIDER_HOST_SUFFIX = '.worldline-solutions.com'
const INLINE_HOST_ATTRIBUTE = 'data-pmd-worldline-inline-host'
const HIDDEN_PAY_ATTRIBUTE = 'data-pmd-worldline-hidden-pay-button'

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function normalizeMethod(value: string): string {
  return String(value || 'card').trim().toLowerCase().replace(/-/g, '_')
}

function methodSlug(code: string): string {
  return normalizeMethod(code).replace(/_/g, '-')
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

function responseWithJson(response: Response, data: Record<string, unknown>): Response {
  const headers = new Headers(response.headers)
  headers.delete('content-length')
  headers.delete('content-encoding')
  headers.set('content-type', 'application/json; charset=utf-8')
  return new Response(JSON.stringify(data), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
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
  for (let attempt = 0; attempt < 50; attempt += 1) {
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

function visiblePaymentPanel(): HTMLElement | null {
  const panels = Array.from(document.querySelectorAll<HTMLElement>('[data-pmd-payment-order-id]'))
  if (!panels.length) return null
  return panels.find((panel) => panel.getClientRects().length > 0) || panels[panels.length - 1] || null
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
  const [hostedSession, setHostedSession] = useState<HostedAuthorizationSession | null>(null)
  const [nativeCard, setNativeCard] = useState<NativeCardSession | null>(null)
  const [nativeWallet, setNativeWallet] = useState<NativeWalletSession | null>(null)
  const [nativeRedirect, setNativeRedirect] = useState<NativeRedirectSession | null>(null)
  const [challengeUrl, setChallengeUrl] = useState<string | null>(null)
  const [hostElement, setHostElement] = useState<HTMLElement | null>(null)
  const [state, setState] = useState<BridgeState>('idle')
  const [message, setMessage] = useState('')
  const [providerStatus, setProviderStatus] = useState('')
  const generationRef = useRef(0)
  const settlingRef = useRef(false)
  const popupRef = useRef<Window | null>(null)

  const close = () => {
    if (state === 'settling' || state === 'paid') return
    generationRef.current += 1
    settlingRef.current = false
    try { popupRef.current?.close() } catch {}
    popupRef.current = null
    setHostedSession(null)
    setNativeCard(null)
    setNativeWallet(null)
    setNativeRedirect(null)
    setChallengeUrl(null)
    setHostElement(null)
    setState('idle')
    setMessage('')
    setProviderStatus('')
    removeInlineHost()
  }

  const activateHost = (): HTMLElement | null => {
    removeInlineHost()
    const inlineHost = ensureInlineHost()
    if (inlineHost) setHostElement(inlineHost)
    return inlineHost
  }

  useEffect(() => {
    const originalFetch = window.fetch
    let disposed = false

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

      const match = parsedUrl?.pathname.match(CREATE_SESSION_PATTERN) || null
      if (!parsedUrl || parsedUrl.origin !== window.location.origin || !match) {
        return originalFetch.call(window, input as any, init)
      }

      let nextInit = init
      let requestedMethod = normalizeMethod(match[1] || 'card')
      let returnTo = `${window.location.pathname}${window.location.search}`
      let orderId = 0
      let payload: Record<string, unknown> = {}

      if (typeof init?.body === 'string') {
        try {
          payload = JSON.parse(init.body) as Record<string, unknown>
          requestedMethod = normalizeMethod(String(payload.payment_method || requestedMethod))
          orderId = Number(payload.order_id || 0)
          try {
            const prior = new URL(String(payload.return_url || ''), window.location.origin)
            returnTo = safeReturnPath(prior.searchParams.get('return_to') || returnTo)
          } catch {}
          payload.return_url = `${window.location.origin}/payment/worldline-embedded-return?return_to=${encodeURIComponent(returnTo)}`
          payload.integration_preference = requestedMethod === 'card'
            ? 'native_client_sdk'
            : ['apple_pay', 'google_pay'].includes(requestedMethod)
              ? 'native_wallet'
              : 'native_redirect'
          nextInit = { ...init, body: JSON.stringify(payload) }
        } catch {}
      }

      const resetForNewSession = () => {
        generationRef.current += 1
        settlingRef.current = false
        try { popupRef.current?.close() } catch {}
        popupRef.current = null
        setHostedSession(null)
        setNativeCard(null)
        setNativeWallet(null)
        setNativeRedirect(null)
        setChallengeUrl(null)
        setProviderStatus('')
        setMessage('')
      }

      if (requestedMethod === 'card') {
        const response = await originalFetch.call(window, NATIVE_CARD_CREATE_ENDPOINT, nextInit)
        if (!response.ok) return response
        const data = await response.clone().json().catch(() => null)
        if (!data || String(data?.flow || '').toLowerCase() !== 'native_card') return response

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
          || !clientSession.assetUrl) {
          return response
        }

        const inlineHost = activateHost()
        if (!inlineHost) return response
        resetForNewSession()
        setHostElement(inlineHost)
        setState('ready')
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

        return responseWithJson(response, {
          ...data,
          redirect_url: null,
          redirectUrl: null,
          flow: 'native_card',
          message: String(data?.message || 'Enter your card details below.'),
        })
      }

      if (requestedMethod === 'apple_pay' || requestedMethod === 'google_pay') {
        const slug = methodSlug(requestedMethod)
        const nativeResponse = await originalFetch.call(
          window,
          `${NATIVE_WALLET_CREATE_PREFIX}/${slug}/create-session`,
          nextInit,
        )
        const nativeData = await nativeResponse.clone().json().catch(() => null)

        if (nativeResponse.ok && nativeData && String(nativeData?.flow || '').toLowerCase() === 'native_wallet') {
          const sessionId = String(nativeData?.session_id || '')
          const clientSession = nativeData?.client_session || {}
          const paymentDetails = nativeData?.payment_details || {}
          const wallet = nativeData?.wallet_configuration || {}
          const productId = Number(nativeData?.payment_product_id || 0)
          if (/^[a-f0-9]{48}$/i.test(sessionId)
            && clientSession.clientSessionId
            && clientSession.customerId
            && clientSession.clientApiUrl
            && clientSession.assetUrl
            && productId > 0) {
            const inlineHost = activateHost()
            if (!inlineHost) return nativeResponse
            resetForNewSession()
            setHostElement(inlineHost)
            setState('ready')
            setNativeWallet({
              sessionId: sessionId.toLowerCase(),
              orderId: Number(nativeData?.order_id || orderId || 0),
              returnTo,
              methodCode: requestedMethod,
              paymentProductId: productId,
              clientSession: {
                clientSessionId: String(clientSession.clientSessionId),
                customerId: String(clientSession.customerId),
                clientApiUrl: String(clientSession.clientApiUrl),
                assetUrl: String(clientSession.assetUrl),
              },
              paymentDetails: {
                totalAmount: Number(paymentDetails.totalAmount || nativeData?.amount_minor || 0),
                countryCode: String(paymentDetails.countryCode || 'DE'),
                locale: String(paymentDetails.locale || 'de_DE'),
                currency: String(paymentDetails.currency || nativeData?.currency || 'EUR'),
                isRecurring: Boolean(paymentDetails.isRecurring),
              },
              walletConfiguration: {
                merchantName: String(wallet.merchant_name || 'PayMyDine'),
                googleMerchantId: wallet.google_merchant_id ? String(wallet.google_merchant_id) : null,
                gatewayMerchantId: String(wallet.gateway_merchant_id || ''),
                environment: String(wallet.environment || 'TEST').toUpperCase() === 'PROD' ? 'PROD' : 'TEST',
              },
            })
            window.requestAnimationFrame(() => inlineHost.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))

            return responseWithJson(nativeResponse, {
              ...nativeData,
              redirect_url: null,
              redirectUrl: null,
              payment_id: null,
              provider_reference: null,
              flow: 'native_wallet',
              message: `${methodLabel(requestedMethod)} is ready inside PayMyDine.`,
            })
          }
        }
        // External wallet boarding can still be incomplete. Fail safely to the
        // existing Worldline hosted flow, but show only a PMD-owned action button.
      }

      if (requestedMethod === 'paypal' || requestedMethod === 'wero') {
        const slug = methodSlug(requestedMethod)
        const directResponse = await originalFetch.call(
          window,
          `${NATIVE_REDIRECT_CREATE_PREFIX}/${slug}/create`,
          nextInit,
        )
        const directData = await directResponse.clone().json().catch(() => null)
        const directUrl = safeHttpsUrl(directData?.redirect_url || directData?.redirectUrl)
        const directSessionId = String(directData?.session_id || '')

        if (directResponse.ok && directData && directUrl && /^[a-f0-9]{48}$/i.test(directSessionId)) {
          const inlineHost = activateHost()
          if (!inlineHost) return directResponse
          resetForNewSession()
          setHostElement(inlineHost)
          setState('ready')
          setNativeRedirect({
            sessionId: directSessionId.toLowerCase(),
            redirectUrl: directUrl,
            orderId: Number(directData?.order_id || orderId || 0),
            methodCode: requestedMethod,
          })
          window.requestAnimationFrame(() => inlineHost.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))

          return responseWithJson(directResponse, {
            ...directData,
            redirect_url: null,
            redirectUrl: null,
            payment_id: null,
            provider_reference: null,
            flow: 'native_redirect',
            message: `${methodLabel(requestedMethod)} is ready inside PayMyDine.`,
          })
        }
        // Direct redirect product setup can vary by merchant. If it is not
        // available, use the restricted hosted checkout only as the authorization target.
      }

      const hostedResponse = await originalFetch.call(window, input as any, nextInit)
      if (!hostedResponse.ok) return hostedResponse
      const hostedData = await hostedResponse.clone().json().catch(() => null)
      if (!hostedData) return hostedResponse
      const redirectUrl = safeWorldlineUrl(hostedData?.redirect_url || hostedData?.redirectUrl)
      const hostedCheckoutId = String(hostedData?.hosted_checkout_id || hostedData?.hostedCheckoutId || '')
      if (!redirectUrl || !hostedCheckoutId) return hostedResponse

      const inlineHost = activateHost()
      if (!inlineHost) return hostedResponse
      resetForNewSession()
      setHostElement(inlineHost)
      setState('ready')
      setHostedSession({
        redirectUrl,
        hostedCheckoutId,
        orderId: Number(hostedData?.order_id || orderId || 0),
        methodCode: normalizeMethod(String(hostedData?.payment_method || requestedMethod)),
      })
      window.requestAnimationFrame(() => inlineHost.scrollIntoView({ behavior: 'smooth', block: 'nearest' }))

      return responseWithJson(hostedResponse, {
        ...hostedData,
        redirect_url: null,
        redirectUrl: null,
        flow: 'pmd_authorization_button',
        message: `${methodLabel(requestedMethod)} authorization is ready inside PayMyDine.`,
      })
    }

    window.fetch = patchedFetch
    return () => {
      disposed = true
      if (window.fetch === patchedFetch) window.fetch = originalFetch
      try { popupRef.current?.close() } catch {}
      popupRef.current = null
      removeInlineHost()
    }
  }, [])

  useEffect(() => {
    if ((!hostedSession && !nativeCard && !nativeWallet && !nativeRedirect) || !hostElement) return

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
  }, [hostElement, hostedSession, nativeCard, nativeWallet, nativeRedirect, state])

  const pollKind = hostedSession
    ? 'hosted'
    : nativeCard
      ? 'native_card'
      : nativeWallet || nativeRedirect
        ? 'native_alt'
        : ''
  const pollIdentity = hostedSession?.hostedCheckoutId || nativeCard?.sessionId || nativeWallet?.sessionId || nativeRedirect?.sessionId || ''
  const pollOrderId = hostedSession?.orderId || nativeCard?.orderId || nativeWallet?.orderId || nativeRedirect?.orderId || 0

  useEffect(() => {
    if (!pollKind || !pollIdentity || !pollOrderId) return
    const generation = generationRef.current
    let cancelled = false
    let timer: number | null = null

    const schedule = (delay = 1100) => {
      if (timer !== null) window.clearTimeout(timer)
      if (!cancelled && generation === generationRef.current && !settlingRef.current) {
        timer = window.setTimeout(poll, delay)
      }
    }

    const poll = async () => {
      if (cancelled || generation !== generationRef.current || settlingRef.current) return
      try {
        const pending = await waitForPending(pollIdentity)
        if (cancelled || generation !== generationRef.current) return

        let status: any
        if (pollKind === 'hosted') {
          status = await requestJson('/api/v1/payments/worldline/runtime/status', {
            hosted_checkout_id: pollIdentity,
            order_id: Number(pending.orderId || pollOrderId || 0),
          })
        } else if (pollKind === 'native_card') {
          status = await requestJson('/api/v1/payments/worldline/native/card/status', {
            session_id: pollIdentity,
            order_id: Number(pending.orderId || pollOrderId || 0),
          })
        } else {
          status = await requestJson('/api/v1/payments/worldline/native/alternative/status', {
            session_id: pollIdentity,
            order_id: Number(pending.orderId || pollOrderId || 0),
          })
        }
        if (cancelled || generation !== generationRef.current) return

        const statusName = String(status?.payment_status || status?.status || '').toUpperCase()
        if (statusName && !['PENDING', 'CREATED'].includes(statusName)) setProviderStatus(statusName)

        if (status?.is_paid === true && status?.verification_ok === true) {
          settlingRef.current = true
          setChallengeUrl(null)
          setState('settling')
          setMessage('Payment confirmed. Finishing your order…')
          try {
            await settleVerifiedWorldlinePayment(pending, status)
            clearPending(pollIdentity)
            if (cancelled || generation !== generationRef.current) return
            try { popupRef.current?.close() } catch {}
            popupRef.current = null
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
          setChallengeUrl(null)
          setState('failed')
          setMessage(`Payment not completed (${statusName}). Choose another method or try again.`)
          return
        }

        if (state !== 'failed') setState('ready')
      } catch (error) {
        if (cancelled || generation !== generationRef.current) return
        if (error instanceof Error && /bind the Worldline/i.test(error.message)) setMessage(error.message)
      }

      schedule()
    }

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'pmd-worldline-embedded-return') return

      if (pollKind === 'native_card') {
        const returnedSessionId = String(event.data?.nativeSessionId || '').toLowerCase()
        if (returnedSessionId && returnedSessionId !== pollIdentity) return
        const returnMac = String(event.data?.returnMac || '')
        if (!returnMac) {
          setState('failed')
          setMessage('Worldline returned from 3-D Secure without the required verification token.')
          return
        }
        void waitForPending(pollIdentity).then(async (pending) => {
          await requestJson('/api/v1/payments/worldline/native/card/return', {
            session_id: pollIdentity,
            order_id: Number(pending.orderId || pollOrderId || 0),
            return_mac: returnMac,
          })
          if (cancelled || generation !== generationRef.current) return
          setChallengeUrl(null)
          setMessage('Bank verification returned. Confirming payment with Worldline…')
          schedule(50)
        }).catch((error) => {
          if (cancelled || generation !== generationRef.current) return
          setState('failed')
          setMessage(error instanceof Error ? error.message : 'Worldline 3-D Secure return could not be verified.')
        })
        return
      }

      if (pollKind === 'native_alt') {
        const returnedSessionId = String(event.data?.nativeAltSessionId || '').toLowerCase()
        if (returnedSessionId && returnedSessionId !== pollIdentity) return
        const returnMac = String(event.data?.returnMac || '')
        void waitForPending(pollIdentity).then(async (pending) => {
          if (returnMac) {
            await requestJson('/api/v1/payments/worldline/native/alternative/return', {
              session_id: pollIdentity,
              order_id: Number(pending.orderId || pollOrderId || 0),
              return_mac: returnMac,
            })
          }
          if (cancelled || generation !== generationRef.current) return
          setChallengeUrl(null)
          setMessage('Authorization returned. Confirming payment with Worldline…')
          schedule(50)
        }).catch(() => schedule(50))
        return
      }

      schedule(50)
    }

    void poll()
    window.addEventListener('message', onMessage)
    return () => {
      cancelled = true
      if (timer !== null) window.clearTimeout(timer)
      window.removeEventListener('message', onMessage)
    }
  }, [pollKind, pollIdentity, pollOrderId])

  if (!hostElement || (!hostedSession && !nativeCard && !nativeWallet && !nativeRedirect)) return null

  const challenge = challengeUrl ? (
    <div style={{ width: '100%', display: 'grid', gap: 10 }}>
      <div style={{ color: '#d4d4d8', fontSize: 12, lineHeight: 1.5 }}>
        Your bank requires secure verification. Complete it below; PayMyDine verifies the final payment server-to-server.
      </div>
      <iframe
        src={challengeUrl}
        title="Worldline secure bank verification"
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
  ) : null

  const statusBlock = (state === 'settling' || state === 'paid' || state === 'failed' || message || providerStatus) ? (
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
  ) : null

  if (nativeCard) {
    return createPortal((
      <div
        data-pmd-worldline-embedded="native-card-client-sdk-v2"
        aria-label="Secure Worldline card payment"
        style={{ width: '100%', minWidth: 0, margin: 0, padding: 0, background: 'transparent' }}
      >
        {challenge || (state === 'settling' || state === 'paid' ? null : (
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
              const nextChallenge = safeHttpsUrl(result?.redirect_url)
              if (nextChallenge) {
                setChallengeUrl(nextChallenge)
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
        ))}
        {statusBlock}
      </div>
    ), hostElement)
  }

  if (nativeWallet) {
    return createPortal((
      <div
        data-pmd-worldline-embedded={`native-wallet-${nativeWallet.methodCode}-v1`}
        aria-label={`Secure ${methodLabel(nativeWallet.methodCode)} payment`}
        style={{ width: '100%', minWidth: 0, margin: 0, padding: 0, background: 'transparent' }}
      >
        {challenge || (state === 'settling' || state === 'paid' ? null : (
          <WorldlineNativeWalletForm
            methodCode={nativeWallet.methodCode}
            sessionId={nativeWallet.sessionId}
            clientSession={nativeWallet.clientSession}
            paymentDetails={nativeWallet.paymentDetails}
            paymentProductId={nativeWallet.paymentProductId}
            walletConfiguration={nativeWallet.walletConfiguration}
            orderId={nativeWallet.orderId}
            returnTo={nativeWallet.returnTo}
            onResult={(result) => {
              const statusName = String(result?.payment_status || '').toUpperCase()
              if (statusName) setProviderStatus(statusName)
              const nextChallenge = safeHttpsUrl(result?.redirect_url)
              if (nextChallenge) {
                setChallengeUrl(nextChallenge)
                setState('loading')
                setMessage('Complete your bank verification to continue.')
              } else {
                setState('ready')
                setMessage(String(result?.message || `${methodLabel(nativeWallet.methodCode)} submitted. Confirming with Worldline…`))
              }
            }}
            onError={(value) => {
              setState('failed')
              setMessage(value)
            }}
          />
        ))}
        {statusBlock}
      </div>
    ), hostElement)
  }

  const authSession = nativeRedirect
    ? {
        redirectUrl: nativeRedirect.redirectUrl,
        methodCode: nativeRedirect.methodCode,
        mode: 'direct' as const,
      }
    : hostedSession
      ? {
          redirectUrl: hostedSession.redirectUrl,
          methodCode: hostedSession.methodCode,
          mode: 'hosted' as const,
        }
      : null

  if (!authSession) return null
  const authLabel = methodLabel(authSession.methodCode)
  const openAuthorization = () => {
    const popup = window.open(
      authSession.redirectUrl,
      'pmd-worldline-authorization',
      'popup=yes,width=520,height=760,resizable=yes,scrollbars=yes',
    )
    if (!popup) {
      setState('failed')
      setMessage(`Your browser blocked the secure ${authLabel} window. Allow pop-ups for PayMyDine and try again.`)
      return
    }
    popupRef.current = popup
    setState('ready')
    setMessage(`${authLabel} opened securely. Complete authorization in the provider window; this PayMyDine checkout stays open.`)
    try { popup.focus() } catch {}
  }

  return createPortal((
    <section
      data-pmd-worldline-embedded={`pmd-authorization-${normalizeMethod(authSession.methodCode)}-v1`}
      style={{
        width: '100%',
        minWidth: 0,
        border: '1px solid rgba(255,31,112,.55)',
        borderRadius: 16,
        background: 'rgba(12,12,18,.96)',
        padding: 16,
        display: 'grid',
        gap: 14,
        boxSizing: 'border-box',
      }}
    >
      <div>
        <strong style={{ display: 'block', color: '#fff', fontSize: 17 }}>{authLabel}</strong>
        <span style={{ color: '#a1a1aa', fontSize: 12 }}>
          {authSession.mode === 'direct'
            ? `Start ${authLabel} directly from PayMyDine through Worldline`
            : `Secure ${authLabel} authorization through Worldline`}
        </span>
      </div>
      <button
        type="button"
        onClick={openAuthorization}
        disabled={state === 'settling' || state === 'paid'}
        style={{
          width: '100%',
          height: 54,
          border: 0,
          borderRadius: 999,
          background: '#ff1f70',
          color: '#fff',
          fontSize: 17,
          fontWeight: 800,
          cursor: 'pointer',
        }}
      >
        {authLabel === 'PayPal' ? 'Pay with PayPal' : authLabel === 'Wero' ? 'Continue with Wero' : `Continue with ${authLabel}`}
      </button>
      <div style={{ color: '#8f8f9b', fontSize: 11, lineHeight: 1.5, textAlign: 'center' }}>
        The final provider/bank authorization is security-controlled by {authLabel}. PayMyDine keeps this checkout open and verifies the result server-to-server.
      </div>
      {statusBlock}
    </section>
  ), hostElement)
}
