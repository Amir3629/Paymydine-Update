'use client'

// PMD_TABLE_ROUND_INVOICE_R27

import { useMemo, useState, type ReactNode } from 'react'
import {
  Bell,
  Car,
  Check,
  CheckCircle2,
  Clock,
  ChefHat,
  CreditCard,
  LoaderCircle,
  Minus,
  Plus,
  Receipt,
  RefreshCw,
  Send,
  Split,
  Tag,
  Trash2,
  Users,
  Utensils,
  X,
} from 'lucide-react'
import type { CartOptionSelection, MenuItem, TableOrderState } from '@/src/domain/model'
import { clearPendingProviderPayment, finalizeExistingOrderPayment, payExistingOrder, startHostedProviderPayment, validateCoupon } from '@/src/lib/client-api'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { DietaryBadges } from './SharedPieces'
import { PayPalButton } from './PayPalButton'
import styles from './RuntimeOverlays.module.css'

function PanelShell({ title, subtitle, modal = false, children, footer }: {
  title: string
  subtitle?: string
  modal?: boolean
  children: ReactNode
  footer?: ReactNode
}) {
  const { closeOverlay } = useMenuRuntime()
  return (
    <div className={styles.layer} role="presentation">
      <button type="button" className={styles.backdrop} onClick={closeOverlay} aria-label="Close" />
      <section className={modal ? styles.modal : styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <header className={styles.header}>
          <div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
          <button className={styles.close} type="button" onClick={closeOverlay} aria-label="Close"><X /></button>
        </header>
        <div className={styles.scroll}>{children}</div>
        {footer && <footer className={styles.footerActions}>{footer}</footer>}
      </section>
    </div>
  )
}

function initialSelections(item: MenuItem): Record<string, string[]> {
  return Object.fromEntries(item.options.map((group) => {
    const selected = group.values.filter((value) => value.isDefault).map((value) => value.id)
    if (!selected.length && group.required && group.values[0]) selected.push(group.values[0].id)
    return [group.id, selected]
  }))
}

function ItemDialog({ item }: { item: MenuItem }) {
  const { labels, addConfiguredItem, formatCurrency } = useMenuRuntime()
  const [quantity, setQuantity] = useState(1)
  const [selected, setSelected] = useState<Record<string, string[]>>(() => initialSelections(item))
  const [error, setError] = useState('')

  const selections = useMemo<CartOptionSelection[]>(() => item.options.flatMap((group) => {
    const ids = selected[group.id] || []
    return ids.flatMap((id) => {
      const value = group.values.find((candidate) => candidate.id === id)
      return value ? [{ groupId: group.id, groupName: group.name, valueId: value.id, valueName: value.name, price: value.price }] : []
    })
  }), [item.options, selected])

  const total = (item.price + selections.reduce((sum, option) => sum + option.price, 0)) * quantity

  const toggle = (groupId: string, valueId: string, multi: boolean) => {
    setSelected((current) => {
      const existing = current[groupId] || []
      if (!multi) return { ...current, [groupId]: [valueId] }
      return {
        ...current,
        [groupId]: existing.includes(valueId)
          ? existing.filter((id) => id !== valueId)
          : [...existing, valueId],
      }
    })
  }

  const add = () => {
    const missing = item.options.find((group) => group.required && !(selected[group.id] || []).length)
    if (missing) {
      setError(`${missing.name} is required.`)
      return
    }
    addConfiguredItem(item, quantity, selections)
  }

  return (
    <PanelShell
      title={item.name}
      subtitle={item.categoryName}
      modal
      footer={
        <div className={styles.actionRow}>
          <div className={styles.quantity} aria-label={labels.quantity}>
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))}><Minus /></button>
            <span>{quantity}</span>
            <button type="button" onClick={() => setQuantity((value) => value + 1)}><Plus /></button>
          </div>
          <button className={styles.primary} type="button" onClick={add}>{labels.add} · {formatCurrency(total)}</button>
        </div>
      }
    >
      <div className={styles.itemTop}>
        {item.imageUrl && <img className={styles.heroImage} src={item.imageUrl} alt={item.name} width={960} height={600} />}
        <div className={styles.itemTitleRow}><h3>{item.name}</h3><span className={styles.price}>{formatCurrency(item.price)}</span></div>
        <p className={styles.description}>{item.description}</p>
        <DietaryBadges item={item} />
        {(item.allergens.length > 0 || item.nutrition) && (
          <div className={styles.metaGrid}>
            {item.allergens.length > 0 && <div className={styles.metaCard}><strong>{labels.allergens}</strong><span>{item.allergens.join(', ')}</span></div>}
            {item.nutrition && <div className={styles.metaCard}><strong>{labels.nutrition}</strong><span>{item.nutrition.calories != null ? `${item.nutrition.calories} kcal` : '—'}{item.nutrition.servingSize ? ` · ${item.nutrition.servingSize}` : ''}</span></div>}
          </div>
        )}
        {item.options.map((group) => (
          <fieldset className={styles.optionGroup} key={group.id}>
            <legend>{group.name}{group.required ? ' *' : ''}</legend>
            {group.values.map((value) => {
              const multi = group.displayType === 'checkbox'
              const checked = (selected[group.id] || []).includes(value.id)
              return (
                <label className={styles.option} key={value.id}>
                  <span>
                    <input
                      type={multi ? 'checkbox' : 'radio'}
                      name={group.id}
                      checked={checked}
                      onChange={() => toggle(group.id, value.id, multi)}
                    />
                    {value.name}
                  </span>
                  {value.price > 0 && <strong>+{formatCurrency(value.price)}</strong>}
                </label>
              )
            })}
          </fieldset>
        ))}
        {error && <div className={`${styles.statusMessage} ${styles.statusError}`}>{error}</div>}
      </div>
    </PanelShell>
  )
}

