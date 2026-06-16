"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Users, Check, Minus, CreditCard, ArrowLeft, ArrowRight, Link2, QrCode, Star, MessageSquare, Plus } from "lucide-react"
import { formatCurrency } from "@/lib/currency"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { iconForPayment } from "@/lib/payment-icons"
import { cn } from "@/lib/utils"
import {
  OrganicCheckoutScopedStyles,
  organicCheckoutBodyStyle,
  organicCheckoutHeaderStyle,
  organicCheckoutModalStyle,
} from "@/components/themes/organic-botanical-paper/OrganicCheckoutShell"
import {
  CheckoutIconFrame,
  CheckoutStepCard,
  CheckoutSummaryCard,
  OrderStatusCard,
  PaymentCardFrame,
  PaymentMethodTile,
  SplitBillPanel,
  SplitMethodButton,
  ThemedButton,
  ThemedInput,
  TipCouponPanel,
} from "@/components/theme-ui"
import { OrderItemWithOptions } from "@/features/customer-menu/checkout/OrderItemWithOptions"
import { createSubmittedTableOrderSnapshot } from "@/features/table-order/table-order-utils"
import {
  groupOrderDisplayItems,
  tableOrderTotalByCode,
  tableOrderVatPercentage,
} from "@/features/checkout/checkout-utils"
import {
  getCheckoutStepAfterBack,
  getCheckoutStepAfterDraftSubmit,
  isSplitCheckoutStep,
} from "@/features/checkout/checkout-state-utils"
import { canRenderPaymentMethodDetail } from "@/features/checkout/payment-method-utils"
import type { SplitMethod, SplitSourceItem } from "@/features/checkout/types"

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

          {isSplitCheckoutStep(checkoutStep) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <SplitBillPanel className="pmd-checkout-flat-section rounded-3xl">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs muted">Share {formatCurrency(splitGrandTotal)} your way.</p>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {([
                    ["equal", "Split equally"],
                    ["items", "By order items"],
                    ["shares", "By shares"],
                  ] as Array<[SplitMethod, string]>).map(([method, label]) => (
                    <button
                      data-pmd-split-method-real={method}
                      data-pmd-active={splitMethod === method ? "1" : "0"}
                      data-pmd-split-method-polished="1"
                      key={method}
                      type="button"
                      onClick={() => chooseSplitMethod(method)}
                      className={cn(
                        "group rounded-full border px-2 py-1.5 text-[11px] font-semibold transition-colors duration-150 focus:outline-none",
                        splitMethod === method ? "text-white" : ""
                      )}
                      style={{
                        boxShadow: "none",
                        outline: "none",
                      }}
                    >
                      <span
                        data-pmd-split-label="1"
                        className="inline-block transition-transform duration-150 ease-out"
                        style={{ willChange: "transform" }}
                      >
                        {label === "By order items" ? <>By order<br />items</> : label}
                      </span>
                    </button>
                  ))}
                </div>
              </SplitBillPanel>

              {checkoutStep !== "split-review" && (
                <div className="pmd-checkout-flat-section rounded-3xl p-3 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-sm font-semibold">People</span>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-[11px] muted">Split across {splitGuestCount} guests{suggestedSplitGuestCount > 2 ? ` · ${suggestedSplitGuestCount} detected` : ""}.</p>

                          <div
                            data-pmd-split-guest-stepper="1"
                            className="inline-flex shrink-0 items-center gap-1 rounded-full"
                          >
                            <button
                              type="button"
                              data-pmd-split-guest-count-control="remove"
                              aria-label="Remove guest"
                              disabled={splitGuestCount <= 2}
                              onClick={removeSplitGuest}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-35"
                              style={{ background: "#062F2A", color: "#FFFFFF" }}
                            >
                              <Minus className="h-3.5 w-3.5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
                            </button>

                            <span
                              className="min-w-5 text-center text-sm font-semibold"
                              style={{ color: "var(--theme-text-primary)" }}
                              aria-label={`${splitGuestCount} guests`}
                            >
                              {splitGuestCount}
                            </span>

                            <button
                              type="button"
                              data-pmd-split-guest-count-control="add"
                              aria-label="Add guest"
                              disabled={splitGuestCount >= 10}
                              onClick={addSplitGuest}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-full disabled:opacity-35"
                              style={{ background: "#062F2A", color: "#FFFFFF" }}
                            >
                              <Plus className="h-3.5 w-3.5" style={{ color: "#FFFFFF", stroke: "#FFFFFF", WebkitTextFillColor: "#FFFFFF" }} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {splitGuestProfiles.map((guest: any, idx: number) => (
                      <span key={`${guest.name}-${idx}`} className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold" style={{ borderColor: "color-mix(in srgb, #b88940 32%, var(--theme-border) 68%)", background: "color-mix(in srgb, #b88940 9%, var(--theme-surface) 91%)", color: "#062F2A" }}>
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px]" style={{ background: "color-mix(in srgb, #b88940 24%, var(--theme-surface) 76%)" }}>{guest.avatar}</span>
                        {guest.name}
                      </span>
                    ))}
                  </div>

                  {splitMethod === "equal" && (
                    <div className="space-y-2">
                      {equalSplitPeople.map((person: any, idx: number) => (
                        <div key={person.id} className="flex items-center justify-between rounded-2xl border p-3" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}>
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: "#062F2A", border: "1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)" }}>{person.avatar}</span>
                            <span className="truncate text-sm font-medium">{person.name}{idx === 0 ? " (rounding)" : ""}</span>
                          </div>
                          <span className="shrink-0 font-semibold">{formatCurrency(person.total)}</span>
                        </div>
                      ))}
                      <p className="rounded-full px-3 py-2 text-[11px] muted" style={{ background: "color-mix(in srgb, #b88940 12%, var(--theme-surface) 88%)" }}>Odd cents go to the first payer so totals match exactly.</p>
                    </div>
                  )}

                  {splitMethod === "items" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="muted">Tap items to assign guests.</span>
                        <span className={cn("rounded-full px-2 py-1 font-semibold", unassignedSplitItems > 0 ? "text-red-700" : "") } style={{ background: unassignedSplitItems > 0 ? "#FEE2E2" : "color-mix(in srgb, #062F2A 12%, var(--theme-surface) 88%)" }}>{unassignedSplitItems} unassigned</span>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {splitSourceItems.map((item: SplitSourceItem) => {
                          const assignedIndex = itemAssignments[item.key]
                          const nextLabel = assignedIndex === undefined || assignedIndex === null ? "Unassigned" : splitGuestNames[assignedIndex]
                          return (
                            <button key={item.key} type="button" className="flex w-full items-center justify-between gap-3 rounded-2xl p-3 text-left shadow-sm" style={{ border: "1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)", background: "var(--theme-surface)" }} onClick={() => setItemAssignments((prev: any) => ({ ...prev, [item.key]: assignedIndex === undefined || assignedIndex === null ? 0 : assignedIndex >= splitGuestCount - 1 ? null : assignedIndex + 1 }))}>
                              <span className="truncate text-sm font-medium">{item.name}</span>
                              <span className="shrink-0 text-right text-xs"><span className="font-semibold">{formatCurrency(item.amount)}</span><br /><span className={assignedIndex === undefined || assignedIndex === null ? "text-red-700" : "muted"}>{nextLabel}</span></span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {splitMethod === "shares" && (
                    <div className="space-y-3">
                      {sharePercents.slice(0, splitGuestCount).map((percent: any, idx: number) => (
                        <div key={idx} className="rounded-2xl p-3 shadow-sm" style={{ border: "1px solid color-mix(in srgb, var(--theme-border) 70%, transparent)", background: "var(--theme-surface)" }}>
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="flex min-w-0 items-center gap-2 font-medium"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: "#062F2A", border: "1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)" }}>{getSplitGuestAvatar(idx)}</span><span className="truncate">{splitGuestNames[idx]}</span></span>

                            <div
                              data-pmd-share-edit-group="1"
                              className="flex shrink-0 items-center gap-1.5"
                            >
                              <label className="sr-only" htmlFor={`share-percent-${idx}`}>Share percentage for {splitGuestNames[idx]}</label>
                              <div className="relative">
                                <input
                                  id={`share-percent-${idx}`}
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={Math.round(Number(percent || 0))}
                                  onChange={(event) => {
                                    const nextPercent = Math.max(0, Math.min(100, Number(event.target.value || 0)))
                                    setSharePercents((prev: any) => prev.map((value: any, valueIdx: number) => valueIdx === idx ? nextPercent : value))
                                  }}
                                  className="pmd-share-manual-input pmd-share-percent-input"
                                  inputMode="decimal"
                                />
                                <span className="pmd-share-input-suffix">%</span>
                              </div>

                              <span className="pmd-share-dot">·</span>

                              <label className="sr-only" htmlFor={`share-amount-${idx}`}>Share amount for {splitGuestNames[idx]}</label>
                              <div className="relative">
                                <span className="pmd-share-input-prefix">€</span>
                                <input
                                  id={`share-amount-${idx}`}
                                  type="number"
                                  min={0}
                                  max={Math.max(0, Number(splitGrandTotal || 0))}
                                  step={0.01}
                                  value={(splitGrandTotal * (Number(percent || 0) / 100)).toFixed(2)}
                                  onChange={(event) => {
                                    const nextAmount = Math.max(0, Number(event.target.value || 0))
                                    const nextPercent = Number(splitGrandTotal || 0) > 0 ? Math.max(0, Math.min(100, (nextAmount / Number(splitGrandTotal || 0)) * 100)) : 0
                                    setSharePercents((prev: any) => prev.map((value: any, valueIdx: number) => valueIdx === idx ? Math.round(nextPercent) : value))
                                  }}
                                  className="pmd-share-manual-input pmd-share-amount-input"
                                  inputMode="decimal"
                                />
                              </div>
                            </div>
                          </div>
                          <input type="range" min="0" max="100" step="1" value={percent} onChange={(event) => setSharePercents((prev: any) => prev.map((value: any, valueIdx: number) => valueIdx === idx ? Number(event.target.value) : value))} className="pmd-split-slider w-full" />
                        </div>
                      ))}
                      <div className="flex justify-center">
                        <span className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", sharePercentTotal === 100 ? "" : "text-red-700")} style={{ background: sharePercentTotal === 100 ? "color-mix(in srgb, #062F2A 12%, var(--theme-surface) 88%)" : "#FEF2F2", border: `1px solid ${sharePercentTotal === 100 ? "color-mix(in srgb, #062F2A 18%, var(--theme-border) 82%)" : "#FCA5A5"}` }}>
                          {sharePercentTotal === 100 ? "100% ready" : sharePercentTotal < 100 ? `${100 - sharePercentTotal}% remaining` : `Over by ${sharePercentTotal - 100}%`}
                        </span>
                      </div>
                    </div>
                  )}

                  <ThemedButton type="button" disabled={!canConfirmSplitMethod} onClick={goToSplitReview} variant="primary" fullWidth className={cn(!canConfirmSplitMethod && "cursor-not-allowed")}>
                    Review split
                  </ThemedButton>
                </div>
              )}

              {checkoutStep === "split-review" && (
                <div className="space-y-3">
                  {activeSplitPeople.map((person: any) => (
                    <div key={person.id} className="rounded-3xl p-3 space-y-2 shadow-sm" style={{ border: `1px solid ${selectedSplitPersonId === person.id ? "#b88940" : "color-mix(in srgb, var(--theme-border) 70%, transparent)"}`, background: "var(--theme-surface)" }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ background: "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: "#062F2A", border: "1px solid color-mix(in srgb, #b88940 35%, var(--theme-border) 65%)" }}>{person.avatar}</span>
                          <h4 className="truncate font-semibold">{person.name}</h4>
                        </div>
                        <span className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold" style={{ background: person.status === "Paid" ? "#DCFCE7" : "color-mix(in srgb, #b88940 18%, var(--theme-surface) 82%)", color: person.status === "Paid" ? "#166534" : "#5A3512" }}>{person.status}</span>
                      </div>
                      <div className="space-y-1 text-xs muted">
                        {person.items.map((item: any, idx: number) => <div key={`${person.id}-${idx}`} className="flex justify-between gap-2"><span className="truncate">{item.name}</span><span>{formatCurrency(item.amount)}</span></div>)}
                        {person.tax > 0 && <div className="flex justify-between"><span>Proportional service/tax</span><span>{formatCurrency(person.tax)}</span></div>}
                      </div>
                      <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--theme-border)" }}><span className="font-semibold">Total</span><span className="font-bold">{formatCurrency(person.total)}</span></div>
                      {selectedSplitPersonId === person.id ? (
                        <ThemedButton type="button" onClick={() => setCheckoutStep("payment")} variant="primary" fullWidth>Pay my share</ThemedButton>
                      ) : (
                        <ThemedButton type="button" onClick={() => setSelectedSplitPersonId(person.id)} variant="secondary" fullWidth>Select payer</ThemedButton>
                      )}
                    </div>
                  ))}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={() => toast({ title: "Payment links ready", description: "Share links can be generated by the payment API when multi-device checkout is enabled." })} className={modalSecondaryBtn}><Link2 className="h-4 w-4" /> Send payment link to others</button>
                    <button type="button" onClick={() => toast({ title: "QR share", description: "Ask guests to scan the table QR to pay their own share." })} className={modalSecondaryBtn}><QrCode className="h-4 w-4" /> Show QR/share link</button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {(checkoutStep === "submitted" || checkoutStep === "paid") && submittedSnapshot && (
            <motion.div
              data-pmd-order-status-card="1"
              className="relative mt-7 space-y-3"
            >
              <OrderStatusCard className="pt-7 space-y-3">
              {(submittedSnapshot?.showCustomerEta ?? true) && (
                <div
                  data-pmd-floating-eta-circle="1"
                  className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
                  aria-label={`Estimated time ${estimatedMinutes} minutes`}
                  style={{
                    width: "4.45rem",
                    height: "4.45rem",
                    background: "#062F2A",
                    backgroundColor: "#062F2A",
                    border: "2px solid #b88940",
                    boxShadow: "0 16px 34px rgba(6, 47, 42, 0.24)",
                    color: "#FFFFFF",
                    WebkitTextFillColor: "#FFFFFF",
                  }}
                >
                  <div className="flex flex-col items-center justify-center leading-none">
                    <span
                      className="font-extrabold tracking-tight"
                      style={{
                        color: "#FFFFFF",
                        WebkitTextFillColor: "#FFFFFF",
                        fontSize: "1.45rem",
                        lineHeight: 1,
                      }}
                    >
                      {Math.max(1, Math.round(Number(estimatedMinutes) || 0))}
                    </span>
                    <span
                      className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em]"
                      style={{
                        color: "rgba(255,255,255,0.92)",
                        WebkitTextFillColor: "rgba(255,255,255,0.92)",
                      }}
                    >
                      mins
                    </span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <CheckoutIconFrame
                  data-pmd-order-received-icon="1"
                  className="pmd-order-received-icon rounded-full"
                >
                  <Check className="h-5 w-5" strokeWidth={3} />
                </CheckoutIconFrame>
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="pmd-checkout-status-title text-base font-semibold">{checkoutStep === "paid" ? "Payment confirmed" : "We received your order"}</p>

                  </div>
                  {checkoutStep === "paid" && <p className="text-xs muted">Your order is confirmed and being prepared.</p>}
                </div>
              </div>

              <div className="pmd-checkout-total-card surface-sub rounded-2xl p-3 space-y-2 text-sm" style={{ background: "var(--theme-surface)", color: "var(--theme-text-primary)", border: "1px solid var(--theme-border)" }}>
                {submittedSnapshot?.orderId && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Order Number:</span>
                    <span className="font-semibold text-[15px]">{submittedSnapshot.orderId}</span>
                  </div>
                )}
                {Number(submittedSnapshot?.vatAmount ?? 0) > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="muted font-medium">Subtotal:</span>
                      <span className="font-semibold text-[15px]">{formatCurrency(Number(submittedSnapshot?.subtotal ?? 0))}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="muted font-medium">VAT {Number(submittedSnapshot?.vatPercentage ?? taxSettings?.percentage ?? 0)}%:</span>
                      <span className="font-semibold text-[15px]">{formatCurrency(Number(submittedSnapshot?.vatAmount ?? 0))}</span>
                    </div>
                  </>
                )}
                {(paidTipAmount > 0 || paidCouponDiscount > 0) && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Items total:</span>
                    <span className="font-semibold text-[15px]">{formatCurrency(submittedBaseTotal || Number(submittedSnapshot?.total ?? 0))}</span>
                  </div>
                )}
                {paidTipAmount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Tip:</span>
                    <span className="font-semibold text-[15px]">{formatCurrency(paidTipAmount)}</span>
                  </div>
                )}
                {paidCouponDiscount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="muted font-medium">Coupon {String(submittedSnapshot?.paidCouponCode || appliedCoupon?.code || "") ? `(${String(submittedSnapshot?.paidCouponCode || appliedCoupon?.code)})` : ""}:</span>
                    <span className="font-semibold text-[15px]" style={{ color: "#166534" }}>-{formatCurrency(paidCouponDiscount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="muted font-medium">{checkoutStep === "paid" && (paidTipAmount > 0 || paidCouponDiscount > 0) ? "Amount paid:" : "Order Total:"}</span>
                  <span className="font-semibold text-[15px]">{formatCurrency(checkoutStep === "paid" && (paidTipAmount > 0 || paidCouponDiscount > 0) ? paidAmountTotal : orderStatusTotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="muted font-medium">{submittedContextLabel}:</span>
                  <span className="font-semibold text-[15px]">{submittedContextValue}</span>
                </div>
                {vatLabels.includedNote && (
                  <div className="flex items-center justify-between pt-1 text-xs opacity-75">
                    <span className="muted font-medium">VAT:</span>
                    <span className="font-medium">{vatLabels.includedNote}</span>
                  </div>
                )}
              </div>

              <div className="pmd-checkout-flat-section rounded-2xl p-3">
                <h3 className="mb-2 text-sm font-semibold">{vatLabels.summary}</h3>
                <div className="pmd-checkout-list-scroll space-y-2 max-h-56 overflow-y-auto pr-1">
                  {groupOrderDisplayItems(submittedSnapshot?.submittedItems || []).map((item: any, idx: number) => (
                    <motion.div layout key={`${item?.menu_id || item?.order_menu_id || item?.name || idx}-${idx}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.16, ease: "easeOut" }} className="pmd-checkout-item-row flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{Number(item?.quantity || 1)}x {String(item?.name || `Item ${idx + 1}`)}</span>
                      <span className="font-semibold text-[15px]">{formatCurrency(Number(item?.subtotal ?? (Number(item?.price || 0) * Number(item?.quantity || 1))))}</span>
                    </motion.div>
                  ))}
                </div>
              </div>

              {checkoutStep !== "paid" && <div className="space-y-3">
                {checkoutStep === "submitted" && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <motion.button
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.985 }}
                      onClick={() => { setIsSplitting(false); setSelectedSplitPersonId(null); setCheckoutStep('payment') }}
                      className="group flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold shadow-md transition" style={modalPrimaryBtnStyle}
                    >
                      Pay in full <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: "#FFFFFF", stroke: "#FFFFFF" }} />
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={{ x: 2 }}
                      whileTap={{ scale: 0.985 }}
                      data-pmd-split-bill-stable="1"
                      onClick={() => startSplitFlow("equal")}
                      className="pmd-split-bill-stable-button group flex min-h-11 w-full items-center justify-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition"
                      style={{
                        border: "1.5px solid #D8B982",
                        borderColor: "#D8B982",
                        color: "#10201D",
                        WebkitTextFillColor: "#10201D",
                        background: "rgba(255, 255, 255, 0.74)",
                        backgroundColor: "rgba(255, 255, 255, 0.74)",
                        backgroundImage: "none",
                        boxShadow: "0 8px 18px rgba(17, 24, 39, 0.04)",
                        textShadow: "none",
                        opacity: 1,
                        transition: "none",
                      }}
                    >
                      <Users className="h-4 w-4 transition-transform group-hover:translate-x-0.5" style={{ color: "#b88940", stroke: "#b88940" }} /> Split bill
                    </motion.button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onOpenOrderUpdate?.(submittedSnapshot || initialSubmittedOrder || null)
                    onClose()
                  }}
                  className={modalSecondaryBtn}
                >
                  Continue ordering
                </button>
              </div>}
              {checkoutStep === "paid" && (
                <div className="pmd-order-complete-content space-y-3">
                  <div className="rounded-2xl border p-3 space-y-3" style={{ borderColor: "var(--theme-border)", background: "var(--theme-surface)" }}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" style={{ color: "#b88940" }} />
                      <h3 className="text-sm font-semibold">Rate your visit</h3>
                    </div>
                    <p className="text-xs muted">Thank you — a quick note for the restaurant.</p>
                    <div className="flex gap-1" aria-label="Restaurant rating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button key={star} type="button" aria-label={`${star} star${star > 1 ? "s" : ""}`} onClick={() => { setReviewRating(star); if (reviewSubmitStatus !== "loading") setReviewSubmitStatus("idle") }} className="rounded-full p-1">
                          <Star className="h-6 w-6" style={{ color: "#b88940", fill: reviewRating >= star ? "#b88940" : "transparent" }} />
                        </button>
                      ))}
                    </div>
                    <Textarea value={reviewComment} onChange={(event) => { setReviewComment(event.target.value); if (reviewSubmitStatus !== "loading") setReviewSubmitStatus("idle") }} placeholder="Optional comment for the restaurant" className="min-h-[78px] rounded-2xl" />
                    {/* PMD_FINAL_REVIEW_SUBMIT_BUTTON_20260605 */}
                    <button
                      type="button"
                      data-pmd-submit-review="1"
                      disabled={!canSubmitReview || reviewSubmitStatus === "loading" || reviewSubmitStatus === "success"}
                      onClick={handleSubmitReview}
                      className="min-h-11 w-full rounded-full px-4 py-2 text-sm font-semibold transition"
                      style={{ border: "1px solid #062F2A", background: canSubmitReview && reviewSubmitStatus !== "success" ? "#062F2A" : "rgba(6, 47, 42, 0.18)", color: "#FFFFFF", WebkitTextFillColor: "#FFFFFF", boxShadow: canSubmitReview ? "0 14px 28px rgba(0, 0, 0, 0.24)" : "none", opacity: !canSubmitReview || reviewSubmitStatus === "success" ? 0.72 : 1 }}
                    >
                      {reviewSubmitStatus === "loading" ? "Submitting..." : reviewSubmitStatus === "success" ? "Review submitted" : "Submit review"}
                    </button>
                    {reviewSubmitMessage && <p className="text-xs" style={{ color: reviewSubmitStatus === "error" ? "#B42318" : "#166534" }}>{reviewSubmitMessage}</p>}
                    {reviewSubmitStatus === "success" && merchantSettings.reviewSocial?.sharePromptEnabled && activeReviewSharePlatforms.length > 0 && (
                      <div className="rounded-2xl border p-3" style={{ borderColor: "rgba(216, 185, 130, 0.42)", background: "rgba(255, 249, 239, 0.78)" }}>
                        <p className="mb-2 text-xs font-semibold" style={{ color: "#10201D" }}>Would you like to share your review publicly?</p>
                        <div className="flex flex-wrap gap-2">
                          {activeReviewSharePlatforms.map(({ id, label, icon: Icon }: any) => (
                            <a key={id} href={merchantSettings.reviewSocial.platforms[id].url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "rgba(6, 47, 42, 0.18)", color: "#062F2A", background: "rgba(255,255,255,0.72)" }}>
                              <Icon className="h-3.5 w-3.5" /> {label}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center">
                    <button type="button" onClick={handleDownloadBusinessInvoice} disabled={invoiceDownloadStatus === "loading"} className="min-h-10 w-full max-w-[280px] rounded-full border px-4 py-2 text-xs font-semibold" style={{ borderColor: "color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)", color: "#062F2A", background: "transparent", opacity: invoiceDownloadStatus === "loading" ? 0.72 : 1 }}>{invoiceDownloadStatus === "loading" ? "Preparing invoice..." : "Download business invoice"}</button>
                  </div>
                  {invoiceDownloadMessage && <p className="text-center text-xs" style={{ color: "#B42318" }}>{invoiceDownloadMessage}</p>}
                  <div className="flex justify-center pt-1">
                    <img src="/assets/media/uploads/Paymydinelogo.png" alt="PayMyDine" className="max-h-7 max-w-[120px] opacity-70" />
                  </div>
                  <button type="button" onClick={onClose} className={modalSecondaryBtn}>Back to menu</button>
                </div>
              )}
              </OrderStatusCard>
            </motion.div>
          )}

          {checkoutStep === "payment" && (
            <>
              <motion.div key="payment-card-header" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18, ease: "easeOut" }} className="space-y-3">
                <PaymentCardFrame className="pmd-checkout-payment-card surface-sub">
                <div
                  data-pmd-payment-header-copy-row="1"
                  className="flex items-center gap-3 rounded-2xl p-4"
                  style={{
                    background: "var(--theme-surface)",
                    color: "var(--theme-text-primary)",
                    border: "1px solid var(--theme-border)",
                  }}
                >
                  <CheckoutIconFrame
                    data-pmd-payment-header-icon="1"
                    className="rounded-full"
                  >
                    <CreditCard className="h-5 w-5" />
                  </CheckoutIconFrame>
                  <p
                    className="text-sm font-semibold leading-snug"
                    style={{
                      color: "var(--theme-text-muted)",
                      WebkitTextFillColor: "var(--theme-text-muted)",
                    }}
                  >
                    Ready to pay?
                  </p>
                </div>
                {selectedSplitPerson && (
                  <CheckoutStepCard variant="subtle" className="flex items-center justify-between p-3">
                    <div className="flex items-center space-x-2"><span className="pmd-checkout-avatar-frame inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold">{selectedSplitPerson.avatar}</span><span className="text-xs font-semibold">{selectedSplitPerson.name}'s share</span></div>
                    <span className="text-sm font-bold">{formatCurrency(selectedSplitPerson.total)}</span>
                  </CheckoutStepCard>
                )}
                </PaymentCardFrame>
              </motion.div>
              {pendingSummary && (
                <div className="pmd-checkout-flat-section rounded-2xl p-3 text-xs">
                  <div className="flex justify-between"><span className="muted">Total</span><span className="font-semibold">{formatCurrency(pendingSummary?.orderTotal || 0)}</span></div>
                  <div className="flex justify-between"><span className="muted">Already paid</span><span className="font-semibold">{formatCurrency(pendingSummary?.settledAmount || 0)}</span></div>
                  <div className="flex justify-between mt-1"><span className="muted">Remaining</span><span className="font-semibold">{formatCurrency(pendingSummary?.remainingAmount || 0)}</span></div>
                </div>
              )}
              <motion.div className="space-y-3">
                <CheckoutSummaryCard className="pmd-checkout-total-card space-y-3">
                <div className="pmd-checkout-meta-row flex items-center justify-between rounded-2xl border px-3 py-2 text-xs" style={{ borderColor: "var(--theme-border)",
                    background: "transparent",
                    backgroundColor: "transparent",
                    boxShadow: "none",}}>
                  <span className="muted">{orderContextLabel}</span>
                  <span className="font-semibold">{orderContextValue}</span>
                </div>
                <div className="space-y-1 text-sm">
                  {paymentVatAmount > 0 && !selectedSplitPerson && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="muted">Subtotal</span>
                        <span className="font-semibold">{formatCurrency(paymentSubtotalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="muted">VAT {paymentVatPercentage}%</span>
                        <span className="font-semibold">{formatCurrency(paymentVatAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="muted">{selectedSplitPerson ? "Share amount" : "Items total"}</span>
                    <span className="font-semibold">{formatCurrency(paymentBaseAmount)}</span>
                  </div>
                  {paymentTipAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="muted">Tip</span>
                      <span className="font-semibold">{formatCurrency(paymentTipAmount)}</span>
                    </div>
                  )}
                  {paymentCouponDiscount > 0 && appliedCoupon && (
                    <div className="flex items-center justify-between">
                      <span className="muted">Coupon {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
                      <span className="font-semibold" style={{ color: "#166534" }}>-{formatCurrency(paymentCouponDiscount)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t pt-2" style={{ borderColor: "var(--theme-border)" }}>
                    <span className="font-semibold">Payable total</span>
                    <span className="text-base font-bold" style={{ color: "#b88940" }}>{formatCurrency(paymentPayableTotal)}</span>
                  </div>
                </div>
                {tipSettings.enabled && (
                  <TipCouponPanel data-pmd-payment-real-panel="tip-coupon">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{selectedSplitPerson ? `${selectedSplitPerson.name}'s tip` : "Add tip"}</span>
                      {paymentTipAmount > 0 && <span className="text-xs font-semibold" style={{ color: "#b88940" }}>{formatCurrency(paymentTipAmount)}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(tipSettings.percentages || []).map((p: any) => (
                        <SplitMethodButton key={p} selected={paymentTipPercentage === p && !paymentCustomTip} onClick={() => updatePaymentTipPercentage(p)}>{p}%</SplitMethodButton>
                      ))}
                      <div className="relative min-w-[96px] flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs muted">€</span>
                        <ThemedInput
                    data-pmd-custom-tip-shows-selected-amount="1"
                    step="0.01"
                    value={customTip || (Number(tipAmount) > 0 ? Number(tipAmount).toFixed(2) : "")} type="number" min="0" onChange={(event) => updatePaymentCustomTip(event.target.value)} placeholder="Custom" className="h-9 w-full pl-7 pr-3 text-xs font-semibold" />
                      </div>
                    </div>
                  </TipCouponPanel>
                )}
                <TipCouponPanel>
                  {!appliedCoupon || selectedSplitPerson ? (
                    <div className="flex gap-2">
                      <ThemedInput type="text" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setCouponError(null) }} placeholder="Coupon code" className="h-9 min-w-0 flex-1 px-3 text-xs font-semibold" disabled={couponLoading} />
                      <ThemedButton type="button" disabled={couponLoading || !couponCode.trim()} onClick={async () => {
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
                      }} className="h-9 px-4 text-xs font-semibold disabled:opacity-50" variant="secondary">{couponLoading ? "Checking..." : "Apply"}</ThemedButton>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2 rounded-full px-3 py-2 text-xs" style={{ background: "color-mix(in srgb, #062F2A 10%, var(--theme-surface) 90%)" }}>
                      <span className="font-semibold">{appliedCoupon.name || "Coupon"} {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
                      <button type="button" onClick={() => { removeCoupon(); setCouponCode(""); setCouponError(null) }} className="rounded-full border px-2.5 py-1 text-[11px] font-semibold transition" style={{ borderColor: "color-mix(in srgb, #b88940 45%, var(--theme-border) 55%)", color: "#062F2A", background: "var(--theme-surface)" }}>Remove</button>
                    </div>
                  )}
                  {couponError && <p className="text-xs text-red-700">{couponError}</p>}
                </TipCouponPanel>
                </CheckoutSummaryCard>
              </motion.div>
          {/* Payment Methods */}
          <AnimatePresence initial={false} mode="wait">
            {checkoutStep === "payment" ? (
              <motion.div
                key="payment-methods"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-3 pt-2"
              >
                <PaymentCardFrame className="pmd-checkout-payment-methods-card">
                <h3 className="text-center text-sm">{t("paymentMethods")}</h3>
                <div className="flex justify-center items-center gap-3 flex-wrap">
                  {loadingPayments ? (
                    <div className="text-sm muted">Loading payment methods...</div>
                  ) : visiblePaymentMethods.length === 0 ? (
                    <div className="text-sm muted">No payment methods available</div>
                  ) : (
                    visiblePaymentMethods.map((method: any) => (
                      <motion.div key={method.code}>
                        <PaymentMethodTile
                          label={method.name}
                          selected={selectedPaymentMethod === method.code}
                          onClick={() => {
                            try {
                              if (typeof window !== "undefined" && (window as any).__PMD_WALLET_POST) {
                                (window as any).__PMD_WALLET_POST({
                                  level: "info",
                                  message: "PMD_PAYMENT_METHOD_CLICK",
                                  data: {
                                    clickedCode: method.code,
                                    clickedName: method.name,
                                    selectedPaymentMethodBefore: selectedPaymentMethod ?? null,
                                    selectedMethodBefore: selectedMethod ? {
                                      code: (selectedMethod as any).code,
                                      name: (selectedMethod as any).name,
                                    } : null,
                                    stripePromise: !!stripePromise,
                                    stripeConfig: stripeConfig ? {
                                      currency: stripeConfig?.currency || null,
                                      countryCode: stripeConfig?.countryCode || null,
                                      applePayEnabled: (stripeConfig as any)?.applePayEnabled ?? null,
                                      googlePayEnabled: (stripeConfig as any)?.googlePayEnabled ?? null,
                                    } : null,
                                    ua: typeof navigator !== "undefined" ? navigator.userAgent : null,
                                  }
                                });
                              }
                            } catch {}
                            handlePaymentMethodSelect(method.code)
                          }}
                        >
                          {method.code === "card" ? (
                            <img
                              src={isDarkTheme ? "/images/payments/card-dark.svg" : "/images/payments/card-light.svg"}
                              alt={method.name}
                              width={40}
                              height={22}
                              className="object-contain"
                            />
                          ) : (
                            <img
                              src={
                                method.code === "paypal"
                                  ? "/images/payments/paypal.png"
                                  : method.code === "google_pay"
                                    ? "/images/payments/google_pay.png"
                                    : iconForPayment(method.code)
                              }
                              alt={method.name}
                              width={method.code === "wero" ? 50 : method.code === "cod" ? 30 : method.code === "paypal" ? 30 : method.code === "apple_pay" || method.code === "google_pay" ? 50 : 42}
                              height={method.code === "wero" ? 29 : method.code === "apple_pay" || method.code === "google_pay" ? 28 : 24}
                              className="object-contain"
                            />
                          )}
                        </PaymentMethodTile>
                      </motion.div>
                    ))
                  )}
                </div>
                {canRenderPaymentMethodDetail(selectedPaymentMethod) && (
                  <div data-pmd-payment-selected-detail="1" className="pmd-checkout-payment-detail pt-2">
                    {renderPaymentForm()}
                  </div>
                )}
                </PaymentCardFrame>
              </motion.div>
            ) : null}
          </AnimatePresence>
            </>
          )}
</div>
      </motion.div>
    </div>
  )
}
