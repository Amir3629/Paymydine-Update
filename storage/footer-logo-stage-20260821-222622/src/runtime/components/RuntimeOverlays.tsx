'use client'

// PMD_TABLE_ROUND_INVOICE_R27

import { useMemo, useState, type ReactNode, useEffect } from 'react'
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
import type { CartOptionSelection, MenuItem, PaymentMethod, TableOrderState } from '@/src/domain/model'
import type { ExistingOrderPaymentAllocation } from '@/src/lib/client-api'
import { callWaiter, clearPendingProviderPayment, finalizeExistingOrderPayment, payExistingOrder, prepareSplitPaymentIntent, startHostedProviderPayment, validateCoupon, downloadPaidInvoice,
  submitReview,
  settleExistingOrderGroup,
  type SplitPaymentIntent,
} from '@/src/lib/client-api'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import { DietaryBadges } from './SharedPieces'
import { PayPalButton } from './PayPalButton'
import { StripeInlinePayment } from './StripeInlinePayment'
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


// PMD_ITEM_NOTE_UI_R29
function itemNoteCopy(locale: string) {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return { add: 'Notiz hinzufügen', edit: 'Notiz bearbeiten', title: 'Notiz für dieses Gericht', placeholder: 'z. B. ohne Zwiebeln, Sauce separat …', save: 'Speichern', cancel: 'Abbrechen' }
  if (lang === 'fa') return { add: 'افزودن یادداشت', edit: 'ویرایش یادداشت', title: 'یادداشت برای این غذا', placeholder: 'مثلاً بدون پیاز، سس جدا …', save: 'ذخیره', cancel: 'لغو' }
  if (lang === 'tr') return { add: 'Not ekle', edit: 'Notu düzenle', title: 'Bu ürün için not', placeholder: 'örn. soğansız, sos ayrı …', save: 'Kaydet', cancel: 'İptal' }
  if (lang === 'ja') return { add: 'メモを追加', edit: 'メモを編集', title: 'この料理へのメモ', placeholder: '例：玉ねぎ抜き、ソース別添え …', save: '保存', cancel: 'キャンセル' }
  return { add: 'Add note', edit: 'Edit note', title: 'Note for this item', placeholder: 'e.g. no onions, sauce on the side …', save: 'Save', cancel: 'Cancel' }
}

// PMD_DIRECT_KITCHEN_SEND_R33B
// One visible ordering action across all ten themes. We deliberately count guests
// from actual submitted item ownership, not from passive QR scans.
type R33DirectOrderCopy = {
  sendOrder: string
  sending: string
  pendingTitle: string
  pendingHint: string
  finishSend: string
  multiGuestTitle: string
  multiGuestHint: string
  payMine: string
  payTable: string
}

function r33DirectOrderCopy(locale: string): R33DirectOrderCopy {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return {
    sendOrder: 'Bestellung senden', sending: 'Wird gesendet …',
    pendingTitle: 'Ausstehende Bestellung', pendingHint: 'Der Versand wurde unterbrochen. Sende diese Bestellung jetzt an die Küche.', finishSend: 'Versand abschließen',
    multiGuestTitle: 'Gemeinsamer Tisch', multiGuestHint: 'Mehrere Gäste haben an diesem Tisch bestellt. Du kannst deine Artikel jetzt bezahlen oder warten, damit eine Person mehrere Tischbestellungen zusammen bezahlt.',
    payMine: 'Meine Artikel bezahlen', payTable: 'Tischbestellungen bezahlen',
  }
  if (lang === 'fa') return {
    sendOrder: 'ارسال سفارش', sending: 'در حال ارسال …',
    pendingTitle: 'سفارش در انتظار ارسال', pendingHint: 'ارسال این سفارش کامل نشده است. آن را به آشپزخانه ارسال کنید.', finishSend: 'تکمیل ارسال',
    multiGuestTitle: 'میز مشترک', multiGuestHint: 'بیش از یک مهمان در این میز سفارش داده است. می‌توانید آیتم‌های خودتان را الآن پرداخت کنید یا صبر کنید تا یک نفر چند سفارش میز را با هم پرداخت کند.',
    payMine: 'پرداخت آیتم‌های من', payTable: 'پرداخت سفارش‌های میز',
  }
  if (lang === 'tr') return {
    sendOrder: 'Siparişi gönder', sending: 'Gönderiliyor …',
    pendingTitle: 'Bekleyen sipariş', pendingHint: 'Gönderim tamamlanmadı. Bu siparişi şimdi mutfağa gönderin.', finishSend: 'Gönderimi tamamla',
    multiGuestTitle: 'Ortak masa', multiGuestHint: 'Bu masada birden fazla misafir sipariş verdi. Kendi ürünlerinizi şimdi ödeyebilir veya bir kişinin birden fazla masa siparişini birlikte ödemesini bekleyebilirsiniz.',
    payMine: 'Ürünlerimi öde', payTable: 'Masa siparişlerini öde',
  }
  if (lang === 'ja') return {
    sendOrder: '注文を送信', sending: '送信中 …',
    pendingTitle: '送信待ちの注文', pendingHint: '送信が完了していません。この注文をキッチンへ送信してください。', finishSend: '送信を完了',
    multiGuestTitle: '共有テーブル', multiGuestHint: 'このテーブルでは複数のゲストが注文しています。自分の料理を今支払うか、1人が複数のテーブル注文をまとめて支払うまで待つことができます。',
    payMine: '自分の料理を支払う', payTable: 'テーブル注文を支払う',
  }
  return {
    sendOrder: 'Send order', sending: 'Sending …',
    pendingTitle: 'Pending order', pendingHint: 'Sending was interrupted. Finish sending this order to the kitchen.', finishSend: 'Finish sending',
    multiGuestTitle: 'Shared table', multiGuestHint: 'More than one guest has ordered at this table. You can pay your own items now, or wait and let one person pay selected table orders together.',
    payMine: 'Pay my items', payTable: 'Pay table orders',
  }
}

function CartSheet() {
  const {
    labels,
    cart,
    cartCount,
    cartSubtotal,
    formatCurrency,
    updateCartQuantity,
    updateCartNote,
    removeCartLine,
    confirmPersonalItems,
    continueOrdering,
    orderLoading,
    bootstrap,
    locale,
  } = useMenuRuntime()
  const [noteLineKey, setNoteLineKey] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const noteCopy = itemNoteCopy(locale)
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
            <button className={styles.primary} type="button" onClick={() => void confirmPersonalItems()} disabled={!canConfirm || orderLoading} data-pmd-direct-kitchen-send="r33b">
              {orderLoading ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}{orderLoading ? r33DirectOrderCopy(locale).sending : r33DirectOrderCopy(locale).sendOrder}
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
                {line.note && <p className={styles.itemNotePreview}><Receipt aria-hidden="true" />{line.note}</p>}
                <div className={styles.smallQty}>
                  <button type="button" onClick={() => updateCartQuantity(line.key, line.quantity - 1)}><Minus /></button>
                  <span>{line.quantity}</span>
                  <button type="button" onClick={() => updateCartQuantity(line.key, line.quantity + 1)}><Plus /></button>
                  <button type="button" onClick={() => removeCartLine(line.key)} aria-label="Remove"><Trash2 /></button>
                </div>
                {noteLineKey !== line.key ? (
                  <button className={styles.itemNoteButton} type="button" onClick={() => { setNoteLineKey(line.key); setNoteDraft(line.note || '') }}>
                    <Receipt aria-hidden="true" /> {line.note ? noteCopy.edit : noteCopy.add}
                  </button>
                ) : (
                  <div className={styles.itemNoteEditor}>
                    <label className={styles.label}>{noteCopy.title}
                      <textarea className={styles.itemNoteTextarea} maxLength={500} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} placeholder={noteCopy.placeholder} />
                    </label>
                    <div className={styles.itemNoteActions}>
                      <button className={styles.secondary} type="button" onClick={() => { setNoteLineKey(null); setNoteDraft('') }}>{noteCopy.cancel}</button>
                      <button className={styles.primary} type="button" onClick={() => { updateCartNote(line.key, noteDraft); setNoteLineKey(null); setNoteDraft('') }}>{noteCopy.save}</button>
                    </div>
                  </div>
                )}
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
  downloadInvoice: string
}

