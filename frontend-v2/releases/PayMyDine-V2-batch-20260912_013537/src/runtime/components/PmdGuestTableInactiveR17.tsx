import type { CSSProperties } from 'react'

type Props = { tableLabel?: string | number | null }

export function PmdGuestTableInactiveR17({ tableLabel }: Props) {
  const table = String(tableLabel ?? '').trim()
  const page: CSSProperties = {
    minHeight: '100dvh', display: 'grid', placeItems: 'center',
    padding: '24px', background: '#f8fbf9', color: '#16312a',
    fontFamily: 'Arial, Helvetica, sans-serif',
  }
  const card: CSSProperties = {
    width: 'min(460px,100%)', padding: '32px 28px',
    border: '1px solid #d7e6df', borderRadius: 24,
    background: '#fff', boxShadow: '0 24px 64px rgba(24,57,47,.10)',
    textAlign: 'center',
  }
  return <main style={page} data-pmd-customer-fallback="table-inactive">
    <section style={card} role="status">
      <img src="/brand/paymydine-logo.svg" alt="PayMyDine" width={74} height={74}
           style={{ display: 'block', margin: '0 auto 20px', objectFit: 'contain' }} />
      <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, lineHeight: 1.25 }}>
        This table is not active
      </h1>
      <p style={{ margin: '14px auto 0', maxWidth: 320, color: '#65756f', lineHeight: 1.65 }}>
        Please ask a staff member to guide you with ordering.
      </p>
      {table ? <div style={{
        display: 'inline-flex', minHeight: 40, alignItems: 'center',
        marginTop: 20, padding: '0 16px', borderRadius: 999,
        border: '1px solid #cce3d9', color: '#075f4b',
        background: '#eff8f4', fontWeight: 800
      }}>Table {table}</div> : null}
    </section>
  </main>
}
