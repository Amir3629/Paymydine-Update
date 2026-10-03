'use client'

import { useEffect, useState } from 'react'

function safeReturnPath(value: string | null): string {
  const raw = String(value || '/').trim()
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/'
  try {
    const parsed = new URL(raw, 'https://paymydine.invalid')
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return '/'
  }
}

export default function WorldlineEmbeddedReturnPage() {
  const [mode, setMode] = useState<'embedded' | 'popup' | 'top'>('embedded')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const returnTo = safeReturnPath(params.get('return_to'))
    const nativeSessionId = String(params.get('native_session_id') || '').toLowerCase()
    const nativeAltSessionId = String(params.get('native_alt_session_id') || '').toLowerCase()
    const returnMac = String(params.get('RETURNMAC') || params.get('returnmac') || '')
    const payload = {
      type: 'pmd-worldline-embedded-return',
      nativeSessionId: /^[a-f0-9]{48}$/.test(nativeSessionId) ? nativeSessionId : null,
      nativeAltSessionId: /^[a-f0-9]{48}$/.test(nativeAltSessionId) ? nativeAltSessionId : null,
      returnMac: returnMac || null,
    }

    // Provider authorization opened by PMD in a secure popup. Signal only the
    // same-origin PMD opener; provider pages never get direct PMD settlement access.
    if (window.opener && !window.opener.closed) {
      setMode('popup')
      try {
        window.opener.postMessage(payload, window.location.origin)
      } catch {}
      window.setTimeout(() => {
        try { window.close() } catch {}
      }, 350)
      return
    }

    if (window.parent !== window) {
      setMode('embedded')
      window.parent.postMessage(payload, window.location.origin)
      return
    }

    setMode('top')
    const fallback = new URL('/payment/return', window.location.origin)
    fallback.searchParams.set('payment_return_provider', 'worldline')
    fallback.searchParams.set('return_to', returnTo)
    if (/^[a-f0-9]{48}$/.test(nativeSessionId)) fallback.searchParams.set('native_session_id', nativeSessionId)
    if (/^[a-f0-9]{48}$/.test(nativeAltSessionId)) fallback.searchParams.set('native_alt_session_id', nativeAltSessionId)
    if (returnMac) fallback.searchParams.set('RETURNMAC', returnMac)
    for (const key of ['hostedCheckoutId', 'hosted_checkout_id']) {
      const value = params.get(key)
      if (value) fallback.searchParams.set(key, value)
    }
    window.location.replace(`${fallback.pathname}${fallback.search}`)
  }, [])

  const text = mode === 'popup'
    ? 'Authorization returned to PayMyDine. This secure window can close now.'
    : mode === 'top'
      ? 'Returning to PayMyDine for final verification…'
      : 'PayMyDine is verifying your Worldline payment. Keep this payment window open.'

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#fff', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ maxWidth: 440, textAlign: 'center' }}>
        <div aria-hidden="true" style={{ width: 42, height: 42, margin: '0 auto 16px', border: '4px solid #cbd5e1', borderTopColor: '#0f766e', borderRadius: '50%' }} />
        <h1 style={{ fontSize: 22, margin: 0 }}>Confirming payment</h1>
        <p style={{ color: '#64748b', lineHeight: 1.55 }}>{text}</p>
      </section>
    </main>
  )
}