function r27FlowCopy(locale: string): R27FlowCopy {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return {
    tableOrders: 'Tischbestellungen', sharedDraft: 'Aktueller Tischentwurf', submittedOrders: 'Gesendete Bestellungen', myItems: 'Meine Artikel',
    selectOrderToPay: 'Bestellung zum Bezahlen auswählen', noSubmittedOrders: 'Noch keine Bestellung an die Küche gesendet.', sentToKitchen: 'An die Küche gesendet',
    paymentOpen: 'Zahlung offen', paymentPartial: 'Teilweise bezahlt', paymentComplete: 'Bezahlt', viewOrder: 'Bestellung ansehen',
    downloadInvoice: 'Rechnung herunterladen',
  }
  if (lang === 'fa') return {
    tableOrders: 'سفارش‌های میز', sharedDraft: 'سبد مشترک فعلی میز', submittedOrders: 'سفارش‌های ارسال‌شده', myItems: 'آیتم‌های من',
    selectOrderToPay: 'یک سفارش را برای پرداخت انتخاب کنید', noSubmittedOrders: 'هنوز سفارشی به آشپزخانه ارسال نشده است.', sentToKitchen: 'ارسال‌شده به آشپزخانه',
    paymentOpen: 'پرداخت باز', paymentPartial: 'بخشی پرداخت شده', paymentComplete: 'پرداخت‌شده', viewOrder: 'مشاهده سفارش',
    downloadInvoice: 'دانلود فاکتور',
  }
  if (lang === 'tr') return {
    tableOrders: 'Masa siparişleri', sharedDraft: 'Güncel ortak masa sepeti', submittedOrders: 'Gönderilen siparişler', myItems: 'Ürünlerim',
    selectOrderToPay: 'Ödenecek siparişi seçin', noSubmittedOrders: 'Henüz mutfağa gönderilmiş sipariş yok.', sentToKitchen: 'Mutfağa gönderildi',
    paymentOpen: 'Ödeme açık', paymentPartial: 'Kısmen ödendi', paymentComplete: 'Ödendi', viewOrder: 'Siparişi görüntüle',
    downloadInvoice: 'Faturayı indir',
  }
  if (lang === 'ja') return {
    tableOrders: 'テーブル注文', sharedDraft: '現在の共有カート', submittedOrders: '送信済み注文', myItems: '自分の料理',
    selectOrderToPay: '支払う注文を選択', noSubmittedOrders: 'まだキッチンへ送信された注文はありません。', sentToKitchen: 'キッチンへ送信済み',
    paymentOpen: '未払い', paymentPartial: '一部支払い済み', paymentComplete: '支払い済み', viewOrder: '注文を見る',
    downloadInvoice: '請求書をダウンロード',
  }
  return {
    tableOrders: 'Table orders', sharedDraft: 'Current table draft', submittedOrders: 'Sent orders', myItems: 'My items',
    selectOrderToPay: 'Select an order to pay', noSubmittedOrders: 'No sent orders yet.', sentToKitchen: 'Sent to kitchen',
    paymentOpen: 'Payment open', paymentPartial: 'Partially paid', paymentComplete: 'Paid', viewOrder: 'View order',
    downloadInvoice: 'Download invoice',
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

// PMD_PAID_INVOICE_UI_R28
function operationalStatusLabel(order: TableOrderState, labels: { received: string; preparing: string; ready: string }, copy: R27FlowCopy): string {
  const raw = String(order.deliveryStatus || order.statusName || '').trim()
  const normalized = raw.toLowerCase().replace(/[\s_]+/g, '-')
  if (!raw || /^(paid|settled|payment-open|payment-complete|payment-completed|partially-paid|partial|unpaid)$/.test(normalized)) return copy.sentToKitchen
  if (/ready|complete|completed|delivered/.test(normalized)) return labels.ready
  if (/prepar|cook|kitchen/.test(normalized)) return labels.preparing
  if (/received|new|pending/.test(normalized)) return labels.received
  return raw
}

// PMD_CANONICAL_CUSTOMER_INVOICE_UI_R28E
function InvoiceDownloadButton({ order, className }: { order: TableOrderState; className?: string }) {
  const { locale, notify } = useMenuRuntime()
  const copy = r27FlowCopy(locale)
  const available = Boolean(order.orderId && order.invoiceAvailable && order.invoiceDownloadToken && order.totals.remainingAmount <= 0)
  if (!available) return null

  const openCanonicalInvoice = () => {
    if (!order.orderId || !order.invoiceDownloadToken) return
    try {
      const href = downloadPaidInvoice({ orderId: order.orderId, token: order.invoiceDownloadToken })
      const link = document.createElement('a')
      link.href = href
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.referrerPolicy = 'no-referrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'Could not open invoice.')
    }
  }

  return (
    <button className={className || styles.primary} type="button" onClick={openCanonicalInvoice}>
      <Receipt /> {copy.downloadInvoice}
    </button>
  )
}

type PaidReviewState = 'idle' | 'loading' | 'success' | 'error'

type PaidReviewCopy = {
  title: string
  prompt: string
  commentPlaceholder: string
  submit: string
  submitting: string
  submitted: string
  thanks: string
  already: string
  ratingRequired: string
  failed: string
}

function paidReviewCopy(locale: string): PaidReviewCopy {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return {
    title: 'Besuch bewerten',
    prompt: 'Wie war Ihr Besuch? Ihre Bewertung wird zur Prüfung an das Restaurant gesendet.',
    commentPlaceholder: 'Optionaler Kommentar für das Restaurant',
    submit: 'Bewertung senden',
    submitting: 'Wird gesendet …',
    submitted: 'Bewertung gesendet',
    thanks: 'Vielen Dank — Ihre Bewertung wurde an das Restaurant gesendet.',
    already: 'Vielen Dank — für diese Bestellung wurde bereits eine Bewertung gesendet.',
    ratingRequired: 'Bitte wählen Sie 1 bis 5 Sterne.',
    failed: 'Die Bewertung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.',
  }
  if (lang === 'fa') return {
    title: 'امتیاز به تجربه شما',
    prompt: 'تجربه شما چطور بود؟ نظر شما برای بررسی به رستوران ارسال می‌شود.',
    commentPlaceholder: 'نظر اختیاری برای رستوران',
    submit: 'ارسال نظر',
    submitting: 'در حال ارسال…',
    submitted: 'نظر ارسال شد',
    thanks: 'ممنون — نظر شما برای رستوران ارسال شد.',
    already: 'ممنون — برای این سفارش قبلاً نظر ثبت شده است.',
    ratingRequired: 'لطفاً از ۱ تا ۵ ستاره انتخاب کنید.',
    failed: 'ارسال نظر انجام نشد. لطفاً دوباره تلاش کنید.',
  }
  if (lang === 'tr') return {
    title: 'Ziyaretinizi değerlendirin',
    prompt: 'Deneyiminiz nasıldı? Yorumunuz incelenmek üzere restorana gönderilir.',
    commentPlaceholder: 'Restoran için isteğe bağlı yorum',
    submit: 'Yorumu gönder',
    submitting: 'Gönderiliyor…',
    submitted: 'Yorum gönderildi',
    thanks: 'Teşekkürler — yorumunuz restorana gönderildi.',
    already: 'Teşekkürler — bu sipariş için zaten bir yorum gönderilmiş.',
    ratingRequired: 'Lütfen 1 ile 5 yıldız arasında bir puan seçin.',
    failed: 'Yorum gönderilemedi. Lütfen tekrar deneyin.',
  }
  if (lang === 'ja') return {
    title: 'ご来店を評価',
    prompt: 'ご利用はいかがでしたか？レビューは確認のため店舗へ送信されます。',
    commentPlaceholder: '店舗へのコメント（任意）',
    submit: 'レビューを送信',
    submitting: '送信中…',
    submitted: 'レビュー送信済み',
    thanks: 'ありがとうございます。レビューを店舗へ送信しました。',
    already: 'ありがとうございます。この注文にはすでにレビューが送信されています。',
    ratingRequired: '1〜5つ星で評価してください。',
    failed: 'レビューを送信できませんでした。もう一度お試しください。',
  }
  return {
    title: 'Rate your visit',
    prompt: 'How was your visit? Your review will be sent to the restaurant for moderation.',
    commentPlaceholder: 'Optional comment for the restaurant',
    submit: 'Submit review',
    submitting: 'Submitting…',
    submitted: 'Review submitted',
    thanks: 'Thank you — your review was sent to the restaurant.',
    already: 'Thank you — a review has already been submitted for this order.',
    ratingRequired: 'Please choose a rating from 1 to 5 stars.',
    failed: 'Could not submit your review. Please try again.',
  }
}

// PMD_FRONTEND_V2_PAID_ORDER_REVIEW_R30
// Shared RuntimeOverlays owns this behavior once; all ten themes render it.
// The star control intentionally uses a text glyph instead of adding a new
// lucide-react export to the proven V2 icon dependency surface.
function PaidOrderReviewCard({ order }: { order: TableOrderState }) {
  const { bootstrap, locale, isPreview } = useMenuRuntime()
  const copy = useMemo(() => paidReviewCopy(locale), [locale])
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<PaidReviewState>('idle')
  const [message, setMessage] = useState('')

  const orderId = Math.max(0, Math.trunc(Number(order.orderId || 0)))
  const storageKey = orderId > 0
    ? `pmd-v2:review-submitted:${bootstrap.tenant.id}:${orderId}`
    : ''

  useEffect(() => {
    setRating(0)
    setComment('')
    setStatus('idle')
    setMessage('')

    if (!storageKey) return
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) return
      const saved = JSON.parse(raw)
      setRating(Math.min(5, Math.max(1, Math.trunc(Number(saved?.rating || 5)))))
      setComment(String(saved?.comment || ''))
      setStatus('success')
      setMessage(copy.already)
    } catch {}
  }, [copy.already, storageKey])

  const rememberSubmitted = () => {
    if (!storageKey) return
    try {
      window.localStorage.setItem(storageKey, JSON.stringify({
        rating,
        comment: comment.trim(),
        submittedAt: new Date().toISOString(),
      }))
    } catch {}
  }

  const sendReview = async () => {
    if (status === 'loading' || status === 'success') return
    if (rating < 1 || rating > 5) {
      setStatus('error')
      setMessage(copy.ratingRequired)
      return
    }

    setStatus('loading')
    setMessage('')

    try {
      if (isPreview) {
        setStatus('success')
        setMessage(copy.thanks)
        return
      }

      await submitReview({ orderId, rating, review: comment })
      rememberSubmitted()
      setStatus('success')
      setMessage(copy.thanks)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : copy.failed
      if (/already(?:\s+been)?\s+submitted|already\s+sent|one\s+review/i.test(errorMessage)) {
        rememberSubmitted()
        setStatus('success')
        setMessage(copy.already)
        return
      }
      setStatus('error')
      setMessage(errorMessage || copy.failed)
    }
  }

  return (
    <section className={styles.orderCard} data-pmd-paid-order-review="r30" aria-label={copy.title}>
      <div className={styles.orderHeading}>
        <div>
          <h3>{copy.title}</h3>
          <small>{copy.prompt}</small>
        </div>
      </div>

      <div aria-label={copy.title} style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            aria-label={`${star}/5`}
            aria-pressed={rating === star}
            disabled={status === 'loading' || status === 'success'}
            onClick={() => {
              setRating(star)
              setStatus('idle')
              setMessage('')
            }}
            style={{
              appearance: 'none',
              border: 0,
              background: 'transparent',
              color: '#b88940',
              padding: '0.2rem',
              cursor: status === 'success' ? 'default' : 'pointer',
              fontSize: '1.7rem',
              lineHeight: 1,
              opacity: rating >= star ? 1 : 0.34,
            }}
          >
            <span aria-hidden="true">★</span>
          </button>
        ))}
      </div>

      <textarea
        className={styles.input}
        rows={4}
        maxLength={2000}
        value={comment}
        disabled={status === 'success'}
        placeholder={copy.commentPlaceholder}
        onChange={(event) => {
          setComment(event.target.value)
          if (status !== 'loading') {
            setStatus('idle')
            setMessage('')
          }
        }}
        style={{ minHeight: '6rem', resize: 'vertical' }}
      />

      <button
        className={styles.primary}
        type="button"
        disabled={status === 'loading' || status === 'success' || rating < 1}
        onClick={() => void sendReview()}
      >
        {status === 'loading' ? <LoaderCircle aria-hidden="true" /> : <Send aria-hidden="true" />}
        {status === 'loading' ? copy.submitting : status === 'success' ? copy.submitted : copy.submit}
      </button>

      {message && (
        <div className={`${styles.statusMessage} ${status === 'error' ? styles.statusError : styles.statusSuccess}`} role="status">
          {message}
        </div>
      )}
    </section>
  )
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
          <small>{operationalStatusLabel(order, labels, copy)}</small>
        </div>
        <span className={`${styles.paymentBadge} ${canPay ? '' : styles.paymentBadgePaid}`}>{paymentBadge(order, copy)}</span>
      </div>
      <div className={styles.invoiceItems}>
        {order.items.map((item, index) => (
          <div className={styles.orderLine} key={`${item.orderMenuId || item.menuId}-${index}`}>
            <span>{item.quantity} × {item.name}{item.note ? <small className={styles.orderItemNote}><Receipt aria-hidden="true" />{item.note}</small> : null}</span><strong>{formatCurrency(item.subtotal)}</strong>
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
        {canPay ? <button className={styles.primary} type="button" onClick={onPay}><CreditCard /> {labels.pay}</button> : <InvoiceDownloadButton order={order} />}
      </div>
    </article>
  )
}

type SplitMode = 'full' | 'mine' | 'equal' | 'items' | 'shares'

// PMD_STRIPE_WALLET_STATE_R35C
function paymentMethodKey(method: { code: string; providerCode: string | null }): string {
  return `${method.code}:${method.providerCode || 'default'}`
}

// PMD_STRIPE_INLINE_PAYMENT_R35B
// /api/v1/payments remains the primary list. PayPal's public runtime config is
// a compatibility authority because some older payment-list payloads omit it.
function useRuntimePaymentChoices(payments: PaymentMethod[]): PaymentMethod[] {
  const [paypalFallback, setPaypalFallback] = useState<PaymentMethod | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/v1/payments/config-public', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then((response) => response.json().catch(() => ({})))
      .then((data) => {
        if (cancelled) return
        const enabled = data?.success !== false
          && Boolean(data?.paypalEnabled)
          && Boolean(data?.paypalMethodEnabled)
          && Boolean(String(data?.paypalClientId || '').trim())
        setPaypalFallback(enabled ? { code: 'paypal', name: 'PayPal', providerCode: 'paypal', enabled: true, priority: 90 } : null)
      })
      .catch(() => { if (!cancelled) setPaypalFallback(null) })
    return () => { cancelled = true }
  }, [])

  return useMemo(() => {
    const rows = payments.filter((entry) => entry.enabled !== false)
    if (!paypalFallback || rows.some((entry) => String(entry.code).toLowerCase() === 'paypal')) return rows
    return [...rows, paypalFallback].sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0))
  }, [payments, paypalFallback])
}

