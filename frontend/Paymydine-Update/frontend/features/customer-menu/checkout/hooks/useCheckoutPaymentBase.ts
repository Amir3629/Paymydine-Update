"use client"

import { useMemo, useState } from "react"
import {
  calculateCouponDiscount,
  calculateFinalTotal,
  calculateOrderStatusTotal,
  calculateSubmittedBaseTotal,
  calculateTipAmount,
} from "@/features/checkout/payment-summary-utils"

export function useCheckoutPaymentBase({
  submittedSnapshot,
  pendingSummary,
  checkoutStep,
  subtotal,
  taxAmount,
  appliedCoupon,
  taxSettings,
}: {
  submittedSnapshot: any
  pendingSummary: any
  checkoutStep: string
  subtotal: number
  taxAmount: number
  appliedCoupon: any
  taxSettings: any
}) {
  const [tipPercentage, setTipPercentage] = useState(0)
  const [customTip, setCustomTip] = useState("")
  const [splitPaymentTips, setSplitPaymentTips] = useState<Record<string, { percentage: number; custom: string }>>({})
  const [couponCode, setCouponCode] = useState("")
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState<string | null>(null)

  const submittedBaseTotal = useMemo(
    () => calculateSubmittedBaseTotal(submittedSnapshot, pendingSummary),
    [
      submittedSnapshot?.remainingAmount,
      submittedSnapshot?.total,
      submittedSnapshot?.orderTotal,
      pendingSummary?.remainingAmount,
    ]
  )

  const isOrderStatusFlow = submittedBaseTotal > 0 && checkoutStep !== "review"
  const tipBaseAmount = isOrderStatusFlow ? submittedBaseTotal : subtotal
  const tipAmount = calculateTipAmount(tipBaseAmount, tipPercentage, customTip)
  const couponBaseAmount = isOrderStatusFlow ? submittedBaseTotal : subtotal

  const couponDiscount = useMemo(
    () => calculateCouponDiscount(appliedCoupon, couponBaseAmount),
    [appliedCoupon, couponBaseAmount]
  )

  const finalTotal = calculateFinalTotal(subtotal, taxAmount, tipAmount, couponDiscount)
  const orderStatusTotal = calculateOrderStatusTotal(submittedBaseTotal, subtotal, taxAmount)

  const vatLabels = useMemo(() => {
    if (!taxSettings.enabled || taxSettings.percentage <= 0) {
      return {
        summary: "Order Summary",
        subtotal: "Subtotal",
        total: "Total",
        includedNote: "",
      }
    }

    if (taxSettings.menuPrice === 0) {
      const vatPct = Number.isInteger(taxSettings.percentage)
        ? String(taxSettings.percentage)
        : String(Number(taxSettings.percentage.toFixed(2)))

      return {
        summary: "Order Summary",
        subtotal: `Subtotal (incl. ${vatPct}% VAT)`,
        total: "Total",
        includedNote: `prices incl. ${vatPct}% VAT`,
      }
    }

    return {
      summary: "Order Summary",
      subtotal: "Subtotal",
      total: "Total",
      includedNote: "",
    }
  }, [taxSettings.enabled, taxSettings.percentage, taxSettings.menuPrice])

  return {
    tipPercentage,
    setTipPercentage,
    customTip,
    setCustomTip,
    splitPaymentTips,
    setSplitPaymentTips,
    couponCode,
    setCouponCode,
    couponLoading,
    setCouponLoading,
    couponError,
    setCouponError,
    submittedBaseTotal,
    isOrderStatusFlow,
    tipBaseAmount,
    tipAmount,
    couponBaseAmount,
    couponDiscount,
    finalTotal,
    orderStatusTotal,
    vatLabels,
  }
}
