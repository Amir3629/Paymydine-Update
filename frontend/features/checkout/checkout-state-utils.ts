import type { CheckoutStep, SplitMethod } from "./types"

export const CHECKOUT_STEPS: CheckoutStep[] = [
  "review",
  "submitted",
  "split",
  "split-items",
  "split-shares",
  "split-review",
  "payment",
  "paid",
]

export const SPLIT_CHECKOUT_STEPS: CheckoutStep[] = ["split", "split-items", "split-shares", "split-review"]

export function isCheckoutStep(value: unknown): value is CheckoutStep {
  return CHECKOUT_STEPS.includes(value as CheckoutStep)
}

export function normalizeCheckoutStep(value: unknown, fallback: CheckoutStep = "review"): CheckoutStep {
  return isCheckoutStep(value) ? value : fallback
}

export function isSplitCheckoutStep(step: CheckoutStep): boolean {
  return SPLIT_CHECKOUT_STEPS.includes(step)
}

export function getInitialCheckoutStep(initialCheckoutStep: CheckoutStep | null | undefined, existingOrderId?: number | null): CheckoutStep {
  return initialCheckoutStep || (existingOrderId ? "submitted" : "review")
}

export function getCheckoutStepOnOpen(params: {
  initialCheckoutStep?: CheckoutStep | null
  existingOrderId?: number | null
  hasPersonalItems: boolean
  preferPersonalReview: boolean
  currentStep: CheckoutStep
}): CheckoutStep {
  const nextStep = params.initialCheckoutStep && !(params.existingOrderId && params.initialCheckoutStep === "review")
    ? params.initialCheckoutStep
    : params.existingOrderId
      ? "submitted"
      : "review"

  if (!params.preferPersonalReview && !params.hasPersonalItems && isPostReviewCheckoutStep(params.currentStep) && nextStep === "review") {
    return params.currentStep
  }

  return nextStep
}

export function isPostReviewCheckoutStep(step: CheckoutStep): boolean {
  return step === "submitted" || step === "payment" || step === "paid" || isSplitCheckoutStep(step)
}

export function shouldForcePersonalReview(params: {
  hasPersonalItems: boolean
  initialCheckoutStep?: CheckoutStep | null
  currentStep: CheckoutStep
}): boolean {
  return params.hasPersonalItems && params.initialCheckoutStep === "review" && params.currentStep !== "review"
}

export function getCheckoutStepForSplitMethod(method: SplitMethod): CheckoutStep {
  if (method === "items") return "split-items"
  if (method === "shares") return "split-shares"
  return "split"
}

export function getCheckoutStepAfterBack(currentStep: CheckoutStep, hasSelectedSplitPerson: boolean): CheckoutStep | null {
  if (currentStep === "payment") return hasSelectedSplitPerson ? "split-review" : "submitted"
  if (isSplitCheckoutStep(currentStep)) return "submitted"
  return null
}

export function getCheckoutStepAfterDraftSubmit(): CheckoutStep {
  return "submitted"
}

export function getCheckoutStepAfterPaymentSuccess(): CheckoutStep {
  return "paid"
}

export function getCheckoutStepAfterOrderSubmit(currentStep: CheckoutStep): CheckoutStep {
  return currentStep === "payment" ? getCheckoutStepAfterPaymentSuccess() : getCheckoutStepAfterDraftSubmit()
}
