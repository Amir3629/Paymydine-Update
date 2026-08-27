'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import styles from './ThemeTableBadge.module.css'

function findHeroHost(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-pmd-theme-hero="true"]')
}

/* PMD_THEME_HERO_TABLE_BADGE
 * One shared table-number authority for all ten V2 themes. The table context
 * belongs at the top-center of the hero so it never competes with the restaurant
 * name or the valet/language controls in the header.
 */
export function ThemeTableBadge() {
  const { tableDisplay, labels } = useMenuRuntime()
  const [host, setHost] = useState<HTMLElement | null>(null)

  useEffect(() => {
    if (!tableDisplay) {
      setHost(null)
      return
    }

    const root = document.querySelector<HTMLElement>('main[data-theme-id]')
    if (!root) return

    const nextHost = findHeroHost(root)
    if (!nextHost) {
      setHost(null)
      return
    }

    nextHost.dataset.pmdTableBadgeHost = 'hero'
    nextHost.classList.add(styles.host)
    setHost(nextHost)

    return () => {
      if (nextHost.dataset.pmdTableBadgeHost === 'hero') {
        delete nextHost.dataset.pmdTableBadgeHost
      }
      nextHost.classList.remove(styles.host)
    }
  }, [tableDisplay])

  // PMD_THEME_TABLE_BADGE_CENTER_CLEARANCE_R74B
  //
  // Keep the table pill centered. On compact screens, measure the
  // real rendered geometry and move hero copy down ONLY when the
  // centered pill would overlap the Welcome / restaurant-name area.
  useEffect(() => {
    if (!host || !tableDisplay) return

    const mobile = window.matchMedia('(max-width: 680px)')
    const heading = host.querySelector<HTMLElement>(
      '[data-pmd-hero-restaurant-name="r47"]',
    )
    const copy = heading?.parentElement

    if (!heading || !copy) return

    let frame = 0

    const resetClearance = () => {
      copy.classList.remove(styles.copyClearance)
      copy.style.removeProperty('--pmd-table-badge-clearance')
      delete copy.dataset.pmdTableBadgeClearance
    }

    const measureClearance = () => {
      window.cancelAnimationFrame(frame)

      frame = window.requestAnimationFrame(() => {
        // Always measure from the theme's natural/original position.
        resetClearance()

        if (!mobile.matches) return

        const badge = host.querySelector<HTMLElement>(
          '[data-pmd-table-badge="hero"]',
        )

        if (!badge) return

        const welcome = heading.previousElementSibling instanceof HTMLElement
          ? heading.previousElementSibling
          : heading

        const badgeRect = badge.getBoundingClientRect()
        const welcomeRect = welcome.getBoundingClientRect()

        // Preserve a small visual breathing gap below the centered pill.
        const requiredClearance = Math.ceil(
          badgeRect.bottom + 10 - welcomeRect.top,
        )

        if (requiredClearance <= 0) return

        // Collision corrections should stay modest. This is not a
        // redesign of the hero composition.
        const clearance = Math.min(64, requiredClearance)

        copy.style.setProperty(
          '--pmd-table-badge-clearance',
          `${clearance}px`,
        )
        copy.dataset.pmdTableBadgeClearance = String(clearance)
        copy.classList.add(styles.copyClearance)
      })
    }

    measureClearance()

    const observer = new ResizeObserver(measureClearance)
    observer.observe(host)
    observer.observe(copy)

    window.addEventListener('resize', measureClearance, { passive: true })
    mobile.addEventListener('change', measureClearance)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', measureClearance)
      mobile.removeEventListener('change', measureClearance)
      resetClearance()
    }
  }, [host, tableDisplay])

  if (!host || !tableDisplay) return null

  return createPortal(
    <div
      className={styles.badge}
      data-pmd-table-badge="hero"
      aria-label={`${labels.table} ${tableDisplay}`}
    >
      <span>{labels.table}</span>
      <strong>{tableDisplay}</strong>
    </div>,
    host,
  )
}
