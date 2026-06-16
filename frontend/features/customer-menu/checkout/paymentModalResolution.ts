import { positiveMoney } from "@/features/customer-menu/checkout/paymentModalMath"

export function resolveSubmittedPaymentOrderIdFromState({
  tableDraft,
  submittedSnapshot,
  existingOrderId,
  latestRefOrderId,
}: {
  tableDraft: any
  submittedSnapshot: any
  existingOrderId: any
  latestRefOrderId: number | null
}): number | null {
  const draftIdRaw = Number(tableDraft?.draft_id || 0)
  const draftId = Number.isFinite(draftIdRaw) && draftIdRaw > 0 ? draftIdRaw : null

  const tableDraftOrderIdRaw = Number(tableDraft?.order_id || tableDraft?.orderId || 0)
  const tableDraftOrderId = Number.isFinite(tableDraftOrderIdRaw) && tableDraftOrderIdRaw > 0 ? tableDraftOrderIdRaw : null

  if (draftId && !tableDraftOrderId) {
    return null
  }

  let storedLatestSubmittedOrderId: number | null = null

  try {
    const storedRaw =
      (typeof window !== "undefined" &&
        (sessionStorage.getItem("pmd:latest-submitted-payment-order-id") ||
          localStorage.getItem("pmd:latest-submitted-payment-order-id"))) ||
      ""

    const storedValue = Number(storedRaw || 0)
    storedLatestSubmittedOrderId =
      Number.isFinite(storedValue) && storedValue > 0 ? storedValue : null
  } catch {}

  const snapshotOrderIdRaw = Number(submittedSnapshot?.orderId || submittedSnapshot?.order_id || 0)
  const snapshotOrderId = Number.isFinite(snapshotOrderIdRaw) && snapshotOrderIdRaw > 0 ? snapshotOrderIdRaw : null

  const currentSubmittedOrderId = tableDraftOrderId || snapshotOrderId || latestRefOrderId || null

  const validatedStoredLatestOrderId =
    storedLatestSubmittedOrderId && (!currentSubmittedOrderId || storedLatestSubmittedOrderId === currentSubmittedOrderId)
      ? storedLatestSubmittedOrderId
      : null

  const existingOrderIdRaw = Number(existingOrderId || 0)
  const trustedExistingOrderId =
    Number.isFinite(existingOrderIdRaw) &&
    existingOrderIdRaw > 0 &&
    currentSubmittedOrderId &&
    existingOrderIdRaw === currentSubmittedOrderId
      ? existingOrderIdRaw
      : null

  const candidates = [
    currentSubmittedOrderId,
    tableDraftOrderId,
    snapshotOrderId,
    latestRefOrderId,
    validatedStoredLatestOrderId,
    trustedExistingOrderId,
  ]

  for (const raw of candidates) {
    const value = Number(raw || 0)
    if (!Number.isFinite(value) || value <= 0) continue

    if (draftId && value === draftId && tableDraftOrderId !== value) continue

    return value
  }

  return null
}

export function hasUnsubmittedPaymentDraftFromState({
  tableDraft,
  submittedPaymentOrderId,
}: {
  tableDraft: any
  submittedPaymentOrderId: number | null
}): boolean {
  return Boolean(tableDraft?.draft_id && !submittedPaymentOrderId)
}

export function resolveSubmittedPaymentAmountFromState({
  selectedSplitPersonId,
  selectedSplitPerson,
  paymentPayableTotal,
  submittedSnapshot,
  tableDraft,
  initialSubmittedOrder,
  pendingSummary,
  payableTotal,
  finalTotal,
  submittedItemsSubtotal,
}: {
  selectedSplitPersonId: string | null
  selectedSplitPerson: any
  paymentPayableTotal: number
  submittedSnapshot: any
  tableDraft: any
  initialSubmittedOrder: any
  pendingSummary: any
  payableTotal: number
  finalTotal: number
  submittedItemsSubtotal: number | null
}): number {
  const snapshot: any = submittedSnapshot || {}
  const draft: any = tableDraft || {}
  const draftTotals: any = draft?.totals || {}
  const initial: any = initialSubmittedOrder || {}
  const initialTotals: any = initial?.totals || {}

  if (selectedSplitPersonId && selectedSplitPerson) {
    return positiveMoney(selectedSplitPerson.total) ?? positiveMoney(paymentPayableTotal) ?? 0
  }

  const candidates = [
    snapshot.remainingAmount,
    snapshot.orderTotal,
    snapshot.total,
    draftTotals.remainingAmount,
    draftTotals.orderTotal,
    draftTotals.total,
    submittedItemsSubtotal,
    initial.remainingAmount,
    initial.orderTotal,
    initial.total,
    initialTotals.remainingAmount,
    initialTotals.orderTotal,
    initialTotals.total,
    pendingSummary?.remainingAmount,
    pendingSummary?.orderTotal,
    pendingSummary?.total,
    paymentPayableTotal,
    payableTotal,
    finalTotal,
  ]

  for (const value of candidates) {
    const amount = positiveMoney(value)
    if (amount !== null) return amount
  }

  return 0
}
