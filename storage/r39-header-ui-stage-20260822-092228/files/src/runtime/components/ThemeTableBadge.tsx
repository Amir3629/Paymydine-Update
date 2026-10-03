'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import styles from './ThemeTableBadge.module.css'

function normalizedText(value: string | null | undefined): string {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function findHeaderHost(root: HTMLElement): HTMLElement {
  const headers = Array.from(root.querySelectorAll<HTMLElement>('header'))
  const visibleHeader = headers.find((header) => {
    const rect = header.getBoundingClientRect()
    return rect.width > 20 && rect.height > 20
  })
  return visibleHeader || headers[0] || root
}

/* PMD_THEME_TABLE_BADGE_R39
 * One shared table-number authority for all ten V2 themes. The table context now
 * lives in the theme header rather than on top of hero photography. It stays
 * intentionally compact and inherits each theme's PMD tokens.
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

    const nextHost = findHeaderHost(root)
    nextHost.dataset.pmdTableBadgeHost = 'r39'

    const expected = normalizedText(`${labels.table} ${tableDisplay}`)
    const originals = Array.from(root.querySelectorAll<HTMLElement>('span, div')).filter((element) => {
      if (element.dataset.pmdTableBadge === 'r39') return false
      return normalizedText(element.textContent) === expected
    })

    originals.forEach((element) => {
      element.dataset.pmdTableBadgeOriginal = 'r39'
    })

    setHost(nextHost)

    return () => {
      if (nextHost.dataset.pmdTableBadgeHost === 'r39') {
        delete nextHost.dataset.pmdTableBadgeHost
      }
      originals.forEach((element) => {
        if (element.dataset.pmdTableBadgeOriginal === 'r39') {
          delete element.dataset.pmdTableBadgeOriginal
        }
      })
    }
  }, [labels.table, tableDisplay])

  if (!host || !tableDisplay) return null

  return createPortal(
    <div
      className={styles.badge}
      data-pmd-table-badge="r39"
      aria-label={`${labels.table} ${tableDisplay}`}
    >
      <span>{labels.table}</span>
      <strong>{tableDisplay}</strong>
    </div>,
    host,
  )
}
