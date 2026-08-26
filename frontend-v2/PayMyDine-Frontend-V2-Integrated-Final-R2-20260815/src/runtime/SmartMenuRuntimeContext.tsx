'use client'

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { CustomerBootstrap, MenuItem, TableOrderState } from '@/src/domain/model'
import { localizeMenuItem } from '@/src/lib/i18n'
import { getGuestSessionId } from '@/src/lib/client-api'
import { fetchGuestOrdersState, prepareGuestOrder } from '@/src/lib/guest-order-flow-r60t'
import {
  MenuRuntimeProvider as BaseMenuRuntimeProvider,
  useMenuRuntime as useBaseMenuRuntime,
} from './MenuRuntimeContext'

type SmartKind = 'regular' | 'chef' | 'bestseller' | 'combos'
type SmartCategory = CustomerBootstrap['menu']['categories'][number] & { pmdKind?: SmartKind }
type SmartItem = MenuItem & {
  pmdIsCombo?: boolean
  pmdIsManualBestseller?: boolean
  pmdBestsellerOverrideMode?: 'auto' | 'force_on' | 'force_off'
}
type FlowOrder = TableOrderState & {
  orderOrigin?: 'guest_self' | 'staff_shared'
  canSplit?: boolean
  paymentRequiredBeforeKitchen?: boolean
  kitchenReleased?: boolean
}

