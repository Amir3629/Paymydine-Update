"use client"

import { motion } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { OrganicCheckoutScopedStyles, organicCheckoutBodyStyle, organicCheckoutHeaderStyle, organicCheckoutModalStyle } from "@/components/themes/organic-botanical-paper/OrganicCheckoutShell"
import { getCheckoutStepAfterBack } from "@/features/checkout/checkout-state-utils"
import { NeutralReviewPanels } from "@/features/customer-menu/checkout/NeutralReviewPanels"
import { NeutralSplitBillPanel } from "@/features/customer-menu/checkout/NeutralSplitBillPanel"
import { NeutralOrderStatusPanel } from "@/features/customer-menu/checkout/NeutralOrderStatusPanel"
import { NeutralPaymentPanel } from "@/features/customer-menu/checkout/NeutralPaymentPanel"





export function NeutralCheckoutShell(props: any) {
  const {
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
    payableTotal,
  } = props


  return (
    <div data-pmd-kazen-checkout-overlay={isKazenJapaneseCheckoutVisual ? "1" : undefined} className={cn("fixed inset-0 z-50 flex items-center justify-center", isModernGreenCheckoutVisual ? "bg-transparent backdrop-blur-md" : "bg-black/30")}>
      {/* PMD_KAZEN_SKIN_GOLD_CHECKOUT_RENDER_20260612 */}
      {/* PMD_KAZEN_INLINE_CHECKOUT_SKINS_DISABLED_20260612 */}
      {isOrganicCheckoutVisual && <OrganicCheckoutScopedStyles />}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        data-pmd-checkout-theme-root="1"
        data-pmd-checkout-theme={checkoutVisualTheme}
        data-pmd-checkout-design-system="1"
        data-pmd-checkout-visual-theme={checkoutVisualTheme}
        data-pmd-checkout-kazen-skin={isKazenJapaneseCheckoutVisual ? "1" : undefined}
        className="pmd-checkout-modal w-full max-w-md surface rounded-3xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
        style={isOrganicCheckoutVisual ? organicCheckoutModalStyle : undefined}
      >
        {/* Header with close button */}
        <div className="p-4 pb-2 surface-sub flex justify-between items-center rounded-2xl" style={isOrganicCheckoutVisual ? organicCheckoutHeaderStyle : undefined}>
          <Button
              data-pmd-order-status-back="1"
            variant="ghost"
            size="sm"
            onClick={() => {
              const previousStep = getCheckoutStepAfterBack(checkoutStep, Boolean(selectedSplitPersonId))
              if (previousStep) setCheckoutStep(previousStep)
              else onClose()
            }}

              className={iconBackBtn}
              style={{
                background: "#062F2A",
                backgroundColor: "#062F2A",
                color: "#FFFFFF",
                WebkitTextFillColor: "#FFFFFF",
                borderColor: "#062F2A",
                outlineColor: "#062F2A",
                textDecoration: "none",
              }}
            >
            <ArrowLeft className="h-5 w-5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
          </Button>
          <h2 className="pmd-checkout-modal-title">{modalTitle}</h2>
          <div className="w-8" /> {/* Spacer for centering */}
        </div>

        {/* Order Summary (prices incl. VAT) & Payment - Scrollable Content */}
        <div data-pmd-checkout-scroll="1" className="pmd-checkout-body p-4 pb-8 space-y-4 overflow-y-auto flex-1" style={isOrganicCheckoutVisual ? organicCheckoutBodyStyle : undefined}>
          
          {/* Split Bill Toggle */}
          

          {/* Items List */}
          

          {/* Tip Section */}
          

          {/* Coupon Code Input */}
          


          <NeutralReviewPanels
            {...{
              checkoutStep,
              tableDraft,
              isSubmittedTableDraftForStatus,
              hasPersonalItems,
              preferPersonalReview,
              submitDraftLoading,
              draftLoading,
              handleSubmitTableDraft,
              onClose,
              setSubmittedSnapshot,
              tableInfo,
              taxSettings,
              setCheckoutStep,
              modalSecondaryBtn,
              orderContextLabel,
              orderContextValue,
              isTableContext,
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
              modalPrimaryBtn,
              modalPrimaryBtnStyle,
            }}
          />

          <NeutralSplitBillPanel
            {...{
              checkoutStep,
              splitGrandTotal,
              splitMethod,
              chooseSplitMethod,
              splitGuestCount,
              suggestedSplitGuestCount,
              removeSplitGuest,
              addSplitGuest,
              splitGuestProfiles,
              equalSplitPeople,
              unassignedSplitItems,
              splitSourceItems,
              itemAssignments,
              setItemAssignments,
              splitGuestNames,
              sharePercents,
              setSharePercents,
              getSplitGuestAvatar,
              sharePercentTotal,
              canConfirmSplitMethod,
              goToSplitReview,
              activeSplitPeople,
              selectedSplitPersonId,
              setCheckoutStep,
              setSelectedSplitPersonId,
              toast,
              modalSecondaryBtn,
            }}
          />

          <NeutralOrderStatusPanel
            {...{
              checkoutStep,
              submittedSnapshot,
              estimatedMinutes,
              taxSettings,
              paidTipAmount,
              paidCouponDiscount,
              submittedBaseTotal,
              appliedCoupon,
              paidAmountTotal,
              orderStatusTotal,
              submittedContextLabel,
              submittedContextValue,
              vatLabels,
              setIsSplitting,
              setSelectedSplitPersonId,
              setCheckoutStep,
              modalPrimaryBtnStyle,
              startSplitFlow,
              onOpenOrderUpdate,
              initialSubmittedOrder,
              onClose,
              modalSecondaryBtn,
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
            }}
          />

          <NeutralPaymentPanel
            {...{
              checkoutStep,
              selectedSplitPerson,
              pendingSummary,
              orderContextLabel,
              orderContextValue,
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
              tipAmount,
              updatePaymentCustomTip,
              appliedCoupon,
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
              t,
              toast,
            }}
          />
</div>
      </motion.div>
    </div>
  )
}
