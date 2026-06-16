"use client"

import { useEffect, useMemo } from "react"
import type { TranslationKey } from "@/lib/translations"
import type { CheckoutStep, SplitMethod, SplitSourceItem } from "@/features/checkout/types"
import {
  buildEvenSharePercents,
  calculateSplitSubtotal,
  getOrderItemUnitAmount,
  groupOrderDisplayItems,
} from "@/features/checkout/checkout-utils"
import { getCheckoutStepForSplitMethod } from "@/features/checkout/checkout-state-utils"
import {
  buildEqualSplitPeople,
  buildItemSplitPeople,
  buildShareSplitPeople,
  buildSplitGuestProfiles,
  calculateSplitConfirmationState,
  getActiveSplitPeople,
  getSelectedSplitPerson,
  getSplitGuestAvatar as getSplitGuestAvatarFromProfiles,
  normalizeSharePercentsForGuestCount,
  pruneItemAssignmentsForGuestCount,
} from "@/features/checkout/split-bill-utils"
import { SPLIT_GUEST_PROFILES } from "@/features/customer-menu/checkout/paymentModalShared"

type UseCheckoutSplitBillOptions = {
  isSplitting: boolean
  setIsSplitting: (value: boolean) => void
  splitMethod: SplitMethod
  setSplitMethod: (method: SplitMethod) => void
  splitGuestCount: number
  setSplitGuestCount: (count: number) => void
  itemAssignments: Record<string, number | null>
  setItemAssignments: any
  sharePercents: number[]
  setSharePercents: any
  selectedSplitPersonId: string | null
  setSelectedSplitPersonId: any
  paidSplitPeople: Record<string, boolean>
  tableDraft: any
  submittedSnapshot: any
  allItemInstances: any[]
  t: (key: TranslationKey) => string
  adjustPriceForVAT: (price: number) => number
  taxSettings: any
  submittedBaseTotal: number
  orderStatusTotal: number
  finalTotal: number
  couponDiscount: number
  setSelectedPaymentMethod: (method: string | null) => void
  setCheckoutStep: (step: CheckoutStep) => void
}

