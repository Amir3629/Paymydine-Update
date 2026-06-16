// PMD_SAFETY_NOTE:
// This file is the active checkout/payment modal used by all customer themes.
// It is intentionally not refactored casually because it touches real checkout/payment flow.
// Before changing this file: run build, typecheck, and manual checkout QA on all active themes.
// TODO: split into smaller checkout panels after smoke/E2E tests exist.

"use client"

import React, { useState, useEffect, useLayoutEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useLanguageStore } from "@/store/language-store"
import { useCmsStore } from "@/store/cms-store"
import { useCartStore } from "@/store/cart-store"
import { useToast } from "@/components/ui/use-toast"
import { organicCheckoutPrimaryButtonStyle } from "@/components/themes/organic-botanical-paper/OrganicCheckoutShell"
import { useCheckoutVisualRepairs } from "@/features/customer-menu/legacy-dom-repairs/useCheckoutVisualRepairs"
import { usePaymentModalDomRepairs } from "@/features/customer-menu/legacy-dom-repairs/usePaymentModalDomRepairs"
import { ModernGreenCheckoutShell } from "@/components/themes/modern-green/ModernGreenCheckoutShell"
import { KazenJapaneseCheckoutShell } from "@/components/themes/kazen-japanese"
import { NeutralCheckoutShell } from "@/features/customer-menu/checkout/NeutralCheckoutShell"
import { PaymentMethodForm } from "@/features/customer-menu/checkout/PaymentMethodForm"
import { PaymentActionButton } from "@/features/customer-menu/checkout/PaymentActionButton"
import { createSubmittedTableOrderSnapshot } from "@/features/table-order/table-order-utils"
import { getCheckoutStepAfterDraftSubmit, getCheckoutStepOnOpen, getInitialCheckoutStep, shouldForcePersonalReview } from "@/features/checkout/checkout-state-utils"
import { KAZEN_JAPANESE_THEME_KEY, ORGANIC_BOTANICAL_THEME_KEY, type PaymentFormData, type PaymentModalProps } from "@/features/customer-menu/checkout/paymentModalShared"
import { buildPaymentOpenOrderStorageKeys, ensurePaymentGuestSession, getPaymentTableKey, getPaymentTenantKey } from "@/features/customer-menu/checkout/paymentModalStorage"
import { positiveMoney, subtotalFromSubmittedPaymentRows } from "@/features/customer-menu/checkout/paymentModalMath"
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
import type { CheckoutStep, SplitBillItem, SplitMethod } from "@/features/checkout/types"




export function PaymentModal({ isOpen, onClose, items: allItems, tableInfo, existingOrderId, pendingSummary, initialSubmittedOrder, initialCheckoutStep, preferPersonalReview = false, onOpenOrderUpdate, onCartPricingUpdate, checkoutVisualTheme = "neutral" }: PaymentModalProps) {
  useCheckoutVisualRepairs()

  const router = useRouter()
  const { toast } = useToast()
  const { t } = useLanguageStore()
  const { tipSettings, taxSettings, merchantSettings, loadVATSettings, appliedCoupon, validateCoupon, removeCoupon } = useCmsStore()
const { clearCart, addToCart } = useCartStore()
  const [isLoading, setIsLoading] = useState(false)

  const [isSplitting, setIsSplitting] = useState(false)
  const selectedItems = useRef<Record<string, SplitBillItem>>({}).current
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal")
  const [splitGuestCount, setSplitGuestCount] = useState(2)
  const [itemAssignments, setItemAssignments] = useState<Record<string, number | null>>({})
  const [sharePercents, setSharePercents] = useState<number[]>([50, 50])
  const [selectedSplitPersonId, setSelectedSplitPersonId] = useState<string | null>(null)
  const [paidSplitPeople, setPaidSplitPeople] = useState<Record<string, boolean>>({})
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

  const [cashCollectionConfirmed, setCashCollectionConfirmed] = useState(false)
  const [providerInlineError, setProviderInlineError] = useState<string | null>(null)
  const [isDarkTheme, setIsDarkTheme] = useState(false)

  // Debug (safe): expose key settings
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__CMS_STORE__ = { merchantSettings }
    }
  }, [merchantSettings])

  useEffect(() => {
    const detectDarkTheme = () => {
      const themeName = document.documentElement.getAttribute('data-theme') || 'clean-light'
      setIsDarkTheme(themeName === 'modern-dark')
    }

    detectDarkTheme()

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          detectDarkTheme()
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })

    return () => observer.disconnect()
  }, [])
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    email: "",
    phone: "",
  })
  const isOrganicCheckoutVisual = checkoutVisualTheme === ORGANIC_BOTANICAL_THEME_KEY
  const isModernGreenCheckoutVisual = checkoutVisualTheme === "modern_green"
  const isKazenJapaneseCheckoutVisual = checkoutVisualTheme === KAZEN_JAPANESE_THEME_KEY
  const isThemedCheckoutVisual = isOrganicCheckoutVisual || isModernGreenCheckoutVisual || isKazenJapaneseCheckoutVisual


  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>(
    getInitialCheckoutStep(initialCheckoutStep, existingOrderId)
  )


