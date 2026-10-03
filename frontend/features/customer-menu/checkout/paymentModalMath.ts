import { isCancelledOrderItem } from "@/features/checkout/checkout-utils"

export function estimatePrepMinutes(items: Array<any>): number {
  const normalized = (items || []).filter((item) => !isCancelledOrderItem(item)).map((item) => ({
    quantity: Math.max(1, Number(item?.quantity || 1)),
    prep: Math.max(0, Number(item?.prep_time_minutes ?? item?.item?.prep_time_minutes ?? 15) || 15),
  }))

  const quantity = normalized.reduce((acc, item) => acc + item.quantity, 0)
  const base = normalized.reduce((acc, item) => Math.max(acc, item.prep), 15)
  const buffer = Math.min(15, Math.max(0, (quantity - 1) * 2))

  return Math.max(10, Math.min(90, Math.round(base + buffer)))
}

export function positiveMoney(value: any): number | null {
  const amount = Number(value || 0)
  if (!Number.isFinite(amount) || amount <= 0) return null
  return Number(amount.toFixed(2))
}

export function subtotalFromSubmittedPaymentRows(rows: Array<any>): number | null {
  const total = (rows || []).filter((row: any) => !isCancelledOrderItem(row)).reduce((sum: number, row: any) => {
    const qty = Number(row?.quantity || row?.qty || 1)

    const direct =
      positiveMoney(row?.total) ??
      positiveMoney(row?.line_total) ??
      positiveMoney(row?.subtotal) ??
      null

    if (direct !== null) return sum + direct

    const price =
      positiveMoney(row?.price) ??
      positiveMoney(row?.unit_price) ??
      positiveMoney(row?.menu_price) ??
      positiveMoney(row?.item?.price) ??
      0

    return sum + price * (Number.isFinite(qty) && qty > 0 ? qty : 1)
  }, 0)

  return positiveMoney(total)
}