function uniqueMenuItems(items: MenuItem[]): MenuItem[] {
  const seen = new Set<string>()

  return items.filter((item) => {
    const smart = item as SmartItem
    const key = `${smart.pmdIsCombo ? 'combo' : 'food'}:${item.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function matchesSearch(item: MenuItem, search: string): boolean {
  const needle = search.trim().toLowerCase()
  if (!needle) return true

  return [item.name, item.description, item.categoryName, item.allergens.join(' ')]
    .join(' ')
    .toLowerCase()
    .includes(needle)
}

// PMD_ORDERING_FLOW_REVOLUTION_R60T
// The base runtime still owns cart, menu, service, payment configuration and all
// existing payment callbacks. This adapter only changes ordering semantics:
// - QR self-orders are private to this guest session.
// - clicking the cart action creates a payment-held order, never a kitchen order.
// - existing payment UI settles that order; backend state releases it after paid.
// - Staff/Cashier/Waiter orders remain shared and split-capable.
export function MenuRuntimeProvider({
  bootstrap,
  children,
}: {
  bootstrap: CustomerBootstrap
  children: ReactNode
}) {
  return (
    <BaseMenuRuntimeProvider bootstrap={bootstrap}>
      {children}
    </BaseMenuRuntimeProvider>
  )
}

export function useMenuRuntime(): any {
  const base = useBaseMenuRuntime()
  const isR60tActive = !base.isPreview && Boolean(base.bootstrap.features.tableOrdering && (base.bootstrap.table.id || base.bootstrap.table.number || base.bootstrap.table.qr))
  const [flowGuestSessionId, setFlowGuestSessionId] = useState('')
  const [flowOrders, setFlowOrders] = useState<FlowOrder[]>([])
  const [flowSelectedOrderId, setFlowSelectedOrderId] = useState<number | null>(null)
  const [flowLoading, setFlowLoading] = useState(false)

  useEffect(() => {
    if (!isR60tActive) return
    try {
      setFlowGuestSessionId((current) => current || getGuestSessionId(base.bootstrap.tenant.id, base.bootstrap.table))
    } catch {}
  }, [base.bootstrap.table, base.bootstrap.tenant.id, isR60tActive])

  const refreshFlow = useCallback(async () => {
    if (!isR60tActive || !flowGuestSessionId) return
    try {
      const next = await fetchGuestOrdersState(base.bootstrap.table, flowGuestSessionId)
      const orders = next.orders as FlowOrder[]
      setFlowOrders(orders)
      setFlowSelectedOrderId((current) => {
        if (current && orders.some((order) => order.orderId === current)) return current
        const awaitingOwnPayment = orders.find((order) => order.orderOrigin === 'guest_self' && order.totals.remainingAmount > 0)
        const sharedOpen = orders.find((order) => order.orderOrigin === 'staff_shared' && order.totals.remainingAmount > 0)
        return awaitingOwnPayment?.orderId || sharedOpen?.orderId || orders[0]?.orderId || null
      })
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.debug('[PMD R60T] guest order state refresh failed', error)
    }
  }, [base.bootstrap.table, flowGuestSessionId, isR60tActive])

  useEffect(() => {
    if (!isR60tActive || !flowGuestSessionId) return
    let cancelled = false
    const run = async () => {
      if (cancelled || document.visibilityState === 'hidden') return
      await refreshFlow()
    }
    void run()
    const timer = window.setInterval(run, 3000)
    const onFocus = () => void run()
    const onVisibility = () => { if (document.visibilityState === 'visible') void run() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [flowGuestSessionId, isR60tActive, refreshFlow])

  const confirmPersonalItems = useCallback(async () => {
    if (!isR60tActive) return base.confirmPersonalItems()
    if (!base.cart.length) {
      base.notify('error', base.labels.emptyCart)
      return
    }
    if (!flowGuestSessionId) {
      base.notify('error', base.labels.scanTableQr)
      return
    }

    setFlowLoading(true)
    try {
      const fingerprint = JSON.stringify(base.cart.map((line) => ({
        key: line.key,
        quantity: line.quantity,
        subtotal: line.subtotal,
        note: line.note,
      })))
      const storageKey = `pmd-v2:r60t-confirm:${base.bootstrap.tenant.id}:${base.bootstrap.table.id || base.bootstrap.table.number || base.bootstrap.table.qr || 'table'}`
      let confirmationId = ''
      try {
        const stored = JSON.parse(window.localStorage.getItem(storageKey) || 'null') as { fingerprint?: string; id?: string } | null
        if (stored?.fingerprint === fingerprint && stored.id) confirmationId = stored.id
      } catch {}
      if (!confirmationId) {
        confirmationId = typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `r60t-${Date.now()}-${Math.random().toString(36).slice(2)}`
        try { window.localStorage.setItem(storageKey, JSON.stringify({ fingerprint, id: confirmationId })) } catch {}
      }

      const prepared = await prepareGuestOrder({
        table: base.bootstrap.table,
        guestSessionId: flowGuestSessionId,
        confirmationId,
        lines: base.cart,
      }) as FlowOrder

      setFlowOrders((current) => [prepared, ...current.filter((order) => order.orderId !== prepared.orderId)])
      setFlowSelectedOrderId(prepared.orderId)
      base.clearCart()
      try { window.localStorage.removeItem(storageKey) } catch {}
      base.openCheckout()
      base.notify('info', base.locale.toLowerCase().startsWith('de')
        ? 'Bestellung bereit. Bezahle jetzt, damit sie an die Küche gesendet wird.'
        : 'Order ready. Pay now to place it with the kitchen.')
      void refreshFlow()
    } catch (error) {
      base.notify('error', error instanceof Error ? error.message : base.labels.error)
    } finally {
      setFlowLoading(false)
    }
  }, [base, flowGuestSessionId, isR60tActive, refreshFlow])

  const selectFlowOrder = useCallback((orderId: number | null) => {
    if (!isR60tActive) return base.selectOrder(orderId)
    setFlowSelectedOrderId(orderId)
  }, [base, isR60tActive])

  const markFlowOrderPaid = useCallback((orderId: number, amount?: number) => {
    if (!isR60tActive) return base.markOrderPaid(orderId, amount)
    setFlowOrders((current) => current.map((order) => {
      if (order.orderId !== orderId) return order
      const paidAmount = Number(amount ?? order.totals.remainingAmount ?? order.totals.orderTotal ?? 0)
      const settledAmount = Math.min(order.totals.orderTotal, order.totals.settledAmount + paidAmount)
      const remainingAmount = Math.max(0, order.totals.orderTotal - settledAmount)
      return {
        ...order,
        paymentStatus: remainingAmount <= 0 ? 'paid' : 'partial',
        totals: { ...order.totals, settledAmount, remainingAmount },
      }
    }))
    window.setTimeout(() => void refreshFlow(), 250)
  }, [base, isR60tActive, refreshFlow])

  const activeCategory = useMemo(() => {
    if (base.selectedCategory === 'all') return null
    const selected = String(base.selectedCategory).trim().toLowerCase()
    return (base.categories as SmartCategory[]).find((category) =>
      String(category.id).trim().toLowerCase() === selected
      || category.name.trim().toLowerCase() === selected
    ) || null
  }, [base.categories, base.selectedCategory])

  const localizedItems = useMemo(
    () => base.bootstrap.menu.items.map((item) => localizeMenuItem(item, base.locale)),
    [base.bootstrap.menu.items, base.locale],
  )

  const visibleItems = useMemo(() => {
    if (base.selectedCategory === 'all' || !activeCategory) return uniqueMenuItems(base.visibleItems)
    const kind = activeCategory.pmdKind || 'regular'
    if (kind === 'regular') return uniqueMenuItems(base.visibleItems)
    return uniqueMenuItems(localizedItems.filter((item) => {
      if (!item.available || !matchesSearch(item, base.search)) return false
      const smart = item as SmartItem
      if (kind === 'chef') return item.isChefRecommended
      if (kind === 'bestseller') return Boolean(smart.pmdIsManualBestseller)
      if (kind === 'combos') return Boolean(smart.pmdIsCombo)
      return false
    }))
  }, [activeCategory, base.search, base.selectedCategory, base.visibleItems, localizedItems])

  const featuredItems = useMemo(() => uniqueMenuItems(base.featuredItems), [base.featuredItems])
  const bestsellerItems = useMemo(() => uniqueMenuItems(base.bestsellerItems), [base.bestsellerItems])

  const selectedFlowOrder = useMemo(
    () => flowOrders.find((order) => order.orderId === flowSelectedOrderId) || null,
    [flowOrders, flowSelectedOrderId],
  )
  const activeFlowOrder = useMemo(
    () => selectedFlowOrder || flowOrders.find((order) => order.totals.remainingAmount > 0) || flowOrders[0] || null,
    [flowOrders, selectedFlowOrder],
  )

  return useMemo(() => ({
    ...base,
    visibleItems,
    featuredItems,
    bestsellerItems,
    ...(isR60tActive ? {
      currentDraft: null,
      tableOrders: flowOrders,
      selectedOrder: selectedFlowOrder,
      selectedOrderId: flowSelectedOrderId,
      activeOrder: activeFlowOrder,
      selectOrder: selectFlowOrder,
      guestSessionId: flowGuestSessionId,
      orderLoading: flowLoading,
      refreshOrder: refreshFlow,
      confirmPersonalItems,
      // No shared-draft recovery exists in R60T. Keep the compatibility method
      // but route any unexpected call through the new private preparation action.
      submitTableOrder: confirmPersonalItems,
      markOrderPaid: markFlowOrderPaid,
    } : {}),
  }), [
    activeFlowOrder,
    base,
    bestsellerItems,
    confirmPersonalItems,
    featuredItems,
    flowGuestSessionId,
    flowLoading,
    flowOrders,
    flowSelectedOrderId,
    isR60tActive,
    markFlowOrderPaid,
    refreshFlow,
    selectFlowOrder,
    selectedFlowOrder,
    visibleItems,
  ])
}
