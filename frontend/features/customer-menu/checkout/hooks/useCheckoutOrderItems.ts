"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import type { CartItem } from "@/store/cart-store"
import type { TranslationKey } from "@/lib/translations"
import { calculateCheckoutTax } from "@/features/checkout/checkout-utils"

type UseCheckoutOrderItemsOptions = {
  allItems: CartItem[]
  taxSettings: any
  t: (key: TranslationKey) => string
  isSplitting: boolean
  selectedItems: Record<string, any>
  onCartPricingUpdate?: ((snapshot: any | null) => void) | null
}

export function useCheckoutOrderItems({
  allItems,
  taxSettings,
  t,
  isSplitting,
  selectedItems,
  onCartPricingUpdate,
}: UseCheckoutOrderItemsOptions) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, Record<string, string>>>({})

  const adjustPriceForVAT = useCallback(
    (price: number): number => {
      if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
        return price * (1 + taxSettings.percentage / 100)
      }

      return price
    },
    [taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice]
  )

  const handleOptionsChange = useCallback((itemKey: string | number, options: Record<string, string>) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [String(itemKey)]: options,
    }))
  }, [])

  const personalReviewItems = useMemo<any[]>(() => {
    return allItems.flatMap((cartItem: CartItem, cartIndex: number): any[] => {
      const quantity = Math.max(1, Number(cartItem.quantity || 1))
      const hasOptions =
        Array.isArray((cartItem.item as any)?.options) &&
        (cartItem.item as any).options.length > 0
      const itemId = String((cartItem.item as any)?.id || `item-${cartIndex}`)
      const baseName = cartItem.item.nameKey
        ? t(cartItem.item.nameKey as TranslationKey)
        : cartItem.item.name

      if (!hasOptions) {
        return [{
          ...cartItem,
          __pmdOptionKey: itemId,
          __pmdUnitLabel: "",
          __pmdSourceQuantity: quantity,
        }]
      }

      if (quantity <= 1) {
        return [{
          ...cartItem,
          quantity: 1,
          __pmdOptionKey: `${itemId}-${cartIndex}-0`,
          __pmdUnitLabel: "",
          __pmdSourceQuantity: quantity,
        }]
      }

      return Array.from({ length: quantity }, (_, unitIndex) => ({
        ...cartItem,
        quantity: 1,
        __pmdOptionKey: `${itemId}-${cartIndex}-${unitIndex}`,
        __pmdUnitLabel: `${baseName} · Item ${unitIndex + 1}`,
        __pmdSourceQuantity: quantity,
      }))
    })
  }, [allItems, t])

  const allItemInstances = useMemo(
    () =>
      allItems.flatMap((cartItem: CartItem, cartIndex: number) =>
        Array.from({ length: cartItem.quantity }).map((_, i) => ({
          cartIndex,
          item: cartItem.item,
          price: cartItem.item.price || 0,
          key: `${cartItem.item.id}-${cartIndex}-${i}`,
          quantity: 1,
          orderMenuId: Number((cartItem.item as any).__order_menu_id || 0) || undefined,
          menuId: Number((cartItem.item as any).__menu_id || (cartItem.item as any).id || 0) || undefined,
        }))
      ),
    [allItems]
  )

  const itemsToPay = useMemo(
    () =>
      isSplitting
        ? Object.values(selectedItems)
        : personalReviewItems.map((cartItem: any) => ({
            item: cartItem.item,
            price: adjustPriceForVAT(cartItem.item.price || 0),
            quantity: Number(cartItem.quantity || 1),
            optionKey: String(cartItem.__pmdOptionKey || cartItem.item.id),
          })),
    [isSplitting, selectedItems, personalReviewItems, adjustPriceForVAT]
  )

  const subtotal = useMemo(
    () =>
      itemsToPay.reduce((acc: number, inst: any) => {
        let itemTotal = Number(inst.price || 0) * Number(inst.quantity || 1)

        const itemOptions = selectedOptions[String((inst as any).optionKey || inst.item.id)] || {}

        if (Object.keys(itemOptions).length > 0) {
          const menuItem = allItems.find((cartItem: any) => cartItem.item.id === inst.item.id)

          if (menuItem && menuItem.item.options) {
            Object.values(itemOptions).forEach((optionId) => {
              menuItem.item.options!.forEach((option: any) => {
                const optionValue = option.values.find((val: any) => val.id.toString() === optionId)

                if (optionValue) {
                  itemTotal += adjustPriceForVAT(optionValue.price) * Number(inst.quantity || 1)
                }
              })
            })
          }
        }

        return acc + itemTotal
      }, 0),
    [itemsToPay, selectedOptions, allItems, adjustPriceForVAT]
  )

  const taxAmount = useMemo(
    () => calculateCheckoutTax(subtotal, taxSettings),
    [subtotal, taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice]
  )

  useEffect(() => {
    if (!onCartPricingUpdate) return

    if (!Array.isArray(allItems) || allItems.length === 0) {
      onCartPricingUpdate(null)
      return
    }

    const displayItems = personalReviewItems.map((cartItem: any) => {
      const optionKey = String(cartItem.__pmdOptionKey || cartItem.item.id)
      const selectedForUnit = selectedOptions[optionKey] || {}
      const optionDetails: Array<{ name: string; price: number }> = []

      Object.entries(selectedForUnit).forEach(([optionName, optionId]) => {
        const option = (cartItem.item.options || []).find(
          (candidate: any) => String(candidate.name) === String(optionName)
        )
        const value = option?.values?.find(
          (candidate: any) => String(candidate.id) === String(optionId)
        )

        if (value) {
          optionDetails.push({
            name: String(value.value || value.name || ""),
            price: Number(adjustPriceForVAT(Number(value.price || 0))),
          })
        }
      })

      const baseName = cartItem.item.nameKey
        ? t(cartItem.item.nameKey as TranslationKey)
        : cartItem.item.name
      const optionSummary = optionDetails.map((option) => option.name).filter(Boolean).join(", ")
      const displayName = optionSummary
        ? `${baseName} — ${optionSummary}`
        : String(cartItem.__pmdUnitLabel || baseName)
      const unitPrice =
        Number(adjustPriceForVAT(cartItem.item.price || 0)) +
        optionDetails.reduce((sum, option) => sum + Number(option.price || 0), 0)
      const quantity = Number(cartItem.quantity || 1)

      return {
        ...cartItem,
        quantity,
        __pmdDisplayName: displayName,
        __pmdDisplayUnitPrice: unitPrice,
        __pmdDisplaySubtotal: unitPrice * quantity,
      }
    })

    onCartPricingUpdate({
      items: displayItems,
      subtotal,
      tax: taxAmount,
      total: subtotal + taxAmount,
    })
  }, [
    allItems,
    personalReviewItems,
    selectedOptions,
    subtotal,
    taxAmount,
    onCartPricingUpdate,
    t,
    taxSettings.enabled,
    taxSettings.percentage,
    taxSettings.menuPrice,
    adjustPriceForVAT,
  ])

  return {
    selectedOptions,
    handleOptionsChange,
    adjustPriceForVAT,
    personalReviewItems,
    allItemInstances,
    itemsToPay,
    subtotal,
    taxAmount,
  }
}
