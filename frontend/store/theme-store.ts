import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiClient } from '@/lib/api-client'
import { themes, applyTheme, getCurrentTheme, type Theme } from '@/lib/theme-system'
import { buildSafeThemeOverrides } from '@/lib/theme-loader'
import { shouldSkipLegacyThemeForGoldCustomer } from '@/lib/customer-route-guard'

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
  background_color: '#fdf7f4'
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
        set({ currentTheme: themeId })
        
        if (!shouldSkipLegacyThemeForGoldCustomer()) {
          // Apply theme – let CSS variables handle backgrounds
          applyTheme(themeId)
        }
        
        // Do NOT set any "forced" override flags; admin is the source of truth
      },

      loadSettings: async () => {
        if (shouldSkipLegacyThemeForGoldCustomer()) return
        const now = Date.now()

        set({ isLoading: true })
        
        try {
          const response = await apiClient.getThemeSettings()
          
          if (response.success && response.data) {
            const adminThemeId = response.data.theme_id || response.frontend_theme || 'clean-light'
            
            const overrides = buildSafeThemeOverrides(adminThemeId, response.data)

            // Update store with admin theme (always use admin selection)
            set({ 
              settings: { ...defaultSettings, ...response.data },
              currentTheme: adminThemeId,  // Always use admin theme
              lastFetched: now,
              isLoading: false 
            })
            
            if (!shouldSkipLegacyThemeForGoldCustomer()) {
              applyTheme(adminThemeId, overrides)
            }
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
