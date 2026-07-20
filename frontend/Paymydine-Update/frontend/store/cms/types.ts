import type { MenuItem } from "@/lib/data"

export type CmsSettings = {
  appName: string
  logoUrl: string
  tableNumber: number
}

export type PaymentOption = {
  id: "visa" | "mastercard" | "paypal" | "cash" | "applepay" | "googlepay"
  enabled: boolean
}

export type PmdSocialPlatformId = "trustpilot" | "instagram" | "google" | "website" | "reviews"

export type PmdSocialPlatformSettings = {
  enabled: boolean
  url: string
}

export type PmdReviewSocialSettings = {
  sharePromptEnabled: boolean
  homepageSocialIconsEnabled: boolean
  platforms: Record<PmdSocialPlatformId, PmdSocialPlatformSettings>
}

export type MerchantSettings = {
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
  reviewSocial: PmdReviewSocialSettings
}

export type TipSettings = {
  enabled: boolean
  percentages: number[]
  defaultPercentage: number
}

export type VATSettings = {
  enabled: boolean
  percentage: number
  menuPrice: number
}

export type AppliedCoupon = {
  coupon_id: number
  code: string
  name: string
  type: "F" | "P"
  discount: number
  discount_value: number
  min_total: number
} | null

export type CmsState = {
  settings: CmsSettings
  menuItems: MenuItem[]
  paymentOptions: PaymentOption[]
  tipSettings: TipSettings
  taxSettings: VATSettings
  appliedCoupon: AppliedCoupon
  merchantSettings: MerchantSettings
  updateSettings: (newSettings: Partial<CmsSettings>) => void
  updateMenuItem: (updatedItem: MenuItem) => void
  setMenuItems: (items: MenuItem[]) => void
  togglePaymentOption: (id: PaymentOption["id"]) => void
  updateTipSettings: (newSettings: Partial<TipSettings>) => void
  updateVATSettings: (newSettings: Partial<VATSettings>) => void
  updateTaxSettings: (newSettings: Partial<VATSettings>) => void
  loadVATSettings: () => Promise<void>
  loadTaxSettings: () => Promise<void>
  loadMerchantSettings: () => Promise<void>
  validateCoupon: (code: string, subtotal: number) => Promise<{ success: boolean; message?: string }>
  removeCoupon: () => void
  updateMerchantSettings: (newSettings: Partial<MerchantSettings>) => void
  isInitialized: boolean
}