function CartSheet() {
  const {
    labels,
    cart,
    cartCount,
    cartSubtotal,
    formatCurrency,
    updateCartQuantity,
    removeCartLine,
    confirmPersonalItems,
    continueOrdering,
    orderLoading,
    bootstrap,
  } = useMenuRuntime()
  const canConfirm = Boolean(bootstrap.features.tableOrdering && (bootstrap.table.id || bootstrap.table.number))

  return (
    <PanelShell
      title={labels.cart}
      subtitle={`${cartCount} ${labels.quantity.toLowerCase()}`}
      footer={cart.length > 0 && (
        <div className={styles.stack}>
          <div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(cartSubtotal)}</strong></div>
          {!canConfirm && <div className={`${styles.statusMessage} ${styles.statusError}`}>{labels.scanTableQr}</div>}
          <div className={styles.actionRow}>
            <button className={styles.secondary} type="button" onClick={continueOrdering}>{labels.continueMenu}</button>
            <button className={styles.primary} type="button" onClick={() => void confirmPersonalItems()} disabled={!canConfirm || orderLoading}>
              {orderLoading ? <LoaderCircle aria-hidden="true" /> : null}{labels.confirmItems}
            </button>
          </div>
        </div>
      )}
    >
      {!cart.length ? <div className={styles.empty}>{labels.emptyCart}</div> : (
        <div>
          {cart.map((line) => (
            <article className={styles.cartLine} key={line.key}>
              {line.item.imageUrl ? <img src={line.item.imageUrl} alt="" width={96} height={96} /> : <span />}
              <div>
                <h3>{line.item.name}</h3>
                {line.selectedOptions.length > 0 && <p>{line.selectedOptions.map((option) => option.valueName).join(', ')}</p>}
                <div className={styles.smallQty}>
                  <button type="button" onClick={() => updateCartQuantity(line.key, line.quantity - 1)}><Minus /></button>
                  <span>{line.quantity}</span>
                  <button type="button" onClick={() => updateCartQuantity(line.key, line.quantity + 1)}><Plus /></button>
                  <button type="button" onClick={() => removeCartLine(line.key)} aria-label="Remove"><Trash2 /></button>
                </div>
              </div>
              <div className={styles.lineTotal}>{formatCurrency(line.subtotal)}</div>
            </article>
          ))}
        </div>
      )}
    </PanelShell>
  )
}

