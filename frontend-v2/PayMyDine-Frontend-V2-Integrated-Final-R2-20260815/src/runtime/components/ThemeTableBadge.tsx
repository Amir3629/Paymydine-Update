'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import styles from './ThemeTableBadge.module.css'

function findHeroHost(root: HTMLElement): HTMLElement | null {
  return root.querySelector<HTMLElement>('[data-pmd-theme-hero="true"]')
}

const clearanceClasses = [
  styles.clearance16,
  styles.clearance32,
  styles.clearance48,
  styles.clearance64,
]

function clearanceClass(required: number): string {
  if (required <= 16) return styles.clearance16
  if (required <= 32) return styles.clearance32
  if (required <= 48) return styles.clearance48
  return styles.clearance64
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

  // PMD_THEME_TABLE_BADGE_CENTER_CLEARANCE_R75
  // Preserve collision-aware hero spacing without runtime style mutation.
  // Geometry is measured, then mapped onto one of four CSS-owned spacing
  // classes. CSS remains the rendering authority and the adjustment is bounded.
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
      copy.classList.remove(styles.copyClearance, ...clearanceClasses)
      delete copy.dataset.pmdTableBadgeClearance
    }

    const measureClearance = () => {
      window.cancelAnimationFrame(frame)

      frame = window.requestAnimationFrame(() => {
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
        const requiredClearance = Math.ceil(badgeRect.bottom + 10 - welcomeRect.top)
        if (requiredClearance <= 0) return

        const clearance = Math.min(64, requiredClearance)
        copy.dataset.pmdTableBadgeClearance = String(clearance)
        copy.classList.add(styles.copyClearance, clearanceClass(clearance))
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
