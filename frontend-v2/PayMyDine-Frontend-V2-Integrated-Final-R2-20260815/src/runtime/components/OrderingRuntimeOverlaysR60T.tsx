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
// This wrapper changes scenario presentation only. The underlying RuntimeOverlays
// continues to own coupons, tips, payment methods/providers, invoices and split UI.
// We intentionally do not fork those payment components.
export function RuntimeOverlays() {
  const runtime = useMenuRuntime()
  const autoOpenedPaymentFor = useRef<number | null>(null)

  useEffect(() => {
    const copy = copyFor(runtime.locale)

    const apply = () => {
      document.querySelectorAll<HTMLElement>('[data-pmd-direct-kitchen-send="r33b"]').forEach((button) => {
        const label = runtime.orderLoading ? copy.preparing : copy.payPlace
        button.setAttribute('data-pmd-ordering-flow', 'r60t-pay-first')
        button.setAttribute('aria-label', label)
        if ((button.textContent || '').trim() !== label) button.textContent = label
      })

      const root = document.querySelector<HTMLElement>('[data-pmd-table-round-flow="r27"]')
      if (!root) return
      root.setAttribute('data-pmd-ordering-flow', 'r60t')

      const selected = runtime.selectedOrder as any
      const isSelfOrder = selected?.orderOrigin === 'guest_self'
      const isSharedStaffOrder = selected?.orderOrigin === 'staff_shared'
      const tabBar = root.firstElementChild as HTMLElement | null
      const tabButtons = tabBar ? Array.from(tabBar.querySelectorAll<HTMLButtonElement>(':scope > button')) : []
      const paymentTab = tabButtons[1]
      const splitTab = tabButtons[2]

      if (splitTab) {
        splitTab.style.display = isSelfOrder ? 'none' : ''
        splitTab.toggleAttribute('aria-hidden', isSelfOrder)
        splitTab.toggleAttribute('disabled', isSelfOrder)
      }

      // A QR self-order must be paid before kitchen release, so after the cart action
      // take the guest directly to the existing payment UI. Staff orders keep the
      // normal Orders / Payment / Split navigation.
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

      if (!isSelfOrder && !isSharedStaffOrder) autoOpenedPaymentFor.current = null

      // R60T intentionally removes the old "combine several table orders" layer.
      // One private guest order is paid as one order; one shared Staff/Cashier bill
      // is paid or split as that bill. This removes complexity without touching any
      // underlying payment method, coupon, tip, provider, or invoice implementation.
      root.querySelectorAll<HTMLElement>('[data-pmd-multi-order-picker="r32"], [data-pmd-multi-order-selection="r32"], [data-pmd-multi-order-payment="r32"], [data-pmd-multi-guest-payment-hint="r33b"]').forEach((element) => {
        element.style.display = 'none'
      })
    }

    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [runtime.locale, runtime.orderLoading, runtime.overlay, runtime.selectedOrder])

  return <BaseRuntimeOverlays />
}
