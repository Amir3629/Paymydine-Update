'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type {
  CartLine,
  CartOptionSelection,
  CustomerBootstrap,
  MenuItem,
  ServiceRequestStatus,
  TableOrderState,
} from '@/src/domain/model'
import { getLabels, isRtlLocale, localizeMenuCategory, localizeMenuItem, type UiLabels } from '@/src/lib/i18n'
import {
  callWaiter as callWaiterApi,
  confirmCartItems,
  fetchTableOrder,
  getGuestSessionId,
  requestValet as requestValetApi,
  sendTableNote,
  submitTableOrder as submitTableOrderApi,
} from '@/src/lib/client-api'

export type RuntimeOverlay = 'item' | 'cart' | 'service' | 'checkout' | null
export type ServiceMode = 'waiter' | 'note' | 'valet'

type ToastState = { id: number; kind: 'success' | 'error' | 'info'; message: string } | null

type MenuRuntimeValue = {
  bootstrap: CustomerBootstrap
  labels: UiLabels
  locale: string
  direction: 'ltr' | 'rtl'
  setLocale: (locale: string) => void
  search: string
  setSearch: (value: string) => void
  selectedCategory: string
  setSelectedCategory: (value: string) => void
  categories: CustomerBootstrap['menu']['categories']
  visibleItems: MenuItem[]
  featuredItems: MenuItem[]
  bestsellerItems: MenuItem[]
  selectedItem: MenuItem | null
  openItem: (item: MenuItem) => void
  quickAdd: (item: MenuItem) => void
  addConfiguredItem: (item: MenuItem, quantity: number, options: CartOptionSelection[]) => void
  cart: CartLine[]
  cartCount: number
  cartSubtotal: number
  updateCartQuantity: (key: string, quantity: number) => void
  removeCartLine: (key: string) => void
  clearCart: () => void
  overlay: RuntimeOverlay
  serviceMode: ServiceMode
  openCart: () => void
  openCheckout: () => void
  openService: (mode: ServiceMode) => void
  closeOverlay: () => void
  activeOrder: TableOrderState | null
  orderLoading: boolean
  refreshOrder: () => Promise<void>
  confirmPersonalItems: () => Promise<void>
  submitTableOrder: () => Promise<void>
  markOrderPaid: (amount?: number) => void
  callWaiter: () => Promise<void>
  sendNote: (note: string) => Promise<void>
  requestValet: (values: { name: string; licensePlate: string; carMake: string }) => Promise<void>
  requestStatus: ServiceRequestStatus
  toast: ToastState
  notify: (kind: 'success' | 'error' | 'info', message: string) => void
  formatCurrency: (amount: number) => string
  tableDisplay: string | null
  isPreview: boolean
}

const MenuRuntimeContext = createContext<MenuRuntimeValue | null>(null)

function optionKey(item: MenuItem, options: CartOptionSelection[]): string {
  const suffix = options
    .slice()
    .sort((a, b) => `${a.groupId}:${a.valueId}`.localeCompare(`${b.groupId}:${b.valueId}`))
    .map((option) => `${option.groupId}=${option.valueId}`)
    .join('&')
  return suffix ? `${item.id}?${suffix}` : item.id
}

function defaultSelections(item: MenuItem): CartOptionSelection[] {
  return item.options.flatMap((group) => {
    const value = group.values.find((entry) => entry.isDefault) || (group.required ? group.values[0] : null)
    return value
      ? [{ groupId: group.id, groupName: group.name, valueId: value.id, valueName: value.name, price: value.price }]
      : []
  })
}

function buildCartLine(item: MenuItem, quantity: number, options: CartOptionSelection[]): CartLine {
  const unitPrice = item.price + options.reduce((sum, option) => sum + option.price, 0)
  return {
    key: optionKey(item, options),
    item,
    quantity,
    selectedOptions: options,
    unitPrice,
    subtotal: unitPrice * quantity,
  }
}

