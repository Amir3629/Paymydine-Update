"use client"

import React, { useEffect } from "react"
import { initThemeFromAdmin } from "@/lib/theme-loader"

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    console.log('🔄 ThemeProvider: Loading theme from admin...')
    // Single source of truth: admin-selected theme
    initThemeFromAdmin()
  }, []) // Run once on mount

  // Ensure <html> gets theme-vars class early
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-vars')
    }
  }, [])

  return <>{children}</>
}