export function useCheckoutSplitBill({
  isSplitting,
  setIsSplitting,
  splitMethod,
  setSplitMethod,
  splitGuestCount,
  setSplitGuestCount,
  itemAssignments,
  setItemAssignments,
  sharePercents,
  setSharePercents,
  selectedSplitPersonId,
  setSelectedSplitPersonId,
  paidSplitPeople,
  tableDraft,
  submittedSnapshot,
  allItemInstances,
  t,
  adjustPriceForVAT,
  taxSettings,
  submittedBaseTotal,
  orderStatusTotal,
  finalTotal,
  couponDiscount,
  setSelectedPaymentMethod,
  setCheckoutStep,
}: UseCheckoutSplitBillOptions) {
  const splitGuestProfiles = useMemo(
    () => buildSplitGuestProfiles(splitGuestCount, SPLIT_GUEST_PROFILES),
    [splitGuestCount]
  )

  const splitGuestNames = useMemo(
    () => splitGuestProfiles.map((profile: any) => profile.name),
    [splitGuestProfiles]
  )

  const getSplitGuestAvatar = (idx: number) =>
    getSplitGuestAvatarFromProfiles(splitGuestProfiles, idx)

  const suggestedSplitGuestCount = useMemo(() => {
    const groupCount = Array.isArray(tableDraft?.groups)
      ? tableDraft.groups.filter((group: any) => Array.isArray(group?.items) && group.items.length > 0).length
      : 0

    const contributorIds = new Set<string>()
    const submittedItems = Array.isArray(submittedSnapshot?.submittedItems) ? submittedSnapshot.submittedItems : []

    submittedItems.forEach((item: any) => {
      const contributor = String(item?.guest_session_id || item?.guestSessionId || item?.submitted_by || "").trim()
      if (contributor) contributorIds.add(contributor)
    })

    const itemContributorCount = contributorIds.size

    return Math.max(2, Math.min(10, groupCount || itemContributorCount || 2))
  }, [tableDraft?.groups, submittedSnapshot?.submittedItems])

  const addSplitGuest = () => {
    const nextCount = Math.min(10, splitGuestCount + 1)
    setSplitGuestCount(nextCount)
    setSharePercents(buildEvenSharePercents(nextCount))
  }

  const removeSplitGuest = () => {
    const nextCount = Math.max(2, splitGuestCount - 1)
    setSplitGuestCount(nextCount)
    setSharePercents(buildEvenSharePercents(nextCount))
  }

  useEffect(() => {
    setSharePercents((prev: number[]) =>
      normalizeSharePercentsForGuestCount(prev, splitGuestCount, buildEvenSharePercents(splitGuestCount))
    )

    setItemAssignments((prev: Record<string, number | null>) =>
      pruneItemAssignmentsForGuestCount(prev, splitGuestCount)
    )
  }, [splitGuestCount, setSharePercents, setItemAssignments])

  const splitSourceItems = useMemo<SplitSourceItem[]>(() => {
    const submittedItems = groupOrderDisplayItems(
      Array.isArray(submittedSnapshot?.submittedItems) ? submittedSnapshot.submittedItems : []
    )

    if (submittedItems.length > 0) {
      return submittedItems.flatMap((item: any, itemIndex: number) => {
        const quantity = Math.max(1, Number(item?.quantity || 1))
        const unitAmount = getOrderItemUnitAmount(item)

        return Array.from({ length: quantity }, (_, unitIndex) => ({
          key: `submitted-${item?.order_menu_id || item?.menu_id || item?.id || itemIndex}-${unitIndex}`,
          name: String(item?.name || `Item ${itemIndex + 1}`),
          amount: Number.isFinite(unitAmount) ? unitAmount : 0,
          orderMenuId: Number(item?.order_menu_id || item?.id || 0) || undefined,
        }))
      })
    }

    return allItemInstances.map((instance: any, index: number) => ({
      key: instance.key,
      name: instance.item.nameKey
        ? t(instance.item.nameKey as TranslationKey)
        : instance.item.name || `Item ${index + 1}`,
      amount: Number(adjustPriceForVAT(instance.price || 0)),
      orderMenuId: instance.orderMenuId,
    }))
  }, [
    submittedSnapshot?.submittedItems,
    allItemInstances,
    t,
    adjustPriceForVAT,
    taxSettings.enabled,
    taxSettings.percentage,
    taxSettings.menuPrice,
  ])

  const splitSubtotal = useMemo(
    () => calculateSplitSubtotal(splitSourceItems),
    [splitSourceItems]
  )

  const splitGrandTotal = useMemo(
    () => (submittedBaseTotal > 0 ? orderStatusTotal : finalTotal),
    [submittedBaseTotal, orderStatusTotal, finalTotal]
  )

  const splitExtraAmount = Math.max(0, splitGrandTotal - splitSubtotal)

  const equalSplitPeople = useMemo(
    () =>
      buildEqualSplitPeople({
        splitGrandTotal,
        splitGuestCount,
        splitGuestNames,
        splitGuestProfiles,
        splitSubtotal,
        splitExtraAmount,
        paidSplitPeople,
        selectedSplitPersonId,
      }),
    [
      splitGrandTotal,
      splitGuestCount,
      splitGuestNames,
      splitGuestProfiles,
      splitSubtotal,
      splitExtraAmount,
      paidSplitPeople,
      selectedSplitPersonId,
    ]
  )

  const itemSplitPeople = useMemo(
    () =>
      buildItemSplitPeople({
        splitGuestCount,
        splitSourceItems,
        itemAssignments,
        splitSubtotal,
        splitExtraAmount,
        couponDiscount,
        splitGuestNames,
        splitGuestProfiles,
        paidSplitPeople,
        selectedSplitPersonId,
      }),
    [
      splitGuestCount,
      splitSourceItems,
      itemAssignments,
      splitSubtotal,
      splitExtraAmount,
      couponDiscount,
      splitGuestNames,
      splitGuestProfiles,
      paidSplitPeople,
      selectedSplitPersonId,
    ]
  )

  const shareSplitPeople = useMemo(
    () =>
      buildShareSplitPeople({
        splitGuestCount,
        sharePercents,
        splitGrandTotal,
        splitSubtotal,
        splitExtraAmount,
        splitGuestNames,
        splitGuestProfiles,
        paidSplitPeople,
        selectedSplitPersonId,
      }),
    [
      splitGuestCount,
      sharePercents,
      splitGrandTotal,
      splitSubtotal,
      splitExtraAmount,
      splitGuestNames,
      splitGuestProfiles,
      paidSplitPeople,
      selectedSplitPersonId,
    ]
  )

  const activeSplitPeople = getActiveSplitPeople({
    splitMethod,
    equalSplitPeople,
    itemSplitPeople,
    shareSplitPeople,
  })

  const selectedSplitPerson = getSelectedSplitPerson(activeSplitPeople, selectedSplitPersonId)

  const { unassignedSplitItems, sharePercentTotal, canConfirmSplitMethod } =
    calculateSplitConfirmationState({
      splitMethod,
      splitSourceItems,
      itemAssignments,
      sharePercents,
      splitGuestCount,
    })

  const startSplitFlow = (method: SplitMethod = splitMethod) => {
    const isStartingSplit = !isSplitting && !selectedSplitPersonId

    if (isStartingSplit) {
      setSplitGuestCount(suggestedSplitGuestCount)
      setSharePercents(buildEvenSharePercents(suggestedSplitGuestCount))
    }

    setIsSplitting(true)
    setSplitMethod(method)
    setSelectedPaymentMethod(null)
    setSelectedSplitPersonId(null)
    setCheckoutStep(getCheckoutStepForSplitMethod(method))
  }

  const chooseSplitMethod = (method: SplitMethod) => {
    setSplitMethod(method)
    startSplitFlow(method)
  }

  const goToSplitReview = () => {
    if (!canConfirmSplitMethod) return

    setIsSplitting(true)
    setSelectedSplitPersonId((current: string | null) => current || activeSplitPeople[0]?.id || null)
    setCheckoutStep("split-review")
  }

  return {
    splitGuestProfiles,
    splitGuestNames,
    getSplitGuestAvatar,
    suggestedSplitGuestCount,
    addSplitGuest,
    removeSplitGuest,
    splitSourceItems,
    splitSubtotal,
    splitGrandTotal,
    splitExtraAmount,
    equalSplitPeople,
    itemSplitPeople,
    shareSplitPeople,
    activeSplitPeople,
    selectedSplitPerson,
    unassignedSplitItems,
    sharePercentTotal,
    canConfirmSplitMethod,
    startSplitFlow,
    chooseSplitMethod,
    goToSplitReview,
  }
}
