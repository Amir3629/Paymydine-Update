'use client'

import { Bell, Car, StickyNote, ReceiptText, ShoppingBag } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'

type ThemeBottomToolBarProps = {
  className: string
  primaryClassName?: string
}

/* PMD_UNIFIED_BOTTOM_ACTION_BAR_R17C
 * Preserve the R14 product-contract marker while using the R17C stable-slot behavior.
 * Theme modules own visual skin; shared runtime owns behavior.
 */
export function ThemeBottomToolBar({ className, primaryClassName = '' }: ThemeBottomToolBarProps) {
  const {
    bootstrap, labels, openService, openCart, openCheckout, cartCount, cartSubtotal,
    activeOrder, formatCurrency, notify,
  } = useMenuRuntime()

  const hasTable = Boolean(bootstrap.table.valid && (bootstrap.table.id || bootstrap.table.number || bootstrap.table.qr))
  const tableItems = activeOrder?.items.length || activeOrder?.groups.reduce((sum, group) => sum + group.items.length, 0) || 0
  const hasPayableOrder = Boolean(
    activeOrder?.orderId &&
    activeOrder.status !== 'draft' &&
    activeOrder.paymentStatus !== 'paid' &&
    activeOrder.totals.remainingAmount > 0
  )
  const orderLabel = hasPayableOrder ? labels.checkout : labels.tableOrder

  const requireTable = (action: () => void) => {
    if (!hasTable) {
      notify('error', labels.scanTableQr)
      return
    }
    action()
  }

  return (
    <nav
      className={className}
      data-pmd-unified-bottom-bar="r14"
      data-pmd-toolbar-revision="r17c"
      aria-label={labels.service}
    >
      {bootstrap.features.waiterCall && (
        <button type="button" aria-disabled={!hasTable} onClick={() => requireTable(() => openService('waiter'))} aria-label={labels.callWaiter}>
          <Bell aria-hidden="true" /><span>{labels.callWaiter}</span>
        </button>
      )}
      <button type="button" aria-disabled={!hasTable} onClick={() => requireTable(() => openService('note'))} aria-label={labels.note}>
        <StickyNote aria-hidden="true" /><span>{labels.note}</span>
      </button>
      {bootstrap.features.valet && (
        <button type="button" aria-disabled={!hasTable} onClick={() => requireTable(() => openService('valet'))} aria-label={labels.valet}>
          <Car aria-hidden="true" /><span>{labels.valet}</span>
        </button>
      )}
      {bootstrap.features.tableOrdering && (
        <button type="button" aria-disabled={!hasTable} onClick={() => requireTable(() => openCheckout())} aria-label={orderLabel}>
          <ReceiptText aria-hidden="true" /><span>{orderLabel}</span>
          {tableItems > 0 && <b>{tableItems}</b>}
        </button>
      )}
      <button className={primaryClassName} type="button" onClick={() => openCart()} aria-label={labels.cart}>
        <ShoppingBag aria-hidden="true" /><span>{labels.cart}</span>
        {cartCount > 0 && <b>{cartCount}</b>}
        {cartSubtotal > 0 && <small>{formatCurrency(cartSubtotal)}</small>}
      </button>
    </nav>
  )
}
