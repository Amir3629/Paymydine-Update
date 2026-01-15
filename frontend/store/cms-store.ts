import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { menuData, type MenuItem } from "@/lib/data"
import { apiClient } from "@/lib/api-client"

type CmsSettings = {
  appName: string
  logoUrl: string
  tableNumber: number
}

type PaymentOption = {
  id: "visa" | "mastercard" | "paypal" | "cash" | "applepay" | "googlepay"
  enabled: boolean
}

type MerchantSettings = {
  businessName: string
  accountId: string
  stripeSecretKey: string
  stripePublishableKey: string
  paypalClientId: string
  paypalClientSecret: string
  bankAccountNumber: string
  bankRoutingNumber: string
  bankName: string
  currency: string
  countryCode: string
}

type TipSettings = {
  enabled: boolean
  percentages: number[]
  defaultPercentage: number
}

type TaxSettings = {
  enabled: boolean
  percentage: number
  menuPrice: number // 0 = include tax in menu price, 1 = apply tax on menu price
}

type AppliedCoupon = {
  coupon_id: number
  code: string
  name: string
  type: 'F' | 'P' // F = Fixed, P = Percentage
  discount: number // Calculated discount amount
  discount_value: number // Original discount value from coupon
  min_total: number
} | null

type CmsState = {
  settings: CmsSettings
  menuItems: MenuItem[]
  paymentOptions: PaymentOption[]
  tipSettings: TipSettings
  taxSettings: TaxSettings
  appliedCoupon: AppliedCoupon
  merchantSettings: MerchantSettings
  updateSettings: (newSettings: Partial<CmsSettings>) => void
  updateMenuItem: (updatedItem: MenuItem) => void
  setMenuItems: (items: MenuItem[]) => void
  togglePaymentOption: (id: PaymentOption["id"]) => void
  updateTipSettings: (newSettings: Partial<TipSettings>) => void
  updateTaxSettings: (newSettings: Partial<TaxSettings>) => void
  loadTaxSettings: () => Promise<void>
  validateCoupon: (code: string, subtotal: number) => Promise<{ success: boolean; message?: string }>
  removeCoupon: () => void
  updateMerchantSettings: (newSettings: Partial<MerchantSettings>) => void
  isInitialized: boolean
}

const initialSettings: CmsSettings = {
  appName: "PayMyDine",
  logoUrl: "",
  tableNumber: 7,
}

const initialPaymentOptions: PaymentOption[] = [
  { id: "visa", enabled: true },
  { id: "mastercard", enabled: true },
  { id: "paypal", enabled: true },
  { id: "cash", enabled: true },
  { id: "applepay", enabled: true },
  { id: "googlepay", enabled: true },
]

const initialTipSettings: TipSettings = {
  enabled: true,
  percentages: [0, 5, 10],
  defaultPercentage: 10,
}

const initialTaxSettings: TaxSettings = {
  enabled: false,
  percentage: 0,
  menuPrice: 1, // Default: apply tax on menu price
}

const initialMerchantSettings: MerchantSettings = {
  businessName: "PayMyDine Restaurant",
  accountId: "",
  stripeSecretKey: "",
  stripePublishableKey: "",
  paypalClientId: "",
  paypalClientSecret: "",
  bankAccountNumber: "",
  bankRoutingNumber: "",
  bankName: "",
  currency: "USD",
  countryCode: "US",
}

