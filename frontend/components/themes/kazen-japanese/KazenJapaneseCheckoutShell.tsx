"use client"

import React from "react"
import { Check, CreditCard, Link2, QrCode, Users } from "lucide-react"
import { canRenderPaymentMethodDetail } from "@/features/checkout/payment-method-utils"
import type { SplitPerson } from "@/features/checkout/types"
import {
  money,
  getAmount,
  getItemName,
  ModalHead,
  Card,
  Line,
  ItemRows,
  Actions,
  KazenButton,
  SplitTabs,
  PeopleControls,
  GuestChips,
  PaymentMethods,
} from "./KazenCheckoutParts"

type KazenJapaneseCheckoutShellProps = any

// PMD_KAZEN_V24B_REBUILT_CHECKOUT_CONTROLS_20260618
// Checkout modal controls are source-level rebuilt.
// This avoids old KazenButton inline styles that caused grey checkout buttons.
function CheckoutModalHeadClean({ title, eyebrow, onBack }: any) {
  return (
    <div className="kazen-solid-modal-head pmd-kazen-checkout-head pmd-kazen-checkout-head-clean">
      <div>
        {eyebrow ? <span className="pmd-kazen-eyebrow-badge">{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      <button
        type="button"
        className="pmd-kzui-btn-square pmd-kzui-btn-close kazen-solid-close pmd-kazen-action-close pmd-kazen-checkout-close-clean"
        style={{
          width: "3rem",
          height: "3rem",
          minWidth: "3rem",
          minHeight: "3rem",
          maxWidth: "3rem",
          maxHeight: "3rem",
          padding: 0,
          borderRadius: 0,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--pmd-kz-clean-close-bg)",
          color: "var(--pmd-kz-clean-close-color)",
          WebkitTextFillColor: "var(--pmd-kz-clean-close-color)",
          border: "1px solid var(--pmd-kz-clean-close-border)",
          boxShadow: "none",
          opacity: 1,
          filter: "none",
          transform: "none",
        }}
        aria-label="Close"
        onClick={onBack}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="lucide lucide-x h-5 w-5 pmd-kazen-back-icon"
          aria-hidden="true"
        >
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </div>
  )
}

function CheckoutActionsClean({ children, two }: any) {
  return (
    <div className={`pmd-kazen-actions pmd-kazen-checkout-actions-clean${two ? " pmd-kazen-actions-two" : ""}`}>
      {children}
    </div>
  )
}

function CheckoutActionButtonClean({ variant = "secondary", className = "", children, type = "button", ...rest }: any) {
  const cleanVariant = variant === "primary" ? "primary" : "secondary"

  // PMD_KAZEN_V25_CHECKOUT_NORMAL_STATE_INLINE_VARS_20260618
  // Normal state is controlled here so it is correct immediately, not only after hover.
  const baseStyle = {
    width: "100%",
    minHeight: "3rem",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: ".55rem",
    padding: ".82rem 1rem",
    borderRadius: 0,
    boxShadow: "none",
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: ".82rem",
    fontWeight: 850,
    letterSpacing: ".12em",
    lineHeight: 1.08,
    textTransform: "uppercase" as const,
    textAlign: "center" as const,
    opacity: 1,
    filter: "none",
    transform: "none",
    transition: "background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease",
  }

  const variantStyle =
    cleanVariant === "primary"
      ? {
          background: "var(--pmd-kz-clean-primary-bg)",
          color: "var(--pmd-kz-clean-primary-color)",
          WebkitTextFillColor: "var(--pmd-kz-clean-primary-color)",
          border: "1px solid var(--pmd-kz-clean-primary-border)",
        }
      : {
          background: "var(--pmd-kz-clean-secondary-bg)",
          color: "var(--pmd-kz-clean-secondary-color)",
          WebkitTextFillColor: "var(--pmd-kz-clean-secondary-color)",
          border: "1px solid var(--pmd-kz-clean-secondary-border)",
        }

  return (
    <button
      {...rest}
      type={type}
      data-pmd-kazen-button={cleanVariant}
      style={rest.style || undefined}
      className={[
        "pmd-kzui-btn-action pmd-kazen-checkout-action-button-clean",
        cleanVariant === "primary" ? "pmd-kzui-btn-primary pmd-kazen-checkout-action-primary-clean" : "pmd-kzui-btn-secondary pmd-kazen-checkout-action-secondary-clean",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  )
}


export function KazenJapaneseCheckoutShell(props: KazenJapaneseCheckoutShellProps) {
  // PMD_KAZEN_CHECKOUT_MATCH_WAITER_CARD_20260612
  const {
    checkoutStep,
    onClose,
    hasPersonalItems,
    personalItems = [],
    tableDraft,
    tableDraftItems = [],
    tableDraftTotal = 0,
    submittedSnapshot,
    submittedItems = [],
    estimatedMinutes = 15,
    subtotal = 0,
    finalTotal = 0,
    paymentBaseAmount = 0,
    paymentPayableTotal = 0,
    paymentTipAmount = 0,
    paymentCouponDiscount = 0,
    paymentTipPercentage,
    paymentCustomTip,
    tipPercentages = [5, 10],
    tipEnabled,
    couponCode,
    setCouponCode,
    appliedCoupon,
    couponError,
    couponLoading,
    onApplyCoupon,
    onRemoveCoupon,
    visiblePaymentMethods = [],
    loadingPayments,
    selectedPaymentMethod,
    onPaymentMethodSelect,
    renderPaymentForm,
    renderPaymentButton,
    handleConfirmMyItems,
    handleSubmitTableDraft,
    setCheckoutStep,
    startSplitFlow,
    chooseSplitMethod,
    goToSplitReview,
    canConfirmSplitMethod = true,
    splitGuestCount = 2,
    addSplitGuest,
    removeSplitGuest,
    splitMethod = "equal",
    splitGuestProfiles = [],
    equalSplitPeople = [],
    activeSplitPeople = [],
    selectedSplitPersonId,
    setSelectedSplitPersonId,
    selectedSplitPerson,
    splitSourceItems = [],
    itemAssignments = {},
    setItemAssignments,
    sharePercents = [],
    setSharePercents,
    sharePercentTotal = 0,
    splitGrandTotal = 0,
    updatePaymentTipPercentage,
    updatePaymentCustomTip,
    onPaymentLinks,
    onQrShare,
    isDarkTheme,
  } = props

  // PMD_KAZEN_V24B_RESOLVE_CHECKOUT_MODE_FROM_IFRAME_20260618
  const resolvedKazenCheckoutMode = (() => {
    if (isDarkTheme) return "dark"
    if (typeof window === "undefined") return "light"

    const isDarkValue = (value: any) => String(value || "").toLowerCase() === "dark"

    try {
      const params = new URLSearchParams(window.location.search)
      if (isDarkValue(params.get("mode"))) return "dark"
    } catch {}

    try {
      if (isDarkValue(window.localStorage.getItem("pmd-kazen-japanese-mode"))) return "dark"
    } catch {}

    try {
      if (
        isDarkValue(document.documentElement.getAttribute("data-pmd-kazen-mode")) ||
        isDarkValue(document.body?.getAttribute("data-pmd-kazen-mode"))
      ) {
        return "dark"
      }
    } catch {}

    try {
      const frames = Array.from(document.querySelectorAll("iframe"))
      for (const iframe of frames) {
        try {
          const doc = (iframe as HTMLIFrameElement).contentDocument
          const href = (iframe as HTMLIFrameElement).contentWindow?.location?.href || ""
          if (!doc) continue

          const looksLikeKazen =
            href.includes("/themes/kazen-japanese") ||
            Boolean(doc.querySelector(".kazen-page, .kazen-shell"))

          if (!looksLikeKazen) continue

          if (
            isDarkValue(doc.documentElement.getAttribute("data-pmd-kazen-mode")) ||
            isDarkValue(doc.body?.getAttribute("data-pmd-kazen-mode"))
          ) {
            return "dark"
          }
        } catch {}
      }
    } catch {}

    return "light"
  })()

  const orderTotal = Number(submittedSnapshot?.remainingAmount ?? submittedSnapshot?.orderTotal ?? submittedSnapshot?.total ?? tableDraftTotal ?? finalTotal ?? 0)
  const firstNonEmptyItems = (...groups: any[]) => {
    for (const group of groups) {
      if (Array.isArray(group) && group.length > 0) return group
    }
    return []
  }
  const submittedDisplayItems = firstNonEmptyItems(
    submittedItems,
    submittedSnapshot?.submittedItems,
    submittedSnapshot?.items,
    submittedSnapshot?.orderItems,
    tableDraftItems,
    personalItems,
  )
  const splitDisplayItems = firstNonEmptyItems(splitSourceItems, submittedDisplayItems, tableDraftItems, personalItems)
  const people = Array.isArray(splitGuestProfiles) ? splitGuestProfiles : []
  const equalPeople = Array.isArray(equalSplitPeople) ? equalSplitPeople : []
  const reviewPeople = Array.isArray(activeSplitPeople) ? activeSplitPeople : []
  const paymentHeader = selectedSplitPerson ? `${selectedSplitPerson.name}'s share` : "Order total"

  const goBack = () => {
    if (checkoutStep === "payment") {
      setCheckoutStep?.(selectedSplitPerson ? "split-review" : "submitted")
      return
    }
    if (checkoutStep === "split-review") {
      setCheckoutStep?.("split")
      return
    }
    if (checkoutStep === "split-items" || checkoutStep === "split-shares") {
      setCheckoutStep?.("split")
      return
    }
    if (checkoutStep === "split") {
      setCheckoutStep?.("submitted")
      return
    }
    onClose?.()
  }


    // PMD_KAZEN_V12_NO_RUNTIME_STYLE_GUARDS_20260618: checkout styling is now static CSS only to prevent flicker.




    // PMD_KAZEN_V12_NO_RUNTIME_STYLE_GUARDS_20260618: checkout styling is now static CSS only to prevent flicker.




    // PMD_KAZEN_V12_NO_RUNTIME_STYLE_GUARDS_20260618: checkout styling is now static CSS only to prevent flicker.


  let title = "Checkout"
  let eyebrow: string | undefined = undefined
  let content: React.ReactNode = null

  if (checkoutStep === "review" && hasPersonalItems) {
    title = "My order"
    content = (
      <>
        <ItemRows items={personalItems} />
        <div className="pmd-kazen-total-plain">
          {Math.abs(Number(subtotal || 0) - Number(finalTotal || 0)) > 0.01 ? <Line label="Subtotal" value={subtotal} /> : null}
          <Line label="Total" value={finalTotal} strong />
        </div>
        <CheckoutActionsClean two>
          <CheckoutActionButtonClean variant="secondary" onClick={onClose}>Continue ordering</CheckoutActionButtonClean>
          <CheckoutActionButtonClean variant="primary" onClick={handleConfirmMyItems}>Confirm</CheckoutActionButtonClean>
        </CheckoutActionsClean>
      </>
    )
  } else if (checkoutStep === "review" && tableDraft) {
    title = "Table order"
    content = (
      <>
        <ItemRows items={tableDraftItems} />
        <div className="pmd-kazen-total-plain">
          <Line label="Order total" value={tableDraftTotal} strong />
        </div>
        <CheckoutActionsClean two>
          <CheckoutActionButtonClean variant="secondary" onClick={onClose}>Continue ordering</CheckoutActionButtonClean>
          <CheckoutActionButtonClean variant="primary" onClick={handleSubmitTableDraft}>Send to kitchen</CheckoutActionButtonClean>
        </CheckoutActionsClean>
      </>
    )
  } else if (checkoutStep === "submitted") {
    title = "Order status"
    eyebrow = `${estimatedMinutes} min`
    content = (
      <>
        <div className="pmd-kazen-status-copy">
          <span className="pmd-kazen-status-icon"><Check className="h-5 w-5" /></span>
          <p>We received your order.</p>
        </div>
        <div className="pmd-kazen-total-plain pmd-kazen-order-total-plain" data-pmd-kazen-plain-total="1">
          <Line label="Order total" value={orderTotal} strong />
        </div>
        <div className="pmd-kazen-summary-plain" data-pmd-kazen-plain-summary="1">
          <h3 className="pmd-kazen-section-title">Order Summary</h3>
          <ItemRows items={submittedDisplayItems} />
        </div>
        <CheckoutActionsClean>
          <CheckoutActionButtonClean variant="primary" onClick={() => setCheckoutStep?.("payment")}>Pay in full</CheckoutActionButtonClean>
          <CheckoutActionButtonClean onClick={() => startSplitFlow?.("equal")}><Users className="h-4 w-4" /> Split bill</CheckoutActionButtonClean>
          <CheckoutActionButtonClean onClick={onClose}>Continue ordering</CheckoutActionButtonClean>
        </CheckoutActionsClean>
      </>
    )
  } else if (checkoutStep === "payment") {
    title = "Payment"
    eyebrow = "Ready to pay"
    content = (
      <>
        <section className="pmd-kazen-payment-hero" data-pmd-kazen-payment-plain="1">
          <div className="pmd-kazen-payment-intro">
            <span><CreditCard className="h-5 w-5" /></span>
            <div>
              <strong>{paymentHeader}</strong>
              <p>{money(paymentPayableTotal)}</p>
            </div>
          </div>
        </section>
        <section className="pmd-kazen-payment-totals-plain" data-pmd-kazen-payment-plain="1">
          <Line label={selectedSplitPerson ? "Share amount" : "Items total"} value={paymentBaseAmount} />
          {paymentTipAmount > 0 && <Line label="Tip" value={paymentTipAmount} />}
          {paymentCouponDiscount > 0 && <div className="pmd-kazen-line pmd-kazen-discount"><span>Coupon</span><strong>-{money(paymentCouponDiscount)}</strong></div>}
          <Line label="Payable total" value={paymentPayableTotal} strong />
        </section>
        {tipEnabled && (
          <section className="pmd-kazen-payment-section pmd-kazen-tip-section" data-pmd-kazen-payment-section="tip">
            <h3 className="pmd-kazen-section-title">Add tip</h3>
            <div className="pmd-kazen-tip-grid">
              {[0, ...tipPercentages.filter((percentage: number) => Number(percentage) !== 0)].map((percentage: number) => (
                <button
                  key={percentage}
                  type="button"
                  onClick={() => updatePaymentTipPercentage?.(percentage)}
                  className={paymentTipPercentage === percentage && !paymentCustomTip ? "pmd-kazen-waiter-secondary pmd-kazen-choice-active" : "kazen-secondary"}
                >
                  {percentage}%
                </button>
              ))}
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentCustomTip ?? ""}
                onChange={(event) => updatePaymentCustomTip?.(event.target.value)}
                placeholder="Custom"
                className="kazen-field"
              />
            </div>
          </section>
        )}
        <section className="pmd-kazen-payment-section pmd-kazen-coupon-section" data-pmd-kazen-payment-section="coupon">
          {!appliedCoupon || selectedSplitPerson ? (
            <div className="pmd-kazen-coupon-row">
              <input
                type="text"
                value={couponCode || ""}
                onChange={(event) => setCouponCode?.(event.target.value.toUpperCase())}
                placeholder="Coupon code"
                disabled={couponLoading}
                className="kazen-field"
              />
              <button type="button" disabled={couponLoading || !String(couponCode || "").trim()} onClick={onApplyCoupon} className="pmd-kazen-waiter-secondary pmd-kazen-apply">
                {couponLoading ? "Checking" : "Apply"}
              </button>
            </div>
          ) : (
            <div className="pmd-kazen-applied-coupon">
              <span>{appliedCoupon.name || "Coupon"} {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
              <button type="button" onClick={onRemoveCoupon} className="pmd-kazen-waiter-secondary">Remove</button>
            </div>
          )}
          {couponError && <p className="pmd-kazen-error">{couponError}</p>}
        </section>
        <PaymentMethods
          loadingPayments={loadingPayments}
          visiblePaymentMethods={visiblePaymentMethods}
          selectedPaymentMethod={selectedPaymentMethod}
          onPaymentMethodSelect={onPaymentMethodSelect}
          isDarkTheme={resolvedKazenCheckoutMode === "dark" || Boolean(isDarkTheme)}
        />
        {canRenderPaymentMethodDetail(selectedPaymentMethod) && (
          <section className="pmd-kazen-payment-section pmd-kazen-payment-detail" data-pmd-kazen-payment-section="detail">
            {renderPaymentForm?.()}
          </section>
        )}
        <div className="pmd-kazen-payment-action">
          {renderPaymentButton?.()}
        </div>
      </>
    )
  } else if (checkoutStep === "split" || checkoutStep === "split-items" || checkoutStep === "split-shares") {
    title = checkoutStep === "split-items" ? "Assign items" : checkoutStep === "split-shares" ? "Set shares" : "Split bill"
    eyebrow = `Share ${money(splitGrandTotal)}`
    content = (
      <>
        <SplitTabs splitMethod={splitMethod} chooseSplitMethod={chooseSplitMethod} />
        <PeopleControls splitGuestCount={splitGuestCount} addSplitGuest={addSplitGuest} removeSplitGuest={removeSplitGuest} />
        <GuestChips guests={people} />
        {splitMethod === "equal" && (
          <div className="pmd-kazen-list">
            {equalPeople.map((person: SplitPerson, index: number) => (
              <div className="pmd-kazen-cart-line" key={person.id || index}>
                <span>{person.name}</span>
                <strong>{money(person.total)}</strong>
              </div>
            ))}
          </div>
        )}
        {splitMethod === "items" && (
          <Card>
            <p className="pmd-kazen-muted">Tap an item to assign it to guests.</p>
            <div className="pmd-kazen-list">
              {(splitDisplayItems || []).map((item: any, index: number) => {
                const assignedIndex = itemAssignments?.[item.key]
                const guestName = assignedIndex === undefined || assignedIndex === null ? "Unassigned" : (people[assignedIndex]?.name || `Guest ${Number(assignedIndex) + 1}`)
                return (
                  <button
                    key={item.key || index}
                    type="button"
                    className="pmd-kzui-btn-list pmd-kazen-assign-row"
                    onClick={() => setItemAssignments?.((prev: Record<string, number | null | undefined>) => {
                      const current = prev?.[item.key]
                      const next = current === undefined || current === null ? 0 : current >= splitGuestCount - 1 ? null : Number(current) + 1
                      return { ...(prev || {}), [item.key]: next }
                    })}
                  >
                    <span>{item.name}</span>
                    <strong>{money(item.amount)}</strong>
                    <em>{guestName}</em>
                  </button>
                )
              })}
            </div>
          </Card>
        )}
        {splitMethod === "shares" && (
          <Card>
            <div className={sharePercentTotal === 100 ? "pmd-kazen-share-total" : "pmd-kazen-share-total pmd-kazen-share-total-bad"}>
              {sharePercentTotal === 100 ? "100% ready" : sharePercentTotal < 100 ? `${100 - sharePercentTotal}% remaining` : `Over by ${sharePercentTotal - 100}%`}
            </div>
            <div className="pmd-kazen-list">
              {(sharePercents || []).slice(0, splitGuestCount).map((percent: number, index: number) => (
                <div className="pmd-kazen-share-row" key={index}>
                  <span>{people[index]?.name || `Guest ${index + 1}`}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(Number(percent || 0))}
                    onChange={(event) => {
                      const nextPercent = Math.max(0, Math.min(100, Number(event.target.value || 0)))
                      setSharePercents?.((prev: number[]) => (prev || []).map((value, valueIndex) => valueIndex === index ? nextPercent : value))
                    }}
                    className="kazen-field pmd-kazen-share-input"
                  />
                  <strong>%</strong>
                </div>
              ))}
            </div>
          </Card>
        )}
        <CheckoutActionButtonClean variant="primary" disabled={!canConfirmSplitMethod} onClick={goToSplitReview}>Review split</CheckoutActionButtonClean>
      </>
    )
  } else if (checkoutStep === "split-review") {
    title = "Review split"
    eyebrow = "Choose payer"
    content = (
      <>
        <div className="pmd-kazen-list">
          {reviewPeople.map((person: SplitPerson) => {
            const selected = selectedSplitPersonId === person.id
            return (
              <Card key={person.id} className={selected ? "pmd-kazen-person-selected" : ""}>
                <div className="pmd-kazen-person-head">
                  <span><b>{person.avatar || person.name?.slice(0, 1)}</b>{person.name}</span>
                  <em>{person.status || "Pending"}</em>
                </div>
                <Line label="Total" value={Number(person.total || 0)} strong />
                {selected ? (
                  <CheckoutActionButtonClean variant="primary" onClick={() => setCheckoutStep?.("payment")}>Pay my share</CheckoutActionButtonClean>
                ) : (
                  <CheckoutActionButtonClean onClick={() => setSelectedSplitPersonId?.(person.id)}>Select payer</CheckoutActionButtonClean>
                )}
              </Card>
            )
          })}
        </div>
        <CheckoutActionsClean two>
          <CheckoutActionButtonClean onClick={onPaymentLinks}><Link2 className="h-4 w-4" /> Link</CheckoutActionButtonClean>
          <CheckoutActionButtonClean onClick={onQrShare}><QrCode className="h-4 w-4" /> QR</CheckoutActionButtonClean>
        </CheckoutActionsClean>
      </>
    )
  }

  return (
    <div data-pmd-checkout-theme-root="1" data-pmd-checkout-theme="kazen_japanese" data-pmd-kazen-checkout-shell="1" data-pmd-kazen-checkout-mode={resolvedKazenCheckoutMode} className="kazen-solid-modal-overlay pmd-kazen-checkout-waiter" role="dialog" aria-modal="true">
      <div className="kazen-solid-modal-panel pmd-kazen-checkout-panel" data-kazen-solid-panel="1">
        <div className="kazen-solid-modal-sheet" aria-hidden="true" />
        <div className="kazen-solid-modal-content pmd-kazen-checkout-content">
          <CheckoutModalHeadClean title={title} eyebrow={eyebrow} onBack={goBack} />
          <div key={checkoutStep} className="pmd-kazen-checkout-body" data-pmd-kazen-step={checkoutStep}>
            {content}
          </div>
        </div>
      </div>
      <style>{`
        html body .pmd-kazen-checkout-waiter {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999999 !important;
          display: grid !important;
          place-items: center !important;
          padding: 1rem !important;
          background: rgba(36, 32, 28, .42) !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          filter: none !important;
          opacity: 1 !important;
          isolation: isolate !important;
        }

        html body .pmd-kazen-checkout-waiter,
        html body .pmd-kazen-checkout-waiter * {
          box-sizing: border-box !important;
          text-shadow: none !important;
        }

        html body .pmd-kazen-checkout-panel {
          position: relative !important;
          z-index: 1 !important;
          width: min(100%, 430px) !important;
          max-height: min(88dvh, 740px) !important;
          overflow: auto !important;
          padding: 1.15rem !important;
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          background-image: none !important;
          border: 1px solid rgba(35, 34, 31, .24) !important;
          box-shadow: 0 28px 78px rgba(36, 30, 24, .34) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          mix-blend-mode: normal !important;
          isolation: isolate !important;
          transform: translateZ(0) !important;
          border-radius: 0 !important;
        }

        html body .pmd-kazen-checkout-panel .kazen-solid-modal-sheet {
          position: absolute !important;
          inset: 0 !important;
          z-index: 0 !important;
          display: block !important;
          background: #fbf8f2 !important;
          background-color: #fbf8f2 !important;
          background-image:
            radial-gradient(circle at 92% 0%, rgba(184,93,89,.035), transparent 30%),
            linear-gradient(180deg, #fbf8f2 0%, #f7f3ec 100%) !important;
          opacity: 1 !important;
          pointer-events: none !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          mix-blend-mode: normal !important;
        }

        html body .pmd-kazen-checkout-content {
          position: relative !important;
          z-index: 2 !important;
          background: transparent !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
          filter: none !important;
          backdrop-filter: none !important;
          -webkit-backdrop-filter: none !important;
          mix-blend-mode: normal !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-solid-modal-head {
          position: relative !important;
          z-index: 3 !important;
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 1rem !important;
          padding-bottom: 1rem !important;
          margin-bottom: 1rem !important;
          border-bottom: 1px solid rgba(35,34,31,.14) !important;
          background: transparent !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-solid-modal-head h2 {
          margin: 0 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 1.32rem !important;
          line-height: 1.12 !important;
          letter-spacing: .18em !important;
          text-transform: uppercase !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-solid-eyebrow {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          font-size: .62rem !important;
          letter-spacing: .22em !important;
          text-transform: uppercase !important;
          margin-bottom: .4rem !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-solid-close {
          width: 2.5rem !important;
          height: 2.5rem !important;
          min-width: 2.5rem !important;
          min-height: 2.5rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #f7f3ec !important;
          background-color: #f7f3ec !important;
          border: 1px solid rgba(35,34,31,.24) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
          filter: none !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-solid-close svg,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close path,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close line {
          color: #242320 !important;
          stroke: #242320 !important;
          fill: none !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-body {
          display: grid !important;
          gap: 1rem !important;
        }

        html body .pmd-kazen-checkout-card {
          position: relative !important;
          z-index: 2 !important;
          border: 1px solid rgba(35,34,31,.14) !important;
          background: rgba(255,255,255,.24) !important;
          border-radius: 0 !important;
          padding: .9rem !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-list {
          display: grid !important;
          gap: .75rem !important;
        }

        html body .pmd-kazen-cart-line {
          display: grid !important;
          grid-template-columns: 1fr auto !important;
          align-items: center !important;
          gap: .75rem !important;
          border: 1px solid rgba(35,34,31,.14) !important;
          background: rgba(255,255,255,.18) !important;
          padding: .78rem .9rem !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .pmd-kazen-cart-line span,
        html body .pmd-kazen-cart-line strong,
        html body .pmd-kazen-line span,
        html body .pmd-kazen-line strong {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-cart-line span {
          font-weight: 650 !important;
        }

        html body .pmd-kazen-cart-line strong {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          white-space: nowrap !important;
        }

        html body .pmd-kazen-line {
          display: flex !important;
          justify-content: space-between !important;
          align-items: center !important;
          gap: 1rem !important;
          padding: .32rem 0 !important;
          color: #6b655c !important;
        }

        html body .pmd-kazen-line span,
        html body .pmd-kazen-line strong {
          font-weight: 600 !important;
        }

        html body .pmd-kazen-line:not(.pmd-kazen-line-strong) span,
        html body .pmd-kazen-line:not(.pmd-kazen-line-strong) strong {
          color: #6b655c !important;
          -webkit-text-fill-color: #6b655c !important;
        }

        html body .pmd-kazen-line-strong span,
        html body .pmd-kazen-line-strong strong {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-weight: 760 !important;
        }

        html body .pmd-kazen-actions {
          display: grid !important;
          gap: .75rem !important;
        }

        html body .pmd-kazen-actions-two {
          grid-template-columns: 1fr 1fr !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-primary,
        html body .pmd-kazen-checkout-waiter .kazen-secondary,
        html body .pmd-kazen-payment-action button,
        html body .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          width: 100% !important;
          min-height: 3.45rem !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          font-family: Georgia, "Times New Roman", serif !important;
          text-transform: uppercase !important;
          line-height: 1.1 !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-primary,
        html body .pmd-kazen-payment-action button,
        html body .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          border: 1px solid rgba(184,93,89,.42) !important;
          background: rgba(184,93,89,.08) !important;
          background-color: rgba(184,93,89,.08) !important;
          background-image: none !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          letter-spacing: .22em !important;
          font-weight: 700 !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-secondary {
          border: 1px solid rgba(35,34,31,.16) !important;
          background: rgba(255,255,255,.24) !important;
          background-color: rgba(255,255,255,.24) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          letter-spacing: .18em !important;
          font-weight: 650 !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-primary *,
        html body .pmd-kazen-checkout-waiter .kazen-secondary *,
        html body .pmd-kazen-payment-action button *,
        html body .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] * {
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
          stroke: currentColor !important;
        }

        html body .pmd-kazen-section-title {
          margin: 0 0 .75rem !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 1.02rem !important;
          letter-spacing: .14em !important;
          text-transform: uppercase !important;
        }

        html body .pmd-kazen-muted,
        html body .pmd-kazen-status-copy p {
          color: #6b655c !important;
          -webkit-text-fill-color: #6b655c !important;
          margin: 0 !important;
        }

        html body .pmd-kazen-status-copy {
          display: grid !important;
          grid-template-columns: 2.5rem 1fr !important;
          gap: .85rem !important;
          align-items: center !important;
        }

        html body .pmd-kazen-status-icon,
        html body .pmd-kazen-payment-intro > span {
          width: 2.5rem !important;
          height: 2.5rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid rgba(184,93,89,.38) !important;
          background: rgba(184,93,89,.08) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          border-radius: 0 !important;
        }

        html body .pmd-kazen-status-icon svg,
        html body .pmd-kazen-payment-intro svg {
          stroke: #b85d59 !important;
        }

        html body .pmd-kazen-payment-intro {
          display: grid !important;
          grid-template-columns: 2.5rem 1fr !important;
          gap: .85rem !important;
          align-items: center !important;
        }

        html body .pmd-kazen-payment-intro strong,
        html body .pmd-kazen-payment-intro p {
          margin: 0 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .pmd-kazen-tip-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .65rem !important;
        }

        html body .pmd-kazen-tip-grid .kazen-field {
          grid-column: 1 / -1 !important;
        }

        html body .pmd-kazen-coupon-row {
          display: grid !important;
          grid-template-columns: 1fr auto !important;
          gap: .65rem !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-field,
        html body .pmd-kazen-checkout-waiter input:not(.__PrivateStripeElement-input),
        html body .pmd-kazen-checkout-waiter textarea,
        html body .pmd-kazen-checkout-waiter select,
        html body .pmd-kazen-checkout-waiter .StripeElement {
          border-radius: 0 !important;
          width: 100% !important;
          border: 1px solid rgba(35,34,31,.16) !important;
          background: rgba(255,255,255,.30) !important;
          padding: .82rem .9rem !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          outline: none !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter input::placeholder,
        html body .pmd-kazen-checkout-waiter textarea::placeholder {
          color: rgba(36,35,32,.42) !important;
          -webkit-text-fill-color: rgba(36,35,32,.42) !important;
          opacity: 1 !important;
        }

        html body .pmd-kzui-btn-tile pmd-kazen-method-grid,
        html body .pmd-kazen-tabs {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .65rem !important;
        }

        html body .pmd-kzui-btn-tile pmd-kazen-method,
        html body .pmd-kazen-tab {
          min-height: 4rem !important;
          display: grid !important;
          place-items: center !important;
          border: 1px solid rgba(35,34,31,.16) !important;
          background: rgba(255,255,255,.24) !important;
          border-radius: 0 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .pmd-kzui-btn-tile pmd-kazen-method-active,
        html body .pmd-kazen-tab-active,
        html body .pmd-kazen-choice-active {
          border-color: rgba(184,93,89,.42) !important;
          background: rgba(184,93,89,.08) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .pmd-kazen-qty.kazen-qty {
          display: grid !important;
          grid-template-columns: 2.8rem 1fr 2.8rem !important;
          align-items: center !important;
          border: 1px solid rgba(35,34,31,.14) !important;
          background: #fbf8f2 !important;
          margin: 0 !important;
        }

        html body .pmd-kazen-qty button {
          height: 2.8rem !important;
          display: grid !important;
          place-items: center !important;
          color: #242320 !important;
        }

        html body .pmd-kazen-qty strong {
          text-align: center !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .pmd-kazen-chip-row {
          display: flex !important;
          gap: .5rem !important;
          overflow-x: auto !important;
        }

        html body .pmd-kazen-chip,
        html body .pmd-kazen-person-head,
        html body .pmd-kzui-btn-list pmd-kazen-assign-row,
        html body .pmd-kazen-share-row,
        html body .pmd-kazen-share-total {
          border: 1px solid rgba(35,34,31,.14) !important;
          background: rgba(255,255,255,.24) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          padding: .65rem .75rem !important;
          border-radius: 0 !important;
        }

        html body .pmd-kazen-chip {
          display: inline-flex !important;
          gap: .4rem !important;
          white-space: nowrap !important;
        }

        html body .pmd-kazen-person-head {
          display: flex !important;
          justify-content: space-between !important;
          gap: .75rem !important;
          margin-bottom: .75rem !important;
        }

        html body .pmd-kazen-person-head em,
        html body .pmd-kazen-discount strong,
        html body .pmd-kazen-error {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .pmd-kazen-person-selected {
          border-color: rgba(184,93,89,.42) !important;
          background: rgba(184,93,89,.04) !important;
        }

        html body .pmd-kzui-btn-list pmd-kazen-assign-row {
          display: grid !important;
          grid-template-columns: 1fr auto !important;
          gap: .25rem .75rem !important;
          text-align: left !important;
          width: 100% !important;
        }

        html body .pmd-kzui-btn-list pmd-kazen-assign-row em {
          grid-column: 1 / -1 !important;
          color: #b85d59 !important;
          font-style: normal !important;
        }

        html body .pmd-kazen-share-row {
          display: grid !important;
          grid-template-columns: 1fr 5rem auto !important;
          align-items: center !important;
          gap: .5rem !important;
        }

        html body .pmd-kazen-share-total-bad {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .pmd-kazen-payment-action button,
        html body .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          min-height: 3.45rem !important;
        }

        @media (max-width: 560px) {
          html body .pmd-kazen-checkout-waiter {
            padding: .85rem !important;
          }

          html body .pmd-kazen-checkout-panel {
            width: min(100%, 410px) !important;
            padding: 1rem !important;
          }

          html body .pmd-kazen-actions-two,
          html body .pmd-kazen-coupon-row {
            grid-template-columns: 1fr !important;
          }

          html body .pmd-kzui-btn-tile pmd-kazen-method-grid,
          html body .pmd-kazen-tabs {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }


        /* PMD_KAZEN_UNIQUE_WAITER_BUTTONS_20260612
           Real checkout buttons now use unique classes to avoid old global green/pill styles.
        */

        html body .pmd-kazen-checkout-waiter button.pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-primary {
          width: 100% !important;
          min-height: 3.6rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          padding: .9rem 1rem !important;
          border-radius: 0 !important;
          border: 1px solid rgba(184, 93, 89, .42) !important;
          background: rgba(184, 93, 89, .08) !important;
          background-color: rgba(184, 93, 89, .08) !important;
          background-image: none !important;
          box-shadow: none !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: .86rem !important;
          font-weight: 760 !important;
          letter-spacing: .22em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          text-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-secondary {
          width: 100% !important;
          min-height: 3.6rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          padding: .9rem 1rem !important;
          border-radius: 0 !important;
          border: 1px solid rgba(35, 34, 31, .16) !important;
          background: rgba(255, 255, 255, .24) !important;
          background-color: rgba(255, 255, 255, .24) !important;
          background-image: none !important;
          box-shadow: none !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: .84rem !important;
          font-weight: 700 !important;
          letter-spacing: .18em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          text-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-primary *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-secondary *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-primary svg,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-secondary svg,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-primary svg *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-secondary svg * {
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kazen-waiter-primary:disabled,
        html body .pmd-kazen-checkout-waiter button.pmd-kazen-waiter-secondary:disabled {
          opacity: .45 !important;
          cursor: not-allowed !important;
        }

        /* Split tabs / tip choices / apply button must also use waiter-card frame */
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-apply,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-choice-active {
          border-radius: 0 !important;
          box-shadow: none !important;
          background-image: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab-active,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-choice-active {
          border-color: rgba(184, 93, 89, .42) !important;
          background: rgba(184, 93, 89, .08) !important;
          background-color: rgba(184, 93, 89, .08) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        /* Payment provider button from shared payment renderer */
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          width: 100% !important;
          min-height: 3.6rem !important;
          border-radius: 0 !important;
          border: 1px solid rgba(184, 93, 89, .42) !important;
          background: rgba(184, 93, 89, .08) !important;
          background-color: rgba(184, 93, 89, .08) !important;
          background-image: none !important;
          box-shadow: none !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-weight: 760 !important;
          letter-spacing: .20em !important;
          text-transform: uppercase !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] * {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          stroke: #b85d59 !important;
        }

        /* Back button / icon: waiter-card style, correct visible arrow */
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back {
          width: 2.65rem !important;
          height: 2.65rem !important;
          min-width: 2.65rem !important;
          min-height: 2.65rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          border-radius: 0 !important;
          border: 1px solid rgba(35, 34, 31, .22) !important;
          background: rgba(255, 255, 255, .28) !important;
          background-color: rgba(255, 255, 255, .28) !important;
          background-image: none !important;
          box-shadow: none !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-back-icon,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-back-icon *,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg * {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          stroke: #242320 !important;
          fill: none !important;
          opacity: 1 !important;
        }

        /* Kill old pill styles if some old class still sneaks in */
        html body .pmd-kazen-checkout-waiter .kazen-primary,
        html body .pmd-kazen-checkout-waiter .kazen-button-primary,
        html body .pmd-kazen-checkout-waiter .kazen-btn-primary {
          border-radius: 0 !important;
          background: rgba(184, 93, 89, .08) !important;
          background-color: rgba(184, 93, 89, .08) !important;
          border: 1px solid rgba(184, 93, 89, .42) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-secondary,
        html body .pmd-kazen-checkout-waiter .kazen-button-secondary,
        html body .pmd-kazen-checkout-waiter .kazen-btn-secondary {
          border-radius: 0 !important;
          background: rgba(255,255,255,.24) !important;
          background-color: rgba(255,255,255,.24) !important;
          border: 1px solid rgba(35,34,31,.16) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          box-shadow: none !important;
        }



        /* PMD_KAZEN_CHECKOUT_MODE_SAFE_DARK_REDESIGN_20260613
           Dark mode only. Light mode stays exactly like the original safe checkout. */

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] {
          background: rgba(0, 0, 0, .74) !important;
          backdrop-filter: blur(10px) !important;
          -webkit-backdrop-filter: blur(10px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] *:focus,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] *:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-panel {
          width: min(100%, 520px) !important;
          max-height: min(90dvh, 780px) !important;
          padding: 1.35rem !important;
          overflow: auto !important;
          background:
            radial-gradient(circle at 88% 0%, rgba(90, 29, 22, .18), transparent 30%),
            linear-gradient(180deg, #17120d 0%, #090705 100%) !important;
          background-color: #090705 !important;
          border: 1px solid rgba(198, 164, 93, .52) !important;
          box-shadow:
            0 34px 90px rgba(0,0,0,.82),
            inset 0 1px 0 rgba(255,238,196,.08) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: initial !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-solid-modal-sheet {
          background: transparent !important;
          background-image: none !important;
          border: 1px solid rgba(198,164,93,.22) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-content,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-head,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-body {
          background: transparent !important;
          color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-head {
          border-bottom-color: rgba(198,164,93,.30) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-head h2 {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-solid-eyebrow,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-section-title {
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-card {
          background:
            linear-gradient(180deg, rgba(12, 9, 6, .72), rgba(5, 4, 3, .72)) !important;
          border: 1px solid rgba(198,164,93,.30) !important;
          padding: 1rem !important;
          box-shadow: inset 0 1px 0 rgba(255,238,196,.05) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-cart-line,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-intro,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-line,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-status-copy {
          background: rgba(0,0,0,.28) !important;
          border-color: rgba(198,164,93,.26) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] h1,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] h2,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] h3,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] p,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] span,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] strong,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] label,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] em {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-muted,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-line:not(.pmd-kazen-line-strong) span,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-line:not(.pmd-kazen-line-strong) strong {
          color: rgba(246,232,200,.58) !important;
          -webkit-text-fill-color: rgba(246,232,200,.58) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-cart-line strong,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-discount strong {
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back {
          background: rgba(8, 6, 4, .92) !important;
          border: 1px solid rgba(198,164,93,.46) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg * {
          stroke: #f6e8c8 !important;
          color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action button,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          background: rgba(62, 19, 15, .78) !important;
          border: 1px solid rgba(223,104,93,.62) !important;
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tab,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-apply {
          background: rgba(12, 9, 6, .86) !important;
          border: 1px solid rgba(198,164,93,.36) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-choice-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tab-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] [data-pmd-selected="1"] {
          background: rgba(62, 19, 15, .72) !important;
          border-color: rgba(223,104,93,.64) !important;
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button:disabled,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[disabled] {
          opacity: .54 !important;
          background: rgba(8, 6, 4, .52) !important;
          color: rgba(246,232,200,.42) !important;
          -webkit-text-fill-color: rgba(246,232,200,.42) !important;
          border-color: rgba(198,164,93,.20) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] input,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] textarea,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] select,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-field,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .StripeElement,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] [class*="StripeElement"] {
          background: rgba(4, 3, 2, .88) !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          caret-color: #df685d !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] input::placeholder,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] textarea::placeholder {
          color: rgba(246,232,200,.52) !important;
          -webkit-text-fill-color: rgba(246,232,200,.52) !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile {
          background: rgba(28, 14, 10, .64) !important;
          border-color: rgba(223,104,93,.40) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile[aria-label="Apple Pay"] img,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile[aria-label="Wero"] img,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile[aria-label="Cash"] img {
          filter: invert(1) sepia(.18) saturate(.55) brightness(1.16) !important;
          opacity: .94 !important;
        }



        /* PMD_POLISH_KAZEN_CHECKOUT_REMOVE_NESTED_FRAMES_20260613
           Dark mode only: remove section/card frames.
           Keep frames only on real fields, item rows, total rows and buttons. */

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-body {
          gap: 1.25rem !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-card {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          border: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-section-title {
          margin: .15rem 0 .7rem !important;
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-list {
          gap: .75rem !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-cart-line,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-intro,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-line-strong {
          background:
            linear-gradient(180deg, rgba(4, 3, 2, .90), rgba(0, 0, 0, .78)) !important;
          border: 1px solid rgba(198,164,93,.34) !important;
          padding: .9rem 1rem !important;
          box-shadow: inset 0 1px 0 rgba(255,238,196,.04) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-line:not(.pmd-kazen-line-strong) {
          background: transparent !important;
          border: 0 !important;
          padding: .15rem 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-status-copy {
          background: transparent !important;
          border: 0 !important;
          padding: .2rem 0 .3rem !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-status-icon,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-intro > span {
          background: rgba(62, 19, 15, .42) !important;
          border: 1px solid rgba(223,104,93,.50) !important;
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tip-grid,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-coupon-row,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method-grid {
          background: transparent !important;
          border: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-field,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] input:not(.__PrivateStripeElement-input),
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] textarea,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] select,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .StripeElement,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] [class*="StripeElement"] {
          background: rgba(3, 2, 1, .92) !important;
          border: 1px solid rgba(198,164,93,.38) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          box-shadow: inset 0 1px 0 rgba(255,238,196,.04) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action button,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary {
          background:
            linear-gradient(180deg, rgba(12, 9, 6, .86), rgba(5, 4, 3, .86)) !important;
          border: 1px solid rgba(198,164,93,.36) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action button,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          background:
            linear-gradient(180deg, rgba(61, 18, 14, .78), rgba(25, 8, 6, .86)) !important;
          border: 1px solid rgba(223,104,93,.62) !important;
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button:disabled,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[disabled] {
          opacity: .42 !important;
          background: rgba(6, 5, 4, .58) !important;
          border-color: rgba(198,164,93,.18) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method {
          background:
            linear-gradient(180deg, rgba(31, 15, 11, .72), rgba(11, 7, 5, .86)) !important;
          border: 1px solid rgba(223,104,93,.40) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-panel {
          padding: 1.45rem !important;
        }



        /* PMD_FIX_KAZEN_CHECKOUT_GROUP_ITEMS_ONE_FRAME_20260613
           Light + dark: all order items are grouped in one single frame.
           Individual food rows only have separators, not separate frames. */

        html body .pmd-kazen-checkout-waiter .pmd-kazen-items-frame {
          border: 1px solid rgba(35,34,31,.16) !important;
          background: rgba(255,255,255,.22) !important;
          padding: .9rem 1rem !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-items-frame .pmd-kazen-items-list {
          gap: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-items-frame .pmd-kazen-cart-line {
          border: 0 !important;
          border-bottom: 1px solid rgba(35,34,31,.12) !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          padding: .78rem 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-items-frame .pmd-kazen-cart-line:first-child {
          padding-top: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-items-frame .pmd-kazen-cart-line:last-child {
          border-bottom: 0 !important;
          padding-bottom: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-total-plain {
          display: grid !important;
          gap: .25rem !important;
          padding: .15rem .15rem .4rem !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-total-plain .pmd-kazen-line,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-total-plain .pmd-kazen-line-strong {
          border: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          padding: .15rem 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-items-frame {
          border: 1px solid rgba(198,164,93,.34) !important;
          background:
            linear-gradient(180deg, rgba(4,3,2,.90), rgba(0,0,0,.74)) !important;
          padding: .95rem 1.05rem !important;
          box-shadow: inset 0 1px 0 rgba(255,238,196,.04) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-items-frame .pmd-kazen-cart-line {
          border: 0 !important;
          border-bottom: 1px solid rgba(198,164,93,.18) !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          padding: .82rem 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-items-frame .pmd-kazen-cart-line:last-child {
          border-bottom: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-total-plain,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-total-plain .pmd-kazen-line,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-total-plain .pmd-kazen-line-strong {
          border: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
        }



        /* PMD_POLISH_KAZEN_DARK_SECONDARY_TEXT_WHITE_20260613
           Dark checkout only: keep secondary/disabled action labels readable in white/cream. */

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tip-grid button,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-apply,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button.pmd-kazen-waiter-secondary {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-secondary *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tip-grid button *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-apply * {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          stroke: #f6e8c8 !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button:disabled,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[disabled],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary:disabled,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary[disabled],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-secondary:disabled,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-secondary[disabled] {
          color: rgba(246, 232, 200, .86) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .86) !important;
          opacity: .62 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button:disabled *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[disabled] *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary:disabled *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary[disabled] *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-secondary:disabled *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-secondary[disabled] * {
          color: rgba(246, 232, 200, .86) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .86) !important;
          stroke: rgba(246, 232, 200, .86) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tip-grid .pmd-kazen-choice-active {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }



        /* PMD_KAZEN_CHECKOUT_MATCH_ITEM_DETAIL_V4_20260618
           Make Kazen checkout/order cards match the new item detail modal visual language.
           Sharp Japanese geometry, same typography, same action buttons, same smooth entrance.
        */
        html body .pmd-kazen-checkout-waiter {
          padding: max(12px, env(safe-area-inset-top)) 12px max(16px, env(safe-area-inset-bottom)) !important;
          background: rgba(24, 22, 20, .56) !important;
          -webkit-backdrop-filter: blur(10px) saturate(1.03) !important;
          backdrop-filter: blur(10px) saturate(1.03) !important;
          animation: pmdKazenDetailOverlayIn .2s ease-out both !important;
        }

        html body .pmd-kazen-checkout-panel {
          width: min(92vw, 460px) !important;
          max-height: min(92dvh, 760px) !important;
          padding: 0 !important;
          overflow: auto !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          border-radius: 0 !important;
          background: linear-gradient(180deg, #fffdf8 0%, #f8f2e8 100%) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          box-shadow: 0 30px 86px rgba(15, 12, 8, .36), 0 1px 0 rgba(255,255,255,.74) inset !important;
          animation: pmdKazenDetailCardIn .28s cubic-bezier(.22, 1, .36, 1) both !important;
        }

        html body .pmd-kazen-checkout-panel .kazen-solid-modal-sheet {
          background:
            radial-gradient(circle at 92% 0%, rgba(184, 93, 89, .045), transparent 30%),
            linear-gradient(180deg, #fffdf8 0%, #f8f2e8 100%) !important;
        }

        html body .pmd-kazen-checkout-content {
          padding: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-solid-modal-head,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          align-items: start !important;
          gap: 18px !important;
          padding: 24px 24px 16px !important;
          margin: 0 !important;
          border-bottom: 1px solid rgba(36, 35, 32, .14) !important;
          background: transparent !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-solid-modal-head h2,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-head h2 {
          margin: 0 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: clamp(1.75rem, 5.8vw, 2.55rem) !important;
          line-height: 1 !important;
          letter-spacing: .075em !important;
          text-transform: uppercase !important;
          overflow-wrap: anywhere !important;
        }

        html body .pmd-kazen-checkout-waiter .kazen-solid-eyebrow {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .72rem !important;
          font-weight: 850 !important;
          letter-spacing: .26em !important;
          text-transform: uppercase !important;
          margin-bottom: 8px !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close {
          all: unset !important;
          box-sizing: border-box !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 48px !important;
          height: 48px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          border-radius: 0 !important;
          background: rgba(255, 255, 255, .46) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          cursor: pointer !important;
          transition: transform .16s ease, background .16s ease, border-color .16s ease !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back:hover,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close:hover {
          transform: translateY(-1px) !important;
          background: rgba(255,255,255,.82) !important;
          border-color: rgba(184, 93, 89, .42) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-back-icon,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-back-icon *,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg * {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          stroke: #242320 !important;
          fill: none !important;
        }

        html body .pmd-kazen-checkout-body {
          display: grid !important;
          gap: 16px !important;
          padding: 18px 24px 24px !important;
        }

        html body .pmd-kazen-checkout-card {
          border: 1px solid rgba(36, 35, 32, .16) !important;
          border-radius: 0 !important;
          background: rgba(255, 252, 246, .55) !important;
          padding: 16px 18px !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-cart-line {
          padding: 12px 0 !important;
          border: 0 !important;
          border-bottom: 1px solid rgba(36, 35, 32, .12) !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-cart-line:last-child { border-bottom: 0 !important; }

        html body .pmd-kazen-cart-line span,
        html body .pmd-kazen-cart-line strong,
        html body .pmd-kazen-line span,
        html body .pmd-kazen-line strong {
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
        }

        html body .pmd-kazen-cart-line span,
        html body .pmd-kazen-line span {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-weight: 760 !important;
        }

        html body .pmd-kazen-cart-line strong,
        html body .pmd-kazen-line strong,
        html body .pmd-kazen-line-strong strong {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          font-weight: 850 !important;
        }

        html body .pmd-kazen-total-plain {
          padding: 0 !important;
          background: transparent !important;
        }

        html body .pmd-kazen-actions {
          display: grid !important;
          gap: 10px !important;
          margin-top: 2px !important;
        }

        html body .pmd-kazen-actions-two {
          grid-template-columns: .92fr 1.08fr !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn,
        html body .pmd-kazen-checkout-waiter .kazen-primary,
        html body .pmd-kazen-checkout-waiter .kazen-secondary,
        html body .pmd-kazen-payment-action button,
        html body .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          min-height: 48px !important;
          border-radius: 0 !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .8rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          cursor: pointer !important;
          box-shadow: none !important;
          transition: transform .16s ease, box-shadow .16s ease, background .16s ease !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn:hover,
        html body .pmd-kazen-payment-action button:hover {
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter .kazen-primary,
        html body .pmd-kazen-payment-action button,
        html body .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          border: 1px solid rgba(184, 93, 89, .62) !important;
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          box-shadow: 0 12px 28px rgba(184, 93, 89, .16) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter .kazen-secondary {
          border: 1px solid rgba(36, 35, 32, .18) !important;
          background: rgba(255,255,255,.5) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-primary *,
        html body .pmd-kazen-checkout-waiter .kazen-primary *,
        html body .pmd-kazen-payment-action button * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: #fffaf3 !important;
        }

        @media (max-width: 540px) {
          html body .pmd-kazen-checkout-panel { width: min(94vw, 430px) !important; }
          html body .pmd-kazen-checkout-waiter .kazen-solid-modal-head,
          html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-head {
            grid-template-columns: minmax(0, 1fr) 44px !important;
            gap: 12px !important;
            padding: 18px 18px 12px !important;
          }
          html body .pmd-kazen-checkout-waiter .kazen-solid-modal-head h2,
          html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-head h2 {
            font-size: clamp(1.7rem, 8.2vw, 2.28rem) !important;
            letter-spacing: .06em !important;
          }
          html body .pmd-kazen-checkout-body { padding: 16px 18px 18px !important; }
        }


        /* PMD_KAZEN_CHECKOUT_STEP_BUTTON_MOTION_V5_20260618
           Polish every Kazen checkout step: close icon, consistent buttons, smooth step motion.
        */
        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-body {
          animation: pmdKazenCheckoutStepIn .24s cubic-bezier(.22, 1, .36, 1) both !important;
          transform-origin: 50% 22% !important;
          will-change: transform, opacity !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-card,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-items-frame,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method-grid,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tabs,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-actions,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-list {
          animation: pmdKazenCheckoutBlockIn .28s cubic-bezier(.22, 1, .36, 1) both !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back {
          position: relative !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back .pmd-kazen-back-icon,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back .pmd-kazen-back-icon *,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg * {
          width: 22px !important;
          height: 22px !important;
          stroke: #242320 !important;
          color: #242320 !important;
          fill: none !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back:active,
        html body .pmd-kazen-checkout-waiter button:active,
        html body .pmd-kazen-checkout-waiter [role="button"]:active {
          transform: translateY(0) scale(.985) !important;
        }

        html body .pmd-kazen-checkout-waiter button:not(.pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back),
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn,
        html body .pmd-kazen-checkout-waiter .kazen-primary,
        html body .pmd-kazen-checkout-waiter .kazen-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-list pmd-kazen-assign-row,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-apply,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button {
          border-radius: 0 !important;
          box-shadow: none !important;
          background-image: none !important;
          transition:
            transform .16s cubic-bezier(.22, 1, .36, 1),
            border-color .16s ease,
            background-color .16s ease,
            box-shadow .16s ease,
            opacity .16s ease !important;
          touch-action: manipulation !important;
          -webkit-tap-highlight-color: transparent !important;
        }

        html body .pmd-kazen-checkout-waiter button:not(:disabled):not(.pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back):hover,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-list pmd-kazen-assign-row:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab:hover {
          transform: translateY(-1px) !important;
          border-color: rgba(184, 93, 89, .44) !important;
          box-shadow: 0 10px 24px rgba(36, 30, 24, .07) !important;
        }

        html body .pmd-kazen-checkout-waiter button:not(.pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back):focus-visible,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile:focus-visible,
        html body .pmd-kazen-checkout-waiter [role="button"]:focus-visible {
          outline: 2px solid rgba(184, 93, 89, .34) !important;
          outline-offset: 2px !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-actions .pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-actions .kazen-primary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          min-height: 54px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 13px 16px !important;
          border: 1px solid rgba(184, 93, 89, .66) !important;
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .8rem !important;
          font-weight: 900 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
          line-height: 1.1 !important;
          text-align: center !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-actions .pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-actions .kazen-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-apply,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tip-grid button,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-list pmd-kazen-assign-row {
          min-height: 48px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          padding: 12px 14px !important;
          border: 1px solid rgba(36, 35, 32, .18) !important;
          background: rgba(255,255,255,.48) !important;
          background-color: rgba(255,255,255,.48) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .78rem !important;
          font-weight: 850 !important;
          letter-spacing: .11em !important;
          text-transform: uppercase !important;
          line-height: 1.1 !important;
          text-align: center !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab-active,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method-active,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-choice-active,
        html body .pmd-kazen-checkout-waiter [data-pmd-selected="1"] {
          border-color: rgba(184, 93, 89, .58) !important;
          background: rgba(184, 93, 89, .10) !important;
          background-color: rgba(184, 93, 89, .10) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          box-shadow: inset 0 0 0 1px rgba(184, 93, 89, .08) !important;
        }

        html body .pmd-kazen-checkout-waiter button:disabled,
        html body .pmd-kazen-checkout-waiter button[disabled],
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button:disabled,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action [disabled] {
          opacity: .46 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
          background: rgba(255,255,255,.28) !important;
          background-color: rgba(255,255,255,.28) !important;
          border-color: rgba(36,35,32,.13) !important;
          color: rgba(36,35,32,.52) !important;
          -webkit-text-fill-color: rgba(36,35,32,.52) !important;
        }

        html body .pmd-kazen-checkout-waiter button *,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile *,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab * {
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
          stroke: currentColor !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method-grid,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tabs,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tip-grid {
          gap: 10px !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile {
          min-height: 68px !important;
          flex-direction: column !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-coupon-row {
          align-items: stretch !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-apply {
          min-width: 96px !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-share-row,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-person-head,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-share-total,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-chip {
          border-radius: 0 !important;
          transition: border-color .16s ease, background-color .16s ease, transform .16s ease !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back .pmd-kazen-back-icon,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back .pmd-kazen-back-icon *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg * {
          stroke: #f6e8c8 !important;
          color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-actions .pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-actions .kazen-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action button,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          background: linear-gradient(180deg, rgba(61, 18, 14, .88), rgba(32, 10, 8, .92)) !important;
          border-color: rgba(223,104,93,.66) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-actions .pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-actions .kazen-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tab,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-apply,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tip-grid button,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-list pmd-kazen-assign-row {
          background: rgba(12, 9, 6, .86) !important;
          border-color: rgba(198,164,93,.36) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tab-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-choice-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] [data-pmd-selected="1"] {
          background: rgba(61, 18, 14, .68) !important;
          border-color: rgba(223,104,93,.55) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        @keyframes pmdKazenCheckoutStepIn {
          from { opacity: 0; transform: translateY(10px) scale(.992); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @keyframes pmdKazenCheckoutBlockIn {
          from { opacity: 0; transform: translateY(7px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          html body .pmd-kazen-checkout-waiter,
          html body .pmd-kazen-checkout-panel,
          html body .pmd-kazen-checkout-body,
          html body .pmd-kazen-checkout-card,
          html body .pmd-kazen-checkout-waiter * {
            animation: none !important;
            transition: none !important;
          }
        }



        /* PMD_KAZEN_CHECKOUT_V6_PRIMARY_SPLIT_POLISH_20260618
           Solid red primary checkout actions, polished split controls, and smooth step motion. */
        html body .pmd-kazen-checkout-waiter .pmd-kazen-actions .pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter button.pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button="primary"],
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          background: #bf5f5b !important;
          background-color: #bf5f5b !important;
          background-image: linear-gradient(180deg, #c76662 0%, #b95551 100%) !important;
          border: 1px solid rgba(143, 55, 51, .56) !important;
          color: #fffaf1 !important;
          -webkit-text-fill-color: #fffaf1 !important;
          box-shadow: 0 14px 30px rgba(184, 93, 89, .18) !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-actions .pmd-kazen-waiter-primary *,
        html body .pmd-kazen-checkout-waiter button.pmd-kazen-waiter-primary *,
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button="primary"] *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] * {
          color: #fffaf1 !important;
          -webkit-text-fill-color: #fffaf1 !important;
          stroke: #fffaf1 !important;
          fill: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-actions .pmd-kazen-waiter-primary:hover,
        html body .pmd-kazen-checkout-waiter button.pmd-kazen-waiter-primary:hover,
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button="primary"]:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button:hover {
          background: #b95551 !important;
          background-color: #b95551 !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-actions .pmd-kazen-waiter-primary:disabled,
        html body .pmd-kazen-checkout-waiter button.pmd-kazen-waiter-primary:disabled,
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button="primary"]:disabled,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button:disabled {
          background: rgba(184, 93, 89, .16) !important;
          background-color: rgba(184, 93, 89, .16) !important;
          background-image: none !important;
          color: rgba(255, 250, 241, .55) !important;
          -webkit-text-fill-color: rgba(255, 250, 241, .55) !important;
          border-color: rgba(184, 93, 89, .24) !important;
          box-shadow: none !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-split-stepper {
          display: grid !important;
          grid-template-columns: 3.15rem 1fr 3.15rem !important;
          align-items: center !important;
          width: 100% !important;
          min-height: 3.2rem !important;
          border: 1px solid rgba(35, 34, 31, .16) !important;
          background: rgba(255, 255, 255, .28) !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          overflow: hidden !important;
        }

        html body .pmd-kazen-split-stepper button,
        html body .pmd-kazen-split-stepper .pmd-kzui-btn-square pmd-kazen-split-stepper-btn {
          width: 3.15rem !important;
          min-width: 3.15rem !important;
          height: 3.2rem !important;
          min-height: 3.2rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          padding: 0 !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          box-shadow: none !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 1.55rem !important;
          font-weight: 760 !important;
          line-height: 1 !important;
        }

        html body .pmd-kazen-split-stepper button:first-child {
          border-right: 1px solid rgba(35, 34, 31, .14) !important;
        }

        html body .pmd-kazen-split-stepper button:last-child {
          border-left: 1px solid rgba(35, 34, 31, .14) !important;
        }

        html body .pmd-kazen-split-stepper button:hover:not(:disabled) {
          background: rgba(184, 93, 89, .08) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .pmd-kazen-split-stepper button:disabled {
          color: rgba(36, 35, 32, .25) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .25) !important;
          cursor: not-allowed !important;
        }

        html body .pmd-kazen-split-stepper strong {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 3.2rem !important;
          padding: 0 .65rem !important;
          background: rgba(255, 255, 255, .18) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .95rem !important;
          font-weight: 760 !important;
          text-align: center !important;
        }

        html body .pmd-kazen-checkout-body {
          animation: pmdKazenCheckoutStepIn .22s cubic-bezier(.2,.84,.2,1) both !important;
          transform-origin: 50% 16px !important;
        }



        /* PMD_KAZEN_V9_CLEAN_CHECKOUT_FRAMES_AND_ACTION_CLOSE_20260618
           Keep only real fields and buttons framed. Order summaries and totals are plain editorial rows.
           Also keeps action close buttons visually identical across checkout, waiter, and note cards.
        */
        html body .pmd-kazen-checkout-waiter .pmd-kazen-items-plain,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-empty-list,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-summary-plain,
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-plain-summary="1"] {
          border: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-items-plain .pmd-kazen-items-list,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-summary-plain .pmd-kazen-items-list {
          gap: 0 !important;
          border: 0 !important;
          background: transparent !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-items-plain .pmd-kazen-cart-line,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-summary-plain .pmd-kazen-cart-line {
          border: 0 !important;
          border-bottom: 1px solid rgba(36, 35, 32, .13) !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          padding: .78rem 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-items-plain .pmd-kazen-cart-line:last-child,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-summary-plain .pmd-kazen-cart-line:last-child {
          border-bottom: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-order-total-plain,
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-plain-total="1"] {
          border: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          padding: .2rem .25rem .1rem !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-order-total-plain .pmd-kazen-line,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-order-total-plain .pmd-kazen-line-strong,
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-plain-total="1"] .pmd-kazen-line,
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-plain-total="1"] .pmd-kazen-line-strong {
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: .15rem 0 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-items-plain,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-empty-list,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-summary-plain,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] [data-pmd-kazen-plain-summary="1"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-order-total-plain,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] [data-pmd-kazen-plain-total="1"] {
          border: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-items-plain .pmd-kazen-cart-line,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-summary-plain .pmd-kazen-cart-line {
          border: 0 !important;
          border-bottom: 1px solid rgba(198,164,93,.18) !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-items-plain .pmd-kazen-cart-line:last-child,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-summary-plain .pmd-kazen-cart-line:last-child {
          border-bottom: 0 !important;
        }


        /* PMD_KAZEN_PAYMENT_STEP_CLEANUP_V10_20260618
           Clean payment step: no fake frames around totals/summary, only real controls get borders.
           Dark mode payment form is normalized so Stripe/shared renderer does not look like old UI.
        */
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-payment-plain="1"],
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-totals-plain,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-hero,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-section {
          border: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          border-radius: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-hero {
          padding-bottom: .9rem !important;
          border-bottom: 1px solid rgba(36,35,32,.12) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-totals-plain {
          display: grid !important;
          gap: .2rem !important;
          padding: .25rem .1rem .9rem !important;
          border-bottom: 1px solid rgba(36,35,32,.12) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-totals-plain .pmd-kazen-line {
          border: 0 !important;
          background: transparent !important;
          padding: .24rem 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-section {
          display: grid !important;
          gap: .72rem !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-section .pmd-kazen-section-title,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-methods-section .pmd-kazen-section-title {
          margin: 0 !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .72rem !important;
          line-height: 1.1 !important;
          font-weight: 900 !important;
          letter-spacing: .22em !important;
          text-transform: uppercase !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-intro {
          grid-template-columns: 2.35rem 1fr !important;
          align-items: center !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-intro strong {
          font-family: Inter, ui-sans-serif, system-ui !important;
          font-weight: 850 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-intro p {
          margin-top: .15rem !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 1.06rem !important;
          font-weight: 800 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-methods-section,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-methods {
          border: 0 !important;
          background: transparent !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .7rem !important;
          border: 0 !important;
          background: transparent !important;
          padding: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile {
          min-height: 4.35rem !important;
          border-radius: 0 !important;
          background: rgba(255,255,255,.22) !important;
          background-color: rgba(255,255,255,.22) !important;
          border: 1px solid rgba(36,35,32,.16) !important;
          box-shadow: none !important;
          overflow: hidden !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method-active,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile[data-selected="true"],
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile[aria-pressed="true"] {
          background: rgba(184,93,89,.08) !important;
          background-color: rgba(184,93,89,.08) !important;
          border-color: rgba(184,93,89,.42) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail {
          border-top: 1px solid rgba(36,35,32,.12) !important;
          padding-top: 1rem !important;
          overflow: hidden !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail > *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail form,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail fieldset,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail [class*="card"],
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail [class*="Card"],
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail [class*="payment"],
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail [class*="Payment"] {
          max-width: 100% !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail label,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail .label,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail [class*="label"],
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail [class*="Label"] {
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-family: Inter, ui-sans-serif, system-ui !important;
          font-size: .78rem !important;
          font-weight: 800 !important;
          letter-spacing: .01em !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail input:not(.__PrivateStripeElement-input),
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail textarea,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail select,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail .StripeElement,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail [class*="Input"],
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-detail [class*="input"] {
          min-height: 3.1rem !important;
          border-radius: 0 !important;
          background: rgba(255,255,255,.34) !important;
          background-color: rgba(255,255,255,.34) !important;
          border: 1px solid rgba(36,35,32,.16) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          box-shadow: none !important;
          outline: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          min-height: 3.7rem !important;
          border-radius: 0 !important;
          background: linear-gradient(180deg, #c76662 0%, #b95551 100%) !important;
          background-color: #bd5f5b !important;
          border: 1px solid rgba(143,55,51,.62) !important;
          color: #fffaf1 !important;
          -webkit-text-fill-color: #fffaf1 !important;
          box-shadow: 0 16px 32px rgba(184,93,89,.20) !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action button *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] * {
          color: #fffaf1 !important;
          -webkit-text-fill-color: #fffaf1 !important;
          stroke: #fffaf1 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] [data-pmd-kazen-payment-plain="1"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-section,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-methods-section,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-methods {
          border: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-hero,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-totals-plain,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail {
          border-bottom-color: rgba(198,164,93,.20) !important;
          border-top-color: rgba(198,164,93,.20) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-totals-plain .pmd-kazen-line,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-totals-plain .pmd-kazen-line span,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-totals-plain .pmd-kazen-line strong {
          background: transparent !important;
          color: #b9ad96 !important;
          -webkit-text-fill-color: #b9ad96 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-totals-plain .pmd-kazen-line-strong span,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-totals-plain .pmd-kazen-line-strong strong,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-intro strong,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-intro p {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-section .pmd-kazen-section-title,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-methods-section .pmd-kazen-section-title {
          color: #df685d !important;
          -webkit-text-fill-color: #df685d !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method-grid {
          border: 0 !important;
          background: transparent !important;
          padding: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile {
          background: rgba(12,9,6,.72) !important;
          background-color: rgba(12,9,6,.72) !important;
          border-color: rgba(198,164,93,.32) !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile[data-selected="true"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile[aria-pressed="true"] {
          background: rgba(61,18,14,.60) !important;
          background-color: rgba(61,18,14,.60) !important;
          border-color: rgba(223,104,93,.56) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail > *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail form,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail fieldset {
          background: transparent !important;
          background-color: transparent !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail label,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail .label,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail [class*="label"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail [class*="Label"] {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail input:not(.__PrivateStripeElement-input),
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail textarea,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail select,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail .StripeElement,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail [class*="Input"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail [class*="input"] {
          background: rgba(12,9,6,.70) !important;
          background-color: rgba(12,9,6,.70) !important;
          border-color: rgba(198,164,93,.32) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action button,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          background: linear-gradient(180deg, #c76662 0%, #b95551 100%) !important;
          background-color: #bd5f5b !important;
          border-color: rgba(223,104,93,.64) !important;
          color: #fffaf1 !important;
          -webkit-text-fill-color: #fffaf1 !important;
          box-shadow: 0 18px 42px rgba(184,93,89,.25) !important;
        }

        @media (max-width: 560px) {
          html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
        }
        @keyframes pmdKazenCheckoutStepIn {
          from { opacity: 0; transform: translateY(10px) scale(.992); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (prefers-reduced-motion: reduce) {
          html body .pmd-kazen-checkout-body {
            animation: none !important;
          }
        }


        /* PMD_KAZEN_DARK_FINAL_POLISH_V11_20260618
           Last CSS layer for dark checkout. Keeps dark mode elegant and removes unnecessary frames. */
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-section,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-hero,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-totals-plain,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-summary-plain,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-empty-list,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-card {
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          border: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-intro,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-total-plain,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-total-plain .pmd-kazen-line,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-totals-plain .pmd-kazen-line {
          background: transparent !important;
          background-color: transparent !important;
          border: 0 !important;
          padding-left: 0 !important;
          padding-right: 0 !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="primary"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action button,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"] {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: none !important;
          border: 1px solid rgba(223, 104, 93, .72) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          box-shadow: 0 16px 36px rgba(184, 93, 89, .24) !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-primary *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="primary"] *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action button * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: #fffaf3 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method-grid,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tip-grid,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-coupon-row,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tabs {
          background: transparent !important;
          border: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
        }


        /* PMD_KAZEN_V15_STATIC_DARK_FINAL_POLISH_20260618
           Static-only finishing pass after the good V12 checkpoint.
           No React effects, no delayed DOM styling.
           Fixes dark-mode grey buttons, split controls, nested frames, price colors,
           prep-time badge, payment fields, and Stripe wrapper presentation.
        */

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] {
          --pmd-kazen-dark-bg: #050302;
          --pmd-kazen-dark-panel: #0b0705;
          --pmd-kazen-dark-surface: rgba(12, 8, 5, .94);
          --pmd-kazen-dark-surface-2: rgba(20, 13, 8, .78);
          --pmd-kazen-dark-border: rgba(198, 164, 93, .42);
          --pmd-kazen-dark-border-soft: rgba(198, 164, 93, .20);
          --pmd-kazen-dark-text: #f6e8c8;
          --pmd-kazen-dark-muted: rgba(246, 232, 200, .62);
          --pmd-kazen-dark-red: #c4625c;
          --pmd-kazen-dark-red-hot: #ec7166;
          background: rgba(0,0,0,.80) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-panel {
          background:
            radial-gradient(circle at 82% 0%, rgba(111, 45, 33, .28), transparent 38%),
            linear-gradient(180deg, rgba(25, 16, 10, .98), rgba(5, 3, 2, .99)) !important;
          background-color: var(--pmd-kazen-dark-panel) !important;
          border-color: rgba(198, 164, 93, .54) !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
          box-shadow: 0 34px 92px rgba(0,0,0,.74), inset 0 1px 0 rgba(246,232,200,.08) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-content,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-body {
          background: transparent !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-head {
          border-bottom-color: var(--pmd-kazen-dark-border-soft) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-head h2 {
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-solid-eyebrow {
          display: inline-flex !important;
          width: auto !important;
          align-items: center !important;
          justify-content: center !important;
          padding: .42rem .72rem !important;
          margin: 0 0 .72rem 0 !important;
          border: 1px solid rgba(236, 113, 102, .72) !important;
          background: rgba(196, 98, 92, .16) !important;
          color: var(--pmd-kazen-dark-red-hot) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-red-hot) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .72rem !important;
          font-weight: 900 !important;
          letter-spacing: .36em !important;
          text-transform: uppercase !important;
          line-height: 1 !important;
          box-shadow: inset 0 1px 0 rgba(255,255,255,.05) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-back="1"] {
          background: rgba(246, 232, 200, .055) !important;
          background-color: rgba(246, 232, 200, .055) !important;
          border: 1px solid rgba(198, 164, 93, .45) !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
          opacity: 1 !important;
          filter: none !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-back="1"] * {
          color: var(--pmd-kazen-dark-text) !important;
          stroke: currentColor !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-back="1"]:hover {
          background: rgba(198, 164, 93, .12) !important;
          border-color: rgba(246, 232, 200, .60) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="primary"]:not(:disabled),
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-primary:not(:disabled),
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-primary:not(:disabled),
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action button:not(:disabled),
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action [data-pmd-stripe-native-button="1"]:not(:disabled) {
          background: #bd5f5b !important;
          background-color: #bd5f5b !important;
          border-color: rgba(236, 113, 102, .74) !important;
          color: #fffaf2 !important;
          -webkit-text-fill-color: #fffaf2 !important;
          opacity: 1 !important;
          filter: none !important;
          box-shadow: 0 18px 42px rgba(189, 95, 91, .28), inset 0 1px 0 rgba(255,255,255,.16) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="primary"]:not(:disabled) *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-primary:not(:disabled) *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-primary:not(:disabled) *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-action button:not(:disabled) * {
          color: #fffaf2 !important;
          stroke: currentColor !important;
          -webkit-text-fill-color: #fffaf2 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="secondary"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-secondary {
          background: rgba(246, 232, 200, .035) !important;
          background-color: rgba(246, 232, 200, .035) !important;
          border-color: rgba(198, 164, 93, .34) !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
          opacity: 1 !important;
          filter: none !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button:disabled,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[disabled] {
          background: rgba(246, 232, 200, .045) !important;
          background-color: rgba(246, 232, 200, .045) !important;
          border-color: rgba(198, 164, 93, .18) !important;
          color: rgba(246, 232, 200, .38) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .38) !important;
          opacity: .62 !important;
          filter: none !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button:disabled *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[disabled] * {
          color: rgba(246, 232, 200, .38) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .38) !important;
          stroke: currentColor !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-card,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-summary-plain,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-section,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-hero,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-totals-plain,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-list,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-items-plain {
          background: transparent !important;
          background-color: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          outline: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-cart-line,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-line,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-share-row,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-person-head {
          background: transparent !important;
          background-color: transparent !important;
          border: 0 !important;
          border-bottom: 1px solid rgba(198, 164, 93, .18) !important;
          box-shadow: none !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-cart-line strong,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-list pmd-kazen-assign-row strong {
          color: var(--pmd-kazen-dark-red-hot) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-red-hot) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-line strong,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-line-strong strong,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-total-plain strong,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-order-total-plain strong,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-totals-plain strong {
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-line span,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-muted {
          color: var(--pmd-kazen-dark-muted) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-muted) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-section-title {
          color: var(--pmd-kazen-dark-red-hot) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-red-hot) !important;
          border: 0 !important;
          background: transparent !important;
          letter-spacing: .08em !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-status-copy {
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-status-icon {
          background: rgba(196, 98, 92, .14) !important;
          border: 1px solid rgba(236, 113, 102, .62) !important;
          color: var(--pmd-kazen-dark-red-hot) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-red-hot) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tabs {
          gap: .7rem !important;
          background: transparent !important;
          border: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tab {
          min-height: 3.4rem !important;
          background: rgba(246, 232, 200, .035) !important;
          border: 1px solid rgba(198, 164, 93, .30) !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tab-active {
          background: rgba(196, 98, 92, .18) !important;
          border-color: rgba(236, 113, 102, .66) !important;
          color: var(--pmd-kazen-dark-red-hot) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-red-hot) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-split-stepper {
          grid-template-columns: 3.2rem 1fr 3.2rem !important;
          min-height: 3.3rem !important;
          background: rgba(5, 3, 2, .68) !important;
          background-color: rgba(5, 3, 2, .68) !important;
          border: 1px solid rgba(198, 164, 93, .36) !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-split-stepper strong {
          background: transparent !important;
          background-color: transparent !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-split-stepper .pmd-kzui-btn-square pmd-kazen-split-stepper-btn,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-split-stepper button {
          width: 3.2rem !important;
          min-width: 3.2rem !important;
          height: 3.3rem !important;
          min-height: 3.3rem !important;
          background: rgba(246, 232, 200, .035) !important;
          background-color: rgba(246, 232, 200, .035) !important;
          border: 0 !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-split-stepper .pmd-kzui-btn-square pmd-kazen-split-stepper-btn:last-child:not(:disabled),
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-split-stepper button:last-child:not(:disabled) {
          background: #bd5f5b !important;
          background-color: #bd5f5b !important;
          color: #fffaf2 !important;
          -webkit-text-fill-color: #fffaf2 !important;
          border-left: 1px solid rgba(236, 113, 102, .74) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-split-stepper span,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-split-stepper button * {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-chip {
          background: transparent !important;
          border: 0 !important;
          border-bottom: 1px solid rgba(198, 164, 93, .28) !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-share-input,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-field,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] input,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] textarea,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] select,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail [class*="input"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail [class*="Input"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .StripeElement {
          background: rgba(5, 3, 2, .78) !important;
          background-color: rgba(5, 3, 2, .78) !important;
          border: 1px solid rgba(198, 164, 93, .36) !important;
          border-radius: 0 !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
          box-shadow: none !important;
          outline: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] input::placeholder,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] textarea::placeholder {
          color: rgba(246, 232, 200, .38) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .38) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] input:-webkit-autofill,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] textarea:-webkit-autofill,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] select:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #080503 inset !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
          caret-color: var(--pmd-kazen-dark-text) !important;
          border-radius: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail > *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail form,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail label {
          background: transparent !important;
          border-color: transparent !important;
          color: var(--pmd-kazen-dark-text) !important;
          -webkit-text-fill-color: var(--pmd-kazen-dark-text) !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-payment-detail iframe {
          background: rgba(5, 3, 2, .78) !important;
          border-radius: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .75rem !important;
          background: transparent !important;
          border: 0 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method {
          min-height: 4.6rem !important;
          background: rgba(5, 3, 2, .74) !important;
          background-color: rgba(5, 3, 2, .74) !important;
          border: 1px solid rgba(198, 164, 93, .34) !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile[aria-pressed="true"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method-active {
          background: rgba(196, 98, 92, .16) !important;
          border-color: rgba(236, 113, 102, .72) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-payment-method-tile img,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-tile pmd-kazen-method img {
          opacity: 1 !important;
          filter: none !important;
        }

      
        /* PMD_KAZEN_V16_DARK_CHECKOUT_BUTTONS_STATIC_20260618
           Static-only dark overrides:
           - no grey close/secondary buttons
           - secondary buttons match waiter/note card secondary style
           - primary right buttons stay red/solid
           - split bill people control is smaller and not grey
        */

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="secondary"] {
          background: rgba(8, 5, 3, .88) !important;
          background-color: rgba(8, 5, 3, .88) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          border: 1px solid rgba(198, 164, 93, .52) !important;
          box-shadow:
            0 16px 32px rgba(0,0,0,.28),
            inset 0 1px 0 rgba(246,232,200,.06) !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-secondary:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-secondary:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="secondary"]:hover {
          background: rgba(246, 232, 200, .08) !important;
          background-color: rgba(246, 232, 200, .08) !important;
          color: #fff4d6 !important;
          -webkit-text-fill-color: #fff4d6 !important;
          border-color: rgba(246, 232, 200, .72) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-solid-close,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-action-close {
          background: rgba(8, 5, 3, .88) !important;
          background-color: rgba(8, 5, 3, .88) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          border: 1px solid rgba(198, 164, 93, .52) !important;
          box-shadow:
            0 18px 34px rgba(0,0,0,.30),
            inset 0 1px 0 rgba(246,232,200,.08) !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-solid-close svg,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .kazen-solid-close svg *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-action-close svg,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-action-close svg * {
          color: #f6e8c8 !important;
          stroke: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-primary:not(:disabled),
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-primary:not(:disabled),
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="primary"]:not(:disabled) {
          background: #bd5f5b !important;
          background-color: #bd5f5b !important;
          color: #fffaf2 !important;
          -webkit-text-fill-color: #fffaf2 !important;
          border-color: #d06b66 !important;
          box-shadow:
            0 20px 42px rgba(189, 95, 91, .26),
            inset 0 1px 0 rgba(255,255,255,.18) !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[disabled],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button:disabled {
          background: rgba(246, 232, 200, .08) !important;
          background-color: rgba(246, 232, 200, .08) !important;
          color: rgba(246, 232, 200, .35) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .35) !important;
          border-color: rgba(198, 164, 93, .18) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] strong[style*="min-height: 3.05rem"] {
          min-height: 2.65rem !important;
          height: 2.65rem !important;
          background: rgba(8, 5, 3, .88) !important;
          background-color: rgba(8, 5, 3, .88) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          border-top: 1px solid rgba(198, 164, 93, .38) !important;
          border-bottom: 1px solid rgba(198, 164, 93, .38) !important;
          font-size: .88rem !important;
          font-weight: 780 !important;
          letter-spacing: .01em !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[style*="min-height: 3.05rem"] {
          min-height: 2.65rem !important;
          height: 2.65rem !important;
          background: rgba(8, 5, 3, .88) !important;
          background-color: rgba(8, 5, 3, .88) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          border-color: rgba(198, 164, 93, .46) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[style*="min-height: 3.05rem"]:hover {
          background: rgba(246, 232, 200, .08) !important;
          background-color: rgba(246, 232, 200, .08) !important;
          border-color: rgba(246, 232, 200, .72) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[style*="min-height: 3.05rem"] svg,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[style*="min-height: 3.05rem"] svg *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[style*="min-height: 3.05rem"] span {
          color: #f6e8c8 !important;
          stroke: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }


        /* PMD_KAZEN_V22_CHECKOUT_BUTTON_PARITY_20260618
           Checkout buttons must visually match waiter/note card buttons.
           No runtime JS styling. Static CSS only.
        */

        /* Close button: same style as waiter/note close, never grey block */
        html body [data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-action-close,
        html body [data-pmd-checkout-theme="kazen_japanese"] .kazen-solid-close,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close {
          width: 3rem !important;
          height: 3rem !important;
          min-width: 3rem !important;
          min-height: 3rem !important;
          max-width: 3rem !important;
          max-height: 3rem !important;
          padding: 0 !important;
          border-radius: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: rgba(246, 232, 200, .055) !important;
          background-color: rgba(246, 232, 200, .055) !important;
          color: rgb(246, 232, 200) !important;
          -webkit-text-fill-color: rgb(246, 232, 200) !important;
          border: 1px solid rgba(198, 164, 93, .30) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body [data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-action-close:hover,
        html body [data-pmd-checkout-theme="kazen_japanese"] .kazen-solid-close:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close:hover,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close:hover {
          background: rgba(246, 232, 200, .10) !important;
          background-color: rgba(246, 232, 200, .10) !important;
          border-color: rgba(198, 164, 93, .48) !important;
          transform: translateY(-1px) !important;
        }

        html body [data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-action-close svg,
        html body [data-pmd-checkout-theme="kazen_japanese"] .kazen-solid-close svg,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close svg,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close svg {
          color: rgb(246, 232, 200) !important;
          stroke: rgb(246, 232, 200) !important;
          fill: none !important;
          -webkit-text-fill-color: rgb(246, 232, 200) !important;
        }

        /* Secondary buttons: same as waiter/note CANCEL button */
        html body [data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="secondary"]:not(:disabled):not([aria-disabled="true"]),
        html body [data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-waiter-btn-secondary:not(:disabled):not([aria-disabled="true"]),
        html body .pmd-kazen-checkout-waiter button[data-pmd-kazen-button="secondary"]:not(:disabled):not([aria-disabled="true"]),
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-secondary:not(:disabled):not([aria-disabled="true"]) {
          background: rgba(8, 6, 4, .88) !important;
          background-color: rgba(8, 6, 4, .88) !important;
          color: rgb(246, 232, 200) !important;
          -webkit-text-fill-color: rgb(246, 232, 200) !important;
          border: 1px solid rgba(198, 164, 93, .36) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body [data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="secondary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body [data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-waiter-btn-secondary:not(:disabled):not([aria-disabled="true"]):hover,
        html body .pmd-kazen-checkout-waiter button[data-pmd-kazen-button="secondary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-secondary:not(:disabled):not([aria-disabled="true"]):hover {
          background: rgba(246, 232, 200, .08) !important;
          background-color: rgba(246, 232, 200, .08) !important;
          color: rgb(255, 244, 214) !important;
          -webkit-text-fill-color: rgb(255, 244, 214) !important;
          border-color: rgba(198, 164, 93, .52) !important;
          transform: translateY(-1px) !important;
        }

        /* Primary buttons: same as waiter/note CALL button */
        html body [data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="primary"]:not(:disabled):not([aria-disabled="true"]),
        html body [data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-waiter-btn-primary:not(:disabled):not([aria-disabled="true"]),
        html body .pmd-kazen-checkout-waiter button[data-pmd-kazen-button="primary"]:not(:disabled):not([aria-disabled="true"]),
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-primary:not(:disabled):not([aria-disabled="true"]) {
          background: rgb(184, 93, 89) !important;
          background-color: rgb(184, 93, 89) !important;
          color: rgb(255, 250, 243) !important;
          -webkit-text-fill-color: rgb(255, 250, 243) !important;
          border: 1px solid rgba(223, 104, 93, .72) !important;
          box-shadow: 0 16px 36px rgba(184, 93, 89, .24) !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body [data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="primary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body [data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-waiter-btn-primary:not(:disabled):not([aria-disabled="true"]):hover,
        html body .pmd-kazen-checkout-waiter button[data-pmd-kazen-button="primary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-primary:not(:disabled):not([aria-disabled="true"]):hover {
          background: rgb(205, 99, 92) !important;
          background-color: rgb(205, 99, 92) !important;
          border-color: rgba(238, 126, 112, .82) !important;
          transform: translateY(-1px) !important;
        }

        /* Catch the exact old grey inline checkout buttons */
        html body [data-pmd-checkout-theme="kazen_japanese"] button[style*="rgba(255, 255, 255, 0.46)"]:not(:disabled):not([aria-disabled="true"]),
        html body [data-pmd-checkout-theme="kazen_japanese"] button[style*="rgba(255,255,255,0.46)"]:not(:disabled):not([aria-disabled="true"]),
        html body .pmd-kazen-checkout-waiter button[style*="rgba(255, 255, 255, 0.46)"]:not(:disabled):not([aria-disabled="true"]),
        html body .pmd-kazen-checkout-waiter button[style*="rgba(255,255,255,0.46)"]:not(:disabled):not([aria-disabled="true"]) {
          background: rgba(8, 6, 4, .88) !important;
          background-color: rgba(8, 6, 4, .88) !important;
          color: rgb(246, 232, 200) !important;
          -webkit-text-fill-color: rgb(246, 232, 200) !important;
          border-color: rgba(198, 164, 93, .36) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
        }

        /* Catch old grey split/tab controls but keep disabled buttons visually muted */
        html body [data-pmd-checkout-theme="kazen_japanese"] button:not(:disabled):not([aria-disabled="true"])[style*="rgba(255, 255, 255, 0.2)"],
        html body [data-pmd-checkout-theme="kazen_japanese"] button:not(:disabled):not([aria-disabled="true"])[style*="rgba(255,255,255,0.2)"],
        html body .pmd-kazen-checkout-waiter button:not(:disabled):not([aria-disabled="true"])[style*="rgba(255, 255, 255, 0.2)"],
        html body .pmd-kazen-checkout-waiter button:not(:disabled):not([aria-disabled="true"])[style*="rgba(255,255,255,0.2)"] {
          background: rgba(8, 6, 4, .88) !important;
          background-color: rgba(8, 6, 4, .88) !important;
          color: rgb(246, 232, 200) !important;
          -webkit-text-fill-color: rgb(246, 232, 200) !important;
          border-color: rgba(198, 164, 93, .36) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body [data-pmd-checkout-theme="kazen_japanese"] button:disabled,
        html body [data-pmd-checkout-theme="kazen_japanese"] button[aria-disabled="true"],
        html body .pmd-kazen-checkout-waiter button:disabled,
        html body .pmd-kazen-checkout-waiter button[aria-disabled="true"] {
          background: rgba(246, 232, 200, .055) !important;
          background-color: rgba(246, 232, 200, .055) !important;
          color: rgba(246, 232, 200, .34) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .34) !important;
          border-color: rgba(198, 164, 93, .18) !important;
          opacity: .62 !important;
          filter: none !important;
          box-shadow: none !important;
        }

        

        /* PMD_KAZEN_V23_CHECKOUT_BUTTONS_MATCH_ACTION_MODAL_20260618
           Final source-safe override.
           Reason: checkout modal renders in TOP_DOC, not Kazen iframe.
           These buttons must match waiter/note modal buttons.
        */

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back {
          width: 3rem !important;
          height: 3rem !important;
          min-width: 3rem !important;
          min-height: 3rem !important;
          max-width: 3rem !important;
          max-height: 3rem !important;
          padding: 0 !important;
          border-radius: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: rgba(255, 255, 255, .46) !important;
          background-color: rgba(255, 255, 255, .46) !important;
          color: rgb(36, 35, 32) !important;
          -webkit-text-fill-color: rgb(36, 35, 32) !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg *,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back svg * {
          color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back:hover,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back:hover {
          background: rgba(255, 255, 255, .62) !important;
          background-color: rgba(255, 255, 255, .62) !important;
          color: rgb(36, 35, 32) !important;
          -webkit-text-fill-color: rgb(36, 35, 32) !important;
          border-color: rgba(36, 35, 32, .32) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-secondary,
        html body .pmd-kazen-checkout-waiter button[data-pmd-kazen-button="secondary"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-waiter-btn-secondary,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="secondary"] {
          min-height: 3rem !important;
          padding: .82rem 1rem !important;
          border-radius: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: rgba(255, 255, 255, .50) !important;
          background-color: rgba(255, 255, 255, .50) !important;
          color: rgb(36, 35, 32) !important;
          -webkit-text-fill-color: rgb(36, 35, 32) !important;
          border: 1px solid rgba(36, 35, 32, .18) !important;
          box-shadow: none !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .8rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-secondary:hover,
        html body .pmd-kazen-checkout-waiter button[data-pmd-kazen-button="secondary"]:hover,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-waiter-btn-secondary:hover,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="secondary"]:hover {
          background: rgba(255, 255, 255, .62) !important;
          background-color: rgba(255, 255, 255, .62) !important;
          color: rgb(36, 35, 32) !important;
          -webkit-text-fill-color: rgb(36, 35, 32) !important;
          border-color: rgba(36, 35, 32, .32) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-primary,
        html body .pmd-kazen-checkout-waiter button[data-pmd-kazen-button="primary"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-waiter-btn-primary,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="primary"] {
          min-height: 3rem !important;
          padding: .82rem 1rem !important;
          border-radius: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: rgb(184, 93, 89) !important;
          background-color: rgb(184, 93, 89) !important;
          color: rgb(255, 250, 243) !important;
          -webkit-text-fill-color: rgb(255, 250, 243) !important;
          border: 1px solid rgba(184, 93, 89, .62) !important;
          box-shadow: rgba(184, 93, 89, .16) 0 12px 28px !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .8rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-primary:hover,
        html body .pmd-kazen-checkout-waiter button[data-pmd-kazen-button="primary"]:hover,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-waiter-btn-primary:hover,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="primary"]:hover {
          background: rgb(159, 79, 75) !important;
          background-color: rgb(159, 79, 75) !important;
          color: rgb(255, 250, 243) !important;
          -webkit-text-fill-color: rgb(255, 250, 243) !important;
          border-color: rgba(159, 79, 75, .76) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back {
          background: rgba(246, 232, 200, .055) !important;
          background-color: rgba(246, 232, 200, .055) !important;
          color: rgb(246, 232, 200) !important;
          -webkit-text-fill-color: rgb(246, 232, 200) !important;
          border-color: rgba(198, 164, 93, .30) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back:hover,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back:hover {
          background: rgba(246, 232, 200, .09) !important;
          background-color: rgba(246, 232, 200, .09) !important;
          color: rgb(255, 244, 214) !important;
          -webkit-text-fill-color: rgb(255, 244, 214) !important;
          border-color: rgba(198, 164, 93, .48) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="secondary"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-secondary,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="secondary"] {
          background: rgba(8, 6, 4, .88) !important;
          background-color: rgba(8, 6, 4, .88) !important;
          color: rgb(246, 232, 200) !important;
          -webkit-text-fill-color: rgb(246, 232, 200) !important;
          border-color: rgba(198, 164, 93, .36) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-secondary:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="secondary"]:hover,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-secondary:hover,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="secondary"]:hover {
          background: rgba(246, 232, 200, .08) !important;
          background-color: rgba(246, 232, 200, .08) !important;
          color: rgb(255, 244, 214) !important;
          -webkit-text-fill-color: rgb(255, 244, 214) !important;
          border-color: rgba(198, 164, 93, .52) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="primary"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-btn-primary,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] button[data-pmd-kazen-button="primary"] {
          background: rgb(184, 93, 89) !important;
          background-color: rgb(184, 93, 89) !important;
          color: rgb(255, 250, 243) !important;
          -webkit-text-fill-color: rgb(255, 250, 243) !important;
          border-color: rgba(223, 104, 93, .72) !important;
          box-shadow: rgba(184, 93, 89, .24) 0 16px 36px !important;
        }



        /* PMD_KAZEN_V24B_CHECKOUT_CONTROLS_FINAL_STYLE_20260618
           Rebuilt checkout controls.
           These buttons now match waiter/note modal controls.
        */

        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-head-clean {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 1rem !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean {
          width: 3rem !important;
          height: 3rem !important;
          min-width: 3rem !important;
          min-height: 3rem !important;
          max-width: 3rem !important;
          max-height: 3rem !important;
          padding: 0 !important;
          border-radius: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: rgba(255, 255, 255, .44) !important;
          background-color: rgba(255, 255, 255, .44) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
          transform: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean:hover {
          background: rgba(255, 255, 255, .62) !important;
          background-color: rgba(255, 255, 255, .62) !important;
          border-color: rgba(36, 35, 32, .34) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean svg,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean svg * {
          color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-actions-clean {
          display: grid !important;
          gap: .75rem !important;
          width: 100% !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-actions-clean.pmd-kazen-actions-two {
          grid-template-columns: 1fr 1fr !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-action pmd-kazen-checkout-action-button-clean {
          width: 100% !important;
          min-height: 3rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          padding: .82rem 1rem !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          opacity: 1 !important;
          filter: none !important;
          transform: none !important;
          transition:
            background-color .18s ease,
            border-color .18s ease,
            color .18s ease,
            transform .18s ease !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-secondary pmd-kazen-checkout-action-secondary-clean {
          background: rgba(255, 255, 255, .42) !important;
          background-color: rgba(255, 255, 255, .42) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          border: 1px solid rgba(36, 35, 32, .20) !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-secondary pmd-kazen-checkout-action-secondary-clean:hover:not(:disabled):not([aria-disabled="true"]) {
          background: rgba(255, 255, 255, .62) !important;
          background-color: rgba(255, 255, 255, .62) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          border-color: rgba(36, 35, 32, .34) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-primary pmd-kazen-checkout-action-primary-clean {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: none !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .56) !important;
          box-shadow: 0 16px 36px rgba(184, 93, 89, .18) !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-primary pmd-kazen-checkout-action-primary-clean:hover:not(:disabled):not([aria-disabled="true"]) {
          background: #c86460 !important;
          background-color: #c86460 !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border-color: rgba(223, 104, 93, .74) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-action pmd-kazen-checkout-action-button-clean svg,
        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-action pmd-kazen-checkout-action-button-clean svg * {
          color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-close-clean {
          background: rgba(246, 232, 200, .055) !important;
          background-color: rgba(246, 232, 200, .055) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          border: 1px solid rgba(198, 164, 93, .30) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-close-clean:hover {
          background: rgba(246, 232, 200, .09) !important;
          background-color: rgba(246, 232, 200, .09) !important;
          border-color: rgba(198, 164, 93, .48) !important;
          color: #fff4d6 !important;
          -webkit-text-fill-color: #fff4d6 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button.pmd-kzui-btn-secondary pmd-kazen-checkout-action-secondary-clean {
          background: rgba(8, 6, 4, .88) !important;
          background-color: rgba(8, 6, 4, .88) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
          border: 1px solid rgba(198, 164, 93, .36) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button.pmd-kzui-btn-secondary pmd-kazen-checkout-action-secondary-clean:hover:not(:disabled):not([aria-disabled="true"]) {
          background: rgba(246, 232, 200, .08) !important;
          background-color: rgba(246, 232, 200, .08) !important;
          color: #fff4d6 !important;
          -webkit-text-fill-color: #fff4d6 !important;
          border-color: rgba(198, 164, 93, .52) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button.pmd-kzui-btn-primary pmd-kazen-checkout-action-primary-clean {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: none !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(223, 104, 93, .72) !important;
          box-shadow: 0 16px 36px rgba(184, 93, 89, .24) !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-action pmd-kazen-checkout-action-button-clean:disabled,
        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-action pmd-kazen-checkout-action-button-clean[aria-disabled="true"] {
          opacity: .58 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }

        @media (max-width: 560px) {
          html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-actions-clean.pmd-kazen-actions-two {
            grid-template-columns: 1fr !important;
          }
        }


        /* PMD_KAZEN_V25_CHECKOUT_NORMAL_STATE_VARS_20260618
           Normal state variables for rebuilt checkout controls.
           Fixes Safari/old CSS issue where buttons looked correct only after hover.
        */

        html body .pmd-kazen-checkout-waiter,
        html body .kazen-solid-modal-overlay.pmd-kazen-checkout-waiter,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] {
          --pmd-kz-clean-close-bg: rgba(255, 255, 255, .44);
          --pmd-kz-clean-close-color: #242320;
          --pmd-kz-clean-close-border: rgba(36, 35, 32, .22);

          --pmd-kz-clean-secondary-bg: rgba(255, 255, 255, .42);
          --pmd-kz-clean-secondary-color: #242320;
          --pmd-kz-clean-secondary-border: rgba(36, 35, 32, .20);

          --pmd-kz-clean-primary-bg: #b85d59;
          --pmd-kz-clean-primary-color: #fffaf3;
          --pmd-kz-clean-primary-border: rgba(143, 55, 51, .56);
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] {
          --pmd-kz-clean-close-bg: rgba(246, 232, 200, .055);
          --pmd-kz-clean-close-color: #f6e8c8;
          --pmd-kz-clean-close-border: rgba(198, 164, 93, .30);

          --pmd-kz-clean-secondary-bg: rgba(8, 6, 4, .88);
          --pmd-kz-clean-secondary-color: #f6e8c8;
          --pmd-kz-clean-secondary-border: rgba(198, 164, 93, .36);

          --pmd-kz-clean-primary-bg: #b85d59;
          --pmd-kz-clean-primary-color: #fffaf3;
          --pmd-kz-clean-primary-border: rgba(223, 104, 93, .72);
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-action pmd-kazen-checkout-action-button-clean,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean {
          -webkit-appearance: none !important;
          appearance: none !important;
          background-image: none !important;
          box-shadow: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean:hover {
          background: rgba(255, 255, 255, .62) !important;
          background-color: rgba(255, 255, 255, .62) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          border-color: rgba(36, 35, 32, .34) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-checkout-close-clean:hover {
          background: rgba(246, 232, 200, .09) !important;
          background-color: rgba(246, 232, 200, .09) !important;
          color: #fff4d6 !important;
          -webkit-text-fill-color: #fff4d6 !important;
          border-color: rgba(198, 164, 93, .48) !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-secondary pmd-kazen-checkout-action-secondary-clean:hover:not(:disabled):not([aria-disabled="true"]) {
          background: rgba(255, 255, 255, .62) !important;
          background-color: rgba(255, 255, 255, .62) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          border-color: rgba(36, 35, 32, .34) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] button.pmd-kzui-btn-secondary pmd-kazen-checkout-action-secondary-clean:hover:not(:disabled):not([aria-disabled="true"]) {
          background: rgba(246, 232, 200, .08) !important;
          background-color: rgba(246, 232, 200, .08) !important;
          color: #fff4d6 !important;
          -webkit-text-fill-color: #fff4d6 !important;
          border-color: rgba(198, 164, 93, .52) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-primary pmd-kazen-checkout-action-primary-clean:hover:not(:disabled):not([aria-disabled="true"]) {
          background: #c86460 !important;
          background-color: #c86460 !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border-color: rgba(223, 104, 93, .74) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-action pmd-kazen-checkout-action-button-clean:disabled,
        html body .pmd-kazen-checkout-waiter button.pmd-kzui-btn-action pmd-kazen-checkout-action-button-clean[aria-disabled="true"] {
          opacity: .56 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }


        /* PMD_KAZEN_V26_UNIFY_ALL_CHECKOUT_CONTROLS_20260618
           One visual system for every checkout card control:
           - action buttons
           - split tabs
           - split stepper
           - assign rows
           - payment method tiles
           - discount/apply buttons
           Works in light and dark mode.
        */

        html body .pmd-kazen-checkout-waiter,
        html body .kazen-solid-modal-overlay.pmd-kazen-checkout-waiter,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] {
          --pmd-kz-btn-secondary-bg: rgba(255, 255, 255, .42);
          --pmd-kz-btn-secondary-bg-hover: rgba(255, 255, 255, .62);
          --pmd-kz-btn-secondary-color: #242320;
          --pmd-kz-btn-secondary-color-hover: #242320;
          --pmd-kz-btn-secondary-border: rgba(36, 35, 32, .20);
          --pmd-kz-btn-secondary-border-hover: rgba(36, 35, 32, .34);

          --pmd-kz-btn-primary-bg: #b85d59;
          --pmd-kz-btn-primary-bg-hover: #c86460;
          --pmd-kz-btn-primary-color: #fffaf3;
          --pmd-kz-btn-primary-border: rgba(143, 55, 51, .56);
          --pmd-kz-btn-primary-border-hover: rgba(143, 55, 51, .72);

          --pmd-kz-btn-close-bg: rgba(255, 255, 255, .44);
          --pmd-kz-btn-close-bg-hover: rgba(255, 255, 255, .62);
          --pmd-kz-btn-close-color: #242320;
          --pmd-kz-btn-close-border: rgba(36, 35, 32, .22);
          --pmd-kz-btn-close-border-hover: rgba(36, 35, 32, .34);
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] {
          --pmd-kz-btn-secondary-bg: rgba(8, 6, 4, .88);
          --pmd-kz-btn-secondary-bg-hover: rgba(246, 232, 200, .08);
          --pmd-kz-btn-secondary-color: #f6e8c8;
          --pmd-kz-btn-secondary-color-hover: #fff4d6;
          --pmd-kz-btn-secondary-border: rgba(198, 164, 93, .36);
          --pmd-kz-btn-secondary-border-hover: rgba(198, 164, 93, .52);

          --pmd-kz-btn-primary-bg: #b85d59;
          --pmd-kz-btn-primary-bg-hover: #c86460;
          --pmd-kz-btn-primary-color: #fffaf3;
          --pmd-kz-btn-primary-border: rgba(223, 104, 93, .72);
          --pmd-kz-btn-primary-border-hover: rgba(223, 104, 93, .88);

          --pmd-kz-btn-close-bg: rgba(246, 232, 200, .055);
          --pmd-kz-btn-close-bg-hover: rgba(246, 232, 200, .09);
          --pmd-kz-btn-close-color: #f6e8c8;
          --pmd-kz-btn-close-border: rgba(198, 164, 93, .30);
          --pmd-kz-btn-close-border-hover: rgba(198, 164, 93, .52);
        }

        /* Shared base for every clickable control inside checkout */
        html body .pmd-kazen-checkout-waiter button,
        html body .pmd-kazen-checkout-waiter [role="button"] {
          border-radius: 0 !important;
          box-shadow: none !important;
          filter: none !important;
          -webkit-appearance: none !important;
          appearance: none !important;
          background-image: none !important;
          transition:
            background-color .18s ease,
            border-color .18s ease,
            color .18s ease,
            transform .18s ease !important;
        }

        /* Close/back button */
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean {
          width: 3rem !important;
          height: 3rem !important;
          min-width: 3rem !important;
          min-height: 3rem !important;
          max-width: 3rem !important;
          max-height: 3rem !important;
          padding: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: var(--pmd-kz-btn-close-bg) !important;
          background-color: var(--pmd-kz-btn-close-bg) !important;
          color: var(--pmd-kz-btn-close-color) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-close-color) !important;
          border: 1px solid var(--pmd-kz-btn-close-border) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close:hover,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean:hover {
          background: var(--pmd-kz-btn-close-bg-hover) !important;
          background-color: var(--pmd-kz-btn-close-bg-hover) !important;
          color: var(--pmd-kz-btn-close-color) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-close-color) !important;
          border-color: var(--pmd-kz-btn-close-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* All secondary checkout controls */
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-choice-active,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-secondary pmd-kazen-checkout-action-secondary-clean,
        html body .pmd-kazen-checkout-waiter .kazen-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-apply,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kazen-split-stepper-btn,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-list pmd-kazen-assign-row,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile {
          background: var(--pmd-kz-btn-secondary-bg) !important;
          background-color: var(--pmd-kz-btn-secondary-bg) !important;
          color: var(--pmd-kz-btn-secondary-color) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-secondary-color) !important;
          border: 1px solid var(--pmd-kz-btn-secondary-border) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-choice-active:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-secondary:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-secondary:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-secondary pmd-kazen-checkout-action-secondary-clean:hover,
        html body .pmd-kazen-checkout-waiter .kazen-secondary:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-apply:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kazen-split-stepper-btn:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-list pmd-kazen-assign-row:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-kazen-method:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-tile pmd-payment-method-tile:hover {
          background: var(--pmd-kz-btn-secondary-bg-hover) !important;
          background-color: var(--pmd-kz-btn-secondary-bg-hover) !important;
          color: var(--pmd-kz-btn-secondary-color-hover) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-secondary-color-hover) !important;
          border-color: var(--pmd-kz-btn-secondary-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* Active tabs: same system, only stronger border/inner highlight */
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab-active,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-choice-active {
          border-color: var(--pmd-kz-btn-secondary-border-hover) !important;
          box-shadow: inset 0 0 0 1px var(--pmd-kz-btn-secondary-border) !important;
        }

        /* Primary checkout controls */
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-primary,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-primary pmd-kazen-checkout-action-primary-clean,
        html body .pmd-kazen-checkout-waiter .kazen-primary,
        html body .pmd-kazen-checkout-waiter button[data-pmd-kazen-button="primary"] {
          background: var(--pmd-kz-btn-primary-bg) !important;
          background-color: var(--pmd-kz-btn-primary-bg) !important;
          color: var(--pmd-kz-btn-primary-color) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-primary-color) !important;
          border: 1px solid var(--pmd-kz-btn-primary-border) !important;
          box-shadow: none !important;
          opacity: 1 !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-primary:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn-primary:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-primary pmd-kazen-checkout-action-primary-clean:hover,
        html body .pmd-kazen-checkout-waiter .kazen-primary:hover,
        html body .pmd-kazen-checkout-waiter button[data-pmd-kazen-button="primary"]:hover {
          background: var(--pmd-kz-btn-primary-bg-hover) !important;
          background-color: var(--pmd-kz-btn-primary-bg-hover) !important;
          color: var(--pmd-kz-btn-primary-color) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-primary-color) !important;
          border-color: var(--pmd-kz-btn-primary-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* Plus inside split stepper should be primary, minus stays secondary */
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kazen-split-stepper-btn[aria-label="Add guest"] {
          background: var(--pmd-kz-btn-primary-bg) !important;
          background-color: var(--pmd-kz-btn-primary-bg) !important;
          color: var(--pmd-kz-btn-primary-color) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-primary-color) !important;
          border-color: var(--pmd-kz-btn-primary-border) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-square pmd-kazen-split-stepper-btn[aria-label="Add guest"]:hover {
          background: var(--pmd-kz-btn-primary-bg-hover) !important;
          background-color: var(--pmd-kz-btn-primary-bg-hover) !important;
          border-color: var(--pmd-kz-btn-primary-border-hover) !important;
        }

        /* Icons inherit button color */
        html body .pmd-kazen-checkout-waiter button svg,
        html body .pmd-kazen-checkout-waiter button svg *,
        html body .pmd-kazen-checkout-waiter [role="button"] svg,
        html body .pmd-kazen-checkout-waiter [role="button"] svg * {
          color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        html body .pmd-kazen-checkout-waiter button:disabled,
        html body .pmd-kazen-checkout-waiter button[aria-disabled="true"],
        html body .pmd-kazen-checkout-waiter [role="button"][aria-disabled="true"] {
          opacity: .54 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }
`}</style>
      <style jsx global>{`

        /* PMD_KAZEN_V27_FINAL_CHECKOUT_CONTROL_CASCADE_20260618
           This style tag is intentionally inserted AFTER the old checkout style tag.
           It wins against old Kazen checkout card rules and unifies every control.
        */

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"],
        html body .kazen-solid-modal-overlay.pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] {
          --pmd-kz-btn-secondary-bg: rgba(255, 255, 255, .42);
          --pmd-kz-btn-secondary-bg-hover: rgba(255, 255, 255, .62);
          --pmd-kz-btn-secondary-color: #242320;
          --pmd-kz-btn-secondary-color-hover: #242320;
          --pmd-kz-btn-secondary-border: rgba(36, 35, 32, .20);
          --pmd-kz-btn-secondary-border-hover: rgba(36, 35, 32, .34);

          --pmd-kz-btn-primary-bg: #b85d59;
          --pmd-kz-btn-primary-bg-hover: #c86460;
          --pmd-kz-btn-primary-color: #fffaf3;
          --pmd-kz-btn-primary-border: rgba(143, 55, 51, .56);
          --pmd-kz-btn-primary-border-hover: rgba(143, 55, 51, .72);

          --pmd-kz-btn-close-bg: rgba(255, 255, 255, .44);
          --pmd-kz-btn-close-bg-hover: rgba(255, 255, 255, .62);
          --pmd-kz-btn-close-color: #242320;
          --pmd-kz-btn-close-border: rgba(36, 35, 32, .22);
          --pmd-kz-btn-close-border-hover: rgba(36, 35, 32, .34);

          /* Alias old V25 clean vars to the new final button system */
          --pmd-kz-clean-secondary-bg: var(--pmd-kz-btn-secondary-bg);
          --pmd-kz-clean-secondary-bg-hover: var(--pmd-kz-btn-secondary-bg-hover);
          --pmd-kz-clean-secondary-color: var(--pmd-kz-btn-secondary-color);
          --pmd-kz-clean-secondary-color-hover: var(--pmd-kz-btn-secondary-color-hover);
          --pmd-kz-clean-secondary-border: var(--pmd-kz-btn-secondary-border);
          --pmd-kz-clean-secondary-border-hover: var(--pmd-kz-btn-secondary-border-hover);

          --pmd-kz-clean-primary-bg: var(--pmd-kz-btn-primary-bg);
          --pmd-kz-clean-primary-bg-hover: var(--pmd-kz-btn-primary-bg-hover);
          --pmd-kz-clean-primary-color: var(--pmd-kz-btn-primary-color);
          --pmd-kz-clean-primary-border: var(--pmd-kz-btn-primary-border);
          --pmd-kz-clean-primary-border-hover: var(--pmd-kz-btn-primary-border-hover);

          --pmd-kz-clean-close-bg: var(--pmd-kz-btn-close-bg);
          --pmd-kz-clean-close-bg-hover: var(--pmd-kz-btn-close-bg-hover);
          --pmd-kz-clean-close-color: var(--pmd-kz-btn-close-color);
          --pmd-kz-clean-close-border: var(--pmd-kz-btn-close-border);
          --pmd-kz-clean-close-border-hover: var(--pmd-kz-btn-close-border-hover);
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"][data-pmd-checkout-theme="kazen_japanese"],
        html body .kazen-solid-modal-overlay.pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"][data-pmd-checkout-theme="kazen_japanese"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] {
          --pmd-kz-btn-secondary-bg: rgba(8, 6, 4, .88);
          --pmd-kz-btn-secondary-bg-hover: rgba(246, 232, 200, .08);
          --pmd-kz-btn-secondary-color: #f6e8c8;
          --pmd-kz-btn-secondary-color-hover: #fff4d6;
          --pmd-kz-btn-secondary-border: rgba(198, 164, 93, .36);
          --pmd-kz-btn-secondary-border-hover: rgba(198, 164, 93, .52);

          --pmd-kz-btn-primary-bg: #b85d59;
          --pmd-kz-btn-primary-bg-hover: #c86460;
          --pmd-kz-btn-primary-color: #fffaf3;
          --pmd-kz-btn-primary-border: rgba(223, 104, 93, .72);
          --pmd-kz-btn-primary-border-hover: rgba(223, 104, 93, .88);

          --pmd-kz-btn-close-bg: rgba(246, 232, 200, .055);
          --pmd-kz-btn-close-bg-hover: rgba(246, 232, 200, .09);
          --pmd-kz-btn-close-color: #f6e8c8;
          --pmd-kz-btn-close-border: rgba(198, 164, 93, .30);
          --pmd-kz-btn-close-border-hover: rgba(198, 164, 93, .52);
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] [role="button"] {
          border-radius: 0 !important;
          box-shadow: none !important;
          filter: none !important;
          -webkit-appearance: none !important;
          appearance: none !important;
          background-image: none !important;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease !important;
        }

        /* Close */
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-action-close,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.kazen-solid-close,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-checkout-close-clean {
          width: 48px !important;
          height: 48px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          max-width: 48px !important;
          max-height: 48px !important;
          padding: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: var(--pmd-kz-btn-close-bg) !important;
          background-color: var(--pmd-kz-btn-close-bg) !important;
          color: var(--pmd-kz-btn-close-color) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-close-color) !important;
          border: 1px solid var(--pmd-kz-btn-close-border) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-square pmd-kzui-btn-close pmd-kazen-waiter-back:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-action-close:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.kazen-solid-close:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-checkout-close-clean:hover {
          background: var(--pmd-kz-btn-close-bg-hover) !important;
          background-color: var(--pmd-kz-btn-close-bg-hover) !important;
          border-color: var(--pmd-kz-btn-close-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* Secondary controls: inactive tabs, split bill, assign rows, method tiles */
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="secondary"],
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-tab:not(.pmd-kazen-tab-active),
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-choice-active:not([data-pmd-kazen-button="primary"]),
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-apply,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-square pmd-kazen-split-stepper-btn:not([aria-label="Add guest"]),
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-list pmd-kazen-assign-row,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-tile pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-tile pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-tile pmd-payment-method-tile[role="button"] {
          background: var(--pmd-kz-btn-secondary-bg) !important;
          background-color: var(--pmd-kz-btn-secondary-bg) !important;
          color: var(--pmd-kz-btn-secondary-color) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-secondary-color) !important;
          border: 1px solid var(--pmd-kz-btn-secondary-border) !important;
          box-shadow: none !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="secondary"]:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-waiter-secondary:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-tab:not(.pmd-kazen-tab-active):hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-choice-active:not([data-pmd-kazen-button="primary"]):hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-apply:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-square pmd-kazen-split-stepper-btn:not([aria-label="Add guest"]):hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-list pmd-kazen-assign-row:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-tile pmd-kazen-method:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-tile pmd-payment-method-tile:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-tile pmd-payment-method-tile[role="button"]:hover {
          background: var(--pmd-kz-btn-secondary-bg-hover) !important;
          background-color: var(--pmd-kz-btn-secondary-bg-hover) !important;
          color: var(--pmd-kz-btn-secondary-color-hover) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-secondary-color-hover) !important;
          border-color: var(--pmd-kz-btn-secondary-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* Primary controls: active tabs + main actions + plus */
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="primary"],
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-tab-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-waiter-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-primary pmd-kazen-checkout-action-primary-clean,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.kazen-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-square pmd-kazen-split-stepper-btn[aria-label="Add guest"] {
          background: var(--pmd-kz-btn-primary-bg) !important;
          background-color: var(--pmd-kz-btn-primary-bg) !important;
          color: var(--pmd-kz-btn-primary-color) !important;
          -webkit-text-fill-color: var(--pmd-kz-btn-primary-color) !important;
          border: 1px solid var(--pmd-kz-btn-primary-border) !important;
          box-shadow: none !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button[data-pmd-kazen-button="primary"]:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-tab-active:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kazen-waiter-primary:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-primary pmd-kazen-checkout-action-primary-clean:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.kazen-primary:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button.pmd-kzui-btn-square pmd-kazen-split-stepper-btn[aria-label="Add guest"]:hover {
          background: var(--pmd-kz-btn-primary-bg-hover) !important;
          background-color: var(--pmd-kz-btn-primary-bg-hover) !important;
          border-color: var(--pmd-kz-btn-primary-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button svg,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button svg *,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] [role="button"] svg,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] [role="button"] svg * {
          color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button:disabled,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] button[aria-disabled="true"],
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] [role="button"][aria-disabled="true"] {
          opacity: .56 !important;
          cursor: not-allowed !important;
          transform: none !important;
          box-shadow: none !important;
        }

      `}</style>

      <style jsx global>{`
        /* PMD_KAZEN_V28_CANONICAL_CHECKOUT_BUTTON_SYSTEM_20260618
           Canonical isolated checkout button system.
           Every checkout control belongs to ONE of these types:
           - pmd-kzui-btn-square
           - pmd-kzui-btn-action
           - pmd-kzui-btn-segment
           - pmd-kzui-btn-list
           - pmd-kzui-btn-tile
           and ONE color role:
           - pmd-kzui-btn-primary
           - pmd-kzui-btn-secondary
        */

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] {
          --pmd-kzui-secondary-bg: rgba(255, 255, 255, .44);
          --pmd-kzui-secondary-bg-hover: rgba(255, 255, 255, .64);
          --pmd-kzui-secondary-text: #242320;
          --pmd-kzui-secondary-border: rgba(36, 35, 32, .22);
          --pmd-kzui-secondary-border-hover: rgba(36, 35, 32, .36);

          --pmd-kzui-primary-bg: #b85d59;
          --pmd-kzui-primary-bg-hover: #c86460;
          --pmd-kzui-primary-text: #fffaf3;
          --pmd-kzui-primary-border: rgba(143, 55, 51, .56);
          --pmd-kzui-primary-border-hover: rgba(143, 55, 51, .72);

          --pmd-kzui-close-bg: rgba(255, 255, 255, .44);
          --pmd-kzui-close-bg-hover: rgba(255, 255, 255, .64);
          --pmd-kzui-close-text: #242320;
          --pmd-kzui-close-border: rgba(36, 35, 32, .22);
          --pmd-kzui-close-border-hover: rgba(36, 35, 32, .36);
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] {
          --pmd-kzui-secondary-bg: rgba(8, 6, 4, .88);
          --pmd-kzui-secondary-bg-hover: rgba(246, 232, 200, .08);
          --pmd-kzui-secondary-text: #f6e8c8;
          --pmd-kzui-secondary-border: rgba(198, 164, 93, .36);
          --pmd-kzui-secondary-border-hover: rgba(198, 164, 93, .54);

          --pmd-kzui-primary-bg: #b85d59;
          --pmd-kzui-primary-bg-hover: #c86460;
          --pmd-kzui-primary-text: #fffaf3;
          --pmd-kzui-primary-border: rgba(223, 104, 93, .72);
          --pmd-kzui-primary-border-hover: rgba(223, 104, 93, .88);

          --pmd-kzui-close-bg: rgba(246, 232, 200, .055);
          --pmd-kzui-close-bg-hover: rgba(246, 232, 200, .09);
          --pmd-kzui-close-text: #f6e8c8;
          --pmd-kzui-close-border: rgba(198, 164, 93, .30);
          --pmd-kzui-close-border-hover: rgba(198, 164, 93, .52);
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn {
          border-radius: 0 !important;
          box-shadow: none !important;
          filter: none !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          background-image: none !important;
          text-transform: uppercase !important;
          text-align: center !important;
          line-height: 1.08 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-secondary,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn[data-pmd-kazen-button="secondary"],
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-list,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-tile,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-square:not([aria-label="Add guest"]):not(.pmd-kzui-btn-close) {
          background: var(--pmd-kzui-secondary-bg) !important;
          background-color: var(--pmd-kzui-secondary-bg) !important;
          color: var(--pmd-kzui-secondary-text) !important;
          -webkit-text-fill-color: var(--pmd-kzui-secondary-text) !important;
          border: 1px solid var(--pmd-kzui-secondary-border) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-primary,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn[data-pmd-kazen-button="primary"],
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-tab-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-square[aria-label="Add guest"] {
          background: var(--pmd-kzui-primary-bg) !important;
          background-color: var(--pmd-kzui-primary-bg) !important;
          color: var(--pmd-kzui-primary-text) !important;
          -webkit-text-fill-color: var(--pmd-kzui-primary-text) !important;
          border: 1px solid var(--pmd-kzui-primary-border) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-close {
          width: 48px !important;
          height: 48px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          max-width: 48px !important;
          max-height: 48px !important;
          padding: 0 !important;
          background: var(--pmd-kzui-close-bg) !important;
          background-color: var(--pmd-kzui-close-bg) !important;
          color: var(--pmd-kzui-close-text) !important;
          -webkit-text-fill-color: var(--pmd-kzui-close-text) !important;
          border: 1px solid var(--pmd-kzui-close-border) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-action {
          width: 100% !important;
          min-height: 54px !important;
          padding: .95rem 1rem !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-segment {
          min-height: 58px !important;
          padding: .85rem .8rem !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-square {
          width: 52px !important;
          min-width: 52px !important;
          height: 52px !important;
          min-height: 52px !important;
          padding: 0 !important;
          font-size: 1.25rem !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-list {
          width: 100% !important;
          min-height: 57px !important;
          padding: .95rem 1.05rem !important;
          justify-content: space-between !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-tile {
          min-width: 84px !important;
          min-height: 60px !important;
          padding: .6rem !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-secondary:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn[data-pmd-kazen-button="secondary"]:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-list:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-tile:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-square:not([aria-label="Add guest"]):not(.pmd-kzui-btn-close):hover {
          background: var(--pmd-kzui-secondary-bg-hover) !important;
          background-color: var(--pmd-kzui-secondary-bg-hover) !important;
          border-color: var(--pmd-kzui-secondary-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-primary:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn[data-pmd-kazen-button="primary"]:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-tab-active:hover,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-square[aria-label="Add guest"]:hover {
          background: var(--pmd-kzui-primary-bg-hover) !important;
          background-color: var(--pmd-kzui-primary-bg-hover) !important;
          border-color: var(--pmd-kzui-primary-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn-close:hover {
          background: var(--pmd-kzui-close-bg-hover) !important;
          background-color: var(--pmd-kzui-close-bg-hover) !important;
          border-color: var(--pmd-kzui-close-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn svg,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn svg *,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn span {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn:disabled,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kzui-btn[aria-disabled="true"] {
          opacity: .56 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }
      `}</style>

      <style jsx global>{`
        /* PMD_KAZEN_V29_FINAL_PRIMARY_SECONDARY_BUTTON_CONTRACT_20260618

           Final button contract for Kazen checkout cards.

           TYPE 1 / PRIMARY / RED:
           Confirm, Send to kitchen, Pay in full, Pay, Confirm cash payment,
           Review split, Pay my share.

           TYPE 2 / SECONDARY:
           Continue ordering, Split bill, Select payer, Link, QR,
           Cancel/Close text buttons, and split tabs:
           SPLIT EQUALLY / BY ORDER ITEMS / BY SHARES.

           Important:
           Tabs are secondary buttons, even when active.
        */

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"],
        html[data-theme="kazen_japanese"] body {
          --pmd-kz-action-height: 48px;
          --pmd-kz-action-radius: 0px;
          --pmd-kz-action-font: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          --pmd-kz-action-size: .82rem;
          --pmd-kz-action-weight: 850;
          --pmd-kz-action-spacing: .12em;

          --pmd-kz-primary-bg: #b85d59;
          --pmd-kz-primary-bg-hover: #c86460;
          --pmd-kz-primary-text: #fffaf3;
          --pmd-kz-primary-border: rgba(143, 55, 51, .56);
          --pmd-kz-primary-border-hover: rgba(143, 55, 51, .72);

          --pmd-kz-secondary-bg: rgba(255, 255, 255, .44);
          --pmd-kz-secondary-bg-hover: rgba(255, 255, 255, .64);
          --pmd-kz-secondary-text: #242320;
          --pmd-kz-secondary-border: rgba(36, 35, 32, .22);
          --pmd-kz-secondary-border-hover: rgba(36, 35, 32, .36);
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] {
          --pmd-kz-secondary-bg: rgba(8, 6, 4, .88);
          --pmd-kz-secondary-bg-hover: rgba(246, 232, 200, .08);
          --pmd-kz-secondary-text: #f6e8c8;
          --pmd-kz-secondary-border: rgba(198, 164, 93, .36);
          --pmd-kz-secondary-border-hover: rgba(198, 164, 93, .54);

          --pmd-kz-primary-bg: #b85d59;
          --pmd-kz-primary-bg-hover: #c86460;
          --pmd-kz-primary-text: #fffaf3;
          --pmd-kz-primary-border: rgba(223, 104, 93, .72);
          --pmd-kz-primary-border-hover: rgba(223, 104, 93, .88);
        }

        /* Shared action button base: same size, same edge, same typography, same hover system */
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] :is(
          button[data-pmd-kazen-button],
          .pmd-kzui-btn-action,
          .pmd-kazen-checkout-action-button-clean,
          .pmd-kazen-tab,
          .pmd-kazen-tabs > button,
          .pmd-themed-button,
          [data-pmd-themed-button],
          [data-pmd-stripe-native-button],
          button[class*="bg-primary"][class*="w-full"],
          button[style*="rgb(23, 18, 14)"],
          button[style*="rgb(248, 240, 223)"]
        ) {
          min-height: var(--pmd-kz-action-height) !important;
          height: var(--pmd-kz-action-height) !important;
          border-radius: var(--pmd-kz-action-radius) !important;
          box-shadow: none !important;
          filter: none !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          background-image: none !important;
          font-family: var(--pmd-kz-action-font) !important;
          font-size: var(--pmd-kz-action-size) !important;
          font-weight: var(--pmd-kz-action-weight) !important;
          letter-spacing: var(--pmd-kz-action-spacing) !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          padding: .82rem 1rem !important;
          opacity: 1 !important;
          transform: none !important;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease !important;
        }

        /* TYPE 1: PRIMARY RED */
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] :is(
          button[data-pmd-kazen-button="primary"]:not(.pmd-kazen-tab),
          .pmd-kzui-btn-primary:not(.pmd-kazen-tab),
          .pmd-kazen-checkout-action-primary-clean,
          .pmd-themed-button[data-pmd-themed-button="primary"],
          [data-pmd-themed-button="primary"],
          [data-pmd-stripe-native-button="1"],
          button[class*="bg-primary"][class*="w-full"],
          button[style*="rgb(23, 18, 14)"],
          button[style*="rgb(248, 240, 223)"]
        ) {
          background: var(--pmd-kz-primary-bg) !important;
          background-color: var(--pmd-kz-primary-bg) !important;
          color: var(--pmd-kz-primary-text) !important;
          -webkit-text-fill-color: var(--pmd-kz-primary-text) !important;
          border: 1px solid var(--pmd-kz-primary-border) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] :is(
          button[data-pmd-kazen-button="primary"]:not(.pmd-kazen-tab),
          .pmd-kzui-btn-primary:not(.pmd-kazen-tab),
          .pmd-kazen-checkout-action-primary-clean,
          .pmd-themed-button[data-pmd-themed-button="primary"],
          [data-pmd-themed-button="primary"],
          [data-pmd-stripe-native-button="1"],
          button[class*="bg-primary"][class*="w-full"],
          button[style*="rgb(23, 18, 14)"],
          button[style*="rgb(248, 240, 223)"]
        ):not(:disabled):not([aria-disabled="true"]):hover {
          background: var(--pmd-kz-primary-bg-hover) !important;
          background-color: var(--pmd-kz-primary-bg-hover) !important;
          border-color: var(--pmd-kz-primary-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* TYPE 2: SECONDARY. Includes split tabs, even active tab. */
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] :is(
          button[data-pmd-kazen-button="secondary"],
          .pmd-kzui-btn-secondary,
          .pmd-kazen-checkout-action-secondary-clean,
          .pmd-kazen-tab,
          .pmd-kazen-tabs > button
        ) {
          background: var(--pmd-kz-secondary-bg) !important;
          background-color: var(--pmd-kz-secondary-bg) !important;
          color: var(--pmd-kz-secondary-text) !important;
          -webkit-text-fill-color: var(--pmd-kz-secondary-text) !important;
          border: 1px solid var(--pmd-kz-secondary-border) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] :is(
          button[data-pmd-kazen-button="secondary"],
          .pmd-kzui-btn-secondary,
          .pmd-kazen-checkout-action-secondary-clean,
          .pmd-kazen-tab,
          .pmd-kazen-tabs > button
        ):not(:disabled):not([aria-disabled="true"]):hover {
          background: var(--pmd-kz-secondary-bg-hover) !important;
          background-color: var(--pmd-kz-secondary-bg-hover) !important;
          color: var(--pmd-kz-secondary-text) !important;
          -webkit-text-fill-color: var(--pmd-kz-secondary-text) !important;
          border-color: var(--pmd-kz-secondary-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* Active tab is still Type 2, only stronger border. No red. */
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-tab-active {
          background: var(--pmd-kz-secondary-bg-hover) !important;
          background-color: var(--pmd-kz-secondary-bg-hover) !important;
          color: var(--pmd-kz-secondary-text) !important;
          -webkit-text-fill-color: var(--pmd-kz-secondary-text) !important;
          border-color: var(--pmd-kz-secondary-border-hover) !important;
          outline: 1px solid var(--pmd-kz-secondary-border-hover) !important;
          outline-offset: -2px !important;
        }

        /* Make all action buttons same visual height in rows/grids */
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-actions :is(button, [role="button"]),
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-checkout-actions-clean :is(button, [role="button"]),
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] .pmd-kazen-tabs > button {
          min-height: var(--pmd-kz-action-height) !important;
          height: var(--pmd-kz-action-height) !important;
        }

        /* Icons inside all buttons must inherit button color */
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] :is(
          button[data-pmd-kazen-button],
          .pmd-kzui-btn-action,
          .pmd-kazen-checkout-action-button-clean,
          .pmd-themed-button,
          [data-pmd-themed-button],
          [data-pmd-stripe-native-button]
        ) :is(svg, svg *, span) {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] :is(
          button[data-pmd-kazen-button],
          .pmd-kzui-btn-action,
          .pmd-kazen-checkout-action-button-clean,
          .pmd-themed-button,
          [data-pmd-themed-button],
          [data-pmd-stripe-native-button]
        ):disabled,
        html body .pmd-kazen-checkout-waiter[data-pmd-checkout-theme="kazen_japanese"] :is(
          button[data-pmd-kazen-button],
          .pmd-kzui-btn-action,
          .pmd-kazen-checkout-action-button-clean,
          .pmd-themed-button,
          [data-pmd-themed-button],
          [data-pmd-stripe-native-button]
        )[aria-disabled="true"] {
          opacity: .56 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }
      `}</style>





    </div>
  )
}
