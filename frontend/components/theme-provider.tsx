"use client"

import React, { useEffect } from 'react'
import { useThemeStore } from '@/store/theme-store'
import { initializeTheme } from '@/lib/theme-system'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { loadSettings, setTheme } = useThemeStore()

  useEffect(() => {
    console.log('🔄 ThemeProvider: Initializing theme system...')
    
    // Initialize theme system on client side
    initializeTheme()
    
    // Load theme settings from API and apply
    loadSettings().then(() => {
      console.log('✅ ThemeProvider: Settings loaded successfully')
      // After loading settings, apply the theme from API
      const { settings } = useThemeStore.getState()
      console.log('🎨 ThemeProvider: Current settings:', settings)
      if (settings.theme_id) {
        console.log('🎨 ThemeProvider: Applying theme:', settings.theme_id)
        setTheme(settings.theme_id)
      }
    }).catch((error) => {
      console.error('❌ ThemeProvider: Failed to load settings:', error)
    })
  }, [loadSettings, setTheme])

  // Ensure <html> gets theme-vars and theme-dark classes early
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.add('theme-vars')
      const { currentTheme } = useThemeStore.getState()
      const isDark = currentTheme === 'modern-dark' || currentTheme === 'gold-luxury'
      document.documentElement.classList.toggle('theme-dark', isDark)
    }
  }, [])

  return <>{children}</>
}
