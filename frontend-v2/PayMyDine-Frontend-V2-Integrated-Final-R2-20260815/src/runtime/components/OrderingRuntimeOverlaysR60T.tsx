'use client'

import { useEffect } from 'react'
import { RuntimeOverlays as BaseRuntimeOverlays } from './RuntimeOverlays'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'

function copyFor(locale: string) {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return {
    payPlace: 'Bezahlen & bestellen', preparing: 'Zahlung wird vorbereitet …',
    received: 'In der Küche', cooking: 'In Zubereitung', ready: 'Abholbereit',
    remaining: 'ca. {minutes} Min. verbleibend', longer: 'Die Küche braucht etwas mehr Zeit · wird weiter zubereitet', adjusted: 'aktualisiert',
  }
  if (lang === 'fa') return {
    payPlace: 'پرداخت و ثبت سفارش', preparing: 'در حال آماده‌سازی پرداخت…',
    received: 'در آشپزخانه', cooking: 'در حال آماده‌سازی', ready: 'آماده است',
    remaining: 'حدود {minutes} دقیقه باقی‌مانده', longer: 'آشپزخانه کمی زمان بیشتری نیاز دارد · سفارش هنوز در حال آماده‌سازی است', adjusted: 'به‌روزرسانی شد',
  }
  if (lang === 'tr') return {
    payPlace: 'Öde ve sipariş ver', preparing: 'Ödeme hazırlanıyor …',
    received: 'Mutfakta', cooking: 'Hazırlanıyor', ready: 'Hazır',
    remaining: 'yaklaşık {minutes} dk kaldı', longer: 'Mutfak biraz daha zamana ihtiyaç duyuyor · hazırlanıyor', adjusted: 'güncellendi',
  }
  if (lang === 'ja') return {
    payPlace: '支払って注文', preparing: '支払いを準備中 …',
    received: 'キッチン受付済み', cooking: '調理中', ready: '準備完了',
    remaining: 'あと約{minutes}分', longer: 'キッチンでもう少し時間が必要です · 調理中', adjusted: '更新済み',
  }
  return {
    payPlace: 'Pay & place order', preparing: 'Preparing payment …',
    received: 'In the kitchen', cooking: 'Preparing', ready: 'Ready',
    remaining: 'about {minutes} min remaining', longer: 'The kitchen needs a little more time · still preparing', adjusted: 'updated',
  }
}

function etaLabel(order: any, copy: ReturnType<typeof copyFor>): string {
  if (!order || order.showCustomerEta === false || !order.kitchenReleased) return ''
  const phase = String(order.kitchenPhase || '').toLowerCase()
  if (phase === 'ready') return copy.ready
  if (order.etaTakingLonger) return copy.longer
  const remaining = Number(order.remainingPrepMinutes)
  const prefix = phase === 'preparing' ? copy.cooking : copy.received
  if (!Number.isFinite(remaining)) return prefix
  const remainingText = copy.remaining.replace('{minutes}', String(Math.max(0, Math.ceil(remaining))))
  const adjusted = Number(order.etaExtensionCount || 0) > 0 ? ` · ${copy.adjusted}` : ''
  return `${prefix} · ${remainingText}${adjusted}`
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

    runtime.tableOrders.forEach((order: any) => {
      if (!order?.orderId) return
      const card = root.querySelector<HTMLElement>(`article[data-pmd-order-id="${String(order.orderId).replace(/"/g, '')}"]`)
      if (!card) return
      const label = etaLabel(order, copy)
      if (label) {
        card.setAttribute('data-pmd-r60t-eta-visible', 'true')
        card.setAttribute('data-pmd-r60t-eta-label', label)
        card.setAttribute('data-pmd-r60t-eta-phase', String(order.kitchenPhase || 'received'))
      } else {
        card.removeAttribute('data-pmd-r60t-eta-visible')
        card.removeAttribute('data-pmd-r60t-eta-label')
        card.removeAttribute('data-pmd-r60t-eta-phase')
      }
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
        [data-pmd-ordering-flow="r60t"] article[data-pmd-order-id][data-pmd-r60t-eta-visible="true"]::before {
          content: attr(data-pmd-r60t-eta-label);
          display: block;
          margin: 0 0 0.7rem;
          padding: 0.65rem 0.75rem;
          border: 1px solid color-mix(in srgb, var(--pmd-accent, #0b725d) 22%, transparent);
          border-radius: 0.7rem;
          background: color-mix(in srgb, var(--pmd-accent, #0b725d) 8%, transparent);
          color: var(--pmd-text, inherit);
          font-size: 0.84rem;
          font-weight: 700;
          line-height: 1.35;
        }
        [data-pmd-ordering-flow="r60t"] article[data-pmd-order-id][data-pmd-r60t-eta-phase="ready"]::before {
          font-weight: 800;
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