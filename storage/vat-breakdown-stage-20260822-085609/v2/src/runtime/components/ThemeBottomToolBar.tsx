'use client'

import { useEffect } from 'react'
import { Bell, Car, StickyNote, ReceiptText, ShoppingBag } from 'lucide-react'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import toolbarStyles from './ThemeBottomToolBar.module.css'

type ThemeBottomToolBarProps = {
  className: string
  primaryClassName?: string
}

/* PMD_STICKY_CATEGORIES_R36
 * Every non-Japanese theme has one horizontal category <nav> made from direct
 * button children. Keep that exact theme-owned nav in the DOM and promote it to
 * a viewport-fixed bar only after its original position reaches the top.
 *
 * Kazen/Japanese intentionally uses its accordion category model and is excluded.
 * A temporary placeholder reserves the original geometry while floating so menu
 * content never jumps, and the same nav element keeps its horizontal scroll state.
 */
function useFloatingCategoryNav() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('main[data-theme-id]')
    if (!root || root.dataset.themeId === 'kazen_japanese') return

    const categoryNav = Array.from(root.querySelectorAll<HTMLElement>('nav')).find((nav) => {
      if (nav.hasAttribute('data-pmd-unified-bottom-bar')) return false
      return Array.from(nav.children).some((child) => child.tagName === 'BUTTON')
    })

    if (!categoryNav || !categoryNav.parentElement) return

    const originalCssText = categoryNav.style.cssText
    const placeholder = document.createElement('div')
    placeholder.dataset.pmdStickyCategoryPlaceholder = 'r36'
    placeholder.setAttribute('aria-hidden', 'true')
    placeholder.style.display = 'none'
    categoryNav.parentElement.insertBefore(placeholder, categoryNav)

    categoryNav.dataset.pmdStickyCategories = 'r36'
    categoryNav.dataset.pmdCategoryFloating = 'false'

    let floating = false
    let frame = 0

    const restore = () => {
      categoryNav.style.cssText = originalCssText
      categoryNav.dataset.pmdCategoryFloating = 'false'
      placeholder.style.cssText = 'display: none;'
      floating = false
    }

    const reserveOriginalSlot = (rect: DOMRect, computed: CSSStyleDeclaration) => {
      placeholder.style.display = 'block'
      placeholder.style.boxSizing = 'border-box'
      placeholder.style.height = `${rect.height}px`
      placeholder.style.width = `${rect.width}px`
      placeholder.style.margin = computed.margin
      placeholder.style.gridArea = computed.gridArea
      placeholder.style.gridColumn = computed.gridColumn
      placeholder.style.gridRow = computed.gridRow
      placeholder.style.alignSelf = computed.alignSelf
      placeholder.style.justifySelf = computed.justifySelf
      placeholder.style.flex = computed.flex
      placeholder.style.order = computed.order
    }

    const floatNav = (rect: DOMRect, computed: CSSStyleDeclaration) => {
      reserveOriginalSlot(rect, computed)

      categoryNav.style.position = 'fixed'
      categoryNav.style.top = 'max(0px, env(safe-area-inset-top, 0px))'
      categoryNav.style.left = `${rect.left}px`
      categoryNav.style.width = `${rect.width}px`
      categoryNav.style.margin = '0'
      categoryNav.style.boxSizing = 'border-box'
      categoryNav.style.zIndex = '85'

      if (computed.backgroundColor === 'transparent' || computed.backgroundColor === 'rgba(0, 0, 0, 0)') {
        categoryNav.style.backgroundColor = 'var(--pmd-surface, #fff)'
      }
      if (computed.boxShadow === 'none') {
        categoryNav.style.boxShadow = '0 .65rem 1.8rem rgba(0, 0, 0, .16)'
      }
      categoryNav.style.backdropFilter = 'blur(14px)'

      categoryNav.dataset.pmdCategoryFloating = 'true'
      floating = true
    }

    const sync = () => {
      frame = 0

      if (!floating) {
        const rect = categoryNav.getBoundingClientRect()
        if (rect.top > 0) return
        floatNav(rect, window.getComputedStyle(categoryNav))
        return
      }

      const anchorRect = placeholder.getBoundingClientRect()
      if (anchorRect.top > 0) {
        restore()
        return
      }

      categoryNav.style.left = `${anchorRect.left}px`
      categoryNav.style.width = `${anchorRect.width}px`
    }

    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(sync)
    }

    const handleResize = () => {
      if (floating) restore()
      schedule()
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', handleResize)
    schedule()

    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', handleResize)
      if (frame) window.cancelAnimationFrame(frame)
      restore()
      categoryNav.removeAttribute('data-pmd-sticky-categories')
      categoryNav.removeAttribute('data-pmd-category-floating')
      placeholder.remove()
    }
  }, [])
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

  useFloatingCategoryNav()

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
      className={`${className} ${toolbarStyles.mobileBalanced}`}
      data-pmd-unified-bottom-bar="r14"
      data-pmd-toolbar-revision="r17c"
      data-pmd-mobile-layout="balanced-r36"
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
