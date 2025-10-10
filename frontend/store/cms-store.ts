import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { menuData, type MenuItem } from "@/lib/data"

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

type CmsState = {
  settings: CmsSettings
  menuItems: MenuItem[]
  paymentOptions: PaymentOption[]
  tipSettings: TipSettings
  merchantSettings: MerchantSettings
  updateSettings: (newSettings: Partial<CmsSettings>) => void
  updateMenuItem: (updatedItem: MenuItem) => void
  setMenuItems: (items: MenuItem[]) => void
  togglePaymentOption: (id: PaymentOption["id"]) => void
  updateTipSettings: (newSettings: Partial<TipSettings>) => void
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
  percentages: [10, 15, 20],
  defaultPercentage: 15,
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
      updateMerchantSettings: (newSettings) =>
        set((state) => ({
          merchantSettings: { ...state.merchantSettings, ...newSettings },
        })),
    }),
    {
      name: "paymydine-cms-storage",
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
        if (state) state.isInitialized = true
      },
    },
  ),
)