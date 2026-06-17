import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { apiClient } from "@/lib/api-client"
import {
  initialMerchantSettings,
  initialPaymentOptions,
  initialSettings,
  initialTipSettings,
  initialVATSettings,
} from "@/store/cms/defaults"
import { buildAppliedCouponFromApiData } from "@/store/cms/coupon-settings"
import { buildMerchantSettingsFromSettingsPayload } from "@/store/cms/merchant-settings"
import { buildVATSettingsFromApiData } from "@/store/cms/vat-settings"
import type { CmsState, PmdSocialPlatformId } from "@/store/cms/types"

export type { PmdSocialPlatformId }

export const useCmsStore = create<CmsState>()(
  persist(
    (set, get) => ({
      settings: initialSettings,
      menuItems: [],
      paymentOptions: initialPaymentOptions,
      tipSettings: initialTipSettings,
      taxSettings: initialVATSettings,
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
      updateVATSettings: (newSettings) =>
        set((state) => ({
          taxSettings: { ...state.taxSettings, ...newSettings },
        })),
      updateTaxSettings: (newSettings) =>
        set((state) => ({
          taxSettings: { ...state.taxSettings, ...newSettings },
        })),

      loadMerchantSettings: async () => {
        try {
          console.log("🔄 CMS Store: Loading merchant settings from backend...")
          const res: any = await apiClient.getSettings()
          const payload: any = res?.data ?? res
          const newMs = buildMerchantSettingsFromSettingsPayload(payload)

          console.log("✅ CMS Store: Merchant settings loaded:", {
            paypalClientIdPresent: !!newMs.paypalClientId,
            currency: newMs.currency,
            businessName: newMs.businessName,
          })

          set((state) => ({
            merchantSettings: { ...state.merchantSettings, ...newMs },
            isInitialized: true,
          }))
        } catch (error) {
          console.error("❌ CMS Store: Failed to load merchant settings:", error)
        }
      },

      loadVATSettings: async () => {
        try {
          console.log("🔄 CMS Store: Loading VAT settings from backend...")
          const response = await apiClient.getVATSettings()
          console.log("📡 CMS Store: VAT settings API response:", response)

          if (response.success && response.data) {
            const taxSettings = buildVATSettingsFromApiData(response.data)
            console.log("✅ CMS Store: Parsed VAT settings:", taxSettings)
            set({ taxSettings })
          } else {
            console.warn("⚠️ CMS Store: No VAT data in response")
          }
        } catch (error) {
          console.error("❌ CMS Store: Failed to load VAT settings:", error)
        }
      },
      loadTaxSettings: async () => get().loadVATSettings(),
      validateCoupon: async (code: string, subtotal: number) => {
        try {
          console.log('🔄 CMS Store: Validating coupon code:', code)
          const response = await apiClient.validateCoupon(code, subtotal)
          console.log('📡 CMS Store: Coupon validation response:', response)

          if (response.success && response.data) {
            set({
              appliedCoupon: buildAppliedCouponFromApiData(response.data),
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
      version: 2,
      // Never persist menuItems – menu must come from API (admin) only
      partialize: (state) => ({
        ...state,
        menuItems: [],
      }),
      migrate: (persistedState: any, version: number) => {
        if (persistedState?.state) {
          persistedState.state.menuItems = []
        }
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
