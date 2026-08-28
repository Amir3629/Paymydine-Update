'use client'

import { useEffect } from 'react'
import { RuntimeOverlays as BaseRuntimeOverlays } from './RuntimeOverlays'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'

function copyFor(locale: string) {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return { payPlace: 'Bezahlen & bestellen', preparing: 'Zahlung wird vorbereitet …', food: 'Wird zubereitet', ready: 'Bereit', longer: 'Braucht etwas länger', around: 'Voraussichtlich bereit gegen' }
  if (lang === 'fa') return { payPlace: 'پرداخت و ثبت سفارش', preparing: 'در حال آماده‌سازی پرداخت…', food: 'در حال آماده‌سازی', ready: 'آماده', longer: 'کمی بیشتر زمان می‌برد', around: 'زمان تقریبی آماده شدن' }
  if (lang === 'tr') return { payPlace: 'Öde ve sipariş ver', preparing: 'Ödeme hazırlanıyor …', food: 'Hazırlanıyor', ready: 'Hazır', longer: 'Biraz daha uzun sürüyor', around: 'Tahmini hazır olma' }
  if (lang === 'ja') return { payPlace: '支払って注文', preparing: '支払いを準備中 …', food: '調理中', ready: '準備完了', longer: 'もう少し時間がかかります', around: '準備予定' }
  return { payPlace: 'Pay & place order', preparing: 'Preparing payment …', food: 'Preparing', ready: 'Ready', longer: 'Taking a little longer', around: 'Estimated ready around' }
}

