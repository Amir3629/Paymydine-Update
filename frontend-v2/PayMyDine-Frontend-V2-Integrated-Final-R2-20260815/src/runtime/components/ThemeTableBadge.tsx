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
    setHost(nextHost)

    return () => {
      if (nextHost.dataset.pmdTableBadgeHost === 'hero') {
        delete nextHost.dataset.pmdTableBadgeHost
      }
    }
  }, [tableDisplay])

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
