import { useEffect, useState } from "react"
import { useCustomerCheckoutModalState } from "@/features/customer-menu/hooks/useCustomerCheckoutModalState"
import { calculateCartPricingSummary } from "@/features/checkout/checkout-utils"
import type { PmdToolbarPricingSnapshot } from "@/features/checkout/types"
import type { CartItem } from "@/store/cart-store"

export function useCheckoutState({
  items,
  taxSettings,
}: {
  items: CartItem[]
  taxSettings: any
}) {
  const modalState = useCustomerCheckoutModalState()
  const [toolbarPricingSnapshot, setToolbarPricingSnapshot] =
    useState<PmdToolbarPricingSnapshot | null>(null)

  const cartPricingSummary = calculateCartPricingSummary(items, taxSettings)
  const totalItems = cartPricingSummary.totalItems
  const rawSubtotalPrice = cartPricingSummary.subtotal
  const rawTaxAmount = cartPricingSummary.tax
  const totalPrice = toolbarPricingSnapshot?.total ?? rawSubtotalPrice + rawTaxAmount

  useEffect(() => {
    if (items.length === 0 && toolbarPricingSnapshot) setToolbarPricingSnapshot(null)
  }, [items.length, toolbarPricingSnapshot])

  return {
    ...modalState,
    toolbarPricingSnapshot,
    setToolbarPricingSnapshot,
    totalItems,
    totalPrice,
  }
}
