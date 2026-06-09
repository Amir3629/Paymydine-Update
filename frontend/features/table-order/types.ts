import type { TableOrderDraftContext, TableOrderDraftResponse } from "@/lib/api-client"

export type TableOrderDraft = TableOrderDraftResponse
export type TableOrderContext = TableOrderDraftContext

export type TableOrderLikeInfo = {
  table_id?: string | number | null
  table_no?: string | number | null
  table_name?: string | null
  qr_code?: string | null
}

export type SubmittedTableOrderSnapshot = {
  orderId?: number | string | null
  orderNumber?: number | string | null
  status?: string | null
  paymentStatus?: string | null
  tableNumber?: string | number | null
  subtotal: number
  vatAmount: number
  vatPercentage: number
  total: number
  orderTotal: number
  settledAmount?: number
  remainingAmount: number
  settlementStatus?: string | null
  submittedItems: NonNullable<TableOrderDraftResponse["items"]>
  payment?: string | null
}
