import { useRef, useState } from "react"
import type { SplitBillItem, SplitMethod } from "@/features/checkout/types"

export function useCheckoutSplitState() {
  const [isSplitting, setIsSplitting] = useState(false)
  const selectedItems = useRef<Record<string, SplitBillItem>>({}).current
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal")
  const [splitGuestCount, setSplitGuestCount] = useState(2)
  const [itemAssignments, setItemAssignments] = useState<Record<string, number | null>>({})
  const [sharePercents, setSharePercents] = useState<number[]>([50, 50])
  const [selectedSplitPersonId, setSelectedSplitPersonId] = useState<string | null>(null)
  const [paidSplitPeople, setPaidSplitPeople] = useState<Record<string, boolean>>({})

  return {
    isSplitting,
    setIsSplitting,
    selectedItems,
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
    setPaidSplitPeople,
  }
}
