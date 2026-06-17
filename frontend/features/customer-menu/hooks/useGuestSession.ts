import { useEffect } from "react"
import { useCartStore, type CartItem } from "@/store/cart-store"
import {
  createSubmittedTableOrderSnapshot,
  isVisibleTableOrderDraft,
  tableOrderItemCount,
} from "@/features/table-order/table-order-utils"

type PendingSettlementSummary = {
  orderTotal: number
  settledAmount: number
  remainingAmount: number
} | null

export function useGuestSession({
  sharedTableOrder,
  tableInfo,
  existingOrderId,
  setExistingOrderId,
  pendingSettlementSummary,
  setPendingSettlementSummary,
  localOpenOrder,
  setLocalOpenOrder,
  hasLocalOpenOrder,
  setHasLocalOpenOrder,
  paymentModalInitialStep,
  items,
}: {
  sharedTableOrder: any
  tableInfo: any
  existingOrderId: number | null
  setExistingOrderId: (value: number | null) => void
  pendingSettlementSummary: PendingSettlementSummary
  setPendingSettlementSummary: (value: PendingSettlementSummary) => void
  localOpenOrder: any | null
  setLocalOpenOrder: (value: any | null | ((previous: any | null) => any | null)) => void
  hasLocalOpenOrder: boolean
  setHasLocalOpenOrder: (value: boolean) => void
  paymentModalInitialStep: string
  items: CartItem[]
}) {
  const isRecentPaidTableOrder =
    localOpenOrder?.paymentStatus === "paid" || localOpenOrder?.status === "paid"

  const hasDraftTableOrderWithoutRealOrder = Boolean(
    isVisibleTableOrderDraft(sharedTableOrder) &&
      (sharedTableOrder as any)?.draft_id &&
      !(sharedTableOrder as any)?.order_id &&
      !(sharedTableOrder as any)?.orderId,
  )

  const activeExistingOrderId = hasDraftTableOrderWithoutRealOrder
    ? null
    : isRecentPaidTableOrder && paymentModalInitialStep === "review"
      ? null
      : existingOrderId

  const activePendingSummary = hasDraftTableOrderWithoutRealOrder
    ? null
    : isRecentPaidTableOrder && paymentModalInitialStep === "review"
      ? null
      : pendingSettlementSummary

  const activeSubmittedOrder = hasDraftTableOrderWithoutRealOrder
    ? null
    : isRecentPaidTableOrder && paymentModalInitialStep === "review" && items.length > 0
      ? null
      : localOpenOrder

  const shouldHideCartSheet = !!activeExistingOrderId

  useEffect(() => {
    if (!isVisibleTableOrderDraft(sharedTableOrder)) return

    if (
      (sharedTableOrder as any)?.draft_id &&
      !(sharedTableOrder as any)?.order_id &&
      !(sharedTableOrder as any)?.orderId
    ) {
      setExistingOrderId(null)
      setPendingSettlementSummary(null)
      setLocalOpenOrder(null)
      setHasLocalOpenOrder(false)
      return
    }

    if (!sharedTableOrder.order_id) return

    setExistingOrderId(Number(sharedTableOrder.order_id))
    setPendingSettlementSummary({
      orderTotal: Number(sharedTableOrder.totals?.orderTotal || sharedTableOrder.totals?.total || 0),
      settledAmount: Number(sharedTableOrder.totals?.settledAmount || 0),
      remainingAmount: Number(
        sharedTableOrder.totals?.remainingAmount || sharedTableOrder.totals?.total || 0,
      ),
    })
    setLocalOpenOrder((prev: any) => {
      const latestSnapshot = createSubmittedTableOrderSnapshot(sharedTableOrder, tableInfo, 0)
      return !prev || String(prev?.orderId || "") !== String(sharedTableOrder.order_id || "")
        ? latestSnapshot
        : { ...prev, ...latestSnapshot }
    })
    setHasLocalOpenOrder(true)
  }, [sharedTableOrder, tableInfo?.table_id, tableInfo?.table_no])

  useEffect(() => {
    if (!existingOrderId) return
    try {
      const state = useCartStore.getState() as any
      if (state?.isCartOpen === true) {
        useCartStore.setState({ isCartOpen: false })
      }
    } catch (e) {
      console.error("[PMD] close side cart for pending QR failed", e)
    }
  }, [existingOrderId])

  const localOpenOrderStatusForAction = String(localOpenOrder?.status || "").toLowerCase()
  const localOpenOrderPaymentStatusForAction = String(
    localOpenOrder?.paymentStatus || localOpenOrder?.payment_status || "",
  ).toLowerCase()
  const localOpenOrderRemainingForAction = Number(
    localOpenOrder?.remainingAmount ??
      localOpenOrder?.remaining_amount ??
      localOpenOrder?.totals?.remainingAmount ??
      Number.NaN,
  )
  const localOpenOrderTotalForAction = Number(
    localOpenOrder?.orderTotal ?? localOpenOrder?.total ?? localOpenOrder?.subtotal ?? 0,
  )

  const hasActiveLocalOpenOrder = Boolean(
    hasLocalOpenOrder &&
      localOpenOrder &&
      !["paid", "completed", "complete", "delivered", "cancelled", "canceled"].includes(
        localOpenOrderStatusForAction,
      ) &&
      !["paid", "settled"].includes(localOpenOrderPaymentStatusForAction) &&
      ((Number.isFinite(localOpenOrderRemainingForAction) &&
        localOpenOrderRemainingForAction > 0) ||
        (!Number.isFinite(localOpenOrderRemainingForAction) && localOpenOrderTotalForAction > 0)),
  )

  const shouldShowTableOrderAction =
    isVisibleTableOrderDraft(sharedTableOrder) || hasActiveLocalOpenOrder

  const tableOrderActionCount = Number(
    tableOrderItemCount(sharedTableOrder) ||
      (hasActiveLocalOpenOrder
        ? localOpenOrder?.submittedItems?.reduce?.(
            (sum: number, item: any) => sum + Number(item?.quantity || 1),
            0,
          )
        : 0) ||
      0,
  )

  return {
    hasDraftTableOrderWithoutRealOrder,
    activeExistingOrderId,
    activePendingSummary,
    activeSubmittedOrder,
    shouldHideCartSheet,
    shouldShowTableOrderAction,
    tableOrderActionCount,
  }
}
