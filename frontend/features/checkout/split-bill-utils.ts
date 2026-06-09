import type { SplitMethod, SplitPerson, SplitSourceItem } from "./types"
import { countUnassignedSplitItems, sumSharePercents } from "./checkout-utils"

export type SplitGuestProfile = {
  name: string
  avatar: string
}

export type SplitConfirmationState = {
  unassignedSplitItems: number
  sharePercentTotal: number
  canConfirmSplitMethod: boolean
}

export function normalizeSplitMethod(method: SplitMethod | string | null | undefined): SplitMethod {
  return method === "items" || method === "shares" || method === "equal" ? method : "equal"
}

export function buildSplitGuestProfiles(count: number, profiles: SplitGuestProfile[]): SplitGuestProfile[] {
  return Array.from({ length: count }, (_, idx) => profiles[idx] || { name: `Guest ${idx + 1}`, avatar: String(idx + 1) })
}

export function normalizeSplitPersonName(name: string | null | undefined, index: number): string {
  const trimmed = String(name || "").trim()
  return trimmed || `Guest ${index + 1}`
}

export function getSplitGuestAvatar(profiles: SplitGuestProfile[], index: number): string {
  return profiles[index]?.avatar || String(index + 1)
}

export function normalizeSharePercentsForGuestCount(previous: number[], guestCount: number, fallbackPercents: number[]): number[] {
  const next = Array.from({ length: guestCount }, (_, idx) => previous[idx] ?? 0)
  return next.every((value) => value === 0) ? fallbackPercents : next
}

export function pruneItemAssignmentsForGuestCount(
  assignments: Record<string, number | null | undefined>,
  guestCount: number,
): Record<string, number | null> {
  return Object.fromEntries(
    Object.entries(assignments).map(([key, value]) => [key, typeof value === "number" && value >= guestCount ? null : value ?? null]),
  )
}

export function isSplitPersonPaid(paidSplitPeople: Record<string, boolean>, personId: string): boolean {
  return Boolean(paidSplitPeople[personId])
}

export function getPaidPersonIds(paidSplitPeople: Record<string, boolean>): string[] {
  return Object.entries(paidSplitPeople).filter(([, paid]) => Boolean(paid)).map(([personId]) => personId)
}

export function buildSplitPerson(params: {
  index: number
  personSubtotal: number
  items: SplitPerson["items"]
  splitSubtotal: number
  splitExtraAmount: number
  splitGuestCount: number
  couponDiscount: number
  splitGuestNames: string[]
  splitGuestProfiles: SplitGuestProfile[]
  paidSplitPeople: Record<string, boolean>
  selectedSplitPersonId: string | null
  percent?: number
}): SplitPerson {
  const {
    index,
    personSubtotal,
    items,
    splitSubtotal,
    splitExtraAmount,
    splitGuestCount,
    couponDiscount,
    splitGuestNames,
    splitGuestProfiles,
    paidSplitPeople,
    selectedSplitPersonId,
    percent,
  } = params
  const ratio = splitSubtotal > 0 ? personSubtotal / splitSubtotal : (splitGuestCount > 0 ? 1 / splitGuestCount : 0)
  const extra = splitExtraAmount * ratio
  const discountShare = couponDiscount > 0 ? couponDiscount * ratio : 0
  const total = Math.max(0, personSubtotal + extra - discountShare)
  const id = `guest-${index}`

  return {
    id,
    name: normalizeSplitPersonName(splitGuestNames[index], index),
    avatar: getSplitGuestAvatar(splitGuestProfiles, index),
    subtotal: personSubtotal,
    tax: extra,
    tip: 0,
    discount: discountShare,
    total,
    items,
    status: isSplitPersonPaid(paidSplitPeople, id) ? "Paid" : selectedSplitPersonId === id ? "Ready to pay" : "Pending",
    percent,
  }
}

export function buildEqualSplitPeople(params: {
  splitGrandTotal: number
  splitGuestCount: number
  splitGuestNames: string[]
  splitGuestProfiles: SplitGuestProfile[]
  splitSubtotal: number
  splitExtraAmount: number
  paidSplitPeople: Record<string, boolean>
  selectedSplitPersonId: string | null
}): SplitPerson[] {
  const { splitGrandTotal, splitGuestCount, splitGuestNames, splitGuestProfiles, splitSubtotal, splitExtraAmount, paidSplitPeople, selectedSplitPersonId } = params
  const totalCents = Math.round(splitGrandTotal * 100)
  const baseCents = Math.floor(totalCents / splitGuestCount)
  const remainder = totalCents - baseCents * splitGuestCount

  return Array.from({ length: splitGuestCount }, (_, idx) => {
    const cents = baseCents + (idx === 0 ? remainder : 0)
    const total = cents / 100
    const ratio = splitGrandTotal > 0 ? total / splitGrandTotal : 1 / splitGuestCount
    const id = `guest-${idx}`

    return {
      id,
      name: normalizeSplitPersonName(splitGuestNames[idx], idx),
      avatar: getSplitGuestAvatar(splitGuestProfiles, idx),
      subtotal: splitSubtotal * ratio,
      tax: splitExtraAmount * ratio,
      tip: 0,
      discount: 0,
      total,
      items: [{ name: "Equal share", amount: total }],
      status: isSplitPersonPaid(paidSplitPeople, id) ? "Paid" : selectedSplitPersonId === id ? "Ready to pay" : "Pending",
    }
  })
}

