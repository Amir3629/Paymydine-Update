"use client"

import { useMemo } from "react"
import type { TranslationKey } from "@/lib/translations"
import {
  groupOrderDisplayItems,
  tableOrderTotalByCode,
} from "@/features/checkout/checkout-utils"

export function useCheckoutDisplayItems({
  tableDraft,
  submittedSnapshot,
  personalReviewItems,
  selectedOptions,
  adjustPriceForVAT,
  t,
}: any) {
  const modernGreenTableDraftItems = useMemo(
    () => groupOrderDisplayItems(Array.isArray(tableDraft?.items) ? tableDraft.items : []),
    [tableDraft?.items]
  )

  const modernGreenTableDraftTotal = useMemo(
    () =>
      Number(
        tableDraft?.totals?.total ??
          tableDraft?.totals?.orderTotal ??
          tableDraft?.total ??
          tableOrderTotalByCode(tableDraft, "total") ??
          tableOrderTotalByCode(tableDraft, "subtotal") ??
          0
      ),
    [tableDraft]
  )

  const modernGreenSubmittedItems = useMemo(
    () => groupOrderDisplayItems(Array.isArray(submittedSnapshot?.submittedItems) ? submittedSnapshot.submittedItems : []),
    [submittedSnapshot?.submittedItems]
  )

  const modernGreenPersonalItems = useMemo(
    () =>
      personalReviewItems.map((cartItem: any) => {
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
          __pmdDisplaySubtotal: unitPrice * quantity,
        }
      }),
    [personalReviewItems, selectedOptions, adjustPriceForVAT, t]
  )

  return {
    modernGreenTableDraftItems,
    modernGreenTableDraftTotal,
    modernGreenSubmittedItems,
    modernGreenPersonalItems,
  }
}
