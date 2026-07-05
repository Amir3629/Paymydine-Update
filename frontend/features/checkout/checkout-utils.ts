import type { CartItem } from "../../store/cart-store"
import type { CheckoutTaxSettings, SplitSourceItem } from "./types"

export const CHECKOUT_ALLOWED_PAYMENT_METHOD_CODES = new Set(["card", "apple_pay", "google_pay", "wero", "paypal", "cod"])

export function filterVisiblePaymentMethods<T extends { code: string }>(paymentMethods: T[] | null | undefined): T[] {
  return (paymentMethods || []).filter((method) => CHECKOUT_ALLOWED_PAYMENT_METHOD_CODES.has(method.code))
}

export function mapPaymentMethodsByCode<T extends { code: string }>(paymentMethods: T[] | null | undefined): Map<string, T> {
  return new Map((paymentMethods || []).map((method) => [method.code, method]))
}

export function tableOrderTotalByCode(response: unknown, code: string): number {
  const rows = Array.isArray((response as any)?.order_totals) ? (response as any).order_totals : []
  const found = rows.find((row: any) => String(row?.code || "").toLowerCase() === code.toLowerCase())
  const amount = Number(found?.value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

export function tableOrderVatPercentage(response: unknown, fallback = 0): number {
  const rows = Array.isArray((response as any)?.order_totals) ? (response as any).order_totals : []
  const taxRow = rows.find((row: any) => String(row?.code || "").toLowerCase() === "tax")
  const title = String(taxRow?.title || "")
  const match = title.match(/([0-9]+(?:\.[0-9]+)?)\s*%/)
  const parsed = match ? Number(match[1]) : Number(fallback || 0)
  return Number.isFinite(parsed) ? parsed : 0
}

export function calculateCheckoutTax(subtotal: number, taxSettings: CheckoutTaxSettings): number {
  if (!taxSettings.enabled || Number(taxSettings.percentage || 0) === 0 || taxSettings.menuPrice === 0) {
    return 0
  }
  return subtotal * (Number(taxSettings.percentage || 0) / 100)
}

export function calculateCartPricingSummary(items: CartItem[], taxSettings: CheckoutTaxSettings) {
  const totalItems = items.reduce((acc, item) => acc + Number(item.quantity || 0), 0)
  const subtotal = items.reduce((acc, item) => acc + Number(item.item.price || 0) * Number(item.quantity || 0), 0)
  const tax = taxSettings.enabled && Number(taxSettings.percentage || 0) > 0 && taxSettings.menuPrice === 1
    ? subtotal * (Number(taxSettings.percentage || 0) / 100)
    : 0
  return { totalItems, subtotal, tax, total: subtotal + tax }
}

export function buildEvenSharePercents(count: number): number[] {
  const safeCount = Math.max(2, Math.min(10, count))
  const base = Math.floor(100 / safeCount)
  const remainder = 100 - base * safeCount
  return Array.from({ length: safeCount }, (_, idx) => base + (idx === 0 ? remainder : 0))
}

export function toPositiveAmount(value: unknown): number | null {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? amount : null
}

export function getOrderItemOptionsKey(item: any): string {
  const rawOptions = item?.options ?? item?.modifiers ?? item?.selected_options ?? null
  if (!rawOptions) return ""
  if (typeof rawOptions === "string") return rawOptions
  if (Array.isArray(rawOptions)) {
    return JSON.stringify(rawOptions.map((option) => typeof option === "object" ? Object.keys(option).sort().reduce((acc: any, key) => ({ ...acc, [key]: option[key] }), {}) : option))
  }
  if (typeof rawOptions === "object") {
    return JSON.stringify(Object.keys(rawOptions).sort().reduce((acc: any, key) => ({ ...acc, [key]: rawOptions[key] }), {}))
  }
  return String(rawOptions)
}

export function isCancelledOrderItem(item: any): boolean {
  const status = String(
    item?.status ??
      item?.order_status ??
      item?.item_status ??
      item?.state ??
      item?.void_status ??
      ""
  ).trim().toLowerCase()

  return ["cancelled", "canceled", "void", "voided", "refunded", "removed"].includes(status) ||
    item?.cancelled === true ||
    item?.canceled === true ||
    item?.is_cancelled === true ||
    item?.is_canceled === true ||
    item?.is_void === true ||
    item?.voided === true
}

export function getOrderItemUnitAmount(item: any): number {
  const quantity = Math.max(1, Number(item?.quantity || 1))
  const explicitPrice = Number(item?.price ?? item?.unit_price)
  if (Number.isFinite(explicitPrice)) return explicitPrice
  const subtotalAmount = Number(item?.subtotal ?? item?.total)
  return Number.isFinite(subtotalAmount) ? subtotalAmount / quantity : 0
}

export function groupOrderDisplayItems<T extends Record<string, any>>(items: T[] = []): Array<T & { name: string; quantity: number; price: number; subtotal: number; optionsKey: string }> {
  const grouped = new Map<string, T & { name: string; quantity: number; price: number; subtotal: number; optionsKey: string }>()
  items.forEach((item, index) => {
    if (isCancelledOrderItem(item)) return

    const quantity = Math.max(1, Number(item?.quantity || 1))
    const unitAmount = getOrderItemUnitAmount(item)
    const name = String(item?.name || `Item ${index + 1}`)
    const optionsKey = getOrderItemOptionsKey(item)
    const key = `${item?.menu_id || item?.order_menu_id || item?.id || name}|${name}|${optionsKey}`
    const existing = grouped.get(key)
    if (existing) {
      existing.quantity += quantity
      existing.subtotal += unitAmount * quantity
    } else {
      grouped.set(key, { ...item, name, quantity, price: unitAmount, subtotal: unitAmount * quantity, optionsKey })
    }
  })
  return Array.from(grouped.values())
}

export function calculateSplitSubtotal(items: SplitSourceItem[]): number {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0)
}

export function countUnassignedSplitItems(items: SplitSourceItem[], itemAssignments: Record<string, number | null | undefined>): number {
  return items.filter((item) => itemAssignments[item.key] === undefined || itemAssignments[item.key] === null).length
}

export function sumSharePercents(sharePercents: number[], splitGuestCount: number): number {
  return sharePercents.slice(0, splitGuestCount).reduce((sum, value) => sum + Number(value || 0), 0)
}
