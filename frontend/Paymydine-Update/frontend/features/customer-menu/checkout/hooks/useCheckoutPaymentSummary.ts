"use client"

import { useMemo } from "react"
import {
  calculatePaidSnapshotTotals,
  calculatePayableTotal,
  calculatePaymentSummary,
} from "@/features/checkout/payment-summary-utils"
import { estimatePrepMinutes } from "@/features/customer-menu/checkout/paymentModalMath"

export function useCheckoutPaymentSummary({
  selectedSplitPersonId,
  selectedSplitPerson,
  splitPaymentTips,
  setSplitPaymentTips,
  tipPercentage,
  setTipPercentage,
  customTip,
  setCustomTip,
  submittedBaseTotal,
  finalTotal,
  couponDiscount,
  submittedSnapshot,
  taxSettings,
  checkoutStep,
  tipAmount,
  orderStatusTotal,
  itemsToPay,
}: any) {
  const splitPaymentTip = selectedSplitPersonId
    ? (splitPaymentTips[selectedSplitPersonId] || { percentage: 0, custom: "" })
    : { percentage: 0, custom: "" }

  const paymentTipPercentage = selectedSplitPerson ? splitPaymentTip.percentage : tipPercentage
  const paymentCustomTip = selectedSplitPerson ? splitPaymentTip.custom : customTip

  const {
    paymentBaseAmount,
    paymentTipAmount,
    paymentCouponDiscount,
    paymentPayableTotal,
    paymentSubtotalAmount,
    paymentVatAmount,
    paymentVatPercentage,
  } = calculatePaymentSummary({
    selectedSplitPerson,
    submittedBaseTotal,
    finalTotal,
    paymentCustomTip,
    paymentTipPercentage,
    couponDiscount,
    submittedSnapshot,
    taxPercentage: taxSettings?.percentage ?? 0,
  })

  const { paidTipAmount, paidCouponDiscount, paidAmountTotal } = calculatePaidSnapshotTotals({
    checkoutStep,
    submittedSnapshot,
    paymentTipAmount,
    tipAmount,
    paymentCouponDiscount,
    couponDiscount,
    orderStatusTotal,
    paymentPayableTotal,
  })

  const updatePaymentTipPercentage = (percentage: number) => {
    if (selectedSplitPersonId) {
      setSplitPaymentTips((prev: any) => ({
        ...prev,
        [selectedSplitPersonId]: { percentage, custom: "" },
      }))
      return
    }

    setTipPercentage(percentage)
    setCustomTip("")
  }

  const updatePaymentCustomTip = (value: string) => {
    if (selectedSplitPersonId) {
      setSplitPaymentTips((prev: any) => ({
        ...prev,
        [selectedSplitPersonId]: { percentage: 0, custom: value },
      }))
      return
    }

    setCustomTip(value)
    setTipPercentage(0)
  }

  const payableTotal = useMemo(
    () =>
      calculatePayableTotal({
        checkoutStep,
        paymentPayableTotal,
        orderStatusTotal,
        finalTotal,
      }),
    [checkoutStep, paymentPayableTotal, orderStatusTotal, finalTotal]
  )

  const estimatedMinutes = useMemo(() => {
    const backendEta = Number(
      submittedSnapshot?.etaMinutes ||
      submittedSnapshot?.estimated_prep_minutes ||
      0
    )

    if (backendEta > 0) return backendEta

    return estimatePrepMinutes(submittedSnapshot?.submittedItems || itemsToPay)
  }, [
    submittedSnapshot?.submittedItems,
    submittedSnapshot?.etaMinutes,
    submittedSnapshot?.estimated_prep_minutes,
    itemsToPay,
  ])

  return {
    paymentTipPercentage,
    paymentCustomTip,
    paymentBaseAmount,
    paymentTipAmount,
    paymentCouponDiscount,
    paymentPayableTotal,
    paymentSubtotalAmount,
    paymentVatAmount,
    paymentVatPercentage,
    paidTipAmount,
    paidCouponDiscount,
    paidAmountTotal,
    updatePaymentTipPercentage,
    updatePaymentCustomTip,
    payableTotal,
    estimatedMinutes,
  }
}
