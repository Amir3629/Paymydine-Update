// PMD_SAFETY_NOTE:
// This file is the active checkout/payment modal used by all customer themes.
// It is intentionally not refactored casually because it touches real checkout/payment flow.
// Before changing this file: run build, typecheck, and manual checkout QA on all active themes.
// TODO: split into smaller checkout panels after smoke/E2E tests exist.

"use client"

import React, { useState } from "react"
import { useLanguageStore } from "@/store/language-store"
import { usePaymentSettingsStore } from "@/store/cms/payment-settings-store"
import { useTaxSettingsStore } from "@/store/cms/tax-settings-store"
import { useTipSettingsStore } from "@/store/cms/tip-settings-store"
import { useCouponStore } from "@/store/cms/coupon-store"
import { useCartStore } from "@/store/cart-store"
import { useToast } from "@/components/ui/use-toast"
import { useCheckoutDomCompatibilityEffects } from "@/features/customer-menu/checkout/dom-compat/useCheckoutDomCompatibilityEffects"
import { CheckoutShellRouter } from "@/features/customer-menu/checkout/CheckoutShellRouter"
import { PaymentMethodForm } from "@/features/customer-menu/checkout/PaymentMethodForm"
import { PaymentActionButton } from "@/features/customer-menu/checkout/PaymentActionButton"
import { KAZEN_JAPANESE_THEME_KEY, VELVET_TERRACOTTA_THEME_KEY, ORGANIC_BOTANICAL_THEME_KEY, type PaymentModalProps } from "@/features/customer-menu/checkout/paymentModalShared"
import { buildPaymentOpenOrderStorageKeys, ensurePaymentGuestSession, getPaymentTableKey, getPaymentTenantKey } from "@/features/customer-menu/checkout/paymentModalStorage"
import { subtotalFromSubmittedPaymentRows } from "@/features/customer-menu/checkout/paymentModalMath"
import { startHostedRedirectCheckoutFlow } from "@/features/customer-menu/checkout/paymentModalHostedCheckout"
import { handlePaymentFlow } from "@/features/customer-menu/checkout/paymentModalPaymentFlow"
import { hasUnsubmittedPaymentDraftFromState, resolveSubmittedPaymentAmountFromState, resolveSubmittedPaymentOrderIdFromState } from "@/features/customer-menu/checkout/paymentModalResolution"
import { usePaymentReturnVerification } from "@/features/customer-menu/checkout/usePaymentReturnVerification"
import { usePaymentProviderConfig } from "@/features/customer-menu/checkout/hooks/usePaymentProviderConfig"
import { useCheckoutTableDraftSync } from "@/features/customer-menu/checkout/hooks/useCheckoutTableDraftSync"
import { useCheckoutTableActions } from "@/features/customer-menu/checkout/hooks/useCheckoutTableActions"
import { useCheckoutReviewInvoiceActions } from "@/features/customer-menu/checkout/hooks/useCheckoutReviewInvoiceActions"
import { useCheckoutOrderItems } from "@/features/customer-menu/checkout/hooks/useCheckoutOrderItems"
import { useCheckoutSplitBill } from "@/features/customer-menu/checkout/hooks/useCheckoutSplitBill"
import { useCheckoutPaymentBase } from "@/features/customer-menu/checkout/hooks/useCheckoutPaymentBase"
import { useCheckoutPaymentSummary } from "@/features/customer-menu/checkout/hooks/useCheckoutPaymentSummary"
import { useCheckoutPaymentContext } from "@/features/customer-menu/checkout/hooks/useCheckoutPaymentContext"
import { useCheckoutDisplayItems } from "@/features/customer-menu/checkout/hooks/useCheckoutDisplayItems"
import { useCheckoutModalLifecycleEffects } from "@/features/customer-menu/checkout/hooks/useCheckoutModalLifecycleEffects"
import { useCheckoutSplitState } from "@/features/customer-menu/checkout/hooks/useCheckoutSplitState"
import { usePaymentModalRuntimeState } from "@/features/customer-menu/checkout/hooks/usePaymentModalRuntimeState"
import { createPaymentModalVisualStyles } from "@/features/customer-menu/checkout/paymentModalVisualStyles"
import { getPaymentModalContextLabels } from "@/features/customer-menu/checkout/paymentModalContextLabels"
import type { CheckoutStep } from "@/features/checkout/types"







