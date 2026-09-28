'use client'

import { useEffect } from 'react'

export default function GlobalCustomerFrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PMD Frontend V2] global render error', error)
    }
  }, [error])

  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <main
          style={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            padding: 24,
            boxSizing: 'border-box',
            background: '#f8fbf9',
            color: '#16312a',
            fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            textAlign: 'center',
          }}
        >
          <section
            role="alert"
            style={{
              width: 'min(100%, 460px)',
              boxSizing: 'border-box',
              padding: '34px 30px 30px',
              border: '1px solid #d7e6df',
              borderRadius: 28,
              background: 'rgba(255,255,255,.96)',
              boxShadow: '0 24px 64px rgba(24,57,47,.10)',
            }}
          >
            <img
              src="/brand/paymydine-logo.svg"
              alt="PayMyDine"
              width={74}
              height={74}
              style={{
                display: 'block',
                width: 74,
                height: 74,
                objectFit: 'contain',
                margin: '0 auto 20px',
              }}
            />
            <h1
              style={{
                margin: 0,
                color: '#143c31',
                fontSize: 28,
                lineHeight: 1.15,
                fontWeight: 850,
                letterSpacing: '-.025em',
              }}
            >
              We could not open this menu
            </h1>
            <p
              style={{
                margin: '14px auto 0',
                maxWidth: '34ch',
                color: '#65756f',
                fontSize: 15,
                lineHeight: 1.65,
              }}
            >
              Please try again, or ask a staff member to guide you with ordering.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: 44,
                marginTop: 20,
                padding: '0 18px',
                border: '1px solid #0a7059',
                borderRadius: 14,
                background: '#08705b',
                color: '#fff',
                font: 'inherit',
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  )
}
