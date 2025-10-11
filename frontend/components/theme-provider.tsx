"use client"

import React, { useEffect } from "react"
import { initThemeFromAdmin } from "@/lib/theme-loader"

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    console.log('🔄 ThemeProvider: Loading theme from admin...')
    // Load from admin, then cache theme + overrides for next boot
    initThemeFromAdmin().then((res) => {
      try {
        if (typeof window !== 'undefined' && res && res.themeId) {
          const parts = window.location.hostname.split('.')
          const tenant = parts.length >= 3 ? parts[0] : 'default'
          localStorage.setItem(`${tenant}:paymydine-theme`, res.themeId)
          if (res.overrides && Object.keys(res.overrides).length > 0) {
            localStorage.setItem(`${tenant}:paymydine-theme-overrides`, JSON.stringify(res.overrides))
            console.log(`💾 ThemeProvider: Cached overrides for tenant "${tenant}"`, res.overrides)
          }
        }
      } catch(_) {}
    })
  }, []) // Run once on mount

  // Ensure <html> gets theme-vars class early
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-vars')
    }
  }, [])

  return <>{children}</>
}