function ServiceSheet() {
  const { labels, serviceMode, callWaiter, requestValet, sendTableNote, requestStatus } = useMenuRuntime()
  const [name, setName] = useState('')
  const [licensePlate, setLicensePlate] = useState('')
  const [carMake, setCarMake] = useState('')
  const [note, setNote] = useState('')
  const [localError, setLocalError] = useState('')
  const title = serviceMode === 'waiter' ? labels.callWaiter : serviceMode === 'valet' ? labels.valet : labels.note

  const status = requestStatus.kind === serviceMode ? requestStatus : null
  const run = async () => {
    setLocalError('')
    try {
      if (serviceMode === 'waiter') await callWaiter()
      if (serviceMode === 'valet') await requestValet({ name, licensePlate, carMake })
      if (serviceMode === 'note') {
        await sendTableNote(note)
        setNote('')
      }
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : labels.error)
    }
  }

  const actionLabel = serviceMode === 'waiter'
    ? labels.callWaiter
    : serviceMode === 'valet'
      ? labels.requestValet
      : labels.send

  return (
    <PanelShell
      title={title}
      subtitle={labels.service}
      modal
      footer={<button className={styles.primary} type="button" onClick={() => void run()} disabled={status?.state === 'sending'}>{status?.state === 'sending' ? labels.pending : actionLabel}</button>}
    >
      <div className={styles.stack}>
        {serviceMode === 'waiter' && <div className={styles.orderCard}><Bell /><strong>{labels.waiterConfirm}</strong></div>}
        {serviceMode === 'valet' && (
          <div className={styles.stack}>
            <label className={styles.label}>{labels.valetName}<input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} /></label>
            <label className={styles.label}>{labels.licensePlate}<input className={styles.input} value={licensePlate} onChange={(event) => setLicensePlate(event.target.value)} /></label>
            <label className={styles.label}>{labels.carMake}<input className={styles.input} value={carMake} onChange={(event) => setCarMake(event.target.value)} /></label>
          </div>
        )}
        {serviceMode === 'note' && (
          <label className={styles.label}>
            {labels.note}
            <textarea className={styles.input} value={note} rows={5} maxLength={1000} placeholder={labels.notePlaceholder} onChange={(event) => setNote(event.target.value)} />
            <small>{note.length}/1000</small>
          </label>
        )}
        {(localError || status?.state === 'error') && <div className={`${styles.statusMessage} ${styles.statusError}`}>{localError || status?.message}</div>}
        {status?.state === 'success' && <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>{status.message}</div>}
      </div>
    </PanelShell>
  )
}

type R27FlowCopy = {
  tableOrders: string
  sharedDraft: string
  submittedOrders: string
  myItems: string
  selectOrderToPay: string
  noSubmittedOrders: string
  sentToKitchen: string
  paymentOpen: string
  paymentPartial: string
  paymentComplete: string
  viewOrder: string
}

function r27FlowCopy(locale: string): R27FlowCopy {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return {
    tableOrders: 'Tischbestellungen', sharedDraft: 'Aktueller Tischentwurf', submittedOrders: 'Gesendete Bestellungen', myItems: 'Meine Artikel',
    selectOrderToPay: 'Bestellung zum Bezahlen auswählen', noSubmittedOrders: 'Noch keine Bestellung an die Küche gesendet.', sentToKitchen: 'An die Küche gesendet',
    paymentOpen: 'Zahlung offen', paymentPartial: 'Teilweise bezahlt', paymentComplete: 'Bezahlt', viewOrder: 'Bestellung ansehen',
  }
  if (lang === 'fa') return {
    tableOrders: 'سفارش‌های میز', sharedDraft: 'سبد مشترک فعلی میز', submittedOrders: 'سفارش‌های ارسال‌شده', myItems: 'آیتم‌های من',
    selectOrderToPay: 'یک سفارش را برای پرداخت انتخاب کنید', noSubmittedOrders: 'هنوز سفارشی به آشپزخانه ارسال نشده است.', sentToKitchen: 'ارسال‌شده به آشپزخانه',
    paymentOpen: 'پرداخت باز', paymentPartial: 'بخشی پرداخت شده', paymentComplete: 'پرداخت‌شده', viewOrder: 'مشاهده سفارش',
  }
  if (lang === 'tr') return {
    tableOrders: 'Masa siparişleri', sharedDraft: 'Güncel ortak masa sepeti', submittedOrders: 'Gönderilen siparişler', myItems: 'Ürünlerim',
    selectOrderToPay: 'Ödenecek siparişi seçin', noSubmittedOrders: 'Henüz mutfağa gönderilmiş sipariş yok.', sentToKitchen: 'Mutfağa gönderildi',
    paymentOpen: 'Ödeme açık', paymentPartial: 'Kısmen ödendi', paymentComplete: 'Ödendi', viewOrder: 'Siparişi görüntüle',
  }
  if (lang === 'ja') return {
    tableOrders: 'テーブル注文', sharedDraft: '現在の共有カート', submittedOrders: '送信済み注文', myItems: '自分の料理',
    selectOrderToPay: '支払う注文を選択', noSubmittedOrders: 'まだキッチンへ送信された注文はありません。', sentToKitchen: 'キッチンへ送信済み',
    paymentOpen: '未払い', paymentPartial: '一部支払い済み', paymentComplete: '支払い済み', viewOrder: '注文を見る',
  }
  return {
    tableOrders: 'Table orders', sharedDraft: 'Current table draft', submittedOrders: 'Sent orders', myItems: 'My items',
    selectOrderToPay: 'Select an order to pay', noSubmittedOrders: 'No sent orders yet.', sentToKitchen: 'Sent to kitchen',
    paymentOpen: 'Payment open', paymentPartial: 'Partially paid', paymentComplete: 'Paid', viewOrder: 'View order',
  }
}

