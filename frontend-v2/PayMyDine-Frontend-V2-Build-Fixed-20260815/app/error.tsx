'use client'

import { useEffect } from 'react'
import styles from './error.module.css'

export default function CustomerFrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[PMD Frontend V2] render error', error)
    }
  }, [error])

  return (
    <main className={styles.page}>
      <section className={styles.card} role="alert">
        <img className={styles.mark} src="/brand/pmd-mark.svg" alt="" width={56} height={56} />
        <h1>The menu is temporarily unavailable</h1>
        <p>We could not load the restaurant information safely. Please try again, or ask a member of staff for help.</p>
        <button className={styles.retry} type="button" onClick={reset}>Try again</button>
      </section>
    </main>
  )
}