const [submittedSnapshot, setSubmittedSnapshot] = useState<any | null>(initialSubmittedOrder || null)
  // PMD_USE_LATEST_SUBMITTED_ORDER_ID_FOR_PAYMENT_20260612
  const pmdLatestSubmittedPaymentOrderIdRef = useRef<number | null>(null)
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


  useEffect(() => {
    if (!isOpen) return
    setCheckoutStep((current) => getCheckoutStepOnOpen({
      initialCheckoutStep,
      existingOrderId,
      hasPersonalItems,
      preferPersonalReview,
      currentStep: current,
    }))
  }, [isOpen, existingOrderId, initialCheckoutStep, hasPersonalItems, preferPersonalReview])

  useEffect(() => {
    if (!initialSubmittedOrder) return
    if ((tableDraft as any)?.draft_id && !(tableDraft as any)?.order_id && !(tableDraft as any)?.orderId) return
    const tableDraftOrderId = Number((tableDraft as any)?.order_id || (tableDraft as any)?.orderId || 0)
    const initialOrderId = Number((initialSubmittedOrder as any)?.orderId || (initialSubmittedOrder as any)?.order_id || 0)
    if (tableDraftOrderId > 0 && initialOrderId > 0 && tableDraftOrderId !== initialOrderId) return
    setSubmittedSnapshot((prev: any) => {
      const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
      if (prevOrderId > 0 && tableDraftOrderId > 0 && prevOrderId === tableDraftOrderId && initialOrderId !== tableDraftOrderId) return prev
      return initialSubmittedOrder
    })
  }, [initialSubmittedOrder, (tableDraft as any)?.draft_id, (tableDraft as any)?.order_id, (tableDraft as any)?.orderId])

  useEffect(() => {
    if (!(tableDraft as any)?.draft_id) return
    if ((tableDraft as any)?.order_id || (tableDraft as any)?.orderId) return
    setSubmittedSnapshot(null)
  }, [(tableDraft as any)?.draft_id, (tableDraft as any)?.order_id, (tableDraft as any)?.orderId])

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
    isOrderStatusFlow,
    tipBaseAmount,
    tipAmount,
    couponBaseAmount,
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

  usePaymentModalDomRepairs({
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

  const modalPrimaryBtn = isKazenJapaneseCheckoutVisual
    ? "min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden"
    : "min-h-12 w-full rounded-2xl px-5 py-3 text-sm font-semibold transition hover:brightness-105 active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
  const modalPrimaryBtnStyle: React.CSSProperties = isKazenJapaneseCheckoutVisual
    ? {
        background: "#17120e",
        color: "#f8f0df",
        WebkitTextFillColor: "#f8f0df",
        textShadow: "none",
        border: "1px solid rgba(125, 92, 48, .68)",
        borderRadius: 0,
        boxShadow: "none",
      }
    : isOrganicCheckoutVisual
      ? organicCheckoutPrimaryButtonStyle
      : {
          background: "#062F2A",
          color: "#FFFFFF",
          textShadow: "none",
          border: "1px solid #062F2A",
        }

  const modalSecondaryBtn = isKazenJapaneseCheckoutVisual
    ? "min-h-10 w-full rounded-none px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.025em] leading-tight transition border border-[rgba(125,92,48,.68)] text-[#17120e] bg-[#fbf7ee] inline-flex items-center justify-center gap-2 whitespace-normal break-words overflow-hidden"
    : "min-h-10 w-full rounded-full px-4 py-2 text-sm font-semibold transition hover:bg-[color:var(--theme-surface)] active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent inline-flex items-center justify-center gap-2"
  const iconBackBtn = "h-9 w-9 rounded-full border border-[#062F2A] bg-[#062F2A] text-white hover:bg-[#021F1C] hover:text-white pmd-v2-action-circle hover:opacity-90"
  const toolbarIconBtnStyle: React.CSSProperties = {
    background: "color-mix(in srgb, var(--theme-surface) 92%, #f5fff8 8%)",
    border: "1px solid var(--theme-border)",
    color: "var(--theme-text-primary)",
    boxShadow: "0 6px 16px rgba(17,24,39,0.08)",
              borderRadius: "9999px",
  }
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
  const pmdPositiveMoney = positiveMoney

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
  useEffect(() => {
    // Load VAT settings from backend on mount
    loadVATSettings()
  }, [loadVATSettings])

  const {
    stripeResolvedTableIdRaw,
    stripeResolvedTableNumber,
    stripeResolvedTableName,
    stripeResolvedLocationId,
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

  const tableDisplayName = tableDraft?.table_name || tableInfo?.table_name || (tableDraft?.table_no || tableInfo?.table_no ? `Table ${tableDraft?.table_no || tableInfo?.table_no}` : "Delivery")
  const isTableContext = Boolean(tableInfo?.table_id || tableInfo?.table_no || tableDraft?.table_id || tableDraft?.table_no)
  const orderContextLabel = isTableContext ? "Table" : "Order type"
  const orderContextValue = isTableContext ? tableDisplayName : "Delivery"
  const submittedContextLabel = submittedSnapshot?.tableNumber || isTableContext ? "Table" : "Order type"
  const submittedContextValue = submittedSnapshot?.tableNumber ? `Table ${submittedSnapshot.tableNumber}` : orderContextValue

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
    // PMD_FORCE_PERSONAL_CART_REVIEW_WHEN_CHECKOUT_HAS_ITEMS
  useEffect(() => {
    if (!isOpen) return

    // If the customer has just added new items and pressed Checkout,
    // the modal must show the personal review card first.
    // Existing table/order status must not steal this flow.
    if (shouldForcePersonalReview({ hasPersonalItems, initialCheckoutStep, currentStep: checkoutStep })) {
      setCheckoutStep("review")
    }
  }, [isOpen, hasPersonalItems, initialCheckoutStep, checkoutStep])

// PMD_FREEZE_MODAL_TEXT_BUTTONS_FIRST_PAINT
useLayoutEffect(() => {
  if (!isOpen || typeof document === "undefined") return

  let cleanupTimer: number | undefined
  let retryTimer: number | undefined

  const applyFreeze = () => {
    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    if (!root) return false

    root.setAttribute("data-pmd-step-freeze", "1")

    cleanupTimer = window.setTimeout(() => {
      root.setAttribute("data-pmd-step-freeze", "0")
      root.removeAttribute("data-pmd-step-freeze")
    }, 850)

    return true
  }

  if (!applyFreeze()) {
    retryTimer = window.setTimeout(applyFreeze, 16)
  }

  return () => {
    if (cleanupTimer) window.clearTimeout(cleanupTimer)
    if (retryTimer) window.clearTimeout(retryTimer)
  }
}, [isOpen, checkoutStep])


  // PMD_SUBMITTED_TABLE_DRAFT_SHOULD_SHOW_STATUS
  const isSubmittedTableDraftForStatus = Boolean(
    tableDraft?.order_id ||
    tableDraft?.orderId ||
    ["submitted", "submitted_unpaid", "partially_paid", "paid"].includes(String(tableDraft?.status || "").toLowerCase())
  )
  const checkoutListViewKey = `${checkoutStep}:${hasPersonalItems ? "personal" : "shared"}:${isSubmittedTableDraftForStatus ? "status" : "draft"}`

  useLayoutEffect(() => {
    if (!isOpen || typeof window === "undefined" || typeof document === "undefined") return

    const resetCheckoutScrollPositions = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (root) root.scrollTop = 0
      document.querySelectorAll<HTMLElement>('.pmd-checkout-list-scroll').forEach((list) => {
        list.scrollTop = 0
      })
    }

    resetCheckoutScrollPositions()
    const raf = window.requestAnimationFrame(resetCheckoutScrollPositions)
    return () => window.cancelAnimationFrame(raf)
  }, [isOpen, checkoutListViewKey])


  // PMD_DIRECT_ORDER_STATUS_AFTER_SEND_20260603
  useEffect(() => {
    if (!isOpen) return
    if (checkoutStep !== "review") return
    if (hasPersonalItems || preferPersonalReview) return
    if (!isSubmittedTableDraftForStatus) return

    if (tableDraft) {
      const normalizedTableDraftSnapshot = createSubmittedTableOrderSnapshot(tableDraft, tableInfo, taxSettings?.percentage || 0)
      setSubmittedSnapshot((prev: any) => {
        const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
        const nextOrderId = Number(normalizedTableDraftSnapshot.orderId || 0)
        return !prev || prevOrderId !== nextOrderId ? normalizedTableDraftSnapshot : { ...prev, ...normalizedTableDraftSnapshot }
      })
    }

    setCheckoutStep(getCheckoutStepAfterDraftSubmit())
  }, [
    isOpen,
    checkoutStep,
    hasPersonalItems,
    preferPersonalReview,
    isSubmittedTableDraftForStatus,
    tableDraft,
    tableInfo?.table_no,
    tableInfo?.table_id,
  ])

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

  if (!isOpen) return null


  if (isKazenJapaneseCheckoutVisual) {
    return (
      <KazenJapaneseCheckoutShell
        checkoutStep={checkoutStep}
        onClose={onClose}
        hasPersonalItems={hasPersonalItems || preferPersonalReview}
        personalItems={modernGreenPersonalItems}
        tableDraft={tableDraft}
        tableDraftItems={modernGreenTableDraftItems}
        tableDraftTotal={modernGreenTableDraftTotal}
        submittedSnapshot={submittedSnapshot}
        submittedItems={modernGreenSubmittedItems}
        estimatedMinutes={estimatedMinutes}
        subtotal={subtotal}
        finalTotal={finalTotal}
        payableTotal={payableTotal}
        paymentBaseAmount={paymentBaseAmount}
        paymentPayableTotal={paymentPayableTotal}
        paymentTipAmount={paymentTipAmount}
        paymentCouponDiscount={paymentCouponDiscount}
        paymentTipPercentage={paymentTipPercentage}
        paymentCustomTip={paymentCustomTip}
        tipPercentages={tipSettings.percentages || [5, 10]}
        tipEnabled={Boolean(tipSettings.enabled)}
        couponCode={couponCode}
        setCouponCode={(value: string) => { setCouponCode(value); setCouponError(null) }}
        appliedCoupon={appliedCoupon}
        couponError={couponError}
        couponLoading={couponLoading}
        onApplyCoupon={handleModernGreenApplyCoupon}
        onRemoveCoupon={handleModernGreenRemoveCoupon}
        visiblePaymentMethods={visiblePaymentMethods}
        loadingPayments={loadingPayments}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        renderPaymentForm={renderPaymentForm}
        renderPaymentButton={renderPaymentButton}
        handleConfirmMyItems={handleConfirmMyItems}
        handleSubmitTableDraft={handleSubmitTableDraft}
        handlePayment={handlePayment}
        setCheckoutStep={setCheckoutStep}
        startSplitFlow={startSplitFlow}
        chooseSplitMethod={chooseSplitMethod}
        goToSplitReview={goToSplitReview}
        splitGuestCount={splitGuestCount}
        addSplitGuest={addSplitGuest}
        removeSplitGuest={removeSplitGuest}
        splitMethod={splitMethod}
        splitGuestProfiles={splitGuestProfiles}
        equalSplitPeople={equalSplitPeople || []}
        activeSplitPeople={activeSplitPeople}
        selectedSplitPersonId={selectedSplitPersonId}
        setSelectedSplitPersonId={setSelectedSplitPersonId}
        selectedSplitPerson={selectedSplitPerson}
        splitSourceItems={splitSourceItems}
        itemAssignments={itemAssignments}
        setItemAssignments={setItemAssignments}
        sharePercents={sharePercents}
        setSharePercents={setSharePercents}
        sharePercentTotal={sharePercentTotal}
        canConfirmSplitMethod={canConfirmSplitMethod}
        splitGrandTotal={splitGrandTotal}
        updatePaymentTipPercentage={updatePaymentTipPercentage}
        updatePaymentCustomTip={updatePaymentCustomTip}
        onPaymentLinks={() => toast({ title: "Payment links ready", description: "Share links can be generated by the payment API when multi-device checkout is enabled." })}
        onQrShare={() => toast({ title: "QR share", description: "Ask guests to scan the table QR to pay their own share." })}
        isDarkTheme={isDarkTheme}
      />
    )
  }

  if (isModernGreenCheckoutVisual) {
    return (
      <ModernGreenCheckoutShell
        checkoutStep={checkoutStep}
        onClose={onClose}
        hasPersonalItems={hasPersonalItems || preferPersonalReview}
        personalItems={modernGreenPersonalItems}
        tableDraft={tableDraft}
        tableDraftItems={modernGreenTableDraftItems}
        tableDraftTotal={modernGreenTableDraftTotal}
        submittedSnapshot={submittedSnapshot}
        submittedItems={modernGreenSubmittedItems}
        estimatedMinutes={estimatedMinutes}
        subtotal={subtotal}
        finalTotal={finalTotal}
        payableTotal={payableTotal}
        paymentBaseAmount={paymentBaseAmount}
        paymentPayableTotal={paymentPayableTotal}
        paymentTipAmount={paymentTipAmount}
        paymentCouponDiscount={paymentCouponDiscount}
        paymentTipPercentage={paymentTipPercentage}
        paymentCustomTip={paymentCustomTip}
        tipPercentages={tipSettings.percentages || [5, 10]}
        tipEnabled={Boolean(tipSettings.enabled)}
        couponCode={couponCode}
        setCouponCode={(value) => { setCouponCode(value); setCouponError(null) }}
        appliedCoupon={appliedCoupon}
        couponError={couponError}
        couponLoading={couponLoading}
        onApplyCoupon={handleModernGreenApplyCoupon}
        onRemoveCoupon={handleModernGreenRemoveCoupon}
        visiblePaymentMethods={visiblePaymentMethods}
        loadingPayments={loadingPayments}
        selectedPaymentMethod={selectedPaymentMethod}
        onPaymentMethodSelect={handlePaymentMethodSelect}
        renderPaymentForm={renderPaymentForm}
        renderPaymentButton={renderPaymentButton}
        handleConfirmMyItems={handleConfirmMyItems}
        handleSubmitTableDraft={handleSubmitTableDraft}
        handlePayment={handlePayment}
        setCheckoutStep={setCheckoutStep}
        startSplitFlow={startSplitFlow}
        chooseSplitMethod={chooseSplitMethod}
        goToSplitReview={goToSplitReview}
        splitGuestCount={splitGuestCount}
        addSplitGuest={addSplitGuest}
        removeSplitGuest={removeSplitGuest}
        splitMethod={splitMethod}
        splitGuestProfiles={splitGuestProfiles}
        equalSplitPeople={equalSplitPeople || []}
        activeSplitPeople={activeSplitPeople}
        selectedSplitPersonId={selectedSplitPersonId}
        setSelectedSplitPersonId={setSelectedSplitPersonId}
        selectedSplitPerson={selectedSplitPerson}
        splitSourceItems={splitSourceItems}
        itemAssignments={itemAssignments}
        setItemAssignments={setItemAssignments}
        sharePercents={sharePercents}
        setSharePercents={setSharePercents}
        sharePercentTotal={sharePercentTotal}
        canConfirmSplitMethod={canConfirmSplitMethod}
        splitGrandTotal={splitGrandTotal}
        updatePaymentTipPercentage={updatePaymentTipPercentage}
        updatePaymentCustomTip={updatePaymentCustomTip}
        onPaymentLinks={() => toast({ title: "Payment links ready", description: "Share links can be generated by the payment API when multi-device checkout is enabled." })}
        onQrShare={() => toast({ title: "QR share", description: "Ask guests to scan the table QR to pay their own share." })}
        isDarkTheme={isDarkTheme}
      />
    )
  }

  return (
    <NeutralCheckoutShell
      {...{
        isKazenJapaneseCheckoutVisual,
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
        payableTotal,
      }}
    />
  )
}