function OrderTimeline({ order }: { order: TableOrderState }) {
  const { labels } = useMenuRuntime()
  const statusText = `${order.statusName || ''} ${order.deliveryStatus || ''} ${order.status || ''}`.toLowerCase()
  const stage = /ready|complete|on.?way|delivered/.test(statusText) ? 2 : /prepar|cook|kitchen/.test(statusText) ? 1 : 0
  const stages = [
    { label: labels.received, icon: CheckCircle2 },
    { label: labels.preparing, icon: ChefHat },
    { label: labels.ready, icon: Utensils },
  ]
  return (
    <div className={styles.timeline}>
      {stages.map((entry, index) => (
        <div className={`${styles.stage} ${index <= stage ? styles.stageActive : ''}`} key={entry.label}>
          <span className={styles.stageIcon}><entry.icon /></span>
          <span>{entry.label}</span>
        </div>
      ))}
    </div>
  )
}

function paymentBadge(order: TableOrderState, copy: R27FlowCopy): string {
  if (order.totals.remainingAmount <= 0 || order.paymentStatus === 'paid') return copy.paymentComplete
  if (order.totals.settledAmount > 0 || order.paymentStatus === 'partial') return copy.paymentPartial
  return copy.paymentOpen
}

function SubmittedOrderCard({ order, selected, onSelect, onPay }: {
  order: TableOrderState
  selected: boolean
  onSelect: () => void
  onPay: () => void
}) {
  const { labels, formatCurrency, locale } = useMenuRuntime()
  const copy = r27FlowCopy(locale)
  const canPay = order.totals.remainingAmount > 0
  return (
    <article className={`${styles.invoiceCard} ${selected ? styles.invoiceCardSelected : ''}`} data-pmd-order-id={order.orderId || ''}>
      <div className={styles.invoiceHead}>
        <div>
          <strong>#{order.orderNumber || order.orderId}</strong>
          <small>{order.statusName || copy.sentToKitchen}</small>
        </div>
        <span className={`${styles.paymentBadge} ${canPay ? '' : styles.paymentBadgePaid}`}>{paymentBadge(order, copy)}</span>
      </div>
      <div className={styles.invoiceItems}>
        {order.items.map((item, index) => (
          <div className={styles.orderLine} key={`${item.orderMenuId || item.menuId}-${index}`}>
            <span>{item.quantity} × {item.name}</span><strong>{formatCurrency(item.subtotal)}</strong>
          </div>
        ))}
      </div>
      <div className={styles.summary}>
        <div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(order.totals.orderTotal)}</strong></div>
        {order.totals.settledAmount > 0 && <div className={styles.summaryRow}><span>{labels.paid}</span><span>{formatCurrency(order.totals.settledAmount)}</span></div>}
        <div className={styles.summaryRow}><span>{labels.remaining}</span><strong>{formatCurrency(order.totals.remainingAmount)}</strong></div>
      </div>
      <div className={styles.invoiceActions}>
        <button className={styles.secondary} type="button" onClick={onSelect}>{copy.viewOrder}</button>
        {canPay && <button className={styles.primary} type="button" onClick={onPay}><CreditCard /> {labels.pay}</button>}
      </div>
    </article>
  )
}

type SplitMode = 'full' | 'mine' | 'equal' | 'items' | 'shares'

function paymentMethodKey(method: { code: string; providerCode: string | null }): string {
  return `${method.code}:${method.providerCode || 'default'}`
}

