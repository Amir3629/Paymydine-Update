"use client"

import { useEffect, useState } from "react"
import { ORGANIC_BOTANICAL_THEME_KEY } from "./OrganicThemeContract"

export type CurrentFrontendThemeState = {
  themeId: string | null
  isResolved: boolean
}

export function useCurrentFrontendTheme(): CurrentFrontendThemeState {
  const [themeState, setThemeState] = useState<CurrentFrontendThemeState>({
    themeId: null,
    isResolved: false,
  })

  useEffect(() => {
    if (typeof document === 'undefined') return
    const readTheme = () => {
      const nextTheme = document.documentElement.getAttribute('data-theme')
      const resolved = document.documentElement.getAttribute('data-pmd-theme-resolved') === '1'

      setThemeState({
        themeId: nextTheme || null,
        // A cached Organic value is safe to use immediately because it prevents
        // the legacy Gold fallback from rendering before the admin theme call completes.
        isResolved: resolved || nextTheme === ORGANIC_BOTANICAL_THEME_KEY,
      })
    }
    readTheme()
    const observer = new MutationObserver(readTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-pmd-theme-resolved'] })
    return () => observer.disconnect()
  }, [])

  return themeState
}
