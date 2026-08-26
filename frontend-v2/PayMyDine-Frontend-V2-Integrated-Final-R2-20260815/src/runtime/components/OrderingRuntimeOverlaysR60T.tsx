'use client'

import { useEffect, useRef } from 'react'
import { RuntimeOverlays as BaseRuntimeOverlays } from './RuntimeOverlays'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'

function copyFor(locale: string) {
  const lang = String(locale || 'en').toLowerCase().split('-')[0]
  if (lang === 'de') return { payPlace: 'Bezahlen & bestellen', preparing: 'Zahlung wird vorbereitet …' }
  if (lang === 'fa') return { payPlace: 'پرداخت و ثبت سفارش', preparing: 'در حال آماده‌سازی پرداخت…' }
  if (lang === 'tr') return { payPlace: 'Öde ve sipariş ver', preparing: 'Ödeme hazırlanıyor …' }
  if (lang === 'ja') return { payPlace: '支払って注文', preparing: '支払いを準備中 …' }
  return { payPlace: 'Pay & place order', preparing: 'Preparing payment …' }
}

// PMD_ORDERING_FLOW_REVOLUTION_R60T
// Scenario presentation only. Payment, coupon, tip, provider and invoice owners
// remain inside the proven RuntimeOverlays/payment components.
// React-owned child nodes are never rewritten here.
export function RuntimeOverlays() {
  const runtime = useMenuRuntime()
  const autoOpenedPaymentFor = useRef<number | null>(null)

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

    const selected = runtime.selectedOrder as any
    const isSelfOrder = selected?.orderOrigin === 'guest_self'
    root.setAttribute('data-pmd-r60t-self-order', isSelfOrder ? 'true' : 'false')

    const tabBar = root.firstElementChild as HTMLElement | null
    const tabButtons = tabBar ? Array.from(tabBar.querySelectorAll<HTMLButtonElement>(':scope > button')) : []
    const paymentTab = tabButtons[1]
    const splitTab = tabButtons[2]

    if (splitTab) {
      splitTab.toggleAttribute('aria-hidden', isSelfOrder)
      splitTab.toggleAttribute('disabled', isSelfOrder)
    }

    if (
      isSelfOrder
      && Number(selected?.orderId || 0) > 0
      && Number(selected?.totals?.remainingAmount || 0) > 0
      && runtime.overlay === 'checkout'
      && autoOpenedPaymentFor.current !== Number(selected.orderId)
      && paymentTab
    ) {
      autoOpenedPaymentFor.current = Number(selected.orderId)
      paymentTab.click()
    }

    if (!isSelfOrder) autoOpenedPaymentFor.current = null
  }, [runtime.locale, runtime.orderLoading, runtime.overlay, runtime.selectedOrder])

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
        [data-pmd-ordering-flow="r60t"][data-pmd-r60t-self-order="true"] > :first-child > button:nth-child(3) {
          display: none;
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