function demoDraft(cart: CartLine[], guestSessionId: string, previous: TableOrderState | null): TableOrderState {
  const newItems = cart.map((line) => ({
    orderMenuId: null,
    menuId: line.item.id,
    name: line.selectedOptions.length
      ? `${line.item.name} — ${line.selectedOptions.map((option) => option.valueName).join(', ')}`
      : line.item.name,
    quantity: line.quantity,
    price: line.unitPrice,
    subtotal: line.subtotal,
    guestSessionId,
    paidQuantity: 0,
    unpaidQuantity: line.quantity,
  }))
  const previousItems = previous?.status === 'draft' ? previous.items : []
  const items = [...previousItems, ...newItems]
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0)
  return {
    success: true,
    status: 'draft',
    draftId: previous?.draftId || 7001,
    orderId: null,
    orderNumber: null,
    payment: 'qr_pay_later',
    paymentStatus: 'unpaid',
    deliveryStatus: null,
    statusName: 'Draft',
    canShowToNewDevice: true,
    hasActiveTableOrder: true,
    items,
    groups: [{ guestSessionId, items, subtotal }],
    totals: { subtotal, tax: 0, total: subtotal, orderTotal: subtotal, settledAmount: 0, remainingAmount: subtotal },
    prepTimeMinutes: null,
    estimatedReadyAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function demoSubmitted(previous: TableOrderState): TableOrderState {
  return {
    ...previous,
    status: 'submitted_unpaid',
    orderId: previous.orderId || 88001,
    orderNumber: String(previous.orderId || 88001),
    statusName: 'Received',
    paymentStatus: 'unpaid',
    hasActiveTableOrder: true,
    canShowToNewDevice: true,
    updatedAt: new Date().toISOString(),
  }
}

export function MenuRuntimeProvider({ bootstrap, children }: { bootstrap: CustomerBootstrap; children: ReactNode }) {
  const isPreview = bootstrap.tenant.id === 'preview'
  const [locale, setLocaleState] = useState(bootstrap.locales.defaultLocale)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [cart, setCart] = useState<CartLine[]>([])
  const [overlay, setOverlay] = useState<RuntimeOverlay>(null)
  const [serviceMode, setServiceMode] = useState<ServiceMode>('waiter')
  const [activeOrder, setActiveOrder] = useState<TableOrderState | null>(bootstrap.activeOrder)
  const [orderLoading, setOrderLoading] = useState(false)
  const [requestStatus, setRequestStatus] = useState<ServiceRequestStatus>({ kind: 'waiter', state: 'idle', message: '' })
  const [toast, setToast] = useState<ToastState>(null)
  const toastTimer = useRef<number | null>(null)
  const cartHydrated = useRef(false)
  const previousPaymentStatus = useRef(bootstrap.activeOrder?.paymentStatus || '')

  const labels = useMemo(() => getLabels(locale), [locale])
  const direction = isRtlLocale(locale) ? 'rtl' : 'ltr'
  const tableKey = bootstrap.table.id || bootstrap.table.number || 'browse'
  const cartStorageKey = `pmd-v2:cart:${bootstrap.tenant.id}:${tableKey}`

  const notify = useCallback((kind: 'success' | 'error' | 'info', message: string) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), kind, message })
    toastTimer.current = window.setTimeout(() => setToast(null), 3600)
  }, [])

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
  }, [])

  const localizedItems = useMemo(
    () => bootstrap.menu.items.map((item) => localizeMenuItem(item, locale)),
    [bootstrap.menu.items, locale],
  )
  const categories = useMemo(
    () => bootstrap.menu.categories.map((category) => localizeMenuCategory(category, locale)),
    [bootstrap.menu.categories, locale],
  )

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(cartStorageKey)
      const saved = raw ? JSON.parse(raw) : []
      const reconstructed = Array.isArray(saved)
        ? saved.flatMap((row: any) => {
            const item = localizedItems.find((candidate) => candidate.id === String(row?.itemId || ''))
            if (!item || !item.available) return []
            const quantity = Math.max(1, Number(row?.quantity || 1))
            const savedOptions = Array.isArray(row?.selectedOptions) ? row.selectedOptions as CartOptionSelection[] : []
            // Re-resolve option names and prices against the current menu payload so a
            // stale local cart cannot preserve an old Admin price after the menu changes.
            const options = savedOptions.flatMap((saved) => {
              const group = item.options.find((candidate) => candidate.id === saved.groupId)
              const value = group?.values.find((candidate) => candidate.id === saved.valueId)
              return group && value
                ? [{
                    groupId: group.id,
                    groupName: group.name,
                    valueId: value.id,
                    valueName: value.name,
                    price: value.price,
                  }]
                : []
            })
            return [buildCartLine(item, quantity, options)]
          })
        : []
      setCart(reconstructed)
    } catch {
      setCart([])
    } finally {
      cartHydrated.current = true
    }
  }, [cartStorageKey, localizedItems])

  useEffect(() => {
    if (!cartHydrated.current) return
    const compact = cart.map((line) => ({
      itemId: line.item.id,
      quantity: line.quantity,
      selectedOptions: line.selectedOptions,
    }))
    try {
      if (compact.length) window.localStorage.setItem(cartStorageKey, JSON.stringify(compact))
      else window.localStorage.removeItem(cartStorageKey)
    } catch {}
  }, [cart, cartStorageKey])

  const setLocale = useCallback((nextLocale: string) => {
    if (!bootstrap.locales.enabledLocales.includes(nextLocale)) return
    setLocaleState(nextLocale)
    document.documentElement.lang = nextLocale
    document.documentElement.dir = isRtlLocale(nextLocale) ? 'rtl' : 'ltr'
    document.cookie = `pmd_locale=${encodeURIComponent(nextLocale)}; path=/; max-age=31536000; samesite=lax`
    void fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: nextLocale }),
      keepalive: true,
    }).catch(() => undefined)
  }, [bootstrap.locales.enabledLocales])

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return localizedItems.filter((item) => {
      if (!item.available) return false
      const categoryMatch = selectedCategory === 'all'
        || item.categoryId === selectedCategory
        || item.categoryName.toLowerCase() === selectedCategory.toLowerCase()
      if (!categoryMatch) return false
      if (!needle) return true
      return [item.name, item.description, item.categoryName, item.allergens.join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [localizedItems, search, selectedCategory])

  const featuredItems = useMemo(
    () => localizedItems.filter((item) => item.available && item.isChefRecommended).slice(0, 6),
    [localizedItems],
  )
  const bestsellerItems = useMemo(
    () => localizedItems.filter((item) => item.available && item.isBestseller).slice(0, 6),
    [localizedItems],
  )

  const openItem = useCallback((item: MenuItem) => {
    setSelectedItem(item)
    setOverlay('item')
  }, [])

  const addConfiguredItem = useCallback((item: MenuItem, quantity: number, options: CartOptionSelection[]) => {
    const line = buildCartLine(item, Math.max(1, quantity), options)
    setCart((current) => {
      const existing = current.find((entry) => entry.key === line.key)
      if (!existing) return [...current, line]
      return current.map((entry) => entry.key === line.key
        ? buildCartLine(item, entry.quantity + line.quantity, options)
        : entry)
    })
    setSelectedItem(null)
    setOverlay(null)
    notify('success', `${item.name} — ${labels.added}`)
  }, [labels.added, notify])

  const quickAdd = useCallback((item: MenuItem) => {
    const requiresChoice = item.options.some((group) => group.required && !group.values.some((value) => value.isDefault))
    if (item.options.length && requiresChoice) {
      openItem(item)
      return
    }
    addConfiguredItem(item, 1, defaultSelections(item))
  }, [addConfiguredItem, openItem])

  const updateCartQuantity = useCallback((key: string, quantity: number) => {
    setCart((current) => current
      .map((line) => line.key === key ? buildCartLine(line.item, Math.max(0, quantity), line.selectedOptions) : line)
      .filter((line) => line.quantity > 0))
  }, [])
  const removeCartLine = useCallback((key: string) => setCart((current) => current.filter((line) => line.key !== key)), [])
  const clearCart = useCallback(() => setCart([]), [])
  const cartCount = useMemo(() => cart.reduce((sum, line) => sum + line.quantity, 0), [cart])
  const cartSubtotal = useMemo(() => cart.reduce((sum, line) => sum + line.subtotal, 0), [cart])

  const formatCurrency = useCallback((amount: number) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: bootstrap.restaurant.currency }).format(amount)
    } catch {
      return `${amount.toFixed(2)} ${bootstrap.restaurant.currency}`
    }
  }, [bootstrap.restaurant.currency, locale])

  const openCart = useCallback(() => setOverlay('cart'), [])
  const openCheckout = useCallback(() => setOverlay('checkout'), [])
  const openService = useCallback((mode: ServiceMode) => {
    setServiceMode(mode)
    setRequestStatus({ kind: mode, state: 'idle', message: '' })
    setOverlay('service')
  }, [])
  const closeOverlay = useCallback(() => {
    setOverlay(null)
    setSelectedItem(null)
  }, [])

  const refreshOrder = useCallback(async () => {
    if (isPreview) return
    if (!bootstrap.table.id && !bootstrap.table.number && !bootstrap.table.qr) return
    setOrderLoading(true)
    try {
      const next = await fetchTableOrder(bootstrap.table)
      const before = previousPaymentStatus.current
      previousPaymentStatus.current = next.paymentStatus
      setActiveOrder(next.status === 'empty' ? null : next)
      if (before && before !== 'paid' && next.paymentStatus === 'paid') {
        notify('success', labels.paid)
        setOverlay('checkout')
      }
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') console.debug('[PMD V2] Table-order refresh failed', error)
    } finally {
      setOrderLoading(false)
    }
  }, [bootstrap.table, isPreview, labels.paid, notify])

  useEffect(() => {
    if (isPreview) return
    if (!bootstrap.table.id && !bootstrap.table.number && !bootstrap.table.qr) return
    let cancelled = false
    const run = async () => {
      if (cancelled || document.visibilityState === 'hidden') return
      await refreshOrder()
    }
    void run()
    const timer = window.setInterval(run, 5000)
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
  }, [bootstrap.table.id, bootstrap.table.number, bootstrap.table.qr, isPreview, refreshOrder])

  const confirmPersonalItems = useCallback(async () => {
    if (!cart.length) {
      notify('error', labels.emptyCart)
      return
    }
    if (!bootstrap.table.id && !bootstrap.table.number) {
      notify('error', 'A valid table QR is required for table ordering.')
      return
    }
    setOrderLoading(true)
    try {
      const guestSessionId = getGuestSessionId(bootstrap.tenant.id, bootstrap.table)
      const next = isPreview
        ? demoDraft(cart, guestSessionId, activeOrder)
        : await confirmCartItems({ table: bootstrap.table, guestSessionId, lines: cart })
      setActiveOrder(next)
      clearCart()
      setOverlay('checkout')
      notify('success', labels.confirmItems)
    } catch (error) {
      notify('error', error instanceof Error ? error.message : labels.error)
    } finally {
      setOrderLoading(false)
    }
  }, [activeOrder, bootstrap.table, bootstrap.tenant.id, cart, clearCart, isPreview, labels.confirmItems, labels.emptyCart, labels.error, notify])

  const submitTableOrder = useCallback(async () => {
    if (!activeOrder || (activeOrder.status !== 'draft' && !activeOrder.draftId)) return
    setOrderLoading(true)
    try {
      const guestSessionId = getGuestSessionId(bootstrap.tenant.id, bootstrap.table)
      const next = isPreview
        ? demoSubmitted(activeOrder)
        : await submitTableOrderApi({ table: bootstrap.table, draftId: activeOrder.draftId || null, guestSessionId })
      setActiveOrder(next)
      previousPaymentStatus.current = next.paymentStatus
      setOverlay('checkout')
      notify('success', labels.submitKitchen)
    } catch (error) {
      notify('error', error instanceof Error ? error.message : labels.error)
    } finally {
      setOrderLoading(false)
    }
  }, [activeOrder, bootstrap.table, bootstrap.tenant.id, isPreview, labels.error, labels.submitKitchen, notify])

  const markOrderPaid = useCallback((amount?: number) => {
    setActiveOrder((current) => {
      if (!current) return current
      const paidAmount = Number(amount || current.totals.remainingAmount || current.totals.orderTotal || 0)
      const settledAmount = Math.min(current.totals.orderTotal, current.totals.settledAmount + paidAmount)
      const remainingAmount = Math.max(0, current.totals.orderTotal - settledAmount)
      return {
        ...current,
        status: remainingAmount <= 0 ? 'paid' : 'partially_paid',
        paymentStatus: remainingAmount <= 0 ? 'paid' : 'partial',
        totals: { ...current.totals, settledAmount, remainingAmount },
        updatedAt: new Date().toISOString(),
      }
    })
  }, [])

  const callWaiter = useCallback(async () => {
    const id = bootstrap.table.id || bootstrap.table.number
    if (!id) throw new Error('A valid table is required.')
    const cooldownKey = `pmd-v2:waiter:${bootstrap.tenant.id}:${id}`
    const last = Number(window.localStorage.getItem(cooldownKey) || 0)
    const cooldown = 3 * 60 * 1000
    if (last && Date.now() - last < cooldown) {
      const seconds = Math.ceil((cooldown - (Date.now() - last)) / 1000)
      throw new Error(`Waiter already notified. Try again in ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}.`)
    }
    setRequestStatus({ kind: 'waiter', state: 'sending', message: '' })
    try {
      if (!isPreview) await callWaiterApi(bootstrap.table)
      else await new Promise((resolve) => window.setTimeout(resolve, 180))
      window.localStorage.setItem(cooldownKey, String(Date.now()))
      setRequestStatus({ kind: 'waiter', state: 'success', message: labels.success })
      notify('success', labels.callWaiter)
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.error
      setRequestStatus({ kind: 'waiter', state: 'error', message })
      throw error
    }
  }, [bootstrap.table, bootstrap.tenant.id, isPreview, labels.callWaiter, labels.error, labels.success, notify])

  const sendNote = useCallback(async (note: string) => {
    const trimmed = note.trim()
    if (!trimmed) throw new Error('Please enter a note.')
    if (!bootstrap.table.id && !bootstrap.table.number) throw new Error('A valid table is required.')
    setRequestStatus({ kind: 'note', state: 'sending', message: '' })
    try {
      if (!isPreview) await sendTableNote(bootstrap.table, trimmed)
      else await new Promise((resolve) => window.setTimeout(resolve, 180))
      setRequestStatus({ kind: 'note', state: 'success', message: labels.success })
      notify('success', labels.leaveNote)
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.error
      setRequestStatus({ kind: 'note', state: 'error', message })
      throw error
    }
  }, [bootstrap.table, isPreview, labels.error, labels.leaveNote, labels.success, notify])

  const requestValet = useCallback(async (values: { name: string; licensePlate: string; carMake: string }) => {
    if (!values.name.trim() || !values.licensePlate.trim()) throw new Error('Name and license plate are required.')
    if (!bootstrap.table.id && !bootstrap.table.number) throw new Error('A valid table is required.')
    setRequestStatus({ kind: 'valet', state: 'sending', message: '' })
    try {
      if (!isPreview) await requestValetApi(bootstrap.table, values)
      else await new Promise((resolve) => window.setTimeout(resolve, 180))
      setRequestStatus({ kind: 'valet', state: 'success', message: labels.success })
      notify('success', labels.requestValet)
    } catch (error) {
      const message = error instanceof Error ? error.message : labels.error
      setRequestStatus({ kind: 'valet', state: 'error', message })
      throw error
    }
  }, [bootstrap.table, isPreview, labels.error, labels.requestValet, labels.success, notify])

  const tableDisplay = bootstrap.table.number || bootstrap.table.name || bootstrap.table.id

  const value = useMemo<MenuRuntimeValue>(() => ({
    bootstrap, labels, locale, direction, setLocale, search, setSearch, selectedCategory, setSelectedCategory,
    categories, visibleItems, featuredItems, bestsellerItems, selectedItem, openItem, quickAdd, addConfiguredItem,
    cart, cartCount, cartSubtotal, updateCartQuantity, removeCartLine, clearCart, overlay, serviceMode, openCart,
    openCheckout, openService, closeOverlay, activeOrder, orderLoading, refreshOrder, confirmPersonalItems,
    submitTableOrder, markOrderPaid, callWaiter, sendNote, requestValet, requestStatus, toast, notify,
    formatCurrency, tableDisplay, isPreview,
  }), [
    activeOrder, addConfiguredItem, bestsellerItems, bootstrap, callWaiter, cart, cartCount, cartSubtotal, categories,
    clearCart, closeOverlay, confirmPersonalItems, direction, featuredItems, formatCurrency, isPreview, labels, locale,
    markOrderPaid, notify, openCart, openCheckout, openItem, openService, orderLoading, overlay, quickAdd, refreshOrder,
    removeCartLine, requestStatus, requestValet, search, selectedCategory, selectedItem, sendNote, serviceMode,
    setLocale, submitTableOrder, tableDisplay, toast, updateCartQuantity, visibleItems,
  ])

  return <MenuRuntimeContext.Provider value={value}>{children}</MenuRuntimeContext.Provider>
}

export function useMenuRuntime(): MenuRuntimeValue {
  const value = useContext(MenuRuntimeContext)
  if (!value) throw new Error('useMenuRuntime must be used inside MenuRuntimeProvider.')
  return value
}
