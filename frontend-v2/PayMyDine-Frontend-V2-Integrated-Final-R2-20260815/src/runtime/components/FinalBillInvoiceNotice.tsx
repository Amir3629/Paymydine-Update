'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchCurrentBillingGroup, fetchTableOrdersState, type BillingGroupSummary } from '@/src/lib/client-api'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'

export function FinalBillInvoiceNotice() {
  const { bootstrap, guestSessionId, currentDraft, tableOrders, formatCurrency, isPreview } = useMenuRuntime()
  const [sessionKey, setSessionKey] = useState('')
  const [group, setGroup] = useState<BillingGroupSummary | null>(null)

  const orderSignal = useMemo(() => [
    currentDraft?.draftId || 0,
    currentDraft?.updatedAt || '',
    ...tableOrders.map((order) => `${order.orderId || 0}:${order.paymentStatus}:${order.updatedAt || ''}`),
  ].join('|'), [currentDraft, tableOrders])

  const refresh = useCallback(async () => {
    const canonicalTableId = bootstrap.table.id || bootstrap.table.number
    if (isPreview || !bootstrap.table.valid || !canonicalTableId) {
      setGroup(null)
      return
    }

    let visitSession = sessionKey
    if (!visitSession && (currentDraft || tableOrders.length > 0)) {
      try {
        const state = await fetchTableOrdersState(bootstrap.table, guestSessionId)
        visitSession = String(state.sessionKey || '')
        if (visitSession) setSessionKey(visitSession)
      } catch {
        return
      }
    }

    // Privacy boundary: never discover a closed invoice by table alone. This
    // browser must have observed the exact physical-visit session before Free Table.
    if (!visitSession) {
      setGroup(null)
      return
    }

    try {
      const current = await fetchCurrentBillingGroup(
        { ...bootstrap.table, id: String(canonicalTableId) },
        visitSession,
      )
      if (!current || current.sessionKey !== visitSession) {
        setGroup(null)
        return
      }
      setGroup(current)
    } catch {
      // Keep the last verified invoice notice through a transient network error.
    }
  }, [bootstrap.table, currentDraft, guestSessionId, isPreview, sessionKey, tableOrders])

  useEffect(() => {
    void refresh()
    const onFocus = () => void refresh()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refresh()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [orderSignal, refresh])

  if (!group?.invoiceAvailable || !group.invoiceDownloadUrl) return null

  const finalAmount = Math.max(0, (group.totalCents + group.tipCents - group.discountCents) / 100)

  return (
    <aside
      data-pmd-r36-final-bill-notice="1"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '18px',
        transform: 'translateX(-50%)',
        zIndex: 1200,
        width: 'min(92vw, 520px)',
        padding: '12px 14px',
        borderRadius: '14px',
        background: 'rgba(18, 22, 28, 0.94)',
        color: '#fff',
        boxShadow: '0 12px 34px rgba(0,0,0,.24)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ fontSize: '13px', opacity: 0.78 }}>Final Bill ready</div>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'space-between', marginTop: '3px' }}>
        <strong>{group.invoiceNumber || 'Final Bill'} · {formatCurrency(finalAmount)}</strong>
        <a
          href={group.invoiceDownloadUrl}
          target="_blank"
          rel="noopener"
          style={{ color: '#fff', fontWeight: 700, textDecoration: 'underline', whiteSpace: 'nowrap' }}
        >
          Download invoice
        </a>
      </div>
    </aside>
  )
}
