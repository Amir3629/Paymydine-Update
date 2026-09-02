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
  const [embedded, setEmbedded] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const returnTo = safeReturnPath(params.get('return_to'))
    const nativeSessionId = String(params.get('native_session_id') || '').toLowerCase()
    const returnMac = String(params.get('RETURNMAC') || params.get('returnmac') || '')

    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'pmd-worldline-embedded-return',
        nativeSessionId: /^[a-f0-9]{48}$/.test(nativeSessionId) ? nativeSessionId : null,
        returnMac: returnMac || null,
      }, window.location.origin)
      return
    }

    setEmbedded(false)
    const fallback = new URL('/payment/return', window.location.origin)
    fallback.searchParams.set('payment_return_provider', 'worldline')
    fallback.searchParams.set('return_to', returnTo)
    if (/^[a-f0-9]{48}$/.test(nativeSessionId)) fallback.searchParams.set('native_session_id', nativeSessionId)
    if (returnMac) fallback.searchParams.set('RETURNMAC', returnMac)
    for (const key of ['hostedCheckoutId', 'hosted_checkout_id']) {
      const value = params.get(key)
      if (value) fallback.searchParams.set(key, value)
    }
    window.location.replace(`${fallback.pathname}${fallback.search}`)
  }, [])

  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#fff', color: '#0f172a', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ maxWidth: 440, textAlign: 'center' }}>
        <div aria-hidden="true" style={{ width: 42, height: 42, margin: '0 auto 16px', border: '4px solid #cbd5e1', borderTopColor: '#0f766e', borderRadius: '50%' }} />
        <h1 style={{ fontSize: 22, margin: 0 }}>Confirming payment</h1>
        <p style={{ color: '#64748b', lineHeight: 1.55 }}>{embedded ? 'PayMyDine is verifying your Worldline payment. Keep this payment window open.' : 'Returning to PayMyDine for final verification…'}</p>
      </section>
    </main>
  )
}
