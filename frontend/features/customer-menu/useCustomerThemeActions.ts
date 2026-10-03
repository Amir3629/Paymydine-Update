"use client"

import { useMemo } from "react"
import type { CheckoutStep } from "@/features/checkout/types"
import type { MenuItem } from "@/lib/data"
import { createThemeMenuActions } from "@/features/menu/theme-menu-actions"

export type UseThemeMenuActionsInput = {
  addToCart: (item: MenuItem, quantity?: number) => void
  handleFirstAdd: (item: MenuItem) => void
  handleCartClick: () => void
  setPaymentModalInitialStep: (step: CheckoutStep) => void
  setPaymentModalOpen: (open: boolean) => void
  sharedTableOrder: any | null
  handleWaiterClick: () => void
  handleNoteClick: () => void
  tableIdString: string
  totalItems: number
  tableOrderActionCount: number
  shouldShowTableOrderAction: boolean
  displayTableNumber?: string | number | null
  language?: string
  showValet?: boolean
}

export function useCustomerThemeActions({
  addToCart,
  handleFirstAdd,
  handleCartClick,
  setPaymentModalInitialStep,
  setPaymentModalOpen,
  sharedTableOrder,
  handleWaiterClick,
  handleNoteClick,
  tableIdString,
  totalItems,
  tableOrderActionCount,
  shouldShowTableOrderAction,
  displayTableNumber,
  language,
  showValet = true,
}: UseThemeMenuActionsInput) {
  return useMemo(
    () =>
      createThemeMenuActions({
        onAddItem: (item, quantity = 1) => {
          addToCart(item, quantity)
          handleFirstAdd(item)
        },
        onOpenCheckout: handleCartClick,
        onOpenTableOrder: () => {
          setPaymentModalInitialStep(
            sharedTableOrder?.status === "draft"
              ? "review"
              : sharedTableOrder?.status === "paid"
                ? "paid"
                : "submitted"
          )
          setPaymentModalOpen(true)
        },
        onCallWaiter: handleWaiterClick,
        onOpenNote: handleNoteClick,
        onOpenValet: () => {
          if (!showValet) return
          const currentSearch = typeof window !== "undefined" ? window.location.search || "" : ""
          if (tableIdString) {
            window.location.href = `/table/${tableIdString}/valet${currentSearch}`
          } else {
            window.location.href = `/valet${currentSearch}`
          }
        },
        cartCount: totalItems,
        tableOrderCount: tableOrderActionCount,
        showTableOrder: shouldShowTableOrderAction,
        showValet,
        tableNumber: displayTableNumber,
        currentLocale: language,
        language,
      }),
    [
      addToCart,
      handleFirstAdd,
      handleCartClick,
      setPaymentModalInitialStep,
      setPaymentModalOpen,
      sharedTableOrder?.status,
      handleWaiterClick,
      handleNoteClick,
      tableIdString,
      totalItems,
      tableOrderActionCount,
      shouldShowTableOrderAction,
      displayTableNumber,
      language,
      showValet,
    ]
  )
}