function PaymentPanel({ order, mode, guestSessionId }: { order: TableOrderState; mode: 'payment' | 'split'; guestSessionId: string }) {
  const { bootstrap, labels, formatCurrency, notify, refreshOrder, isPreview, markOrderPaid, locale } = useMenuRuntime()
  const copy = r27FlowCopy(locale)
  const mineAvailable = Boolean(guestSessionId && order.items.some((item) => item.guestSessionId === guestSessionId && item.unpaidQuantity > 0))
  const [splitMode, setSplitMode] = useState<SplitMode>(mode === 'payment' ? 'full' : (mineAvailable ? 'mine' : 'equal'))
  const [people, setPeople] = useState(2)
  const [sharePercent, setSharePercent] = useState(50)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [methodKey, setMethodKey] = useState(bootstrap.payments[0] ? paymentMethodKey(bootstrap.payments[0]) : '')
  const [tipPercent, setTipPercent] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const mineItemsPayload = useMemo(() => order.items
    .filter((item) => item.orderMenuId && item.guestSessionId === guestSessionId && item.unpaidQuantity > 0)
    .map((item) => ({ order_menu_id: item.orderMenuId!, quantity: item.unpaidQuantity ?? item.quantity })), [guestSessionId, order.items])

  const selectedItemsPayload = useMemo(() => {
    if (splitMode === 'mine') return mineItemsPayload
    if (splitMode !== 'items') return null
    return order.items
      .filter((item) => item.orderMenuId && item.unpaidQuantity > 0 && selectedItems.includes(item.orderMenuId))
      .map((item) => ({ order_menu_id: item.orderMenuId!, quantity: item.unpaidQuantity ?? item.quantity }))
  }, [mineItemsPayload, order.items, selectedItems, splitMode])

  const providerItems = useMemo(() => order.items
    .filter((item) => (item.unpaidQuantity ?? item.quantity) > 0)
    .map((item) => ({
      id: String(item.orderMenuId || item.menuId), name: item.name,
      quantity: item.unpaidQuantity ?? item.quantity, price: item.price,
    })), [order.items])

  if (!order.orderId || order.status === 'draft') return <div className={styles.empty}>{copy.selectOrderToPay}</div>

  const remaining = Math.max(0, order.totals.remainingAmount ?? order.totals.orderTotal)
  const itemAmount = order.items
    .filter((item) => item.orderMenuId && item.unpaidQuantity > 0 && selectedItems.includes(item.orderMenuId))
    .reduce((sum, item) => sum + item.price * item.unpaidQuantity, 0)
  const mineAmount = order.items
    .filter((item) => item.guestSessionId === guestSessionId && item.unpaidQuantity > 0)
    .reduce((sum, item) => sum + item.price * item.unpaidQuantity, 0)
  const rawBaseAmount = splitMode === 'equal'
    ? remaining / Math.max(2, people)
    : splitMode === 'shares'
      ? remaining * Math.min(100, Math.max(1, sharePercent)) / 100
      : splitMode === 'items'
        ? itemAmount
        : splitMode === 'mine'
          ? mineAmount
          : remaining
  const baseAmount = Math.min(remaining, Math.max(0, rawBaseAmount))
  const afterCoupon = Math.max(0, baseAmount - couponDiscount)
  const tipAmount = afterCoupon * Math.max(0, tipPercent) / 100
  const payable = Number((afterCoupon + tipAmount).toFixed(2))
  const selectedMethod = bootstrap.payments.find((entry) => paymentMethodKey(entry) === methodKey) || null
  const settlementMode = String(order.payment || '').toLowerCase() === 'qr_pay_later' ? 'pay-existing' as const : 'start-finalize' as const
  const selectedProvider = String(selectedMethod?.providerCode || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const isPayPalInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && (selectedProvider === 'paypal' || (selectedMethod.code.toLowerCase() === 'paypal' && (!selectedProvider || selectedProvider === 'paypal'))))
  const requiresSelectedItems = splitMode === 'items' || splitMode === 'mine'
  const canStartPayment = Boolean(selectedMethod && payable > 0 && (!requiresSelectedItems || (selectedItemsPayload && selectedItemsPayload.length > 0)))
  const payerLabel = splitMode === 'full' ? null : `PMD V2 ${splitMode}`

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setBusy(true)
    try {
      if (isPreview) {
        const discount = couponCode.trim().toUpperCase() === 'DEMO10' ? baseAmount * 0.1 : 0
        setCouponDiscount(discount)
        setMessage(discount > 0 ? 'Demo coupon applied.' : 'Use DEMO10 in preview mode.')
        return
      }
      const result = await validateCoupon(couponCode.trim(), baseAmount)
      setCouponDiscount(Math.min(baseAmount, Math.max(0, result.discount)))
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.error)
    } finally { setBusy(false) }
  }

  const completePaymentLocally = async () => {
    markOrderPaid(order.orderId!, payable)
    notify('success', labels.paid)
    setMessage(labels.success)
    await refreshOrder()
  }

  const pay = async () => {
    if (payable <= 0 || !order.orderId) return
    if (!selectedMethod) { setMessage(labels.noPaymentMethods); return }
    if (requiresSelectedItems && !selectedItemsPayload?.length) { setMessage(labels.selectItems); return }
    setBusy(true); setMessage('')
    try {
      if (isPreview) { markOrderPaid(order.orderId, payable); notify('success', labels.paid); setMessage(labels.success); return }
      if (selectedMethod.code === 'cash' || selectedMethod.code === 'cod') {
        await payExistingOrder({
          orderId: order.orderId, table: bootstrap.table, method: selectedMethod.code, providerCode: selectedMethod.providerCode,
          amount: payable, tipAmount, couponCode: couponCode.trim() || null, couponDiscount,
          selectedItems: selectedItemsPayload, payerLabel,
        })
        await completePaymentLocally(); return
      }
      const session = guestSessionId || getSafeGuestSession(bootstrap.tenant.id, bootstrap.table.id || bootstrap.table.number || 'delivery')
      const response = await startHostedProviderPayment({
        orderId: order.orderId, settlementMode, table: bootstrap.table, methodCode: selectedMethod.code,
        providerCode: selectedMethod.providerCode, guestSessionId: session, amount: payable,
        currency: bootstrap.restaurant.currency, tipAmount, couponCode: couponCode.trim() || null,
        couponDiscount, selectedItems: selectedItemsPayload, payerLabel, items: providerItems,
      })
      if (response.redirectUrl) { window.location.assign(response.redirectUrl); return }
      if (response.immediateReference) {
        if (settlementMode === 'pay-existing') {
          await payExistingOrder({
            orderId: order.orderId, table: bootstrap.table, method: selectedMethod.code,
            providerCode: selectedMethod.providerCode, paymentReference: response.immediateReference,
            amount: payable, tipAmount, couponCode: couponCode.trim() || null, couponDiscount,
            selectedItems: selectedItemsPayload, payerLabel,
          })
        } else {
          await finalizeExistingOrderPayment({ orderId: order.orderId, paymentReference: response.immediateReference, methodCode: selectedMethod.code, providerCode: selectedMethod.providerCode })
        }
        clearPendingProviderPayment(response.provider)
        await completePaymentLocally(); return
      }
      setMessage(String(response.raw?.message || labels.paymentSessionReady))
    } catch (error) { setMessage(error instanceof Error ? error.message : labels.error) }
    finally { setBusy(false) }
  }

  return (
    <div className={styles.stack} data-pmd-payment-order-id={order.orderId}>
      <div className={styles.summary}>
        <div className={styles.summaryRow}><span>#{order.orderNumber || order.orderId}</span><strong>{formatCurrency(order.totals.remainingAmount)}</strong></div>
      </div>
      {mode === 'split' && bootstrap.features.splitBill && (
        <>
          <div className={styles.segmented}>
            {mineAvailable && <button type="button" className={splitMode === 'mine' ? styles.selected : ''} onClick={() => setSplitMode('mine')}>{copy.myItems}</button>}
            <button type="button" className={splitMode === 'equal' ? styles.selected : ''} onClick={() => setSplitMode('equal')}>{labels.equalSplit}</button>
            <button type="button" className={splitMode === 'items' ? styles.selected : ''} onClick={() => setSplitMode('items')}>{labels.itemSplit}</button>
            <button type="button" className={splitMode === 'shares' ? styles.selected : ''} onClick={() => setSplitMode('shares')}>{labels.shareSplit}</button>
          </div>
          {splitMode === 'equal' && <label className={styles.label}>{labels.people}<input className={styles.input} type="number" min={2} max={10} value={people} onChange={(event) => setPeople(Math.min(10, Math.max(2, Number(event.target.value) || 2)))} /></label>}
          {splitMode === 'shares' && <label className={styles.label}>%<input className={styles.input} type="number" min={1} max={100} value={sharePercent} onChange={(event) => setSharePercent(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} /></label>}
          {splitMode === 'items' && (
            <div className={styles.checkboxList}>
              {order.items.filter((item) => item.orderMenuId && item.unpaidQuantity > 0).map((item) => (
                <label className={styles.checkboxLine} key={item.orderMenuId!}>
                  <input type="checkbox" checked={selectedItems.includes(item.orderMenuId!)} onChange={() => setSelectedItems((current) => current.includes(item.orderMenuId!) ? current.filter((id) => id !== item.orderMenuId) : [...current, item.orderMenuId!])} />
                  <span>{item.unpaidQuantity ?? item.quantity} × {item.name}</span><strong>{formatCurrency(item.price * (item.unpaidQuantity ?? item.quantity))}</strong>
                </label>
              ))}
            </div>
          )}
        </>
      )}
      {bootstrap.features.coupons && (
        <div className={styles.actionRow}>
          <input className={styles.input} value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder={labels.coupon} />
          <button className={styles.secondary} type="button" onClick={() => void applyCoupon()} disabled={busy}><Tag /> {labels.apply}</button>
        </div>
      )}
      {bootstrap.features.tips && (
        <div className={styles.segmented}>
          {(bootstrap.tips.presets.length ? bootstrap.tips.presets : [0, 5, 10]).slice(0, 4).map((value) => (
            <button key={value} type="button" className={tipPercent === value ? styles.selected : ''} onClick={() => setTipPercent(value)}>{value}% {labels.tip}</button>
          ))}
        </div>
      )}
      {bootstrap.payments.length > 0 ? (
        <div className={styles.methodGrid}>
          {bootstrap.payments.map((entry) => {
            const key = paymentMethodKey(entry)
            return <button key={key} type="button" className={`${styles.method} ${methodKey === key ? styles.methodSelected : ''}`} onClick={() => setMethodKey(key)}>{entry.code === 'cash' || entry.code === 'cod' ? <Receipt /> : <CreditCard />} {entry.name}</button>
          })}
        </div>
      ) : <div className={`${styles.statusMessage} ${styles.statusError}`}>{labels.noPaymentMethods}</div>}
      <div className={styles.summary}>
        <div className={styles.summaryRow}><span>{labels.remaining}</span><span>{formatCurrency(remaining)}</span></div>
        <div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(payable)}</strong></div>
      </div>
      {isPayPalInline && selectedMethod && canStartPayment ? (
        <PayPalButton
          orderId={order.orderId}
          table={bootstrap.table}
          methodCode={selectedMethod.code}
          providerCode={selectedMethod.providerCode}
          amount={payable}
          currency={bootstrap.restaurant.currency}
          tipAmount={tipAmount}
          couponCode={couponCode.trim() || null}
          couponDiscount={couponDiscount}
          selectedItems={selectedItemsPayload}
          payerLabel={payerLabel}
          items={providerItems}
          onSuccess={completePaymentLocally}
          onError={setMessage}
        />
      ) : (
        <button className={styles.primary} type="button" onClick={() => void pay()} disabled={busy || !canStartPayment}>
          {busy ? <LoaderCircle /> : <CreditCard />} {splitMode === 'items' && !selectedItemsPayload?.length ? labels.selectItems : `${labels.pay} ${formatCurrency(payable)}`}
        </button>
      )}
      {message && <div className={`${styles.statusMessage} ${message.toLowerCase().includes('error') || message.toLowerCase().includes('require') || message.toLowerCase().includes('failed') ? styles.statusError : styles.statusSuccess}`}>{message}</div>}
    </div>
  )
}

