'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useMenuRuntime } from '@/src/runtime/MenuRuntimeContext'
import styles from './ThemeTableBadge.module.css'

function normalizedText(value: string | null | undefined): string {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function findHeroHost(root: HTMLElement): HTMLElement {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('section, div'))
  const namedHero = candidates.find((element) => /hero/i.test(String(element.className || '')))
  if (namedHero) return namedHero

  const visualSection = Array.from(root.querySelectorAll<HTMLElement>('section')).find((section) => (
    Boolean(section.querySelector('img'))
  ))
  return visualSection || root
}

/* PMD_THEME_TABLE_BADGE_R38
 * One shared table-number authority for all ten V2 themes. The badge is portaled
 * into each theme's hero and inherits that theme's PMD color variables, so the
 * table context stays visually prominent without duplicating ten implementations.
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
    nextHost.dataset.pmdTableBadgeHost = 'r38'

    const expected = normalizedText(`${labels.table} ${tableDisplay}`)
    const originals = Array.from(root.querySelectorAll<HTMLElement>('span, div')).filter((element) => {
      if (element.dataset.pmdTableBadge === 'r38') return false
      return normalizedText(element.textContent) === expected
    })

    originals.forEach((element) => {
      element.dataset.pmdTableBadgeOriginal = 'r38'
    })

    setHost(nextHost)

    return () => {
      if (nextHost.dataset.pmdTableBadgeHost === 'r38') {
        delete nextHost.dataset.pmdTableBadgeHost
      }
      originals.forEach((element) => {
        if (element.dataset.pmdTableBadgeOriginal === 'r38') {
          delete element.dataset.pmdTableBadgeOriginal
        }
      })
    }
  }, [labels.table, tableDisplay])

  if (!host || !tableDisplay) return null

  return createPortal(
    <div
      className={styles.badge}
      data-pmd-table-badge="r38"
      aria-label={`${labels.table} ${tableDisplay}`}
    >
      <span>{labels.table}</span>
      <strong>{tableDisplay}</strong>
    </div>,
    host,
  )
}
