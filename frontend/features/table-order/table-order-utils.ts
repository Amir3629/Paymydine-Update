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

export function createSubmittedTableOrderSnapshot(
  draft: TableOrderDraftResponse,
  tableInfo?: TableOrderLikeInfo | null,
  fallbackVatPercentage = 0,
): SubmittedTableOrderSnapshot {
  const totals = draft.totals || { subtotal: 0, tax: 0, total: 0, orderTotal: 0, settledAmount: 0, remainingAmount: 0 }
  const total = Number(totals.total ?? draft.total ?? 0)

  return {
    orderId: draft.order_id ?? draft.orderId ?? null,
    orderNumber: draft.orderNumber ?? draft.order_id ?? draft.orderId ?? null,
    status: draft.status || "submitted_unpaid",
    paymentStatus: draft.status === "paid" ? "paid" : (draft.paymentStatus || "unpaid"),
    tableNumber: draft.table_no || tableInfo?.table_no || null,
    subtotal: Number(totals.subtotal ?? tableOrderTotalByCode(draft, "subtotal") ?? 0),
    vatAmount: Number(totals.tax ?? tableOrderTotalByCode(draft, "tax") ?? 0),
    vatPercentage: tableOrderVatPercentage(draft, fallbackVatPercentage),
    total,
    orderTotal: Number(totals.orderTotal ?? totals.total ?? draft.total ?? 0),
    settledAmount: Number(totals.settledAmount ?? draft.settlement?.settledAmount ?? 0),
    remainingAmount: Number(totals.remainingAmount || 0),
    settlementStatus: draft.settlement?.settlementStatus || "unpaid",
    submittedItems: draft.items || [],
    payment: draft.payment || "qr_pay_later",
  }
}
