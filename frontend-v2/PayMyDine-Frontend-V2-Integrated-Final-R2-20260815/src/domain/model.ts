import type { ThemeId } from '@/src/themes/catalog'

export type LocaleCode = string

export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'youtube'
  | 'google'
  | 'trustpilot'
  | 'website'
  | 'whatsapp'
  | 'reviews'
  | 'x'
  | 'other'

export type SocialLink = {
  platform: SocialPlatform
  label: string
  url: string
  enabled: boolean
}

export type RestaurantBrand = {
  id: string
  name: string
  description: string
  logoUrl: string | null
  faviconUrl: string | null
  heroImageUrl: string | null
  phone: string | null
  whatsapp: string | null
  address: string | null
  currency: string
  locale: LocaleCode
  timezone: string
  footerText: string
}

export type TableContext = {
  valid: boolean
  id: string | null
  number: string | null
  name: string | null
  qr: string | null
  locationId: number | null
}

export type MenuItemOptionValue = {
  id: string
  name: string
  price: number
  isDefault: boolean
}

export type MenuItemOption = {
  id: string
  name: string
  displayType: 'radio' | 'checkbox' | 'select'
  required: boolean
  values: MenuItemOptionValue[]
}

export type Nutrition = {
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
  sugar: number | null
  servingSize: string | null
  disclaimer: string | null
}

export type MenuItem = {
  id: string
  name: string
  description: string
  translations?: Record<string, { name?: string; description?: string }>
  price: number
  categoryId: string | null
  categoryName: string
  imageUrl: string | null
  gallery: string[]
  allergens: string[]
  halal: boolean
  vegetarian: boolean
  vegan: boolean
  available: boolean
  stockQty: number | null
  prepTimeMinutes: number | null
  nutrition: Nutrition | null
  options: MenuItemOption[]
  isChefRecommended: boolean
  isBestseller: boolean
  popularityCount: number
}

export type MenuCategory = {
  id: string
  name: string
  description: string
  translations?: Record<string, string>
  imageUrl: string | null
  priority: number
}

export type MenuHighlights = {
  showChefRecommendations: boolean
  showBestsellers: boolean
  chefTitle: string
  bestsellerTitle: string
}

export type PaymentMethod = {
  code: string
  name: string
  providerCode: string | null
  enabled: boolean
  priority: number
}

export type FeatureFlags = {
  waiterCall: boolean
  valet: boolean
  tableOrdering: boolean
  splitBill: boolean
  tips: boolean
  coupons: boolean
  socialLinks: boolean
}

export type TaxConfig = {
  enabled: boolean
  percentage: number
  includedInMenuPrice: boolean
}

export type TipConfig = {
  enabled: boolean
  presets: number[]
}

export type ThemeConfiguration = {
  id: ThemeId
  version: string
  rawAdminThemeId: string
  options: Record<string, unknown>
}

export type OrderLine = {
  orderMenuId: number | null
  menuId: string
  name: string
  quantity: number
  price: number
  subtotal: number
  guestSessionId: string | null
  paidQuantity: number
  unpaidQuantity: number
}

export type OrderTotals = {
  subtotal: number
  tax: number
  total: number
  orderTotal: number
  settledAmount: number
  remainingAmount: number
}

export type TableOrderGroup = {
  guestSessionId: string | null
  items: OrderLine[]
  subtotal: number
}

export type TableOrderState = {
  success: boolean
  status: 'empty' | 'draft' | 'submitted_unpaid' | 'partially_paid' | 'paid' | string
  draftId: number | null
  orderId: number | null
  orderNumber: string | null
  payment: string | null
  paymentStatus: 'paid' | 'partial' | 'unpaid' | string
  deliveryStatus: string | null
  statusName: string | null
  canShowToNewDevice: boolean
  hasActiveTableOrder: boolean
  items: OrderLine[]
  groups: TableOrderGroup[]
  totals: OrderTotals
  prepTimeMinutes: number | null
  estimatedReadyAt: string | null
  createdAt: string | null
  updatedAt: string | null
}

export type TableOrdersState = {
  success: boolean
  sessionKey: string | null
  draft: TableOrderState | null
  orders: TableOrderState[]
  updatedAt: string | null
}

export type CustomerBootstrap = {
  apiVersion: 'pmd-customer-bootstrap-v2'
  tenant: { id: string; slug: string; host: string }
  restaurant: RestaurantBrand
  theme: ThemeConfiguration
  locales: { defaultLocale: LocaleCode; enabledLocales: LocaleCode[] }
  socialLinks: SocialLink[]
  features: FeatureFlags
  tax: TaxConfig
  tips: TipConfig
  table: TableContext
  menu: {
    categories: MenuCategory[]
    items: MenuItem[]
    highlights: MenuHighlights
    cacheVersion: string
  }
  payments: PaymentMethod[]
  activeOrder: TableOrderState | null
}

export type CartOptionSelection = {
  groupId: string
  groupName: string
  valueId: string
  valueName: string
  price: number
}

export type CartLine = {
  key: string
  item: MenuItem
  quantity: number
  selectedOptions: CartOptionSelection[]
  unitPrice: number
  subtotal: number
}

export type ServiceRequestStatus = {
  kind: 'waiter' | 'valet' | 'note'
  state: 'idle' | 'sending' | 'success' | 'error'
  message: string
}
