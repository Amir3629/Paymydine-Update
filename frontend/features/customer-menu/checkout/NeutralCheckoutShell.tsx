"use client"

import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { OrganicCheckoutScopedStyles, organicCheckoutBodyStyle, organicCheckoutHeaderStyle, organicCheckoutModalStyle } from "@/components/themes/organic-botanical-paper/OrganicCheckoutShell"
import { OrderItemWithOptions } from "@/features/customer-menu/checkout/OrderItemWithOptions"
import { createSubmittedTableOrderSnapshot } from "@/features/table-order/table-order-utils"
import { groupOrderDisplayItems, tableOrderTotalByCode, tableOrderVatPercentage } from "@/features/checkout/checkout-utils"
import { getCheckoutStepAfterBack, getCheckoutStepAfterDraftSubmit } from "@/features/checkout/checkout-state-utils"
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
          


          <AnimatePresence mode="wait" initial={false}>
          {checkoutStep === "review" && tableDraft?.success && tableDraft.status && tableDraft.status !== "empty" && !isSubmittedTableDraftForStatus && !hasPersonalItems && !preferPersonalReview && (
            <motion.div key="table-order-draft" layout initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.16, ease: "easeOut" }} className="surface-sub rounded-2xl p-4 space-y-4" style={{ background: "var(--theme-surface)", color: "var(--theme-text-primary)" }}>

              <div className="pmd-checkout-list-scroll space-y-3 max-h-64 overflow-y-auto pr-1">
                {(tableDraft.groups && tableDraft.groups.length > 0 ? tableDraft.groups : [{ guest_session_id: null, items: tableDraft.items || [], subtotal: tableDraft.totals?.subtotal || 0 }]).map((group: any, groupIndex: number) => (
                  <div key={`${group.guest_session_id || 'table'}-${groupIndex}`} className="rounded-2xl border p-3" style={{ borderColor: "var(--theme-border)" }}>
                    {(tableDraft.groups || []).length > 1 && (
                    <div className="mb-2 flex items-center justify-between text-xs font-semibold">
                      <span>{group.guest_session_id ? `Guest ${groupIndex + 1}` : "Table"}</span>
                      <span>{formatCurrency(Number(group.subtotal || 0))}</span>
                    </div>
                    )}
                    <div className="space-y-1">
                      {groupOrderDisplayItems(group.items || []).map((item: any, idx: number) => (
                        <motion.div layout key={`${item.id || item.order_menu_id || item.menu_id || item.name}-${idx}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: "easeOut" }} className="pmd-checkout-item-row pmd-table-order-item-row flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{Number(item.quantity || 1)}x {String(item.name || `Item ${idx + 1}`)}</span>
                          <span className="font-semibold">{formatCurrency(Number(item.subtotal ?? (Number(item.price || 0) * Number(item.quantity || 1))))}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: "var(--theme-border)",
                    background: "transparent",
                    backgroundColor: "transparent",
                    boxShadow: "none",}}>
                <span className="muted">{orderContextLabel}</span>
                <span className="font-semibold">{orderContextValue}</span>
              </div>
              {isTableContext && <p className="pmd-checkout-helper-text text-xs muted">Shared table order</p>}
              {Number(tableDraft.totals?.tax ?? tableOrderTotalByCode(tableDraft, 'tax') ?? 0) > 0 && (
                <div className="space-y-1 border-t pt-3 text-sm" style={{ borderColor: "var(--theme-border)" }}>
                  <div className="flex items-center justify-between">
                    <span className="muted">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(Number(tableDraft.totals?.subtotal ?? tableOrderTotalByCode(tableDraft, 'subtotal') ?? 0))}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="muted">VAT {tableOrderVatPercentage(tableDraft, taxSettings?.percentage || 0)}%</span>
                    <span className="font-semibold">{formatCurrency(Number(tableDraft.totals?.tax ?? tableOrderTotalByCode(tableDraft, 'tax') ?? 0))}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between border-t pt-3 text-sm" style={{ borderColor: "var(--theme-border)" }}>
                <span className="font-semibold">Order Total</span>
                <span className="text-base font-bold">{formatCurrency(Number(tableDraft.totals?.orderTotal || tableDraft.totals?.total || 0))}</span>
              </div>
              {tableDraft.status === "draft" ? (
                <div className="space-y-3" data-pmd-clean-table-actions="1">
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      type="button"
                      disabled={submitDraftLoading || draftLoading || Number(tableDraft.totals?.total || 0) <= 0}
                      onClick={handleSubmitTableDraft}
                      whileHover={{ y: submitDraftLoading ? 0 : -1 }}
                      whileTap={{ scale: submitDraftLoading ? 1 : 0.985 }}
                      aria-label="Send order to kitchen"
                      data-pmd-clean-send-kitchen="1"
                      className="min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70"
                      style={{
                        background: "#062F2A",
                        backgroundColor: "#062F2A",
                        backgroundImage: "none",
                        color: "#FFFFFF",
                        WebkitTextFillColor: "#FFFFFF",
                        border: "1px solid #062F2A",
                        boxShadow: "0 10px 22px rgba(0, 0, 0, 0.24)",
                        textShadow: "none",
                      }}
                    >
                      <span
                        style={{
                          color: "#FFFFFF",
                          WebkitTextFillColor: "#FFFFFF",
                          textShadow: "none",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {submitDraftLoading ? "Sending..." : "Send to kitchen"}
                      </span>
                    </motion.button>

                    <motion.button
                      type="button"
                      onClick={onClose}
                      whileHover={{ y: -1 }}
                      whileTap={{ scale: 0.985 }}
                      data-pmd-clean-continue-ordering="1"
                      className="min-h-12 w-full rounded-2xl px-4 py-3 text-sm font-semibold transition hover:opacity-95 active:scale-[0.99] border border-[color:var(--theme-border)] text-[color:var(--theme-text-primary)] bg-transparent"
                    >
                      Continue ordering
                    </motion.button>
                  </div>
                </div>
              ) : tableDraft.order_id ? (
                <button type="button" onClick={() => { setSubmittedSnapshot(createSubmittedTableOrderSnapshot(tableDraft, tableInfo, taxSettings?.percentage || 0)); setCheckoutStep(getCheckoutStepAfterDraftSubmit()) }} className={modalSecondaryBtn}>
                  View order status
                </button>
              ) : null}
            </motion.div>
          )}

{checkoutStep === "review" && hasPersonalItems && (<motion.div key="personal-cart-review" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0 }} className="space-y-4"><div className="pmd-checkout-flat-section rounded-2xl p-3 space-y-3">{/* PMD_REMOVED_YOUR_ITEMS_TITLE_20260604 */}<div className="pmd-checkout-list-scroll space-y-2 max-h-56 overflow-y-auto pr-1">{personalReviewItems.map((cartItem: any, idx: number) => (<OrderItemWithOptions key={String((cartItem as any).__pmdOptionKey || `${cartItem.item.id}-${idx}`)} cartItem={cartItem} optionKey={String((cartItem as any).__pmdOptionKey || cartItem.item.id)} unitLabel={(cartItem as any).__pmdUnitLabel} addToCart={addToCart as any} t={t} onOptionsChange={handleOptionsChange} />))}</div></div>

          {/* Totals */}
          {checkoutStep === "review" && hasPersonalItems && <div className="pmd-checkout-flat-section rounded-2xl p-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span>{vatLabels.subtotal}</span>
          <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            {taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 1 && (
            <div className="flex justify-between text-xs">
                <span>{t("tax")} {taxSettings.percentage}%</span>
                <span className="font-semibold">{formatCurrency(taxAmount)}</span>
            </div>
            )}
            {tipAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span>{t("tip")}</span>
          <span className="font-semibold">{formatCurrency(tipAmount)}</span>
              </div>
            )}
            {appliedCoupon && couponDiscount > 0 && (
              <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                <span>{t("coupon") || "Coupon"} ({appliedCoupon.code})</span>
                <span className="font-semibold">-{formatCurrency(couponDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between items-center divider pt-2 mt-2">
              <span className="text-base">{vatLabels.total}</span>
          <span className="text-base font-bold">{formatCurrency(finalTotal)}</span>
            </div>
          </div>}

          {checkoutStep === "review" && hasPersonalItems && (
            <div className="mt-3 space-y-3">
              <div className="pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: "var(--theme-border)",
                    background: "transparent",
                    backgroundColor: "transparent",
                    boxShadow: "none",}}>
                <span className="muted">{orderContextLabel}</span>
                <span className="font-semibold">{orderContextValue}</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  data-pmd-review-submit="true"
                  aria-label="Confirm items"
                  disabled={isLoading || allItems.length === 0}
                  onClick={handleConfirmMyItems}
                  className={modalPrimaryBtn} style={modalPrimaryBtnStyle}
                >
                  {isLoading ? "Confirming..." : "Confirm"}
                </button>

                <button
                  type="button"
                  data-pmd-review-continue="true"
                  onClick={onClose}
                  className={modalSecondaryBtn}
                >
                  Continue ordering
                </button>
              </div>
            </div>
          )}
          </motion.div>)}
          </AnimatePresence>

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