export function buildItemSplitPeople(params: {
  splitGuestCount: number
  splitSourceItems: SplitSourceItem[]
  itemAssignments: Record<string, number | null | undefined>
  splitSubtotal: number
  splitExtraAmount: number
  couponDiscount: number
  splitGuestNames: string[]
  splitGuestProfiles: SplitGuestProfile[]
  paidSplitPeople: Record<string, boolean>
  selectedSplitPersonId: string | null
}): SplitPerson[] {
  const { splitGuestCount, splitSourceItems, itemAssignments, splitSubtotal, splitExtraAmount, couponDiscount, splitGuestNames, splitGuestProfiles, paidSplitPeople, selectedSplitPersonId } = params

  return Array.from({ length: splitGuestCount }, (_, idx) => {
    const personItems = splitSourceItems
      .filter((item) => itemAssignments[item.key] === idx)
      .map((item) => ({ name: item.name, amount: item.amount, quantity: 1 }))
    const personSubtotal = personItems.reduce((sum, item) => sum + item.amount, 0)

    return buildSplitPerson({
      index: idx,
      personSubtotal,
      items: personItems,
      splitSubtotal,
      splitExtraAmount,
      splitGuestCount,
      couponDiscount,
      splitGuestNames,
      splitGuestProfiles,
      paidSplitPeople,
      selectedSplitPersonId,
    })
  })
}

export function buildShareSplitPeople(params: {
  splitGuestCount: number
  sharePercents: number[]
  splitGrandTotal: number
  splitSubtotal: number
  splitExtraAmount: number
  splitGuestNames: string[]
  splitGuestProfiles: SplitGuestProfile[]
  paidSplitPeople: Record<string, boolean>
  selectedSplitPersonId: string | null
}): SplitPerson[] {
  const { splitGuestCount, sharePercents, splitGrandTotal, splitSubtotal, splitExtraAmount, splitGuestNames, splitGuestProfiles, paidSplitPeople, selectedSplitPersonId } = params

  return Array.from({ length: splitGuestCount }, (_, idx) => {
    const percent = Number(sharePercents[idx] || 0)
    const total = splitGrandTotal * (percent / 100)
    const ratio = splitGrandTotal > 0 ? total / splitGrandTotal : 0
    const id = `guest-${idx}`

    return {
      id,
      name: normalizeSplitPersonName(splitGuestNames[idx], idx),
      avatar: getSplitGuestAvatar(splitGuestProfiles, idx),
      subtotal: splitSubtotal * ratio,
      tax: splitExtraAmount * ratio,
      tip: 0,
      discount: 0,
      total,
      items: [{ name: `${percent}% share`, amount: total }],
      status: isSplitPersonPaid(paidSplitPeople, id) ? "Paid" : selectedSplitPersonId === id ? "Ready to pay" : "Pending",
      percent,
    }
  })
}

export function getActiveSplitPeople(params: {
  splitMethod: SplitMethod
  equalSplitPeople: SplitPerson[]
  itemSplitPeople: SplitPerson[]
  shareSplitPeople: SplitPerson[]
}): SplitPerson[] {
  return params.splitMethod === "items" ? params.itemSplitPeople : params.splitMethod === "shares" ? params.shareSplitPeople : params.equalSplitPeople
}

export function getSelectedSplitPerson(people: SplitPerson[], selectedSplitPersonId: string | null): SplitPerson | null {
  return selectedSplitPersonId ? people.find((person) => person.id === selectedSplitPersonId) || null : null
}

export function calculateSplitConfirmationState(params: {
  splitMethod: SplitMethod
  splitSourceItems: SplitSourceItem[]
  itemAssignments: Record<string, number | null | undefined>
  sharePercents: number[]
  splitGuestCount: number
}): SplitConfirmationState {
  const unassignedSplitItems = countUnassignedSplitItems(params.splitSourceItems, params.itemAssignments)
  const sharePercentTotal = sumSharePercents(params.sharePercents, params.splitGuestCount)
  const canConfirmSplitMethod = params.splitMethod === "items"
    ? unassignedSplitItems === 0
    : params.splitMethod === "shares"
      ? sharePercentTotal === 100
      : true

  return { unassignedSplitItems, sharePercentTotal, canConfirmSplitMethod }
}
