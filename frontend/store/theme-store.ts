import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api-client'
import { themes, applyTheme, getCurrentTheme, type Theme } from '@/lib/theme-system'

export interface ThemeSettings {
  theme_id: string
  primary_color: string
  secondary_color: string
  accent_color: string
  background_color: string
  custom_colors?: Record<string, string>
}

interface ThemeStore {
  currentTheme: string
  availableThemes: Record<string, Theme>
  settings: ThemeSettings
  isLoading: boolean
  lastFetched: number
  
  // Actions
  setTheme: (themeId: string) => void
  loadSettings: () => Promise<void>
  updateSettings: (settings: Partial<ThemeSettings>) => Promise<void>
  getCSSVariables: () => Record<string, string>
}

const defaultSettings: ThemeSettings = {
  theme_id: 'clean-light',
  primary_color: '#E7CBA9',
  secondary_color: '#EFC7B1',
  accent_color: '#3B3B3B',
  background_color: '#FAFAFA'
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      currentTheme: 'clean-light', // Default, will be updated on client
      availableThemes: themes,
      settings: defaultSettings,
      isLoading: false,
      lastFetched: 0,

      setTheme: (themeId: string) => {
        console.log('🎨 ThemeStore: Setting theme to:', themeId)
        set({ currentTheme: themeId })
        
        // NUCLEAR OPTION: Force exact background colors
        const themeColors = {
          'clean-light': '#FAFAFA',
          'modern-dark': '#0A0E12',
          'gold-luxury': '#0F0B05',
          'vibrant-colors': '#e2ceb1',
          'minimal': '#CFEBF7'
        }
        
        const bgColor = themeColors[themeId as keyof typeof themeColors]
        if (bgColor) {
          console.log('🚀 ThemeStore: Forcing background color:', bgColor)
          // Force background on body and html
          if (typeof document !== 'undefined') {
            document.body.style.background = bgColor
            document.documentElement.style.background = bgColor
            
            // Also force on all main page elements
            const pageElements = document.querySelectorAll('.min-h-screen, .page--home, .page--menu')
            pageElements.forEach(el => {
              if (el instanceof HTMLElement) {
                el.style.background = bgColor
                el.style.backgroundColor = bgColor
              }
            })
          }
        }
        
        // Apply theme with forced background
        applyTheme(themeId, bgColor ? { background: bgColor } : {})
        
        // Store in localStorage to persist across API calls
        if (typeof window !== 'undefined') {
          localStorage.setItem('paymydine-theme', themeId)
          localStorage.setItem('paymydine-theme-forced', 'true')
        }
      },

      loadSettings: async () => {
        console.log('🔄 ThemeStore: Loading settings...')
        const now = Date.now()
        const { lastFetched } = get()
        
        // Check if user has manually selected a theme
        const userSelectedTheme = typeof window !== 'undefined' ? localStorage.getItem('paymydine-theme') : null
        const isThemeForced = typeof window !== 'undefined' ? localStorage.getItem('paymydine-theme-forced') === 'true' : false
        
        if (isThemeForced && userSelectedTheme) {
          console.log('🎨 ThemeStore: User has manually selected theme, skipping API override:', userSelectedTheme)
          return
        }
        
        // Remove the cache limit - always fetch from admin
        // if (now - lastFetched < 30000) {
        //   return
        // }

        set({ isLoading: true })
        
        try {
          console.log('🌐 ThemeStore: Calling API...')
          const response = await apiClient.getThemeSettings()
          console.log('📡 ThemeStore: API response:', response)
          
          if (response.success && response.data) {
            console.log('✅ ThemeStore: Settings loaded:', response.data)
            set({ 
              settings: { ...defaultSettings, ...response.data },
              lastFetched: now,
              isLoading: false 
            })
            
            // DON'T override user's current theme selection with API response
            // Only apply color overrides if present, but keep the current theme
            const { currentTheme } = get()
            console.log('🎨 ThemeStore: Keeping current theme:', currentTheme, '(API suggested:', response.data.theme_id, ')')
            
            // Pass color overrides if present
            const overrides: any = {}
            if (response.data.primary_color) overrides.primary = response.data.primary_color
            if (response.data.secondary_color) overrides.secondary = response.data.secondary_color
            if (response.data.accent_color) overrides.accent = response.data.accent_color
            // Apply background override for all themes
            if (response.data.background_color) {
              overrides.background = response.data.background_color
            }
            
            // Apply theme with overrides but keep current theme selection
            applyTheme(currentTheme, overrides)
          } else {
            console.log('⚠️ ThemeStore: No data in response')
            set({ isLoading: false })
          }
        } catch (error) {
          console.error('❌ ThemeStore: Failed to load theme settings:', error)
          set({ isLoading: false })
        }
      },

      updateSettings: async (newSettings: Partial<ThemeSettings>) => {
        try {
          const response = await apiClient.updateThemeSettings(newSettings)
          if (response.success) {
            set((state) => ({
              settings: { ...state.settings, ...newSettings }
            }))
            
            // If theme_id changed, apply the new theme
            if (newSettings.theme_id) {
              get().setTheme(newSettings.theme_id)
            }
          }
          return
        } catch (error) {
          console.error('Failed to update theme settings:', error)
          return
        }
      },

      getCSSVariables: () => {
        const { currentTheme, availableThemes } = get()
        const theme = availableThemes[currentTheme]
        if (!theme) return {}
        
        // Import the themeToCSSVariables function
        const { themeToCSSVariables } = require('@/lib/theme-system')
        return themeToCSSVariables(theme)
      }
    }),
    {
      name: 'paymydine-theme-store',
      partialize: (state) => ({ 
        currentTheme: state.currentTheme,
        settings: state.settings,
        lastFetched: state.lastFetched 
      }),
    }
  )
) 