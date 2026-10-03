import type { MenuItem } from "@/lib/data"

export type ThemeActionResult<T = void> = T | Promise<T>

export type ThemeMenuActions = {
  onAddItem?: (item: MenuItem, quantity?: number) => ThemeActionResult
  onCallWaiter: () => ThemeActionResult
  onOpenNote: () => ThemeActionResult
  onOpenCheckout: () => ThemeActionResult
  onOpenTableOrder: () => ThemeActionResult
  onOpenValet: () => ThemeActionResult
  cartCount: number
  tableOrderCount: number
  showTableOrder: boolean
  showValet?: boolean
  tableNumber?: string | number | null
  language?: string
  currentLocale?: string
}

export type ThemeDockProps = ThemeMenuActions

export type ThemeCheckoutProps = Pick<
  ThemeMenuActions,
  "onOpenCheckout" | "onOpenTableOrder" | "cartCount" | "tableOrderCount" | "showTableOrder" | "tableNumber" | "language" | "currentLocale"
>
