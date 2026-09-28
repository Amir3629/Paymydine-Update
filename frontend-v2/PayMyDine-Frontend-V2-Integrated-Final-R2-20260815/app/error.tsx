'use client'

import { useEffect } from 'react'
import { CustomerTableFallback } from '@/src/runtime/components/CustomerTableFallback'

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
    <CustomerTableFallback
      tone="error"
      title="We could not open this menu"
      message="Please try again, or ask a staff member to guide you with ordering."
      action={<button type="button" onClick={reset}>Try again</button>}
    />
  )
}
