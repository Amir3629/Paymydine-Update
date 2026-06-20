"use client"

import { ModernGreenCheckoutShell } from "@/components/themes/modern-green/ModernGreenCheckoutShell"
import { KazenJapaneseCheckoutShell } from "@/components/themes/kazen-japanese"

export function renderThemedCheckoutShellRoute(props: any) {
  const {
    isOpen,
    isKazenJapaneseCheckoutVisual,
    isModernGreenCheckoutVisual,
    checkoutStep,
    onClose,
    hasPersonalItems,
    preferPersonalReview,
    modernGreenPersonalItems,
    tableDraft,
    modernGreenTableDraftItems,
    modernGreenTableDraftTotal,
    submittedSnapshot,
    modernGreenSubmittedItems,
    estimatedMinutes,
    subtotal,
    finalTotal,
    payableTotal,
    paymentBaseAmount,
    paymentPayableTotal,
    paymentTipAmount,
    paymentCouponDiscount,
    paymentTipPercentage,
    paymentCustomTip,
    tipSettings,
    couponCode,
    setCouponCode,
    setCouponError,
    appliedCoupon,
    couponError,
    couponLoading,
    setCouponLoading,
    validateCoupon,
    handleModernGreenApplyCoupon,
    handleModernGreenRemoveCoupon,
    visiblePaymentMethods,
    loadingPayments,
    selectedPaymentMethod,
    handlePaymentMethodSelect,
    renderPaymentForm,
    renderPaymentButton,
    handleConfirmMyItems,
    handleSubmitTableDraft,
    handlePayment,
    setCheckoutStep,
    startSplitFlow,
    chooseSplitMethod,
    goToSplitReview,
    splitGuestCount,
    addSplitGuest,
    removeSplitGuest,
    splitMethod,
    splitGuestProfiles,
    equalSplitPeople,
    activeSplitPeople,
    selectedSplitPersonId,
    setSelectedSplitPersonId,
    selectedSplitPerson,
    splitSourceItems,
    itemAssignments,
    setItemAssignments,
    sharePercents,
    setSharePercents,
    sharePercentTotal,
    canConfirmSplitMethod,
    splitGrandTotal,
    updatePaymentTipPercentage,
    updatePaymentCustomTip,
    toast,
    reviewRating,
    setReviewRating,
    reviewComment,
    setReviewComment,
    reviewSubmitStatus,
    setReviewSubmitStatus,
    reviewSubmitMessage,
    canSubmitReview,
    handleSubmitReview,
    merchantSettings,
    activeReviewSharePlatforms,
    handleDownloadBusinessInvoice,
    invoiceDownloadStatus,
    invoiceDownloadMessage,
    isDarkTheme,
  } = props

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
        setCouponError={setCouponError}
        setCouponLoading={setCouponLoading}
        validateCoupon={validateCoupon}
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
        reviewRating={reviewRating}
        setReviewRating={setReviewRating}
        reviewComment={reviewComment}
        setReviewComment={setReviewComment}
        reviewSubmitStatus={reviewSubmitStatus}
        setReviewSubmitStatus={setReviewSubmitStatus}
        reviewSubmitMessage={reviewSubmitMessage}
        canSubmitReview={canSubmitReview}
        handleSubmitReview={handleSubmitReview}
        merchantSettings={merchantSettings}
        activeReviewSharePlatforms={activeReviewSharePlatforms}
        handleDownloadBusinessInvoice={handleDownloadBusinessInvoice}
        invoiceDownloadStatus={invoiceDownloadStatus}
        invoiceDownloadMessage={invoiceDownloadMessage}
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

  return null
}
