import type { ReactNode } from 'react'
import styles from './CustomerTableFallback.module.css'

type CustomerTableFallbackProps = {
  tableLabel?: string | number | null
  title?: string
  message?: string
  tone?: 'table' | 'error'
  action?: ReactNode
}

export function CustomerTableFallback({
  tableLabel = null,
  title = 'This table is not active',
  message = 'Please ask a staff member to guide you with ordering.',
  tone = 'table',
  action = null,
}: CustomerTableFallbackProps) {
  const cleanTable = String(tableLabel ?? '').trim()

  return (
    <main className={styles.page} data-pmd-customer-fallback={tone}>
      <section className={styles.card} role={tone === 'error' ? 'alert' : 'status'}>
        <img
          className={styles.logo}
          src="/brand/paymydine-logo.svg"
          alt="PayMyDine"
          width={74}
          height={74}
        />
        <h1>{title}</h1>
        <p>{message}</p>
        {cleanTable ? <div className={styles.table}>Table {cleanTable}</div> : null}
        {action ? <div className={styles.action}>{action}</div> : null}
      </section>
    </main>
  )
}