function getSafeGuestSession(tenantId: string, tableKey: string): string {
  const key = `pmd-v2:guest:${tenantId}:${tableKey}`
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `guest-${Date.now()}`
  window.localStorage.setItem(key, next)
  return next
}

function CheckoutSheet() {
  const {
    labels, currentDraft, tableOrders, selectedOrder, selectedOrderId, selectOrder, guestSessionId,
    cart, cartSubtotal, formatCurrency, confirmPersonalItems, submitTableOrder, continueOrdering,
    orderLoading, refreshOrder, bootstrap, tableDisplay, locale,
  } = useMenuRuntime()
  const copy = r27FlowCopy(locale)
  const [tab, setTab] = useState<'orders' | 'payment' | 'split'>('orders')
  const title = tab === 'orders' ? copy.tableOrders : tab === 'payment' ? labels.payment : labels.splitBill
  const canPaySelected = Boolean(selectedOrder?.orderId && selectedOrder.totals.remainingAmount > 0)

  const chooseForPayment = (order: TableOrderState, target: 'payment' | 'split' = 'payment') => {
    if (!order.orderId) return
    selectOrder(order.orderId)
    setTab(target)
  }

  return (
    <PanelShell title={title} subtitle={selectedOrder?.orderNumber ? `#${selectedOrder.orderNumber}` : (tableDisplay || labels.tableOrder)}>
      <div className={styles.stack} data-pmd-table-round-flow="r27">
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'orders' ? styles.tabActive : ''}`} type="button" onClick={() => setTab('orders')}><Utensils /> {copy.tableOrders}</button>
          <button className={`${styles.tab} ${tab === 'payment' ? styles.tabActive : ''}`} type="button" onClick={() => setTab('payment')}><CreditCard /> {labels.payment}</button>
          <button className={`${styles.tab} ${tab === 'split' ? styles.tabActive : ''}`} type="button" onClick={() => setTab('split')}><Split /> {labels.splitBill}</button>
        </div>

        {tab === 'orders' && (
          <>
            {cart.length > 0 && (
              <div className={styles.orderCard}>
                <div className={styles.summaryRow}><h3>{labels.cart}</h3><strong>{formatCurrency(cartSubtotal)}</strong></div>
                <button className={styles.primary} type="button" onClick={() => void confirmPersonalItems()} disabled={orderLoading}>{labels.confirmItems}</button>
              </div>
            )}

            {currentDraft && (
              <section className={styles.orderCard} data-pmd-shared-draft={currentDraft.draftId || ''}>
                <div className={styles.orderHeading}>
                  <div><h3>{copy.sharedDraft}</h3><small>{currentDraft.groups.length} {labels.people}</small></div>
                  <button className={styles.close} type="button" onClick={() => void refreshOrder()} aria-label="Refresh"><RefreshCw /></button>
                </div>
                {currentDraft.groups.map((group, groupIndex) => (
                  <div className={styles.guestGroup} key={group.guestSessionId || `group-${groupIndex}`}>
                    <strong>{group.guestSessionId && group.guestSessionId === guestSessionId ? copy.myItems : `${labels.tableOrder} ${groupIndex + 1}`}</strong>
                    {group.items.map((item, index) => <div className={styles.orderLine} key={`${item.menuId}-${index}`}><span>{item.quantity} × {item.name}</span><strong>{formatCurrency(item.subtotal)}</strong></div>)}
                  </div>
                ))}
                <div className={styles.summary}><div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(currentDraft.totals.orderTotal)}</strong></div></div>
                <div className={styles.invoiceActions}>
                  <button className={styles.secondary} type="button" onClick={continueOrdering}>{labels.continueMenu}</button>
                  <button className={styles.primary} type="button" onClick={() => void submitTableOrder()} disabled={orderLoading || !currentDraft.items.length}>
                    {orderLoading ? <LoaderCircle /> : <Send />} {labels.submitKitchen}
                  </button>
                </div>
              </section>
            )}

            {!currentDraft && <button className={styles.secondary} type="button" onClick={continueOrdering}>{labels.continueMenu}</button>}

            <div className={styles.sectionHead}>
              <strong>{copy.submittedOrders}</strong>
              <button className={styles.close} type="button" onClick={() => void refreshOrder()} aria-label="Refresh"><RefreshCw /></button>
            </div>
            {!tableOrders.length ? <div className={styles.emptyCompact}>{copy.noSubmittedOrders}</div> : (
              <div className={styles.invoiceList}>
                {tableOrders.map((order) => (
                  <SubmittedOrderCard
                    key={order.orderId || order.orderNumber || order.updatedAt || 'order'}
                    order={order}
                    selected={selectedOrderId === order.orderId}
                    onSelect={() => { selectOrder(order.orderId); }}
                    onPay={() => chooseForPayment(order, 'payment')}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {(tab === 'payment' || tab === 'split') && (
          <>
            {tableOrders.length > 1 && (
              <div className={styles.invoicePicker}>
                {tableOrders.map((order) => (
                  <button key={order.orderId || order.orderNumber || 'order'} type="button" className={selectedOrderId === order.orderId ? styles.selected : ''} onClick={() => selectOrder(order.orderId)}>
                    #{order.orderNumber || order.orderId} · {formatCurrency(order.totals.remainingAmount)}
                  </button>
                ))}
              </div>
            )}
            {!selectedOrder ? (
              <div className={styles.empty}>{copy.selectOrderToPay}</div>
            ) : !canPaySelected ? (
              <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>#{selectedOrder.orderNumber || selectedOrder.orderId} · {copy.paymentComplete}</div>
            ) : (
              <>
                <OrderTimeline order={selectedOrder} />
                <PaymentPanel key={`${selectedOrder.orderId}-${tab}`} order={selectedOrder} mode={tab} guestSessionId={guestSessionId} />
              </>
            )}
          </>
        )}
      </div>
    </PanelShell>
  )
}

function Toast() {
  const { toast } = useMenuRuntime()
  if (!toast) return null
  return <div className={`${styles.toast} ${toast.kind === 'success' ? styles.toastSuccess : toast.kind === 'error' ? styles.toastError : ''}`} role="status">{toast.message}</div>
}

export function RuntimeOverlays() {
  const { overlay, selectedItem } = useMenuRuntime()
  return (
    <>
      {overlay === 'item' && selectedItem && <ItemDialog key={selectedItem.id} item={selectedItem} />}
      {overlay === 'cart' && <CartSheet />}
      {overlay === 'service' && <ServiceSheet />}
      {overlay === 'checkout' && <CheckoutSheet />}
      <Toast />
    </>
  )
}
