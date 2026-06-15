/**
 * Modern Green theme — shared type definitions.
 *
 * These types describe the *shape of the data* the presentational
 * theme expects. They are intentionally generic so they can be mapped
 * onto whatever domain models exist in the host application.
 *
 * Nothing here contains business logic — only structural contracts.
 */

export type ThemeMode = "dark" | "light"

export type MoneyValue = number // minor-unit agnostic; formatting handled via formatPrice prop

export interface ThemeBadge {
  label: string
  /** visual tone of the badge */
  tone?: "accent" | "neutral"
}

export interface MenuItem {
  id: string
  name: string
  description?: string
  /** numeric price; formatting is delegated to a formatPrice callback */
  price: MoneyValue
  imageUrl?: string
  badge?: ThemeBadge
  /** optional short tag list, e.g. dietary markers */
  tags?: string[]
}

export interface MenuSection {
  id: string
  title: string
  subtitle?: string
  items: MenuItem[]
}

export interface MenuCategory {
  id: string
  label: string
}

export interface CartLine {
  id: string
  name: string
  unitPrice: MoneyValue
  quantity: number
  imageUrl?: string
  /** optional note attached to a line item */
  note?: string
}

export interface OrderTotals {
  subtotal: MoneyValue
  tax?: MoneyValue
  serviceCharge?: MoneyValue
  tip?: MoneyValue
  discount?: MoneyValue
  total: MoneyValue
}

export type OrderStatus = "received" | "preparing" | "ready" | "served"

export interface OrderSummary {
  orderNumber: string
  tableLabel: string
  status: OrderStatus
  /** human readable estimate, e.g. "15–20 min" */
  estimate?: string
  lines: CartLine[]
  totals: OrderTotals
}

export interface PaymentMethodOption {
  id: string
  label: string
  /** key used by the theme to pick an icon; purely presentational */
  icon: "card" | "apple" | "google" | "wero" | "paypal" | "cash"
}

export interface TipOption {
  id: string
  label: string
  /** percentage as a whole number, or null for custom */
  percent: number | null
}

export type SplitMethod = "equally" | "by-items" | "by-shares"

export interface SplitGuest {
  id: string
  label: string
  /** amount owed by this guest */
  amount: MoneyValue
  shares?: number
}

/** A single formatter passed down so the host controls currency/locale. */
export type FormatPrice = (value: MoneyValue) => string