export function PaymentModal({ isOpen, onClose, items: allItems, tableInfo, existingOrderId, pendingSummary, initialSubmittedOrder, initialCheckoutStep, preferPersonalReview = false, onOpenOrderUpdate, onCartPricingUpdate, checkoutVisualTheme = "neutral" }: PaymentModalProps) {

  const { toast } = useToast()
  const { t } = useLanguageStore()
  const { tipSettings } = useTipSettingsStore()
  const { taxSettings, loadVATSettings } = useTaxSettingsStore()
  const { merchantSettings } = usePaymentSettingsStore()
  const { appliedCoupon, validateCoupon, removeCoupon } = useCouponStore()
  const { clearCart, addToCart } = useCartStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
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
  } = useCheckoutSplitState()
  const {
    selectedOptions,
    handleOptionsChange,
    adjustPriceForVAT,
    personalReviewItems,
    allItemInstances,
    itemsToPay,
    subtotal,
    taxAmount,
  } = useCheckoutOrderItems({
    allItems,
    taxSettings,
    t,
    isSplitting,
    selectedItems,
    onCartPricingUpdate,
  })

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null)
  const {
    loadingPayments,
    visiblePaymentMethods,
    stripeConfig,
    stripeConfigError,
    stripePromise,
    paypalConfigLoading,
    effectivePayPalClientId,
    effectivePayPalCurrency,
  } = usePaymentProviderConfig({
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    merchantCurrency: merchantSettings?.currency,
  })

  const {
    cashCollectionConfirmed,
    setCashCollectionConfirmed,
    providerInlineError,
    setProviderInlineError,
    isDarkTheme,
    setIsDarkTheme,
    paymentFormData,
    setPaymentFormData,
    checkoutStep,
    setCheckoutStep,
    submittedSnapshot,
    setSubmittedSnapshot,
    pmdLatestSubmittedPaymentOrderIdRef,
  } = usePaymentModalRuntimeState({
    existingOrderId,
    initialCheckoutStep,
    initialSubmittedOrder,
  })
  const isOrganicCheckoutVisual = checkoutVisualTheme === ORGANIC_BOTANICAL_THEME_KEY
  const isModernGreenCheckoutVisual = checkoutVisualTheme === "modern_green"
  const isKazenJapaneseCheckoutVisual = checkoutVisualTheme === KAZEN_JAPANESE_THEME_KEY
  const isVelvetTerracottaCheckoutVisual = checkoutVisualTheme === VELVET_TERRACOTTA_THEME_KEY


  const {
    tableDraft,
    setTableDraft,
    draftLoading,
    refreshTableDraft,
    submitDraftLoading,
    confirmTableDraftItemsAction,
    submitTableDraftAction,
  } = useCheckoutTableDraftSync({
    isOpen,
    tableInfo,
    taxPercentage: taxSettings?.percentage || 0,
    getGuestSessionId: () => ensurePaymentGuestSession(),
    setSubmittedSnapshot,
  })

  const hasPersonalItems = allItems.length > 0


  const getTenantKey = () => getPaymentTenantKey()
  const getTableKey = () => getPaymentTableKey(tableInfo)
  const ensureGuestSession = () => ensurePaymentGuestSession()

  const buildOpenOrderStorageKeys = () => buildPaymentOpenOrderStorageKeys(tableInfo)

  const {
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
    tipAmount,
    couponDiscount,
    finalTotal,
    orderStatusTotal,
    vatLabels,
  } = useCheckoutPaymentBase({
    submittedSnapshot,
    pendingSummary,
    checkoutStep,
    subtotal,
    taxAmount,
    appliedCoupon,
    taxSettings,
  })

  const {
    splitGuestProfiles,
    splitGuestNames,
    getSplitGuestAvatar,
    suggestedSplitGuestCount,
    addSplitGuest,
    removeSplitGuest,
    splitSourceItems,
    splitGrandTotal,
    equalSplitPeople,
    activeSplitPeople,
    selectedSplitPerson,
    unassignedSplitItems,
    sharePercentTotal,
    canConfirmSplitMethod,
    startSplitFlow,
    chooseSplitMethod,
    goToSplitReview,
  } = useCheckoutSplitBill({
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
  })

  const {
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
  } = useCheckoutPaymentSummary({
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
  })

  const resetPaymentAdjustmentsAfterSuccess = () => {
    removeCoupon()
    setCouponCode("")
    setCouponError(null)
    setTipPercentage(0)
    setCustomTip("")
  }



  // NOTE: Live status-based ETA text would require backend order-status polling/endpoint.

  useCheckoutDomCompatibilityEffects({
    isOpen,
    checkoutStep,
    selectedPaymentMethod,
    couponDiscount,
    tipPercentage,
    customTip,
    appliedCouponCode: appliedCoupon && appliedCoupon.code ? appliedCoupon.code : null,
    isSplitting,
    selectedSplitPersonId,
    splitMethod,
    splitGuestCount,
    submittedSnapshotOrderId: submittedSnapshot && submittedSnapshot.orderId ? submittedSnapshot.orderId : null,
  })

  const {
    modalPrimaryBtn,
    modalPrimaryBtnStyle,
    modalSecondaryBtn,
    iconBackBtn,
  } = createPaymentModalVisualStyles({
    isKazenJapaneseCheckoutVisual,
    isOrganicCheckoutVisual,
  })
  const {
    handleConfirmMyItems,
    handleSubmitTableDraft,
    markOpenOrderAsPaid,
  } = useCheckoutTableActions({
    tableDraft,
    setTableDraft,
    tableInfo,
    taxSettings,
    selectedOptions,
    personalReviewItems,
    adjustPriceForVAT,
    toast,
    setIsLoading,
    confirmTableDraftItemsAction,
    submitTableDraftAction,
    refreshTableDraft,
    clearCart,
    setSubmittedSnapshot,
    pmdLatestSubmittedPaymentOrderIdRef,
    buildOpenOrderStorageKeys,
    getTenantKey,
    getTableKey,
    ensureGuestSession,
    setCheckoutStep,
    onOpenOrderUpdate,
  })


  // PMD_BLOCK_DRAFT_ID_AS_ORDER_ID_20260612
  // PMD_IGNORE_STALE_EXISTING_ORDER_ID_20260612
  const resolveSubmittedPaymentOrderId = (): number | null =>
    resolveSubmittedPaymentOrderIdFromState({
      tableDraft,
      submittedSnapshot,
      existingOrderId,
      latestRefOrderId: pmdLatestSubmittedPaymentOrderIdRef.current,
    })

  const hasUnsubmittedPaymentDraft = (): boolean =>
    hasUnsubmittedPaymentDraftFromState({
      tableDraft,
      submittedPaymentOrderId: resolveSubmittedPaymentOrderId(),
    })

  // PMD_USE_SUBMITTED_ORDER_AMOUNT_FOR_PAYMENT_20260612
  const pmdSubmittedItemsSubtotal = (): number | null => {
    const rows =
      Array.isArray((submittedSnapshot as any)?.submittedItems) && (submittedSnapshot as any).submittedItems.length > 0
        ? (submittedSnapshot as any).submittedItems
        : (Array.isArray((tableDraft as any)?.items) ? (tableDraft as any).items : [])

    return subtotalFromSubmittedPaymentRows(rows)
  }

  const resolveSubmittedPaymentAmount = (): number =>
    resolveSubmittedPaymentAmountFromState({
      selectedSplitPersonId,
      selectedSplitPerson,
      paymentPayableTotal,
      submittedSnapshot,
      tableDraft,
      initialSubmittedOrder,
      pendingSummary,
      payableTotal,
      finalTotal,
      submittedItemsSubtotal: pmdSubmittedItemsSubtotal(),
    })


    const handlePayment = async (
    stripePaymentIntentId?: string,
    forcedPaymentContext?: { method_code?: string | null; provider_code?: string | null }
  ) => handlePaymentFlow({
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
  })

  const handlePaymentMethodSelect = (methodId: string) => {
    setProviderInlineError(null)

    // Apple Pay / Google Pay must remain their own methods.
    // Do NOT reroute them to Stripe card fields.
    if (methodId === "card") {
      try {
        (globalThis as any).__stripePreferred = "card"
      } catch {}
    }
    setSelectedPaymentMethod(methodId)
  }
  const handleBackToMethods = () => {
    setProviderInlineError(null)
    setSelectedPaymentMethod(null)
    setCashCollectionConfirmed(false)
  }
  const {
    stripeResolvedTableNumber,
    stripeResolvedRestaurantId,
    selectedMethod,
    selectedProviderCode,
    stripePaymentData,
  } = useCheckoutPaymentContext({
    tableInfo,
    merchantSettings,
    stripeConfig,
    visiblePaymentMethods,
    selectedPaymentMethod,
    itemsToPay,
    paymentFormData,
    resolveSubmittedPaymentAmount,
  })


  const startHostedRedirectCheckout = () => startHostedRedirectCheckoutFlow({
    selectedMethod,
    resolveSubmittedPaymentAmount,
    setProviderInlineError,
    toast,
    checkoutStep,
    pendingSummary,
    resolveSubmittedPaymentOrderId,
    hasUnsubmittedPaymentDraft,
    setSelectedPaymentMethod,
    setIsLoading,
    ensureGuestSession,
    tableInfo,
    merchantSettings,
    paymentFormData,
    itemsToPay,
  })

  usePaymentReturnVerification({
    handlePayment,
    setProviderInlineError,
    toast,
  })


  const renderPaymentForm = () => (
    <PaymentMethodForm
      selectedPaymentMethod={selectedPaymentMethod}
      selectedMethod={selectedMethod}
      stripePromise={stripePromise}
      stripeConfig={stripeConfig}
      stripeConfigError={stripeConfigError}
      hasUnsubmittedPaymentDraft={hasUnsubmittedPaymentDraft}
      checkoutStep={checkoutStep}
      setCheckoutStep={setCheckoutStep}
      selectedProviderCode={selectedProviderCode}
      handleBackToMethods={handleBackToMethods}
      paypalConfigLoading={paypalConfigLoading}
      effectivePayPalClientId={effectivePayPalClientId}
      effectivePayPalCurrency={effectivePayPalCurrency}
      resolveSubmittedPaymentAmount={resolveSubmittedPaymentAmount}
      itemsToPay={itemsToPay}
      stripeResolvedRestaurantId={stripeResolvedRestaurantId}
      paymentFormData={paymentFormData}
      stripeResolvedTableNumber={stripeResolvedTableNumber}
      handlePayment={handlePayment}
      toast={toast}
      merchantSettings={merchantSettings}
      payableTotal={payableTotal}
      providerInlineError={providerInlineError}
      isLoading={isLoading}
      startHostedRedirectCheckout={startHostedRedirectCheckout}
      stripePaymentData={stripePaymentData}
      finalTotal={finalTotal}
      modalPrimaryBtnStyle={modalPrimaryBtnStyle}
      cashCollectionConfirmed={cashCollectionConfirmed}
      setCashCollectionConfirmed={setCashCollectionConfirmed}
    />
  )

  const {
    isTableContext,
    orderContextLabel,
    orderContextValue,
    submittedContextLabel,
    submittedContextValue,
  } = getPaymentModalContextLabels({ tableDraft, tableInfo, submittedSnapshot })

  const {
    reviewRating,
    setReviewRating,
    reviewComment,
    setReviewComment,
    reviewSubmitStatus,
    setReviewSubmitStatus,
    reviewSubmitMessage,
    invoiceDownloadStatus,
    invoiceDownloadMessage,
    activeReviewSharePlatforms,
    canSubmitReview,
    handleSubmitReview,
    handleDownloadBusinessInvoice,
  } = useCheckoutReviewInvoiceActions({
    merchantSettings,
    submittedSnapshot,
    initialSubmittedOrder,
    existingOrderId,
  })


  const checkoutTitle: Record<CheckoutStep, string> = {
    review: "My Order",
    submitted: "Order Status",
    split: "Split bill",
    "split-items": "Assign items",
    "split-shares": "Set shares",
    "split-review": "Review split",
    payment: "Payment",
    paid: "Order complete",
  }
  // PMD_SUBMITTED_TABLE_DRAFT_SHOULD_SHOW_STATUS
  const isSubmittedTableDraftForStatus = Boolean(
    tableDraft?.order_id ||
    tableDraft?.orderId ||
    ["submitted", "submitted_unpaid", "partially_paid", "paid"].includes(String(tableDraft?.status || "").toLowerCase())
  )
  const checkoutListViewKey = `${checkoutStep}:${hasPersonalItems ? "personal" : "shared"}:${isSubmittedTableDraftForStatus ? "status" : "draft"}`

  useCheckoutModalLifecycleEffects({
    isOpen,
    merchantSettings,
    setIsDarkTheme,
    paymentLoadVATSettings: loadVATSettings,
    initialCheckoutStep,
    existingOrderId,
    hasPersonalItems,
    preferPersonalReview,
    setCheckoutStep,
    initialSubmittedOrder,
    tableDraft,
    setSubmittedSnapshot,
    checkoutStep,
    checkoutListViewKey,
    isSubmittedTableDraftForStatus,
    tableInfo,
    taxSettings,
  })

  const modalTitle = checkoutStep === "review" && tableDraft?.success && tableDraft.status && tableDraft.status !== "empty" && !hasPersonalItems && !preferPersonalReview
    ? "Table Order"
    : checkoutTitle[checkoutStep]

  const renderPaymentButton = () => (
    <PaymentActionButton
      selectedMethod={selectedMethod}
      checkoutStep={checkoutStep}
      payableTotal={payableTotal}
      finalTotal={finalTotal}
      selectedPaymentMethod={selectedPaymentMethod}
      handlePayment={handlePayment}
      isLoading={isLoading}
      paymentFormData={paymentFormData}
    />
  )

  const {
    modernGreenTableDraftItems,
    modernGreenTableDraftTotal,
    modernGreenSubmittedItems,
    modernGreenPersonalItems,
  } = useCheckoutDisplayItems({
    tableDraft,
    submittedSnapshot,
    personalReviewItems,
    selectedOptions,
    adjustPriceForVAT,
    t,
  })

  const handleModernGreenApplyCoupon = async () => {
    if (!couponCode.trim()) return
    if (selectedSplitPerson) {
      setCouponError("Coupon validation for split payments is coming soon.")
      return
    }
    setCouponLoading(true)
    setCouponError(null)
    try {
      const result = await validateCoupon(couponCode.trim(), paymentBaseAmount)
      if (!result.success) setCouponError(result.message || "Coupon will be checked at payment.")
      else {
        setCouponCode("")
        toast({ title: "Coupon applied", description: "Your coupon was added to this payment." })
      }
    } catch {
      setCouponError("Coupon validation coming soon.")
    } finally {
      setCouponLoading(false)
    }
  }

  const handleModernGreenRemoveCoupon = () => {
    removeCoupon()
    setCouponCode("")
    setCouponError(null)
  }

  return (
    <CheckoutShellRouter
      {...{
        isOpen,
        isKazenJapaneseCheckoutVisual,
        isVelvetTerracottaCheckoutVisual,
        isModernGreenCheckoutVisual,
        isOrganicCheckoutVisual,
        checkoutVisualTheme,
        modalPrimaryBtn,
        modalPrimaryBtnStyle,
        modalSecondaryBtn,
        iconBackBtn,
        modalTitle,
        checkoutStep,
        setCheckoutStep,
        selectedSplitPersonId,
        onClose,
        tableDraft,
        tableInfo,
        taxSettings,
        isSubmittedTableDraftForStatus,
        hasPersonalItems,
        preferPersonalReview,
        orderContextLabel,
        orderContextValue,
        isTableContext,
        submitDraftLoading,
        draftLoading,
        handleSubmitTableDraft,
        setSubmittedSnapshot,
        personalReviewItems,
        addToCart,
        t,
        handleOptionsChange,
        vatLabels,
        subtotal,
        taxAmount,
        tipAmount,
        appliedCoupon,
        couponDiscount,
        finalTotal,
        isLoading,
        allItems,
        handleConfirmMyItems,
        setIsSplitting,
        splitGrandTotal,
        splitMethod,
        startSplitFlow,
        chooseSplitMethod,
        splitGuestCount,
        suggestedSplitGuestCount,
        removeSplitGuest,
        addSplitGuest,
        splitGuestProfiles,
        equalSplitPeople,
        getSplitGuestAvatar,
        splitGuestNames,
        unassignedSplitItems,
        splitSourceItems,
        itemAssignments,
        setItemAssignments,
        sharePercents,
        setSharePercents,
        sharePercentTotal,
        canConfirmSplitMethod,
        goToSplitReview,
        activeSplitPeople,
        setSelectedSplitPersonId,
        toast,
        submittedSnapshot,
        estimatedMinutes,
        paidTipAmount,
        paidCouponDiscount,
        paidAmountTotal,
        orderStatusTotal,
        submittedBaseTotal,
        submittedContextLabel,
        submittedContextValue,
        initialSubmittedOrder,
        existingOrderId,
        onOpenOrderUpdate,
        reviewRating,
        setReviewRating,
        reviewSubmitStatus,
        setReviewSubmitStatus,
        reviewComment,
        setReviewComment,
        canSubmitReview,
        handleSubmitReview,
        reviewSubmitMessage,
        merchantSettings,
        activeReviewSharePlatforms,
        handleDownloadBusinessInvoice,
        invoiceDownloadStatus,
        invoiceDownloadMessage,
        selectedSplitPerson,
        pendingSummary,
        paymentVatAmount,
        paymentSubtotalAmount,
        paymentVatPercentage,
        paymentBaseAmount,
        paymentTipAmount,
        paymentCouponDiscount,
        paymentPayableTotal,
        tipSettings,
        paymentTipPercentage,
        paymentCustomTip,
        updatePaymentTipPercentage,
        customTip,
        updatePaymentCustomTip,
        couponCode,
        setCouponCode,
        setCouponError,
        couponError,
        couponLoading,
        setCouponLoading,
        validateCoupon,
        removeCoupon,
        selectedPaymentMethod,
        loadingPayments,
        visiblePaymentMethods,
        handlePaymentMethodSelect,
        stripePromise,
        stripeConfig,
        selectedMethod,
        isDarkTheme,
        renderPaymentForm,
        renderPaymentButton,
        handlePayment,
        payableTotal,
        modernGreenPersonalItems,
        modernGreenTableDraftItems,
        modernGreenTableDraftTotal,
        modernGreenSubmittedItems,
      }}
    />
  )

}