export const useCmsStore = create<CmsState>()(
  persist(
    (set, get) => ({
      settings: initialSettings,
      menuItems: menuData,
      paymentOptions: initialPaymentOptions,
      tipSettings: initialTipSettings,
      taxSettings: initialTaxSettings,
      appliedCoupon: null,
      merchantSettings: initialMerchantSettings,
      isInitialized: false,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      updateMenuItem: (updatedItem) =>
        set((state) => ({
          menuItems: state.menuItems.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
        })),
      setMenuItems: (items) => set({ menuItems: items }),
      togglePaymentOption: (id) =>
        set((state) => ({
          paymentOptions: state.paymentOptions.map((option) =>
            option.id === id ? { ...option, enabled: !option.enabled } : option,
          ),
        })),
      updateTipSettings: (newSettings) =>
        set((state) => ({
          tipSettings: { ...state.tipSettings, ...newSettings },
        })),
      updateTaxSettings: (newSettings) =>
        set((state) => ({
          taxSettings: { ...state.taxSettings, ...newSettings },
        })),
      loadTaxSettings: async () => {
        try {
          console.log('🔄 CMS Store: Loading tax settings from backend...')
          const response = await apiClient.getTaxSettings()
          console.log('📡 CMS Store: Tax settings API response:', response)
          
          if (response.success && response.data) {
            // Backend returns tax_mode, tax_percentage, tax_menu_price from settings table
            const taxMode = parseInt(response.data.tax_mode || '0', 10)
            const taxPercentage = parseFloat(response.data.tax_percentage || '0')
            const taxMenuPrice = parseInt(response.data.tax_menu_price || '1', 10)
            
            console.log('✅ CMS Store: Parsed tax settings:', {
              enabled: taxMode === 1,
              percentage: taxPercentage,
              menuPrice: taxMenuPrice,
            })
            
            set({
              taxSettings: {
                enabled: taxMode === 1,
                percentage: taxPercentage,
                menuPrice: taxMenuPrice,
              },
            })
          } else {
            console.warn('⚠️ CMS Store: No tax data in response')
          }
        } catch (error) {
          console.error('❌ CMS Store: Failed to load tax settings:', error)
        }
      },
      validateCoupon: async (code: string, subtotal: number) => {
        try {
          console.log('🔄 CMS Store: Validating coupon code:', code)
          const response = await apiClient.validateCoupon(code, subtotal)
          console.log('📡 CMS Store: Coupon validation response:', response)
          
          if (response.success && response.data) {
            set({
              appliedCoupon: {
                coupon_id: response.data.coupon_id,
                code: response.data.code,
                name: response.data.name,
                type: response.data.type,
                discount: response.data.discount,
                discount_value: response.data.discount_value,
                min_total: response.data.min_total,
              },
            })
            console.log('✅ CMS Store: Coupon applied successfully')
            return { success: true }
          } else {
            console.warn('⚠️ CMS Store: Coupon validation failed:', response.message)
            return { success: false, message: response.message || 'Invalid coupon code' }
          }
        } catch (error) {
          console.error('❌ CMS Store: Failed to validate coupon:', error)
          return { success: false, message: 'Failed to validate coupon' }
        }
      },
      removeCoupon: () => {
        set({ appliedCoupon: null })
        console.log('✅ CMS Store: Coupon removed')
      },
      updateMerchantSettings: (newSettings) =>
        set((state) => ({
          merchantSettings: { ...state.merchantSettings, ...newSettings },
        })),
    }),
    {
      name: "paymydine-cms-storage",
      version: 1,
      migrate: (persistedState: any, version: number) => {
        // Migrate tip settings from old [10, 15, 20] to new [0, 5, 10]
        if (persistedState?.state?.tipSettings) {
          const currentPercentages = persistedState.state.tipSettings.percentages || []
          const correctPercentages = [0, 5, 10]
          
          // Check if migration is needed
          const needsMigration = 
            currentPercentages.length !== correctPercentages.length ||
            !currentPercentages.every((p: number, i: number) => p === correctPercentages[i])
          
          if (needsMigration) {
            persistedState.state.tipSettings = {
              enabled: persistedState.state.tipSettings.enabled ?? true,
              percentages: correctPercentages,
              defaultPercentage: 10,
            }
          }
        }
        return persistedState
      },
      storage: createJSONStorage(() => {
        // Check if we're on the client side
        if (typeof window !== "undefined") {
          return localStorage
        }
        // Return a mock storage for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        }
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true
          // Backup check: Ensure tip settings are correct even after migration
          const correctPercentages = [0, 5, 10]
          const currentPercentages = state.tipSettings?.percentages || []
          const needsUpdate = 
            currentPercentages.length !== correctPercentages.length ||
            !currentPercentages.every((p, i) => p === correctPercentages[i])
          
          if (needsUpdate) {
            state.tipSettings = {
              enabled: state.tipSettings?.enabled ?? true,
              percentages: correctPercentages,
              defaultPercentage: 10,
            }
          }
        }
      },
    },
  ),
)