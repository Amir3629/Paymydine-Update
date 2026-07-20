"use client"

import { createSubmittedTableOrderSnapshot } from "@/features/table-order/table-order-utils"
import { getCheckoutStepAfterDraftSubmit } from "@/features/checkout/checkout-state-utils"

export function useCheckoutTableActions({
  tableDraft,
  setTableDraft,
  tableInfo,
  taxSettings,
  selectedOptions,
  personalReviewItems,
  adjustPriceForVAT,
  toast,
  setIsLoading,
  confirmTableDraftItemsAction,
  submitTableDraftAction,
  refreshTableDraft,
  clearCart,
  setSubmittedSnapshot,
  pmdLatestSubmittedPaymentOrderIdRef,
  buildOpenOrderStorageKeys,
  getTenantKey,
  getTableKey,
  ensureGuestSession,
  setCheckoutStep,
  onOpenOrderUpdate,
}: any) {
  const buildPersonalDraftItems = () =>
    personalReviewItems
      .map((cartItem: any) => {
        const menuId = Number((cartItem.item as any)?.id || (cartItem.item as any)?.menu_id || 0)
        const baseName = String((cartItem.item as any)?.name || (cartItem.item as any)?.title || "Item")
        const quantity = Number(cartItem.quantity || 1)
        const optionKey = String((cartItem as any).__pmdOptionKey || (cartItem.item as any)?.id)
        const selectedForUnit = selectedOptions[optionKey] || {}
        const optionGroups = Array.isArray((cartItem.item as any)?.options)
          ? (cartItem.item as any).options
          : []

        const optionDetails = Object.entries(selectedForUnit)
          .map(([groupName, selectedValueId]) => {
            const group = optionGroups.find((opt: any) =>
              String(opt?.name || "") === String(groupName) ||
              String(opt?.id || "") === String(groupName)
            )

            const value = (Array.isArray(group?.values) ? group.values : []).find((val: any) =>
              String(val?.id) === String(selectedValueId)
            )

            if (!group || !value) return null

            return {
              group: String(group?.name || groupName),
              option_id: String(group?.id || ""),
              option_value_id: String(value?.id || selectedValueId),
              value: String(value?.value || value?.name || selectedValueId),
              price: Number(adjustPriceForVAT(Number(value?.price || 0))),
            }
          })
          .filter(Boolean) as Array<{
            group: string
            option_id: string
            option_value_id: string
            value: string
            price: number
          }>

        const optionLabel = optionDetails.map((option) => option.value).filter(Boolean).join(", ")
        const unitBasePrice = Number(adjustPriceForVAT(cartItem.item.price || 0))
        const unitOptionPrice = optionDetails.reduce((sum, option) => sum + Number(option.price || 0), 0)
        const unitPrice = Number((unitBasePrice + unitOptionPrice).toFixed(4))
        const lineSubtotal = Number((unitPrice * quantity).toFixed(4))

        return {
          menu_id: menuId,
          name: optionLabel ? `${baseName} — ${optionLabel}` : baseName,
          base_name: baseName,
          quantity,
          price: unitPrice,
          base_price: Number(unitBasePrice.toFixed(4)),
          option_total: Number((unitOptionPrice * quantity).toFixed(4)),
          subtotal: lineSubtotal,
          options: Object.fromEntries(optionDetails.map((option) => [option.group, option.option_value_id])),
          option_details: optionDetails,
          option_summary: optionLabel,
        }
      })
      .filter((item: any) => item.menu_id > 0 && item.quantity > 0)

  const handleConfirmMyItems = async () => {
    const draftItems = buildPersonalDraftItems()

    if (draftItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Add items to your personal cart before confirming.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await confirmTableDraftItemsAction(draftItems)

      setTableDraft(result)
      setSubmittedSnapshot(null)
      clearCart()

      console.info("PMD_TABLE_DRAFT_CONFIRMED_ITEMS", {
        draft_id: result.draft_id ?? null,
        count: draftItems.length,
      })

      toast({
        title: "Items confirmed",
        description: "Your items were added to the table order. Submit the table order when everyone is ready.",
      })

      await refreshTableDraft()
      onOpenOrderUpdate?.(result)
    } catch (error) {
      toast({
        title: "Could not confirm items",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitTableDraft = async () => {
    if (!tableDraft?.draft_id && tableDraft?.status !== "draft") return

    try {
      const result = await submitTableDraftAction({
        draftId: tableDraft?.draft_id ?? null,
        refreshOnError: true,
      })

      const pmdSubmittedOrderId = Number((result as any)?.order_id || (result as any)?.orderId || 0)

      if (Number.isFinite(pmdSubmittedOrderId) && pmdSubmittedOrderId > 0) {
        pmdLatestSubmittedPaymentOrderIdRef.current = pmdSubmittedOrderId

        try {
          sessionStorage.setItem("pmd:latest-submitted-payment-order-id", String(pmdSubmittedOrderId))
          localStorage.setItem("pmd:latest-submitted-payment-order-id", String(pmdSubmittedOrderId))
        } catch {}
      }

      setTableDraft(result)
      clearCart()

      const submittedTableSnapshot = createSubmittedTableOrderSnapshot(
        result,
        tableInfo,
        taxSettings?.percentage || 0
      )

      try {
        const { sessionKey, legacyKey } = buildOpenOrderStorageKeys()

        localStorage.removeItem(legacyKey)
        localStorage.setItem(
          sessionKey,
          JSON.stringify({
            ...submittedTableSnapshot,
            tenant: getTenantKey(),
            tableKey: getTableKey(),
            guestSessionId: ensureGuestSession(),
          })
        )
      } catch {}

      console.info("PMD_SUBMITTED_ORDER_SNAPSHOT_NORMALIZED", {
        order_id: submittedTableSnapshot.orderId,
        total: submittedTableSnapshot.total,
        remainingAmount: submittedTableSnapshot.remainingAmount,
        itemCount: Array.isArray(submittedTableSnapshot.submittedItems)
          ? submittedTableSnapshot.submittedItems.length
          : 0,
      })

      setSubmittedSnapshot(submittedTableSnapshot)
      setCheckoutStep(getCheckoutStepAfterDraftSubmit())

      console.info("PMD_TABLE_DRAFT_SUBMITTED", {
        draft_id: tableDraft?.draft_id ?? null,
        order_id: result.order_id ?? null,
      })

      toast({
        title: "Table order submitted",
        description: "The table order was sent to the kitchen. Payment is now available.",
      })

      onOpenOrderUpdate?.(submittedTableSnapshot)
    } catch (error) {
      toast({
        title: "Could not submit table order",
        description: error instanceof Error ? error.message : "Please refresh and try again.",
        variant: "destructive",
      })
    }
  }

  const markOpenOrderAsPaid = (
    orderIdLike?: string | number | null,
    paymentDetails?: {
      tipAmount?: number
      couponDiscount?: number
      paidTotal?: number
      couponCode?: string | null
    }
  ) => {
    try {
      const sessionKey = buildOpenOrderStorageKeys().sessionKey
      const raw = localStorage.getItem(sessionKey)

      if (!raw) return

      const parsed = JSON.parse(raw)

      if (orderIdLike && parsed?.orderId && String(parsed.orderId) !== String(orderIdLike)) return

      parsed.paymentStatus = "paid"
      parsed.status = "paid"
      parsed.paidAt = Date.now()

      if (paymentDetails) {
        parsed.paidTipAmount = Number(paymentDetails.tipAmount || 0)
        parsed.paidCouponDiscount = Number(paymentDetails.couponDiscount || 0)
        parsed.paidTotal = Number(paymentDetails.paidTotal || 0)
        parsed.paidCouponCode = paymentDetails.couponCode || null
      }

      setSubmittedSnapshot((prev: any) =>
        prev
          ? {
              ...prev,
              paymentStatus: "paid",
              status: "paid",
              paidAt: parsed.paidAt,
              paidTipAmount: parsed.paidTipAmount,
              paidCouponDiscount: parsed.paidCouponDiscount,
              paidTotal: parsed.paidTotal,
              paidCouponCode: parsed.paidCouponCode,
            }
          : parsed
      )

      localStorage.setItem(sessionKey, JSON.stringify(parsed))
      onOpenOrderUpdate?.(parsed)
    } catch {}
  }

  return {
    buildPersonalDraftItems,
    handleConfirmMyItems,
    handleSubmitTableDraft,
    markOpenOrderAsPaid,
  }
}
