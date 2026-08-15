'use client'

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
import type { CartOptionSelection, MenuItem } from '@/src/domain/model'
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
    openCheckout,
    orderLoading,
    bootstrap,
  } = useMenuRuntime()

  return (
    <PanelShell
      title={labels.cart}
      subtitle={`${cartCount} ${labels.quantity.toLowerCase()}`}
      footer={cart.length > 0 && (
        <div className={styles.stack}>
          <div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(cartSubtotal)}</strong></div>
          {bootstrap.features.tableOrdering && bootstrap.table.valid && (bootstrap.table.id || bootstrap.table.number) ? (
            <button className={styles.primary} type="button" onClick={() => void confirmPersonalItems()} disabled={orderLoading}>
              {orderLoading ? <LoaderCircle aria-hidden="true" /> : null}{labels.confirmItems}
            </button>
          ) : (
            <div className={`${styles.statusMessage} ${styles.statusError}`}>{labels.browseOnly}</div>
          )}
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

function OrderTimeline() {
  const { activeOrder, labels } = useMenuRuntime()
  const statusText = `${activeOrder?.statusName || ''} ${activeOrder?.deliveryStatus || ''} ${activeOrder?.status || ''}`.toLowerCase()
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

function OrderDetails() {
  const { activeOrder, labels, formatCurrency, submitTableOrder, orderLoading, refreshOrder, bootstrap, locale } = useMenuRuntime()
  if (!activeOrder || activeOrder.status === 'empty') return <div className={styles.empty}>{labels.pending}</div>
  const isDraft = activeOrder.status === 'draft'
  const itemPrepMinutes = activeOrder.items.reduce((highest, line) => {
    const menuItem = bootstrap.menu.items.find((item) => item.id === line.menuId)
    return Math.max(highest, Number(menuItem?.prepTimeMinutes || 0))
  }, 0)
  const prepMinutes = activeOrder.prepTimeMinutes ?? (itemPrepMinutes > 0 ? itemPrepMinutes : null)
  const estimatedDate = (() => {
    if (activeOrder.estimatedReadyAt) {
      const parsed = new Date(activeOrder.estimatedReadyAt)
      if (!Number.isNaN(parsed.getTime())) return parsed
    }
    if (activeOrder.createdAt && prepMinutes) {
      const parsed = new Date(activeOrder.createdAt)
      if (!Number.isNaN(parsed.getTime())) return new Date(parsed.getTime() + prepMinutes * 60_000)
    }
    return null
  })()
  const etaText = estimatedDate
    ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(estimatedDate)
    : prepMinutes
      ? `~${prepMinutes} ${labels.minutes}`
      : null

  return (
    <div className={styles.stack}>
      {!isDraft && <OrderTimeline />}
      <div className={styles.orderCard}>
        <div className={styles.orderHeading}>
          <h3>{labels.tableOrder}</h3>
          <span className={styles.orderHeadingActions}>
            {etaText && <span className={styles.etaPill}><Clock />{labels.estimatedReady}: {etaText}</span>}
            <button className={styles.close} type="button" onClick={() => void refreshOrder()} aria-label="Refresh"><RefreshCw /></button>
          </span>
        </div>
        {activeOrder.items.map((item, index) => <div className={styles.orderLine} key={`${item.orderMenuId || item.menuId}-${index}`}><span>{item.quantity} × {item.name}</span><strong>{formatCurrency(item.subtotal)}</strong></div>)}
        {!activeOrder.items.length && activeOrder.groups.flatMap((group) => group.items).map((item, index) => <div className={styles.orderLine} key={`${item.menuId}-${index}`}><span>{item.quantity} × {item.name}</span><strong>{formatCurrency(item.subtotal)}</strong></div>)}
        <div className={styles.summary}>
          <div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(activeOrder.totals.orderTotal || activeOrder.totals.total)}</strong></div>
          {activeOrder.totals.settledAmount > 0 && <div className={styles.summaryRow}><span>{labels.paid}</span><span>{formatCurrency(activeOrder.totals.settledAmount)}</span></div>}
          <div className={styles.summaryRow}><span>{labels.remaining}</span><strong>{formatCurrency(activeOrder.totals.remainingAmount)}</strong></div>
        </div>
      </div>
      {isDraft && <button className={styles.primary} type="button" onClick={() => void submitTableOrder()} disabled={orderLoading}>{orderLoading ? labels.pending : labels.submitKitchen}</button>}
    </div>
  )
}

type SplitMode = 'full' | 'equal' | 'items' | 'shares'

function paymentMethodKey(method: { code: string; providerCode: string | null }): string {
  return `${method.code}:${method.providerCode || 'default'}`
}

function PaymentPanel() {
  const { bootstrap, activeOrder, labels, formatCurrency, notify, refreshOrder, isPreview, markOrderPaid } = useMenuRuntime()
  const [splitMode, setSplitMode] = useState<SplitMode>('full')
  const [people, setPeople] = useState(2)
  const [sharePercent, setSharePercent] = useState(50)
  const [selectedItems, setSelectedItems] = useState<number[]>([])
  const [methodKey, setMethodKey] = useState(bootstrap.payments[0] ? paymentMethodKey(bootstrap.payments[0]) : '')
  const [tipPercent, setTipPercent] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  const selectedItemsPayload = useMemo(() => {
    if (splitMode !== 'items') return null
    return (activeOrder?.items || [])
      .filter((item) => item.orderMenuId && item.unpaidQuantity > 0 && selectedItems.includes(item.orderMenuId))
      .map((item) => ({
        order_menu_id: item.orderMenuId!,
        quantity: item.unpaidQuantity ?? item.quantity,
      }))
  }, [activeOrder?.items, selectedItems, splitMode])

  const providerItems = useMemo(() => (activeOrder?.items || [])
    .filter((item) => (item.unpaidQuantity ?? item.quantity) > 0)
    .map((item) => ({
      id: String(item.orderMenuId || item.menuId),
      name: item.name,
      quantity: item.unpaidQuantity ?? item.quantity,
      price: item.price,
    })), [activeOrder?.items])

  if (!activeOrder?.orderId || activeOrder.status === 'draft') {
    return <div className={styles.empty}>Submit the table order before payment.</div>
  }

  const remaining = Math.max(0, activeOrder.totals.remainingAmount ?? activeOrder.totals.orderTotal)
  const itemAmount = activeOrder.items
    .filter((item) => item.orderMenuId && item.unpaidQuantity > 0 && selectedItems.includes(item.orderMenuId))
    .reduce((sum, item) => sum + item.price * item.unpaidQuantity, 0)
  const baseAmount = splitMode === 'equal'
    ? remaining / Math.max(2, people)
    : splitMode === 'shares'
      ? remaining * Math.min(100, Math.max(1, sharePercent)) / 100
      : splitMode === 'items'
        ? itemAmount
        : remaining
  const afterCoupon = Math.max(0, baseAmount - couponDiscount)
  const tipAmount = afterCoupon * Math.max(0, tipPercent) / 100
  const payable = Number((afterCoupon + tipAmount).toFixed(2))
  const selectedMethod = bootstrap.payments.find((entry) => paymentMethodKey(entry) === methodKey) || null
  const settlementMode = String(activeOrder.payment || '').toLowerCase() === 'qr_pay_later'
    ? 'pay-existing' as const
    : 'start-finalize' as const
  const selectedProvider = String(selectedMethod?.providerCode || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const isPayPalInline = Boolean(
    selectedMethod &&
    settlementMode === 'pay-existing' &&
    (selectedProvider === 'paypal' || (selectedMethod.code.toLowerCase() === 'paypal' && (!selectedProvider || selectedProvider === 'paypal')))
  )
  const canStartPayment = Boolean(
    selectedMethod &&
    payable > 0 &&
    (splitMode !== 'items' || (selectedItemsPayload && selectedItemsPayload.length > 0))
  )
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
    } finally {
      setBusy(false)
    }
  }

  const completePaymentLocally = async () => {
    markOrderPaid(payable)
    notify('success', labels.paid)
    setMessage(labels.success)
    await refreshOrder()
  }

  const pay = async () => {
    if (payable <= 0) return
    if (!selectedMethod) {
      setMessage(labels.noPaymentMethods)
      return
    }
    if (splitMode === 'items' && !selectedItemsPayload?.length) {
      setMessage(labels.selectItems)
      return
    }
    setBusy(true)
    setMessage('')
    try {
      if (isPreview) {
        await new Promise((resolve) => window.setTimeout(resolve, 280))
        markOrderPaid(payable)
        notify('success', labels.paid)
        setMessage('Preview payment completed locally. No backend request was sent.')
        return
      }

      if (selectedMethod.code === 'cash' || selectedMethod.code === 'cod') {
        await payExistingOrder({
          orderId: activeOrder.orderId!,
          table: bootstrap.table,
          method: selectedMethod.code,
          providerCode: selectedMethod.providerCode,
          amount: payable,
          tipAmount,
          couponCode: couponCode.trim() || null,
          couponDiscount,
          selectedItems: selectedItemsPayload,
          payerLabel,
        })
        await completePaymentLocally()
        return
      }

      const guestSessionId = getSafeGuestSession(bootstrap.tenant.id, bootstrap.table.id || bootstrap.table.number || 'delivery')
      const response = await startHostedProviderPayment({
        orderId: activeOrder.orderId!,
        settlementMode,
        table: bootstrap.table,
        methodCode: selectedMethod.code,
        providerCode: selectedMethod.providerCode,
        guestSessionId,
        amount: payable,
        currency: bootstrap.restaurant.currency,
        tipAmount,
        couponCode: couponCode.trim() || null,
        couponDiscount,
        selectedItems: selectedItemsPayload,
        payerLabel,
        items: providerItems,
      })

      if (response.redirectUrl) {
        window.location.assign(response.redirectUrl)
        return
      }

      if (response.immediateReference) {
        if (settlementMode === 'pay-existing') {
          await payExistingOrder({
            orderId: activeOrder.orderId!,
            table: bootstrap.table,
            method: selectedMethod.code,
            providerCode: selectedMethod.providerCode,
            paymentReference: response.immediateReference,
            amount: payable,
            tipAmount,
            couponCode: couponCode.trim() || null,
            couponDiscount,
            selectedItems: selectedItemsPayload,
            payerLabel,
          })
        } else {
          await finalizeExistingOrderPayment({
            orderId: activeOrder.orderId!,
            paymentReference: response.immediateReference,
            methodCode: selectedMethod.code,
            providerCode: selectedMethod.providerCode,
          })
        }
        clearPendingProviderPayment(response.provider)
        await completePaymentLocally()
        return
      }

      setMessage(String(response.raw?.message || labels.paymentSessionReady))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.error)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.stack}>
      {bootstrap.features.splitBill && (
        <>
          <div className={styles.segmented}>
            {(['full', 'equal', 'items', 'shares'] as SplitMode[]).map((mode) => (
              <button key={mode} type="button" className={splitMode === mode ? styles.selected : ''} onClick={() => setSplitMode(mode)}>
                {mode === 'full' ? labels.total : mode === 'equal' ? labels.equalSplit : mode === 'items' ? labels.itemSplit : labels.shareSplit}
              </button>
            ))}
          </div>
          {splitMode === 'equal' && <label className={styles.label}>{labels.people}<input className={styles.input} type="number" min={2} max={10} value={people} onChange={(event) => setPeople(Math.min(10, Math.max(2, Number(event.target.value) || 2)))} /></label>}
          {splitMode === 'shares' && <label className={styles.label}>%<input className={styles.input} type="number" min={1} max={100} value={sharePercent} onChange={(event) => setSharePercent(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} /></label>}
          {splitMode === 'items' && (
            <div className={styles.checkboxList}>
              {activeOrder.items.filter((item) => item.orderMenuId && item.unpaidQuantity > 0).map((item) => (
                <label className={styles.checkboxLine} key={item.orderMenuId!}>
                  <input type="checkbox" checked={selectedItems.includes(item.orderMenuId!)} onChange={() => setSelectedItems((current) => current.includes(item.orderMenuId!) ? current.filter((id) => id !== item.orderMenuId) : [...current, item.orderMenuId!])} />
                  <span>{item.unpaidQuantity ?? item.quantity} × {item.name}</span>
                  <strong>{formatCurrency(item.price * (item.unpaidQuantity ?? item.quantity))}</strong>
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
            return (
              <button key={key} type="button" className={`${styles.method} ${methodKey === key ? styles.methodSelected : ''}`} onClick={() => setMethodKey(key)}>
                {entry.code === 'cash' || entry.code === 'cod' ? <Receipt /> : <CreditCard />} {entry.name}
              </button>
            )
          })}
        </div>
      ) : (
        <div className={`${styles.statusMessage} ${styles.statusError}`}>{labels.noPaymentMethods}</div>
      )}

      <div className={styles.summary}>
        <div className={styles.summaryRow}><span>{labels.remaining}</span><span>{formatCurrency(remaining)}</span></div>
        <div className={styles.summaryRow}><span>{splitMode === 'full' ? labels.total : labels.splitBill}</span><span>{formatCurrency(baseAmount)}</span></div>
        {couponDiscount > 0 && <div className={styles.summaryRow}><span>{labels.coupon}</span><span>−{formatCurrency(couponDiscount)}</span></div>}
        {tipAmount > 0 && <div className={styles.summaryRow}><span>{labels.tip}</span><span>{formatCurrency(tipAmount)}</span></div>}
        <div className={styles.summaryRow}><strong>{labels.pay}</strong><strong>{formatCurrency(payable)}</strong></div>
      </div>

      {isPayPalInline && selectedMethod && canStartPayment && !isPreview ? (
        <PayPalButton
          orderId={activeOrder.orderId}
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
          {busy ? <LoaderCircle /> : <CreditCard />} {labels.pay} {formatCurrency(payable)}
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
  const { labels, activeOrder, cart, cartSubtotal, formatCurrency, confirmPersonalItems, orderLoading, bootstrap } = useMenuRuntime()
  const [tab, setTab] = useState<'order' | 'payment' | 'split'>('order')
  const hasSubmittedOrder = Boolean(activeOrder?.orderId && activeOrder.status !== 'draft')

  return (
    <PanelShell title={labels.checkout} subtitle={activeOrder?.orderNumber ? `#${activeOrder.orderNumber}` : labels.tableOrder}>
      <div className={styles.stack}>
        <div className={styles.tabs}>
          <button className={`${styles.tab} ${tab === 'order' ? styles.tabActive : ''}`} type="button" onClick={() => setTab('order')}><Utensils /> {labels.tableOrder}</button>
          <button className={`${styles.tab} ${tab === 'payment' ? styles.tabActive : ''}`} type="button" onClick={() => setTab('payment')} disabled={!hasSubmittedOrder}><CreditCard /> {labels.payment}</button>
          <button className={`${styles.tab} ${tab === 'split' ? styles.tabActive : ''}`} type="button" onClick={() => setTab('split')} disabled={!hasSubmittedOrder}><Split /> {labels.splitBill}</button>
        </div>

        {tab === 'order' && (
          <>
            {!bootstrap.table.valid && <div className={`${styles.statusMessage} ${styles.statusError}`}>{labels.browseOnly}</div>}
            {cart.length > 0 && (
              <div className={styles.orderCard}>
                <div className={styles.summaryRow}><h3>{labels.cart}</h3><strong>{formatCurrency(cartSubtotal)}</strong></div>
                <button className={styles.primary} type="button" onClick={() => void confirmPersonalItems()} disabled={orderLoading}>{labels.confirmItems}</button>
              </div>
            )}
            <OrderDetails />
          </>
        )}
        {(tab === 'payment' || tab === 'split') && <PaymentPanel />}
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
