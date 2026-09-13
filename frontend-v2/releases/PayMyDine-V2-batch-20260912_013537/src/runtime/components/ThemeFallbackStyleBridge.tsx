'use client'

import { useEffect } from 'react'

const STORAGE_KEY = 'pmd-v2:last-theme-fallback-v1'
const THEME_VARIABLES = [
  '--pmd-accent',
  '--pmd-accentText',
  '--pmd-surface',
  '--pmd-soft',
  '--pmd-control',
  '--pmd-text',
  '--pmd-muted',
  '--pmd-line',
] as const

type Snapshot = {
  themeId?: string
  background?: string
  color?: string
  values?: Record<string, string>
}

function applySnapshot(snapshot: Snapshot | null) {
  if (!snapshot || typeof document === 'undefined') return
  const root = document.documentElement
  if (snapshot.themeId) root.dataset.pmdFallbackTheme = snapshot.themeId
  if (snapshot.background) root.style.setProperty('--pmd-fallback-background', snapshot.background)
  if (snapshot.color) root.style.setProperty('--pmd-fallback-color', snapshot.color)
  for (const [name, value] of Object.entries(snapshot.values || {})) {
    if (!value) continue
    root.style.setProperty(`--pmd-fallback-${name.replace(/^--pmd-/, '')}`, value)
  }
}

export function ThemeFallbackStyleBridge() {
  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(STORAGE_KEY)
      if (saved) applySnapshot(JSON.parse(saved) as Snapshot)
    } catch {}

    let scheduled = false
    const capture = () => {
      scheduled = false
      const theme = document.querySelector<HTMLElement>('[data-theme-id]')
      if (!theme) return
      const computed = window.getComputedStyle(theme)
      const values: Record<string, string> = {}
      for (const name of THEME_VARIABLES) {
        const value = computed.getPropertyValue(name).trim()
        if (value) values[name] = value
      }
      const snapshot: Snapshot = {
        themeId: String(theme.dataset.themeId || ''),
        background: computed.backgroundColor || '',
        color: computed.color || '',
        values,
      }
      applySnapshot(snapshot)
      try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)) } catch {}
    }

    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(capture)
    }

    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'data-theme-id'],
    })
    schedule()
    return () => observer.disconnect()
  }, [])

  return null
}
