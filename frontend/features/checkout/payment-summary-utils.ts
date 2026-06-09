import type { CheckoutStep, SplitPerson } from "./types"
import { toPositiveAmount } from "./checkout-utils"

export type CouponLike = {
  type?: string | null
  discount?: number
  discount_value?: number
}

export type PaymentSummary = {
  paymentBaseAmount: number
  paymentTipAmount: number
  paymentCouponDiscount: number
  paymentPayableTotal: number
  paymentSubtotalAmount: number
  paymentVatAmount: number
  paymentVatPercentage: number
}

export type PaidSnapshotTotals = {
  paidTipAmount: number
  paidCouponDiscount: number
  paidAmountTotal: number
}

export function calculateSubmittedBaseTotal(
  submittedSnapshot: any | null | undefined,
  pendingSummary?: { remainingAmount?: number | null } | null,
): number {
  return Number(submittedSnapshot?.remainingAmount ?? submittedSnapshot?.total ?? submittedSnapshot?.orderTotal ?? pendingSummary?.remainingAmount ?? 0)
}

export function calculateTipAmount(baseAmount: number, tipPercentage: number, customTip: string | number | null | undefined): number {
  return customTip ? Number.parseFloat(String(customTip)) || 0 : Number(baseAmount || 0) * (Number(tipPercentage || 0) / 100)
}

export function calculateCouponDiscount(appliedCoupon: CouponLike | null | undefined, couponBaseAmount: number): number {
  if (!appliedCoupon) return 0
  if (appliedCoupon.type === "F") {
    return Math.min(Number(appliedCoupon.discount || 0), couponBaseAmount)
  }
  return couponBaseAmount * (Number(appliedCoupon.discount_value || 0) / 100)
}

export function calculateFinalTotal(subtotal: number, taxAmount: number, tipAmount: number, couponDiscount: number): number {
  return Math.max(0, Number(subtotal || 0) + Number(taxAmount || 0) + Number(tipAmount || 0) - Number(couponDiscount || 0))
}

export function calculateOrderStatusTotal(submittedBaseTotal: number, subtotal: number, taxAmount: number): number {
  return Math.max(0, submittedBaseTotal > 0 ? submittedBaseTotal : Number(subtotal || 0) + Number(taxAmount || 0))
}

export function calculatePaymentSummary(params: {
  selectedSplitPerson: SplitPerson | null
  submittedBaseTotal: number
  finalTotal: number
  paymentCustomTip: string | number | null | undefined
  paymentTipPercentage: number
  couponDiscount: number
  submittedSnapshot: any | null | undefined
  taxPercentage: number
}): PaymentSummary {
  const paymentBaseAmount = params.selectedSplitPerson?.total && params.selectedSplitPerson.total > 0
    ? params.selectedSplitPerson.total
    : (params.submittedBaseTotal > 0 ? params.submittedBaseTotal : params.finalTotal)
  const paymentTipAmount = calculateTipAmount(paymentBaseAmount, params.paymentTipPercentage, params.paymentCustomTip)
  const paymentCouponDiscount = params.selectedSplitPerson ? 0 : params.couponDiscount
  const paymentPayableTotal = Math.max(0, paymentBaseAmount + paymentTipAmount - paymentCouponDiscount)
  const paymentSubtotalAmount = params.selectedSplitPerson
    ? Number(params.selectedSplitPerson.subtotal || 0)
    : Number(params.submittedSnapshot?.subtotal || 0)
  const paymentVatAmount = params.selectedSplitPerson
    ? Number(params.selectedSplitPerson.tax || 0)
    : Number(params.submittedSnapshot?.vatAmount || 0)
  const paymentVatPercentage = Number(params.submittedSnapshot?.vatPercentage ?? params.taxPercentage ?? 0)

  return {
    paymentBaseAmount,
    paymentTipAmount,
    paymentCouponDiscount,
    paymentPayableTotal,
    paymentSubtotalAmount,
    paymentVatAmount,
    paymentVatPercentage,
  }
}

export function calculatePaidSnapshotTotals(params: {
  checkoutStep: CheckoutStep
  submittedSnapshot: any | null | undefined
  paymentTipAmount: number
  tipAmount: number
  paymentCouponDiscount: number
  couponDiscount: number
  orderStatusTotal: number
  paymentPayableTotal: number
}): PaidSnapshotTotals {
  if (params.checkoutStep !== "paid") {
    return {
      paidTipAmount: params.paymentTipAmount,
      paidCouponDiscount: params.paymentCouponDiscount,
      paidAmountTotal: params.paymentPayableTotal,
    }
  }

  const paidTipAmount = Number(params.submittedSnapshot?.paidTipAmount ?? params.paymentTipAmount ?? params.tipAmount ?? 0)
  const paidCouponDiscount = Number(params.submittedSnapshot?.paidCouponDiscount ?? params.paymentCouponDiscount ?? params.couponDiscount ?? 0)

  return {
    paidTipAmount,
    paidCouponDiscount,
    paidAmountTotal: Number(params.submittedSnapshot?.paidTotal ?? Math.max(0, params.orderStatusTotal + paidTipAmount - paidCouponDiscount)),
  }
}

export function calculatePayableTotal(params: {
  checkoutStep: CheckoutStep
  paymentPayableTotal: number
  orderStatusTotal: number
  finalTotal: number
}): number {
  const reviewTotal = toPositiveAmount(params.finalTotal)
  const orderTotal = toPositiveAmount(params.orderStatusTotal)
  if (params.checkoutStep === "payment") return params.paymentPayableTotal
  return orderTotal ?? reviewTotal ?? 0
}