// PMD_ORDERING_FLOW_REVOLUTION_R60T
// Scenario presentation only. Payment, coupon, tip, provider and invoice owners
// remain inside the proven RuntimeOverlays/payment components.
// React-owned child nodes are never rewritten here.
// PMD_R64_FINAL_SELF_HISTORY_INVOICE_TABLE_LIFECYCLE
export function RuntimeOverlays() {
  const runtime = useMenuRuntime()
  useEffect(() => {
    const copy = copyFor(runtime.locale)
    document.querySelectorAll<HTMLElement>('[data-pmd-direct-kitchen-send="r33b"]').forEach((button) => {
      const label = runtime.orderLoading ? copy.preparing : copy.payPlace
      button.setAttribute('data-pmd-ordering-flow', 'r60t-pay-first')
      button.setAttribute('data-pmd-r60t-label', label)
      button.setAttribute('aria-label', label)
    })

    const root = document.querySelector<HTMLElement>('[data-pmd-table-round-flow="r27"]')
    if (!root) return
    root.setAttribute('data-pmd-ordering-flow', 'r60t')

    const currentSelected = runtime.selectedOrder as any
    const isSelfOrder = currentSelected?.orderOrigin === 'guest_self'
    const hasSharedStaffOrder = runtime.tableOrders.some((order: any) => order?.orderOrigin === 'staff_shared')
    root.setAttribute('data-pmd-r60t-self-order', isSelfOrder ? 'true' : 'false')
    root.setAttribute('data-pmd-r60t-has-staff-shared', hasSharedStaffOrder ? 'true' : 'false')

    root.querySelectorAll<HTMLElement>('article[data-pmd-order-id]').forEach((article) => {
      article.removeAttribute('data-pmd-kitchen-eta')
      const orderId = Number(article.dataset.pmdOrderId || 0)
      const order = runtime.tableOrders.find((candidate: any) => Number(candidate?.orderId || 0) === orderId) as any
      if (!order || order.showCustomerEta === false || !order.kitchenReleased) return

      const status = String(order.statusName || '').toLowerCase()
      const phase = String(order.kitchenPhase || '').toLowerCase()
      let label = ''
      if (status.includes('ready') || status.includes('delivery') || phase === 'ready') {
        label = copy.ready
      } else if (order.etaTakingLonger) {
        label = `${copy.food} · ${copy.longer}`
      } else if (order.estimatedReadyAt) {
        const due = new Date(String(order.estimatedReadyAt))
        const dueLabel = Number.isNaN(due.getTime()) ? '' : due.toLocaleTimeString(runtime.locale || undefined, { hour: '2-digit', minute: '2-digit' })
        label = dueLabel ? `${copy.food} · ${copy.around} ${dueLabel}` : copy.food
      } else if (order.remainingPrepMinutes != null) {
        label = `${copy.food} · ~${Math.max(0, Math.round(Number(order.remainingPrepMinutes || 0)))} min`
      } else {
        label = copy.food
      }
      article.setAttribute('data-pmd-kitchen-eta', label)
    })

  }, [runtime.locale, runtime.orderLoading, runtime.overlay, runtime.selectedOrder, runtime.tableOrders])

  return (
    <>
      <style>{`
        [data-pmd-direct-kitchen-send="r33b"][data-pmd-ordering-flow="r60t-pay-first"] {
          font-size: 0;
        }
        [data-pmd-direct-kitchen-send="r33b"][data-pmd-ordering-flow="r60t-pay-first"]::after {
          content: attr(data-pmd-r60t-label);
          font-size: 0.95rem;
          line-height: 1.2;
        }
        [data-pmd-ordering-flow="r60t"] article[data-pmd-order-id] > :last-child {
          grid-template-columns: minmax(0, 1fr);
        }
        [data-pmd-ordering-flow="r60t"] article[data-pmd-order-id] > :last-child > button:first-child {
          display: none;
        }
        [data-pmd-ordering-flow="r60t"] article[data-pmd-order-id] > :last-child > button {
          width: 100%;
        }

        [data-pmd-ordering-flow="r60t"] article[data-pmd-kitchen-eta]::after {
          content: attr(data-pmd-kitchen-eta);
          display: block;
          margin-top: 0.65rem;
          padding: 0.62rem 0.75rem;
          border: 1px solid color-mix(in srgb, var(--pmd-accent, #08745c) 28%, transparent);
          border-radius: 0.75rem;
          background: color-mix(in srgb, var(--pmd-accent, #08745c) 9%, transparent);
          color: var(--pmd-text, inherit);
          font-size: 0.85rem;
          font-weight: 750;
          line-height: 1.25;
        }

        /* Compact self-order payment composition. The payment implementation stays untouched. */
        [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] {
          gap: 0.55rem;
        }
        [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] > div:has(> div > button:nth-child(4)) {
          gap: 0.45rem;
        }
        [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] > div:has(> div > button:nth-child(4)) > div:first-child {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.4rem;
        }
        [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] > div:has(> div > button:nth-child(4)) > label {
          gap: 0.25rem;
        }
        [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] > div:has(> input):has(> button) {
          gap: 0.5rem;
        }
        [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] > div:has(> button:nth-child(3) > svg) {
          gap: 0.45rem;
        }
        [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] > div:has(> button:nth-child(3) > svg) > button {
          min-width: 0;
          padding-inline: 0.65rem;
        }
        [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] > :first-child,
        [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] > :nth-last-child(2) {
          padding-block: 0.75rem;
        }
        @media (min-width: 421px) {
          [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] > div:has(> button:nth-child(3) > svg) {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 420px) {
          [data-pmd-ordering-flow="r60t"] [data-pmd-payment-order-id] > div:has(> div > button:nth-child(4)) > div:first-child {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        [data-pmd-ordering-flow="r60t"] [data-pmd-multi-order-picker="r32"],
        [data-pmd-ordering-flow="r60t"] [data-pmd-multi-order-selection="r32"],
        [data-pmd-ordering-flow="r60t"] [data-pmd-multi-order-payment="r32"],
        [data-pmd-ordering-flow="r60t"] [data-pmd-multi-guest-payment-hint="r33b"] {
          display: none;
        }
      `}</style>
      <BaseRuntimeOverlays />
    </>
  )
}
