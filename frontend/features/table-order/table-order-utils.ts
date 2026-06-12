import type { TableOrderDraftResponse } from "@/lib/api-client"
import { tableOrderTotalByCode, tableOrderVatPercentage } from "@/features/checkout/checkout-utils"
import type { SubmittedTableOrderSnapshot, TableOrderContext, TableOrderLikeInfo } from "./types"

function cleanContextValue(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const trimmed = String(value).trim()
  return trimmed && trimmed !== "undefined" && trimmed !== "null" ? trimmed : null
}

export function buildTableOrderDraftContext(tableInfo?: TableOrderLikeInfo | null, fallbackQr?: string | null): TableOrderContext {
  return {
    table_id: cleanContextValue(tableInfo?.table_id),
    table_no: cleanContextValue(tableInfo?.table_no),
    qr: cleanContextValue(tableInfo?.qr_code) || cleanContextValue(fallbackQr),
  }
}

export function hasTableOrderDraftContext(context: TableOrderContext | null | undefined): boolean {
  return Boolean(cleanContextValue(context?.table_id) || cleanContextValue(context?.table_no) || cleanContextValue(context?.qr))
}

export function isVisibleTableOrderDraft(draft: TableOrderDraftResponse | null | undefined): draft is TableOrderDraftResponse {
  return Boolean(draft?.success && draft.status && draft.status !== "empty")
}

export function tableOrderItemCount(draft: TableOrderDraftResponse | null | undefined): number {
  return Number(draft?.items?.reduce((sum: number, item: any) => sum + Number(item?.quantity || 1), 0) || 0)
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : fallback
}

function firstPositiveAmount(...values: unknown[]): number {
  for (const value of values) {
    const amount = toFiniteNumber(value, 0)
    if (amount > 0) return amount
  }
  return 0
}

export function createSubmittedTableOrderSnapshot(
  draft: TableOrderDraftResponse,
  tableInfo?: TableOrderLikeInfo | null,
  fallbackVatPercentage = 0,
): SubmittedTableOrderSnapshot {
  const totals = draft.totals || { subtotal: 0, tax: 0, total: 0, orderTotal: 0, settledAmount: 0, remainingAmount: 0 }
  const orderId = draft.order_id ?? draft.orderId ?? null
  const submittedItems = Array.isArray(draft.items) ? draft.items : []
  const itemSubtotal = submittedItems.reduce((sum, item: any) => {
    const quantity = Math.max(1, toFiniteNumber(item?.quantity ?? item?.qty, 1))
    const lineAmount = firstPositiveAmount(item?.subtotal, item?.line_total, item?.total)
    if (lineAmount > 0) return sum + lineAmount
    return sum + (toFiniteNumber(item?.price ?? item?.unit_price ?? item?.menu_price, 0) * quantity)
  }, 0)
  const orderTotal = firstPositiveAmount(totals.orderTotal, totals.total, draft.total, itemSubtotal)
  const total = firstPositiveAmount(totals.total, draft.total, orderTotal)
  const settledAmount = toFiniteNumber(totals.settledAmount ?? draft.settlement?.settledAmount, 0)
  const remainingAmount = firstPositiveAmount(totals.remainingAmount, draft.settlement?.remainingAmount, total - settledAmount, orderTotal - settledAmount, total)

  return {
    orderId,
    order_id: orderId,
    orderNumber: draft.orderNumber ?? draft.order_id ?? draft.orderId ?? null,
    status: draft.status || "submitted_unpaid",
    paymentStatus: draft.status === "paid" ? "paid" : (draft.paymentStatus || draft.settlement?.settlementStatus || "unpaid"),
    tableId: draft.table_id || tableInfo?.table_id || null,
    tableNumber: draft.table_no || tableInfo?.table_no || tableInfo?.table_id || null,
    subtotal: firstPositiveAmount(totals.subtotal, tableOrderTotalByCode(draft, "subtotal"), itemSubtotal),
    vatAmount: toFiniteNumber(totals.tax ?? tableOrderTotalByCode(draft, "tax"), 0),
    vatPercentage: tableOrderVatPercentage(draft, fallbackVatPercentage),
    total,
    orderTotal,
    settledAmount,
    remainingAmount,
    settlementStatus: draft.settlement?.settlementStatus || draft.paymentStatus || "unpaid",
    settlement_status: draft.settlement?.settlementStatus || draft.paymentStatus || "unpaid",
    submittedItems,
    payment: draft.payment || "qr_pay_later",
  } as SubmittedTableOrderSnapshot
}
