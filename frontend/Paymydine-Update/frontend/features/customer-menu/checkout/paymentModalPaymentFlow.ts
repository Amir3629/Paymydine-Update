"use client"

import { apiClient } from "@/lib/api-client"
import {
  getCheckoutStepAfterOrderSubmit,
  getCheckoutStepAfterPaymentSuccess,
} from "@/features/checkout/checkout-state-utils"
import { toPositiveAmount } from "@/features/checkout/checkout-utils"

export async function handlePaymentFlow({
  stripePaymentIntentId,
  forcedPaymentContext,
  selectedPaymentMethod,
  visiblePaymentMethods,
  toast,
  setIsLoading,
  tableInfo,
  itemsToPay,
  paymentFormData,
  tableDraft,
  selectedOptions,
  checkoutStep,
  payableTotal,
  finalTotal,
  paymentTipAmount,
  tipAmount,
  selectedSplitPersonId,
  appliedCoupon,
  paymentCouponDiscount,
  couponDiscount,
  ensureGuestSession,
  hasUnsubmittedPaymentDraft,
  initialSubmittedOrder,
  resolveSubmittedPaymentOrderId,
  resolveSubmittedPaymentAmount,
  pmdLatestSubmittedPaymentOrderIdRef,
  submittedSnapshot,
  existingOrderId,
  pendingSummary,
  resetPaymentAdjustmentsAfterSuccess,
  setCheckoutStep,
  t,
  selectedSplitPerson,
  isSplitting,
  splitMethod,
  splitSourceItems,
  itemAssignments,
  pmdSubmittedItemsSubtotal,
  paymentPayableTotal,
  markOpenOrderAsPaid,
  setPaidSplitPeople,
  taxSettings,
  subtotal,
  taxAmount,
  merchantSettings,
  estimatedMinutes,
  onOpenOrderUpdate,
  clearCart,
  setSubmittedSnapshot,
  getTenantKey,
  getTableKey,
  buildOpenOrderStorageKeys,
}: any) {
    const effectiveMethodCode = forcedPaymentContext?.method_code || selectedPaymentMethod
    const selectedMethodForSubmit = visiblePaymentMethods.find((method: any) => method.code === effectiveMethodCode)
    const selectedProviderCodeForSubmit =
      effectiveMethodCode === "cod"
        ? null
        : (forcedPaymentContext?.provider_code || (selectedMethodForSubmit as any)?.provider_code || null)
    const isStripeMethodForSubmit =
      selectedProviderCodeForSubmit === "stripe" &&
      (effectiveMethodCode === "card" || effectiveMethodCode === "apple_pay" || effectiveMethodCode === "google_pay" || effectiveMethodCode === "wero")

    if (isStripeMethodForSubmit && !stripePaymentIntentId) {
      toast({
        title: "Payment Failed",
        description: "Stripe payment confirmation is missing. Please try again.",
        variant: "destructive",
      })
      return
    }
    setIsLoading(true)
    try {
      const isCashier = tableInfo?.is_codier || false

      const routeTableId =
        typeof window !== "undefined"
          ? (window.location.pathname.match(/\/table\/(\d+)/)?.[1] ?? null)
          : null

      const queryTableId =
        typeof window !== "undefined"
          ? (
              new URLSearchParams(window.location.search).get("table") ||
              new URLSearchParams(window.location.search).get("table_id") ||
              new URLSearchParams(window.location.search).get("table_no") ||
              null
            )
          : null

      const rawResolvedTableId =
        tableInfo?.table_id ??
        routeTableId ??
        queryTableId ??
        null

      const numericResolvedTableId =
        rawResolvedTableId !== null &&
        rawResolvedTableId !== undefined &&
        String(rawResolvedTableId).trim() !== "" &&
        !Number.isNaN(Number(rawResolvedTableId))
          ? Number(rawResolvedTableId)
          : null

      const resolvedTableName =
        (tableInfo?.table_name && String(tableInfo.table_name).trim() !== "")
          ? String(tableInfo.table_name)
          : (numericResolvedTableId ? `Table ${numericResolvedTableId}` : "Delivery")

      const resolvedLocationId = Number(tableInfo?.location_id || 1)

      const normalizedItemsForOrder = itemsToPay.map((item: any, index: number) => {
        const menuIdCandidate = Number((item as any)?.item?.id ?? (item as any)?.item?.menu_id ?? 0)
        const quantityCandidate = Number((item as any)?.quantity || 1)
        const priceCandidate = Number((item as any)?.price ?? (item as any)?.item?.price ?? 0)
        const nameCandidate = String((item as any)?.item?.name ?? (item as any)?.item?.title ?? "").trim()

        return {
          menu_id: Number.isFinite(menuIdCandidate) ? menuIdCandidate : 0,
          name: nameCandidate !== "" ? nameCandidate : `Item ${index + 1}`,
          quantity: Number.isFinite(quantityCandidate) && quantityCandidate > 0 ? quantityCandidate : 1,
          price: Number.isFinite(priceCandidate) && priceCandidate >= 0 ? priceCandidate : 0,
          special_instructions: "",
          options: Object.fromEntries(
            Object.entries(selectedOptions[String((item as any)?.optionKey || (item as any)?.item?.id)] || {})
              .map(([key, value]) => [String(key), String(value ?? "")])
              .filter(([, value]) => value !== "")
          ),
        }
      })

      const isSplitPersonPayment = checkoutStep === "payment" && Boolean(selectedSplitPersonId)
      const safePaymentCouponDiscount = isSplitPersonPayment ? 0 : Number(paymentCouponDiscount || 0)
      const safePaymentCouponCode = isSplitPersonPayment ? null : (appliedCoupon?.code ? String(appliedCoupon.code) : null)

      const orderData = {
        table_id: isCashier ? "cashier" : (numericResolvedTableId != null ? String(numericResolvedTableId) : null),
        table_name: String(isCashier ? "Cashier" : resolvedTableName),
        location_id: resolvedLocationId,
        is_codier: Boolean(isCashier),
        items: normalizedItemsForOrder,
        customer_name: String(
          isCashier
            ? "Cashier Customer"
            : `${resolvedTableName} Customer`
        ),
        customer_phone: String(paymentFormData.phone || ""),
        customer_email: String(paymentFormData.email || ""),
        payment_method: (
          effectiveMethodCode === "cod"
            ? "cash"
            : effectiveMethodCode === "paypal"
              ? "paypal"
              : "card"
        ) as 'cash' | 'paypal' | 'card',
        payment_method_raw: effectiveMethodCode || undefined,
        payment_provider: selectedProviderCodeForSubmit || undefined,
        payment_reference: stripePaymentIntentId ? String(stripePaymentIntentId) : undefined,
        stripe_payment_intent_id: (isStripeMethodForSubmit && stripePaymentIntentId) ? String(stripePaymentIntentId) : undefined,
        total_amount: Number(checkoutStep === "payment" ? payableTotal : finalTotal),
        tip_amount: Number(checkoutStep === "payment" ? paymentTipAmount : tipAmount),
        coupon_code: checkoutStep === "payment" ? safePaymentCouponCode : (appliedCoupon?.code ? String(appliedCoupon.code) : null),
        coupon_discount: Number(checkoutStep === "payment" ? safePaymentCouponDiscount : couponDiscount),
        guest_session_id: ensureGuestSession(),
        special_instructions: "",
      }

      const existingLocalOrder = !hasUnsubmittedPaymentDraft() && initialSubmittedOrder?.paymentStatus !== "paid" ? initialSubmittedOrder : null
      if (existingLocalOrder?.orderId) {
        ;(orderData as any).existing_order_id = Number(existingLocalOrder.orderId)
        ;(orderData as any).append_to_order = true
      }
      const paymentOrderIdCandidate = resolveSubmittedPaymentOrderId()
      console.info("PMD_PAYMENT_ORDER_ID_RESOLVED", {
        paymentOrderIdCandidate,
        latestRef: pmdLatestSubmittedPaymentOrderIdRef.current,
        submittedSnapshotOrderId: (submittedSnapshot as any)?.orderId || (submittedSnapshot as any)?.order_id || null,
        tableDraftOrderId: (tableDraft as any)?.order_id || (tableDraft as any)?.orderId || null,
        existingOrderId,
      })
      if (checkoutStep === "payment" && !paymentOrderIdCandidate) {
        setIsLoading(false)
        toast({
          title: "Order not found",
          description: "Please send the table order to the kitchen first.",
          variant: "destructive",
        })
        return
      }
      const isQrPayLaterSubmittedOrder = String(tableDraft?.payment || submittedSnapshot?.payment || "").toLowerCase() === "qr_pay_later"
      const shouldUsePayExisting = !!(checkoutStep === "payment" && paymentOrderIdCandidate && (pendingSummary || isQrPayLaterSubmittedOrder))
      if (checkoutStep === "payment" && paymentOrderIdCandidate && !shouldUsePayExisting) {
        try {
          const started = await apiClient.startExistingOrderPayment({
            order_id: Number(paymentOrderIdCandidate),
            payment_method: String(effectiveMethodCode || "card"),
            provider: selectedProviderCodeForSubmit || undefined,
            guest_session_id: ensureGuestSession(),
            table_id: tableInfo?.table_id ? String(tableInfo.table_id) : null,
            table_no: tableInfo?.table_no ? String(tableInfo.table_no) : null,
            source: "menu_existing_submitted",
          })
          if (String(effectiveMethodCode || "") === "cod") {
            setIsLoading(false)
            toast({ title: "Cash collection requested", description: started?.message || "Staff will collect payment shortly." })
            return
          }
          if (isStripeMethodForSubmit) {
            if (!stripePaymentIntentId) {
              throw new Error("Stripe payment confirmation is missing")
            }
            await apiClient.finalizeExistingOrderPayment({
              order_id: Number(paymentOrderIdCandidate),
              payment_intent_id: String(stripePaymentIntentId),
              payment_method: String(effectiveMethodCode || "card"),
              provider: selectedProviderCodeForSubmit || "stripe",
            })
          }
          if (selectedSplitPersonId) {
            setPaidSplitPeople((prev: any) => ({ ...prev, [selectedSplitPersonId]: true }))
          } else {
            markOpenOrderAsPaid(paymentOrderIdCandidate, { tipAmount: paymentTipAmount, couponDiscount: safePaymentCouponDiscount, paidTotal: paymentPayableTotal, couponCode: safePaymentCouponCode })
            resetPaymentAdjustmentsAfterSuccess()
          }
          setCheckoutStep(getCheckoutStepAfterPaymentSuccess())
          setIsLoading(false)
          toast({
            title: t("paymentSuccessful"),
            description: `Order #${paymentOrderIdCandidate} paid successfully!`,
          })
          return
        } catch (e) {
          setIsLoading(false)
          toast({
            title: "Payment unavailable",
            description: "Payment could not be started. Please ask staff or try again.",
            variant: "destructive",
          })
          return
        }
      }
    // PMD_FIX_EXISTING_ORDER_AMOUNT_REFERENCE_V41
    // Avoid ReferenceError when old payload amount variable does not exist in this scope.
    // PMD_PAY_EXISTING_INLINE_PAYABLE_V40
    // Use payable total after coupon/tip for /pay-existing.
    const pmdPayExistingPayableAmountV40 = (() => {
      const candidates = [
        paymentPayableTotal,
        payableTotal,
      ]
      for (const value of candidates) {
        const amount = Number(value)
        if (Number.isFinite(amount) && amount >= 0) {
          return Math.round(amount * 100) / 100
        }
      }
      return 0
    })()

      if (shouldUsePayExisting && paymentOrderIdCandidate) {
        const paidMethod = orderData.payment_method
        const selectedItemsPayload = selectedSplitPersonId && splitMethod === "items"
          ? splitSourceItems.reduce((acc: Array<{ order_menu_id: number; quantity: number }>, item: any) => {
              const guestIndex = Number(String(selectedSplitPersonId).replace("guest-", ""))
              if (itemAssignments[item.key] !== guestIndex) return acc
              const orderMenuId = Number(item.orderMenuId || 0)
              if (!orderMenuId) return acc
              const existing = acc.find((row: any) => row.order_menu_id === orderMenuId)
              if (existing) existing.quantity += 1
              else acc.push({ order_menu_id: orderMenuId, quantity: 1 })
              return acc
            }, [])
          : undefined

        const existingOrderAmount = checkoutStep === "payment"
          ? resolveSubmittedPaymentAmount()
          : (selectedSplitPerson?.total
            ? Number(selectedSplitPerson.total.toFixed(2))
            : (isSplitting
              ? null
              : (toPositiveAmount(pendingSummary?.remainingAmount) ?? toPositiveAmount(submittedSnapshot?.total) ?? null)))

        console.info("PMD_PAYMENT_AMOUNT_RESOLVED", {
          order_id: paymentOrderIdCandidate,
          amount: pmdPayExistingPayableAmountV40,
          payableTotal,
          paymentPayableTotal,
          submittedSnapshotTotal: (submittedSnapshot as any)?.total ?? null,
          submittedSnapshotRemaining: (submittedSnapshot as any)?.remainingAmount ?? null,
          tableDraftTotal: (tableDraft as any)?.totals?.total ?? null,
          submittedItemsSubtotal: pmdSubmittedItemsSubtotal(),
        })

        const payExistingPayload = {
          payment_method: String(paidMethod),
          payment_reference: stripePaymentIntentId ? String(stripePaymentIntentId) : null,
          amount: (typeof existingOrderAmount !== "undefined" ? existingOrderAmount : undefined),
          tip_amount: checkoutStep === "payment" ? Number(paymentTipAmount.toFixed(2)) : 0,
          coupon_discount: checkoutStep === "payment" ? Number(safePaymentCouponDiscount.toFixed(2)) : 0,
          coupon_code: checkoutStep === "payment" ? safePaymentCouponCode : null,
          selected_items: selectedItemsPayload,
          table_id: tableInfo?.table_id ? String(tableInfo.table_id) : null,
          table_no: tableInfo?.table_no ? String(tableInfo.table_no) : null,
          qr: tableInfo?.qr_code ? String(tableInfo.qr_code) : null,
        }
    console.info("PMD_PAY_EXISTING_AMOUNT_V40", { amount: pmdPayExistingPayableAmountV40, oldAmount: (typeof existingOrderAmount !== "undefined" ? existingOrderAmount : undefined) })
        console.info("PMD_PAY_EXISTING_PAYLOAD", { order_id: paymentOrderIdCandidate, ...payExistingPayload })
        const paidResponse = await apiClient.payExistingQrOrder(paymentOrderIdCandidate, payExistingPayload)

        if (paidResponse?.success) {
          setIsLoading(false)
          toast({
            title: t("paymentSuccessful"),
            description: `Order #${paymentOrderIdCandidate} paid successfully!`
          })

          const orderId = String(paymentOrderIdCandidate)
          localStorage.setItem("lastOrderId", orderId)

          const returnUrl =
            typeof window !== "undefined"
              ? `${window.location.pathname}${window.location.search}`
              : "/menu"

          const params = new URLSearchParams()
          params.set("order_id", orderId)
          params.set("return_url", returnUrl)

          if (selectedSplitPersonId) {
            setPaidSplitPeople((prev: any) => ({ ...prev, [selectedSplitPersonId]: true }))
          } else {
            markOpenOrderAsPaid(paymentOrderIdCandidate, { tipAmount: paymentTipAmount, couponDiscount: safePaymentCouponDiscount, paidTotal: paymentPayableTotal, couponCode: safePaymentCouponCode })
            resetPaymentAdjustmentsAfterSuccess()
          }
          setCheckoutStep(getCheckoutStepAfterPaymentSuccess())
          return
        }
      }

      const response = await apiClient.submitOrder(orderData)

      if (response.success) {
        setIsLoading(false)
        toast({
          title: t("paymentSuccessful"),
          description: `Order #${response.order_id} submitted successfully!`
        })

        const orderId = response.order_id ? String(response.order_id) : ""

        // Save order ID for status tracking
        if (orderId) {
          localStorage.setItem("lastOrderId", orderId)
        }

        const returnUrl =
          typeof window !== "undefined"
            ? `${window.location.pathname}${window.location.search}`
            : "/menu"

        const params = new URLSearchParams()
        if (orderId) params.set("order_id", orderId)
        params.set("return_url", returnUrl)

        try {
          const guestSessionId = ensureGuestSession()
          const tenant = getTenantKey()
          const tableKey = getTableKey()
          const sessionKey = buildOpenOrderStorageKeys().sessionKey
          const orderIdVal = response.order_id ? String(response.order_id) : ''
          const responseTotals = Array.isArray((response as any)?.order_totals) ? (response as any).order_totals : []
          const getTotalByCode = (code: string) => {
            const found = responseTotals.find((row: any) => String(row?.code || '') === code)
            const amount = Number(found?.value ?? 0)
            return Number.isFinite(amount) ? amount : 0
          }
          const responseItems = Array.isArray((response as any)?.items) ? (response as any).items : []
          const combinedSubmittedItems = responseItems.length > 0
            ? responseItems.map((item: any) => ({
                id: Number(item?.menu_id || item?.id || 0),
                name: String(item?.name || 'Item'),
                quantity: Number(item?.quantity || 0),
                price: Number(item?.price || 0),
                subtotal: Number(item?.subtotal || (Number(item?.quantity || 0) * Number(item?.price || 0))),
              }))
            : normalizedItemsForOrder
          const settlement = (response as any)?.settlement || {}
          const serverOrderTotal = Number((response as any)?.order_total ?? (response as any)?.total ?? 0)
          const snapshot = {
            guestSessionId, tenant, tableKey,
            tableNumber: tableInfo?.table_no || tableInfo?.table_id || null,
            orderId: orderIdVal || null,
            status: 'submitted',
            paymentStatus: 'unpaid',
            subtotal: Number(getTotalByCode('subtotal') || subtotal || 0),
            vatAmount: Number(getTotalByCode('tax') || taxAmount || 0),
            vatPercentage: Number(taxSettings?.percentage || 0),
            total: Number(serverOrderTotal > 0 ? serverOrderTotal : (finalTotal || 0)),
            orderTotal: Number(serverOrderTotal > 0 ? serverOrderTotal : (finalTotal || 0)),
            settledAmount: Number(settlement?.settledAmount || 0),
            remainingAmount: Number(settlement?.remainingAmount ?? (serverOrderTotal > 0 ? serverOrderTotal : (finalTotal || 0))),
            settlementStatus: String(settlement?.settlementStatus || 'unpaid'),
            etaMinutes: Number((response as any)?.eta_minutes ?? (response as any)?.estimated_prep_minutes ?? estimatedMinutes),
            showCustomerEta: Boolean((response as any)?.show_customer_eta ?? true),
            currency: String(merchantSettings?.currency || 'EUR'),
            submittedItems: combinedSubmittedItems,
            createdAt: Date.now()
          }
          localStorage.setItem(sessionKey, JSON.stringify(snapshot))
          setSubmittedSnapshot(snapshot)
          onOpenOrderUpdate?.(snapshot)
        } catch {}
        clearCart()
        if (checkoutStep === "payment") {
          markOpenOrderAsPaid(orderId || submittedSnapshot?.orderId || null, { tipAmount: paymentTipAmount, couponDiscount: safePaymentCouponDiscount, paidTotal: paymentPayableTotal, couponCode: safePaymentCouponCode })
          resetPaymentAdjustmentsAfterSuccess()
          setCheckoutStep(getCheckoutStepAfterOrderSubmit(checkoutStep))
        } else {
          setCheckoutStep(getCheckoutStepAfterOrderSubmit(checkoutStep))
        }
        return
      } else {
        throw new Error('Order submission failed')
      }
    } catch (error) {
    setIsLoading(false)
      console.error('Order submission error:', error)
      const normalizedMessage =
        error instanceof Error && /given data was invalid|unprocessable|amount|selected items amount mismatch/i.test(error.message)
          ? "Payment could not be started. Please ask staff or try again."
          : null
      const validationDetails = (error as any)?.details as Record<string, string[]> | undefined
      const firstValidationMessage = validationDetails
        ? Object.values(validationDetails).flat().find(Boolean)
        : null
      toast({
        title: "Order Failed",
        description: normalizedMessage || firstValidationMessage || (error instanceof Error ? error.message : "Failed to submit order. Please try again."),
        variant: "destructive"
      })
    }
  
}