// PMD_SPLIT_PAYMENT_SAFETY_R35
function PaymentPanel({ order, mode, guestSessionId }: { order: TableOrderState; mode: 'payment' | 'split'; guestSessionId: string }) {
  const { bootstrap, labels, formatCurrency, notify, refreshOrder, isPreview, markOrderPaid, locale } = useMenuRuntime()
  const copy = r27FlowCopy(locale)
  const mineAvailable = Boolean(guestSessionId && order.items.some((item) => item.guestSessionId === guestSessionId && item.unpaidQuantity > 0))
  const [splitMode, setSplitMode] = useState<SplitMode>(mode === 'payment' ? 'full' : (mineAvailable ? 'mine' : 'equal'))
  const [people, setPeople] = useState(2)
  const [sharePercent, setSharePercent] = useState(50)
  const [itemQuantities, setItemQuantities] = useState<Record<number, number>>({})
  const [methodKey, setMethodKey] = useState(bootstrap.payments[0] ? paymentMethodKey(bootstrap.payments[0]) : '')
  const [tipPercent, setTipPercent] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const paymentChoices = useRuntimePaymentChoices(bootstrap.payments)

  useEffect(() => {
    if (!paymentChoices.some((entry) => paymentMethodKey(entry) === methodKey)) {
      setMethodKey(paymentChoices[0] ? paymentMethodKey(paymentChoices[0]) : '')
    }
  }, [methodKey, paymentChoices])

  const mineItemsPayload = useMemo(() => order.items
    .filter((item) => item.orderMenuId && item.guestSessionId === guestSessionId && item.unpaidQuantity > 0)
    .map((item) => ({ order_menu_id: item.orderMenuId!, quantity: item.unpaidQuantity ?? item.quantity })), [guestSessionId, order.items])

  const selectedItemsPayload = useMemo(() => {
    if (splitMode === 'mine') return mineItemsPayload
    if (splitMode !== 'items') return null
    return order.items.flatMap((item) => {
      if (!item.orderMenuId || item.unpaidQuantity <= 0) return []
      const qty = Math.min(item.unpaidQuantity, Math.max(0, Number(itemQuantities[item.orderMenuId] || 0)))
      return qty > 0 ? [{ order_menu_id: item.orderMenuId, quantity: qty }] : []
    })
  }, [itemQuantities, mineItemsPayload, order.items, splitMode])

  if (!order.orderId || order.status === 'draft') return <div className={styles.empty}>{copy.selectOrderToPay}</div>

  const remaining = Math.max(0, order.totals.remainingAmount ?? order.totals.orderTotal)
  const orderedItemSubtotal = Math.max(0.0001, order.items.reduce((sum, item) => sum + Math.max(0, item.subtotal || item.price * item.quantity), 0))
  const grossRatio = Math.max(0, order.totals.orderTotal / orderedItemSubtotal)
  const itemAmount = order.items.reduce((sum, item) => {
    if (!item.orderMenuId) return sum
    const qty = Math.min(item.unpaidQuantity, Math.max(0, Number(itemQuantities[item.orderMenuId] || 0)))
    return sum + item.price * qty * grossRatio
  }, 0)
  const mineAmount = order.items
    .filter((item) => item.guestSessionId === guestSessionId && item.unpaidQuantity > 0)
    .reduce((sum, item) => sum + item.price * item.unpaidQuantity * grossRatio, 0)
  const rawBaseAmount = splitMode === 'equal'
    ? order.totals.orderTotal / Math.max(2, people)
    : splitMode === 'shares'
      ? order.totals.orderTotal * Math.min(100, Math.max(1, sharePercent)) / 100
      : splitMode === 'items'
        ? itemAmount
        : splitMode === 'mine'
          ? mineAmount
          : remaining
  const baseAmount = Math.min(remaining, Math.max(0, rawBaseAmount))
  const afterCoupon = Math.max(0, baseAmount - (mode === 'split' ? 0 : couponDiscount))
  const tipAmountEstimate = afterCoupon * Math.max(0, tipPercent) / 100
  const payableEstimate = Number((afterCoupon + tipAmountEstimate).toFixed(2))
  const selectedMethod = paymentChoices.find((entry) => paymentMethodKey(entry) === methodKey) || null
  const settlementMode = String(order.payment || '').toLowerCase() === 'qr_pay_later' ? 'pay-existing' as const : 'start-finalize' as const
  const selectedCode = String(selectedMethod?.code || '').trim().toLowerCase()
  const configuredProvider = String(selectedMethod?.providerCode || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const selectedProvider = configuredProvider || (['card', 'apple_pay', 'google_pay'].includes(selectedCode) ? 'stripe' : '')
  const isStripeInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && selectedProvider === 'stripe' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))
  const isPayPalInline = Boolean(selectedMethod && settlementMode === 'pay-existing' && (selectedProvider === 'paypal' || (selectedMethod.code.toLowerCase() === 'paypal' && (!selectedProvider || selectedProvider === 'paypal'))))
  const requiresSelectedItems = splitMode === 'items' || splitMode === 'mine'
  const canStartPayment = Boolean(selectedMethod && payableEstimate > 0 && (!requiresSelectedItems || (selectedItemsPayload && selectedItemsPayload.length > 0)))
  const payerLabel = splitMode === 'full' ? null : `PMD R35 ${splitMode}`

  const applyCoupon = async () => {
    if (mode === 'split') { setMessage('Coupons can be applied when paying the full remaining bill.'); return }
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
    } catch (error) { setMessage(error instanceof Error ? error.message : labels.error) }
    finally { setBusy(false) }
  }

  const completePaymentLocally = async (amount = payableEstimate) => {
    if (isPreview) markOrderPaid(order.orderId!, amount)
    else await refreshOrder()
    notify('success', labels.paid)
    setMessage(labels.success)
  }

  const prepareSplit = async (): Promise<SplitPaymentIntent> => {
    if (!selectedMethod || !order.orderId) throw new Error(labels.noPaymentMethods)
    if (splitMode === 'full') throw new Error('Split mode is required.')
    return prepareSplitPaymentIntent({
      orderId: order.orderId,
      table: bootstrap.table,
      guestSessionId,
      splitMode,
      splitPeople: splitMode === 'equal' ? people : null,
      sharePercent: splitMode === 'shares' ? sharePercent : null,
      selectedItems: selectedItemsPayload,
      tipPercent,
      paymentMethod: selectedMethod.code,
      providerCode: selectedMethod.providerCode,
    })
  }

  const requestCash = async (amount: number) => {
    await callWaiter(bootstrap.table, `Cash payment requested for order #${order.orderNumber || order.orderId}: ${formatCurrency(amount)}. Please collect and confirm in Staff/Cashier.`)
    notify('success', 'Cash payment requested')
    setMessage('Cash payment requested. This screen stays unpaid until a staff member collects and confirms the cash. Refresh Table Orders after staff confirms.')
  }

  const pay = async () => {
    if (payableEstimate <= 0 || !order.orderId) return
    if (!selectedMethod) { setMessage(labels.noPaymentMethods); return }
    if (requiresSelectedItems && !selectedItemsPayload?.length) { setMessage(labels.selectItems); return }
    setBusy(true); setMessage('')
    try {
      if (isPreview) { await completePaymentLocally(); return }

      if (mode === 'split' && splitMode !== 'full') {
        const intent = await prepareSplit()
        if (selectedMethod.code === 'cash' || selectedMethod.code === 'cod') {
          await requestCash(intent.payableAmount)
          return
        }
        const session = guestSessionId || getSafeGuestSession(bootstrap.tenant.id, bootstrap.table.id || bootstrap.table.number || 'delivery')
        const response = await startHostedProviderPayment({
          orderId: order.orderId,
          paymentIntentToken: intent.token,
          settlementMode: 'pay-existing',
          table: bootstrap.table,
          methodCode: selectedMethod.code,
          providerCode: selectedMethod.providerCode,
          guestSessionId: session,
          amount: intent.payableAmount,
          currency: bootstrap.restaurant.currency,
          tipAmount: intent.tipAmount,
          couponCode: null,
          couponDiscount: 0,
          selectedItems: intent.selectedItems,
          payerLabel: intent.payerLabel,
          items: intent.providerItems,
        })
        if (response.redirectUrl) { window.location.assign(response.redirectUrl); return }
        if (response.immediateReference) {
          await payExistingOrder({
            orderId: order.orderId, table: bootstrap.table, method: selectedMethod.code,
            providerCode: selectedMethod.providerCode, paymentReference: response.immediateReference,
            amount: intent.payableAmount, tipAmount: intent.tipAmount, couponCode: null, couponDiscount: 0,
            selectedItems: intent.selectedItems, payerLabel: intent.payerLabel,
            paymentIntentToken: intent.token, splitMode: intent.splitMode,
            splitPeople: intent.splitPeople, sharePercent: intent.sharePercent, guestSessionId,
          })
          clearPendingProviderPayment(response.provider)
          await completePaymentLocally(intent.payableAmount)
          return
        }
        setMessage(String(response.raw?.message || labels.paymentSessionReady))
        return
      }

      // Full remaining payment keeps the established R32/R34 contract, except guest Cash
      // is now a staff request instead of allowing a guest device to self-settle cash.
      if (selectedMethod.code === 'cash' || selectedMethod.code === 'cod') {
        await requestCash(payableEstimate)
        return
      }
      const session = guestSessionId || getSafeGuestSession(bootstrap.tenant.id, bootstrap.table.id || bootstrap.table.number || 'delivery')
      const response = await startHostedProviderPayment({
        orderId: order.orderId, settlementMode, table: bootstrap.table, methodCode: selectedMethod.code,
        providerCode: selectedMethod.providerCode, guestSessionId: session, amount: payableEstimate,
        currency: bootstrap.restaurant.currency, tipAmount: tipAmountEstimate, couponCode: couponCode.trim() || null,
        couponDiscount, selectedItems: selectedItemsPayload, payerLabel, items: order.items
          .filter((item) => item.unpaidQuantity > 0)
          .map((item) => ({ id: String(item.orderMenuId || item.menuId), name: item.name, quantity: item.unpaidQuantity, price: item.price * grossRatio })),
      })
      if (response.redirectUrl) { window.location.assign(response.redirectUrl); return }
      if (response.immediateReference) {
        if (settlementMode === 'pay-existing') {
          await payExistingOrder({ orderId: order.orderId, table: bootstrap.table, method: selectedMethod.code,
            providerCode: selectedMethod.providerCode, paymentReference: response.immediateReference,
            amount: payableEstimate, tipAmount: tipAmountEstimate, couponCode: couponCode.trim() || null,
            couponDiscount, selectedItems: selectedItemsPayload, payerLabel })
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
    <div className={styles.stack} data-pmd-payment-order-id={order.orderId} data-pmd-split-safety={mode === 'split' ? 'r35' : undefined}>
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
          {splitMode === 'equal' && <label className={styles.label}>{labels.people}<input className={styles.input} type="number" min={2} max={20} value={people} onChange={(event) => setPeople(Math.min(20, Math.max(2, Number(event.target.value) || 2)))} /></label>}
          {splitMode === 'shares' && <label className={styles.label}>%<input className={styles.input} type="number" min={1} max={100} value={sharePercent} onChange={(event) => setSharePercent(Math.min(100, Math.max(1, Number(event.target.value) || 1)))} /></label>}
          {splitMode === 'items' && (
            <div className={styles.checkboxList}>
              {order.items.filter((item) => item.orderMenuId && item.unpaidQuantity > 0).map((item) => {
                const id = item.orderMenuId!
                const maxQty = item.unpaidQuantity ?? item.quantity
                const qty = Math.min(maxQty, Math.max(0, Number(itemQuantities[id] || 0)))
                return (
                  <div className={`${styles.checkboxLine} ${styles.splitQuantityLine}`} key={id}>
                    <input type="checkbox" checked={qty > 0} onChange={() => setItemQuantities((current) => ({ ...current, [id]: qty > 0 ? 0 : maxQty }))} />
                    <span>{maxQty} × {item.name}</span>
                    <span className={styles.smallQty} aria-label={`${item.name} quantity`}>
                      <button type="button" disabled={qty <= 0} onClick={() => setItemQuantities((current) => ({ ...current, [id]: Math.max(0, qty - 1) }))}><Minus /></button>
                      <span>{qty}</span>
                      <button type="button" disabled={qty >= maxQty} onClick={() => setItemQuantities((current) => ({ ...current, [id]: Math.min(maxQty, qty + 1) }))}><Plus /></button>
                    </span>
                    <strong>{formatCurrency(item.price * qty * grossRatio)}</strong>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
      {mode !== 'split' && bootstrap.features.coupons && (
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
      {paymentChoices.length > 0 ? (
        <div className={styles.methodGrid}>
          {paymentChoices.map((entry) => {
            const key = paymentMethodKey(entry)
            return <button key={key} type="button" className={`${styles.method} ${methodKey === key ? styles.methodSelected : ''}`} onClick={() => { setMethodKey(key); setMessage('') }}>{entry.code === 'cash' || entry.code === 'cod' ? <Receipt /> : <CreditCard />} {entry.name}</button>
          })}
        </div>
      ) : <div className={`${styles.statusMessage} ${styles.statusError}`}>{labels.noPaymentMethods}</div>}
      <div className={styles.summary}>
        <div className={styles.summaryRow}><span>{labels.remaining}</span><span>{formatCurrency(remaining)}</span></div>
        <div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(payableEstimate)}</strong></div>
      </div>
      {isPayPalInline && selectedMethod && canStartPayment ? (
        <PayPalButton
          orderId={order.orderId}
          table={bootstrap.table}
          methodCode={selectedMethod.code}
          providerCode={selectedMethod.providerCode}
          amount={payableEstimate}
          currency={bootstrap.restaurant.currency}
          tipAmount={tipAmountEstimate}
          couponCode={mode === 'split' ? null : couponCode.trim() || null}
          couponDiscount={mode === 'split' ? 0 : couponDiscount}
          selectedItems={selectedItemsPayload}
          payerLabel={payerLabel}
          items={order.items.filter((item) => item.unpaidQuantity > 0).map((item) => ({ id: String(item.orderMenuId || item.menuId), name: item.name, quantity: item.unpaidQuantity, price: item.price * grossRatio }))}
          prepareSplitIntent={mode === 'split' && splitMode !== 'full' ? prepareSplit : undefined}
          guestSessionId={guestSessionId}
          onSuccess={() => completePaymentLocally()}
          onError={setMessage}
        />
      ) : isStripeInline && selectedMethod && canStartPayment ? (
        <StripeInlinePayment
          key={`r35c-${paymentMethodKey(selectedMethod)}-${order.orderId}`}
          orderId={order.orderId}
          table={bootstrap.table}
          methodCode={selectedMethod.code}
          providerCode={selectedMethod.providerCode}
          amount={payableEstimate}
          currency={bootstrap.restaurant.currency}
          tipAmount={tipAmountEstimate}
          couponCode={mode === 'split' ? null : couponCode.trim() || null}
          couponDiscount={mode === 'split' ? 0 : couponDiscount}
          selectedItems={selectedItemsPayload}
          payerLabel={payerLabel}
          items={order.items.filter((item) => item.unpaidQuantity > 0).map((item) => ({ id: String(item.orderMenuId || item.menuId), name: item.name, quantity: item.unpaidQuantity, price: item.price * grossRatio }))}
          prepareSplitIntent={mode === 'split' && splitMode !== 'full' ? prepareSplit : undefined}
          guestSessionId={guestSessionId}
          locale={locale}
          onSuccess={(amount) => completePaymentLocally(amount)}
        />
      ) : (
        <button className={styles.primary} type="button" onClick={() => void pay()} disabled={busy || !canStartPayment}>
          {busy ? <LoaderCircle /> : <CreditCard />} {splitMode === 'items' && !selectedItemsPayload?.length ? labels.selectItems : `${selectedMethod?.code === 'cash' || selectedMethod?.code === 'cod' ? 'Request cash' : labels.pay} ${formatCurrency(payableEstimate)}`}
        </button>
      )}
      {message && <div className={`${styles.statusMessage} ${message.toLowerCase().includes('error') || message.toLowerCase().includes('require') || message.toLowerCase().includes('failed') || message.toLowerCase().includes('do not pay') ? styles.statusError : styles.statusSuccess}`}>{message}</div>}
    </div>
  )
}

type R32MultiOrderCopy = {
  selectOrders: string
  ordersSelected: string
  combined: string
  groupPayment: string
  groupHint: string
  unsupported: string
}

function r32MultiOrderCopy(locale: string): R32MultiOrderCopy {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return {
    selectOrders: 'Eine oder mehrere offene Bestellungen auswählen',
    ordersSelected: 'Bestellungen ausgewählt',
    combined: 'Zusammen',
    groupPayment: 'Ausgewählte Bestellungen bezahlen',
    groupHint: 'Die ausgewählten offenen Bestellungen werden gemeinsam bezahlt.',
    unsupported: 'Diese Bestellgruppe kann nicht gemeinsam bezahlt werden.',
  }
  if (lang === 'fa') return {
    selectOrders: 'یک یا چند سفارش پرداخت‌نشده را انتخاب کنید',
    ordersSelected: 'سفارش انتخاب شده',
    combined: 'مجموع',
    groupPayment: 'پرداخت سفارش‌های انتخاب‌شده',
    groupHint: 'سفارش‌های پرداخت‌نشده انتخاب‌شده با یک پرداخت تسویه می‌شوند.',
    unsupported: 'این گروه سفارش را نمی‌توان به‌صورت مشترک پرداخت کرد.',
  }
  if (lang === 'tr') return {
    selectOrders: 'Bir veya daha fazla ödenmemiş sipariş seçin',
    ordersSelected: 'sipariş seçildi',
    combined: 'Toplam',
    groupPayment: 'Seçili siparişleri öde',
    groupHint: 'Seçilen açık siparişler tek ödeme ile kapatılır.',
    unsupported: 'Bu sipariş grubu birlikte ödenemiyor.',
  }
  if (lang === 'ja') return {
    selectOrders: '未払いの注文を1件以上選択してください',
    ordersSelected: '件の注文を選択',
    combined: '合計',
    groupPayment: '選択した注文を支払う',
    groupHint: '選択した未払い注文を1回の決済で支払います。',
    unsupported: 'この注文グループはまとめて支払えません。',
  }
  return {
    selectOrders: 'Select one or more unpaid orders',
    ordersSelected: 'orders selected',
    combined: 'Combined',
    groupPayment: 'Pay selected orders',
    groupHint: 'The selected unpaid orders will be settled with one payment.',
    unsupported: 'This order group cannot be paid together.',
  }
}

function allocateMoneyByWeight(total: number, weights: number[]): number[] {
  if (!weights.length) return []
  const cents = Math.max(0, Math.round((Number(total) || 0) * 100))
  const safeWeights = weights.map((value) => Math.max(0, Number(value) || 0))
  const weightTotal = safeWeights.reduce((sum, value) => sum + value, 0)
  if (cents <= 0 || weightTotal <= 0) return safeWeights.map(() => 0)

  let remaining = cents
  return safeWeights.map((weight, index) => {
    if (index === safeWeights.length - 1) return remaining / 100
    const share = Math.min(remaining, Math.max(0, Math.round(cents * weight / weightTotal)))
    remaining -= share
    return share / 100
  })
}

// PMD_MULTI_ORDER_PAYMENT_R32
// Payment selection is shared by all ten themes. A grouped provider session is
// intentionally created without order_id; after provider confirmation the charge
// is allocated through the canonical pay-existing endpoint once per selected order.
function MultiOrderPaymentPanel({ orders, guestSessionId }: { orders: TableOrderState[]; guestSessionId: string }) {
  const { bootstrap, labels, formatCurrency, notify, refreshOrder, isPreview, markOrderPaid, locale } = useMenuRuntime()
  const copy = r32MultiOrderCopy(locale)
  const payableOrders = useMemo(
    () => orders.filter((order) => Boolean(order.orderId) && order.totals.remainingAmount > 0),
    [orders],
  )
  const [methodKey, setMethodKey] = useState(bootstrap.payments[0] ? paymentMethodKey(bootstrap.payments[0]) : '')
  const [tipPercent, setTipPercent] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [couponDiscount, setCouponDiscount] = useState(0)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const paymentChoices = useRuntimePaymentChoices(bootstrap.payments)

  useEffect(() => {
    if (!paymentChoices.some((entry) => paymentMethodKey(entry) === methodKey)) {
      setMethodKey(paymentChoices[0] ? paymentMethodKey(paymentChoices[0]) : '')
    }
  }, [methodKey, paymentChoices])

  const remaining = Number(payableOrders.reduce((sum, order) => sum + Math.max(0, order.totals.remainingAmount), 0).toFixed(2))
  const afterCoupon = Math.max(0, remaining - couponDiscount)
  const tipAmount = Number((afterCoupon * Math.max(0, tipPercent) / 100).toFixed(2))
  const payable = Number((afterCoupon + tipAmount).toFixed(2))
  const weights = payableOrders.map((order) => Math.max(0, order.totals.remainingAmount))
  const couponShares = useMemo(() => allocateMoneyByWeight(couponDiscount, weights), [couponDiscount, payableOrders])
  const tipShares = useMemo(() => allocateMoneyByWeight(tipAmount, weights), [tipAmount, payableOrders])
  const selectedMethod = paymentChoices.find((entry) => paymentMethodKey(entry) === methodKey) || null
  const selectedCode = String(selectedMethod?.code || '').trim().toLowerCase()
  const configuredProvider = String(selectedMethod?.providerCode || '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  const selectedProvider = configuredProvider || (['card', 'apple_pay', 'google_pay'].includes(selectedCode) ? 'stripe' : '')
  const isStripeInline = Boolean(selectedMethod && selectedProvider === 'stripe' && ['card', 'apple_pay', 'google_pay'].includes(selectedCode))
  const isPayPalInline = Boolean(selectedMethod && (selectedProvider === 'paypal' || (selectedMethod.code.toLowerCase() === 'paypal' && (!selectedProvider || selectedProvider === 'paypal'))))
  const allPayExisting = payableOrders.length > 1 && payableOrders.every((order) => String(order.payment || '').toLowerCase() === 'qr_pay_later')

  const orderAllocations = useMemo<ExistingOrderPaymentAllocation[]>(() => payableOrders.flatMap((order, index) => {
    if (!order.orderId) return []
    const base = Math.max(0, order.totals.remainingAmount)
    const allocatedTip = Number((tipShares[index] || 0).toFixed(2))
    const allocatedDiscount = Number((couponShares[index] || 0).toFixed(2))
    return [{
      orderId: order.orderId,
      amount: Number(Math.max(0, base + allocatedTip - allocatedDiscount).toFixed(2)),
      tipAmount: allocatedTip,
      couponDiscount: allocatedDiscount,
      couponCode: couponCode.trim() || null,
      selectedItems: null,
      payerLabel: 'PMD V2 multi-order',
    }]
  }), [couponCode, couponShares, payableOrders, tipShares])

  const providerItems = useMemo(() => payableOrders.flatMap((order) => order.items
    .filter((item) => (item.unpaidQuantity ?? item.quantity) > 0)
    .map((item) => ({
      id: `${order.orderId || 'order'}:${item.orderMenuId || item.menuId}`,
      name: `#${order.orderNumber || order.orderId} · ${item.name}`,
      quantity: item.unpaidQuantity ?? item.quantity,
      price: item.price,
    }))), [payableOrders])

  const applyCoupon = async () => {
    if (!couponCode.trim()) return
    setBusy(true)
    try {
      if (isPreview) {
        const discount = couponCode.trim().toUpperCase() === 'DEMO10' ? remaining * 0.1 : 0
        setCouponDiscount(Number(discount.toFixed(2)))
        setMessage(discount > 0 ? 'Demo coupon applied.' : 'Use DEMO10 in preview mode.')
        return
      }
      const result = await validateCoupon(couponCode.trim(), remaining)
      setCouponDiscount(Number(Math.min(remaining, Math.max(0, result.discount)).toFixed(2)))
      setMessage(result.message)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.error)
    } finally { setBusy(false) }
  }

  const completePaymentLocally = async () => {
    if (isPreview) {
      for (const order of payableOrders) {
        if (order.orderId) markOrderPaid(order.orderId, order.totals.remainingAmount)
      }
    } else {
      await refreshOrder()
    }
    notify('success', labels.paid)
    setMessage(labels.success)
  }

  const pay = async () => {
    if (!allPayExisting || payable <= 0 || orderAllocations.length < 2) {
      setMessage(copy.unsupported)
      return
    }
    if (!selectedMethod) {
      setMessage(labels.noPaymentMethods)
      return
    }

    setBusy(true)
    setMessage('')
    try {
      if (isPreview) {
        await completePaymentLocally()
        return
      }

      if (selectedMethod.code === 'cash' || selectedMethod.code === 'cod') {
        await callWaiter(bootstrap.table, `Cash payment requested for ${payableOrders.length} table orders: ${formatCurrency(payable)}. Please collect and confirm in Staff/Cashier.`)
        setMessage('Cash payment requested. Staff must collect and confirm it; the selected orders are not marked paid yet.')
        return
      }

      const primaryOrderId = payableOrders[0]?.orderId
      if (!primaryOrderId) throw new Error(copy.unsupported)
      const session = guestSessionId || getSafeGuestSession(bootstrap.tenant.id, bootstrap.table.id || bootstrap.table.number || 'delivery')
      const response = await startHostedProviderPayment({
        orderId: primaryOrderId,
        orderAllocations,
        settlementMode: 'pay-existing',
        table: bootstrap.table,
        methodCode: selectedMethod.code,
        providerCode: selectedMethod.providerCode,
        guestSessionId: session,
        amount: payable,
        currency: bootstrap.restaurant.currency,
        tipAmount,
        couponCode: couponCode.trim() || null,
        couponDiscount,
        selectedItems: null,
        payerLabel: 'PMD V2 multi-order',
        items: providerItems,
      })
      if (response.redirectUrl) {
        window.location.assign(response.redirectUrl)
        return
      }
      if (response.immediateReference) {
        await settleExistingOrderGroup({
          allocations: orderAllocations,
          table: bootstrap.table,
          method: selectedMethod.code,
          providerCode: selectedMethod.providerCode,
          paymentReference: response.immediateReference,
        })
        clearPendingProviderPayment(response.provider)
        await completePaymentLocally()
        return
      }
      setMessage(String(response.raw?.message || labels.paymentSessionReady))
    } catch (error) {
      setMessage(error instanceof Error ? error.message : labels.error)
    } finally { setBusy(false) }
  }

  const primaryOrderId = payableOrders[0]?.orderId || 0
  const canStartPayment = Boolean(allPayExisting && selectedMethod && payable > 0 && orderAllocations.length > 1)

  return (
    <div className={styles.stack} data-pmd-multi-order-payment="r32">
      <div className={styles.multiOrderList}>
        {payableOrders.map((order) => (
          <div className={styles.multiOrderRow} key={order.orderId || order.orderNumber || 'order'}>
            <span>#{order.orderNumber || order.orderId}</span>
            <strong>{formatCurrency(order.totals.remainingAmount)}</strong>
          </div>
        ))}
      </div>
      <p className={styles.providerHint}>{copy.groupHint}</p>

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

      {paymentChoices.length > 0 ? (
        <div className={styles.methodGrid}>
          {paymentChoices.map((entry) => {
            const key = paymentMethodKey(entry)
            return <button key={key} type="button" className={`${styles.method} ${methodKey === key ? styles.methodSelected : ''}`} onClick={() => { setMethodKey(key); setMessage('') }}>{entry.code === 'cash' || entry.code === 'cod' ? <Receipt /> : <CreditCard />} {entry.name}</button>
          })}
        </div>
      ) : <div className={`${styles.statusMessage} ${styles.statusError}`}>{labels.noPaymentMethods}</div>}

      <div className={styles.summary}>
        <div className={styles.summaryRow}><span>{copy.combined}</span><span>{formatCurrency(remaining)}</span></div>
        {couponDiscount > 0 && <div className={styles.summaryRow}><span>{labels.coupon}</span><span>-{formatCurrency(couponDiscount)}</span></div>}
        {tipAmount > 0 && <div className={styles.summaryRow}><span>{labels.tip}</span><span>{formatCurrency(tipAmount)}</span></div>}
        <div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(payable)}</strong></div>
      </div>

      {isPayPalInline && selectedMethod && canStartPayment ? (
        <PayPalButton
          orderId={primaryOrderId}
          orderAllocations={orderAllocations}
          table={bootstrap.table}
          methodCode={selectedMethod.code}
          providerCode={selectedMethod.providerCode}
          amount={payable}
          currency={bootstrap.restaurant.currency}
          tipAmount={tipAmount}
          couponCode={couponCode.trim() || null}
          couponDiscount={couponDiscount}
          selectedItems={null}
          payerLabel="PMD V2 multi-order"
          items={providerItems}
          onSuccess={completePaymentLocally}
          onError={setMessage}
        />
      ) : isStripeInline && selectedMethod && canStartPayment ? (
        <StripeInlinePayment
          key={`r35c-${paymentMethodKey(selectedMethod)}-${primaryOrderId}`}
          orderId={primaryOrderId}
          orderAllocations={orderAllocations}
          table={bootstrap.table}
          methodCode={selectedMethod.code}
          providerCode={selectedMethod.providerCode}
          amount={payable}
          currency={bootstrap.restaurant.currency}
          tipAmount={tipAmount}
          couponCode={couponCode.trim() || null}
          couponDiscount={couponDiscount}
          selectedItems={null}
          payerLabel="PMD V2 multi-order"
          items={providerItems}
          guestSessionId={guestSessionId}
          locale={locale}
          onSuccess={() => completePaymentLocally()}
        />
      ) : (
        <button className={styles.primary} type="button" onClick={() => void pay()} disabled={busy || !canStartPayment}>
          {busy ? <LoaderCircle /> : <CreditCard />} {copy.groupPayment} · {formatCurrency(payable)}
        </button>
      )}
      {!allPayExisting && <div className={`${styles.statusMessage} ${styles.statusError}`}>{copy.unsupported}</div>}
      {message && <div className={`${styles.statusMessage} ${message.toLowerCase().includes('error') || message.toLowerCase().includes('require') || message.toLowerCase().includes('failed') || message === copy.unsupported ? styles.statusError : styles.statusSuccess}`}>{message}</div>}
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
  const multiCopy = r32MultiOrderCopy(locale)
  const directCopy = r33DirectOrderCopy(locale)
  const [tab, setTab] = useState<'orders' | 'payment' | 'split'>('orders')
  const [selectedPaymentOrderIds, setSelectedPaymentOrderIds] = useState<number[]>(() =>
    selectedOrder?.orderId && selectedOrder.totals.remainingAmount > 0 ? [selectedOrder.orderId] : [],
  )
  const selectedPaymentOrders = useMemo(() => tableOrders.filter((order) =>
    Boolean(order.orderId) && order.totals.remainingAmount > 0 && selectedPaymentOrderIds.includes(order.orderId!),
  ), [selectedPaymentOrderIds, tableOrders])
  const selectedPaymentTotal = selectedPaymentOrders.reduce((sum, order) => sum + Math.max(0, order.totals.remainingAmount), 0)
  const orderingGuestIds = useMemo(() => Array.from(new Set([
    ...tableOrders.flatMap((order) => order.items.map((item) => item.guestSessionId || '').filter(Boolean)),
    ...(currentDraft?.items || []).map((item) => item.guestSessionId || '').filter(Boolean),
  ])), [currentDraft, tableOrders])
  const orderingGuestCount = orderingGuestIds.length
  const myOpenOrder = useMemo(() => tableOrders.find((order) =>
    Boolean(order.orderId)
    && order.totals.remainingAmount > 0
    && order.items.some((item) => item.guestSessionId === guestSessionId && item.unpaidQuantity > 0),
  ) || null, [guestSessionId, tableOrders])
  const title = tab === 'orders' ? copy.tableOrders : tab === 'payment' ? labels.payment : labels.splitBill
  const canPaySelected = Boolean(selectedOrder?.orderId && selectedOrder.totals.remainingAmount > 0)

  const chooseForPayment = (order: TableOrderState, target: 'payment' | 'split' = 'payment') => {
    if (!order.orderId) return
    selectOrder(order.orderId)
    if (target === 'payment' && order.totals.remainingAmount > 0) setSelectedPaymentOrderIds([order.orderId])
    setTab(target)
  }

  const togglePaymentOrder = (order: TableOrderState) => {
    if (!order.orderId) return
    if (order.totals.remainingAmount <= 0) {
      setSelectedPaymentOrderIds([])
      selectOrder(order.orderId)
      return
    }
    if (!selectedPaymentOrderIds.includes(order.orderId)) {
      setSelectedPaymentOrderIds([...selectedPaymentOrderIds, order.orderId])
      selectOrder(order.orderId)
      return
    }
    if (selectedPaymentOrderIds.length <= 1) return
    const next = selectedPaymentOrderIds.filter((id) => id !== order.orderId)
    setSelectedPaymentOrderIds(next)
    selectOrder(next[next.length - 1] || null)
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
                <button className={styles.primary} type="button" onClick={() => void confirmPersonalItems()} disabled={orderLoading} data-pmd-direct-kitchen-send="r33b"><Send aria-hidden="true" /> {orderLoading ? directCopy.sending : directCopy.sendOrder}</button>
              </div>
            )}

            {currentDraft && (
              <section className={styles.orderCard} data-pmd-shared-draft={currentDraft.draftId || ''} data-pmd-direct-send-recovery="r33b">
                <div className={styles.orderHeading}>
                  <div><h3>{directCopy.pendingTitle}</h3><small>{directCopy.pendingHint}</small></div>
                  <button className={styles.close} type="button" onClick={() => void refreshOrder()} aria-label="Refresh"><RefreshCw /></button>
                </div>
                {currentDraft.groups.map((group, groupIndex) => (
                  <div className={styles.guestGroup} key={group.guestSessionId || `group-${groupIndex}`}>
                    <strong>{group.guestSessionId && group.guestSessionId === guestSessionId ? copy.myItems : `${labels.tableOrder} ${groupIndex + 1}`}</strong>
                    {group.items.map((item, index) => <div className={styles.orderLine} key={`${item.menuId}-${index}`}><span>{item.quantity} × {item.name}{item.note ? <small className={styles.orderItemNote}><Receipt aria-hidden="true" />{item.note}</small> : null}</span><strong>{formatCurrency(item.subtotal)}</strong></div>)}
                  </div>
                ))}
                <div className={styles.summary}><div className={styles.summaryRow}><span>{labels.total}</span><strong>{formatCurrency(currentDraft.totals.orderTotal)}</strong></div></div>
                <div className={styles.invoiceActions}>
                  <button className={styles.secondary} type="button" onClick={continueOrdering}>{labels.continueMenu}</button>
                  <button className={styles.primary} type="button" onClick={() => void submitTableOrder()} disabled={orderLoading || !currentDraft.items.length}>
                    {orderLoading ? <LoaderCircle /> : <Send />} {orderLoading ? directCopy.sending : directCopy.finishSend}
                  </button>
                </div>
              </section>
            )}

            {!currentDraft && <button className={styles.secondary} type="button" onClick={continueOrdering}>{labels.continueMenu}</button>}

            {orderingGuestCount > 1 && tableOrders.some((order) => order.totals.remainingAmount > 0) && (
              <section className={styles.orderCard} data-pmd-multi-guest-payment-hint="r33b">
                <div className={styles.orderHeading}>
                  <div><h3>{directCopy.multiGuestTitle}</h3><small>{directCopy.multiGuestHint}</small></div>
                  <Users aria-hidden="true" />
                </div>
                <div className={styles.invoiceActions}>
                  {myOpenOrder?.orderId ? (
                    <button className={styles.secondary} type="button" onClick={() => { selectOrder(myOpenOrder.orderId); setTab('split') }}>
                      <Users aria-hidden="true" /> {directCopy.payMine}
                    </button>
                  ) : null}
                  <button className={styles.primary} type="button" onClick={() => setTab('payment')}>
                    <CreditCard aria-hidden="true" /> {directCopy.payTable}
                  </button>
                </div>
              </section>
            )}

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

        {tab === 'payment' && (
          <>
            {tableOrders.length > 1 && (
              <>
                <div className={styles.invoicePicker} data-pmd-multi-order-picker="r32" aria-label={multiCopy.selectOrders}>
                  {tableOrders.map((order) => {
                    const payable = Boolean(order.orderId && order.totals.remainingAmount > 0)
                    const active = payable
                      ? selectedPaymentOrderIds.includes(order.orderId!)
                      : selectedPaymentOrderIds.length === 0 && selectedOrderId === order.orderId
                    return (
                      <button
                        key={order.orderId || order.orderNumber || 'order'}
                        type="button"
                        className={active ? styles.selected : ''}
                        aria-pressed={active}
                        onClick={() => togglePaymentOrder(order)}
                      >
                        #{order.orderNumber || order.orderId} · {formatCurrency(order.totals.remainingAmount)}
                      </button>
                    )
                  })}
                </div>
                {selectedPaymentOrders.length > 0 && (
                  <div className={styles.multiOrderSelectionSummary} data-pmd-multi-order-selection="r32">
                    <span>{selectedPaymentOrders.length} {multiCopy.ordersSelected}</span>
                    <strong>{multiCopy.combined}: {formatCurrency(selectedPaymentTotal)}</strong>
                  </div>
                )}
              </>
            )}

            {selectedPaymentOrders.length > 1 ? (
              <MultiOrderPaymentPanel orders={selectedPaymentOrders} guestSessionId={guestSessionId} />
            ) : selectedPaymentOrders.length === 1 ? (
              <>
                <OrderTimeline order={selectedPaymentOrders[0]} />
                <PaymentPanel key={`${selectedPaymentOrders[0].orderId}-payment`} order={selectedPaymentOrders[0]} mode="payment" guestSessionId={guestSessionId} />
              </>
            ) : !selectedOrder ? (
              <div className={styles.empty}>{multiCopy.selectOrders}</div>
            ) : selectedOrder.totals.remainingAmount > 0 ? (
              <div className={styles.empty}>{multiCopy.selectOrders}</div>
            ) : (
              <>
                <OrderTimeline order={selectedOrder} />
                <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>
                  #{selectedOrder.orderNumber || selectedOrder.orderId} · {copy.paymentComplete} · {operationalStatusLabel(selectedOrder, labels, copy)}
                </div>
                <InvoiceDownloadButton order={selectedOrder} />
                <PaidOrderReviewCard key={selectedOrder.orderId || selectedOrder.orderNumber || 'paid-order'} order={selectedOrder} />
              </>
            )}
          </>
        )}

        {tab === 'split' && (
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
              <>
                <OrderTimeline order={selectedOrder} />
                <div className={`${styles.statusMessage} ${styles.statusSuccess}`}>
                  #{selectedOrder.orderNumber || selectedOrder.orderId} · {copy.paymentComplete} · {operationalStatusLabel(selectedOrder, labels, copy)}
                </div>
                <InvoiceDownloadButton order={selectedOrder} />
                <PaidOrderReviewCard key={selectedOrder.orderId || selectedOrder.orderNumber || 'paid-order'} order={selectedOrder} />
              </>
            ) : (
              <>
                <OrderTimeline order={selectedOrder} />
                <PaymentPanel key={`${selectedOrder.orderId}-split`} order={selectedOrder} mode="split" guestSessionId={guestSessionId} />
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
