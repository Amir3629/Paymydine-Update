import type { MenuItem } from "../../lib/data"
import type { CartItem } from "../../store/cart-store"

export type CheckoutStep =
  | "review"
  | "submitted"
  | "split"
  | "split-items"
  | "split-shares"
  | "split-review"
  | "payment"
  | "paid"

export type SplitMethod = "equal" | "items" | "shares"

export type SplitSourceItem = {
  key: string
  name: string
  amount: number
  orderMenuId?: number
}

export type SplitPersonStatus = "Ready to pay" | "Pending" | "Paid"

export type SplitPerson = {
  id: string
  name: string
  avatar: string
  subtotal: number
  tax: number
  tip: number
  discount: number
  total: number
  items: Array<{ name: string; amount: number; quantity?: number }>
  status: SplitPersonStatus
  percent?: number
}

export type SplitBillItem = {
  cartIndex: number
  item: MenuItem
  price: number
  key: string
  quantity: number
  orderMenuId?: number
  menuId?: number
}

export type PmdToolbarPricingSnapshot = {
  items: Array<CartItem & { __pmdDisplayName?: string; __pmdDisplayUnitPrice?: number; __pmdDisplaySubtotal?: number }>
  subtotal: number
  tax: number
  total: number
}

export type CheckoutTaxSettings = {
  enabled?: boolean
  percentage?: number
  menuPrice?: number
}
