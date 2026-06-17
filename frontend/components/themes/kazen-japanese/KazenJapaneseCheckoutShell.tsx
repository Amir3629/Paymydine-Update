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

  // PMD_FIX_KAZEN_CHECKOUT_RESOLVE_MODE_FROM_DOM_20260613
  const resolvedKazenCheckoutMode =
    isDarkTheme ||
    (typeof window !== "undefined" && (
      new URLSearchParams(window.location.search).get("mode") === "dark" ||
      window.localStorage.getItem("pmd-kazen-japanese-mode") === "dark" ||
      document.documentElement.getAttribute("data-pmd-kazen-mode") === "dark" ||
      document.body?.getAttribute("data-pmd-kazen-mode") === "dark"
    ))
      ? "dark"
      : "light"

  const orderTotal = Number(submittedSnapshot?.remainingAmount ?? submittedSnapshot?.orderTotal ?? submittedSnapshot?.total ?? tableDraftTotal ?? finalTotal ?? 0)
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
        <Actions two>
          <KazenButton variant="secondary" onClick={onClose}>Continue ordering</KazenButton>
          <KazenButton variant="primary" onClick={handleConfirmMyItems}>Confirm</KazenButton>
        </Actions>
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
        <Actions two>
          <KazenButton variant="secondary" onClick={onClose}>Continue ordering</KazenButton>
          <KazenButton variant="primary" onClick={handleSubmitTableDraft}>Send to kitchen</KazenButton>
        </Actions>
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
        <Card>
          <Line label="Order total" value={orderTotal} strong />
        </Card>
        <div>
          <h3 className="pmd-kazen-section-title">Order Summary</h3>
          <ItemRows items={submittedItems} />
        </div>
        <Actions>
          <KazenButton variant="primary" onClick={() => setCheckoutStep?.("payment")}>Pay in full</KazenButton>
          <KazenButton onClick={() => startSplitFlow?.("equal")}><Users className="h-4 w-4" /> Split bill</KazenButton>
          <KazenButton onClick={onClose}>Continue ordering</KazenButton>
        </Actions>
      </>
    )
  } else if (checkoutStep === "payment") {
    title = "Payment"
    eyebrow = "Ready to pay"
    content = (
      <>
        <Card>
          <div className="pmd-kazen-payment-intro">
            <span><CreditCard className="h-5 w-5" /></span>
            <div>
              <strong>{paymentHeader}</strong>
              <p>{money(paymentPayableTotal)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <Line label={selectedSplitPerson ? "Share amount" : "Items total"} value={paymentBaseAmount} />
          {paymentTipAmount > 0 && <Line label="Tip" value={paymentTipAmount} />}
          {paymentCouponDiscount > 0 && <div className="pmd-kazen-line pmd-kazen-discount"><span>Coupon</span><strong>-{money(paymentCouponDiscount)}</strong></div>}
          <Line label="Payable total" value={paymentPayableTotal} strong />
        </Card>
        {tipEnabled && (
          <Card>
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
          </Card>
        )}
        <Card>
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
        </Card>
        <PaymentMethods
          loadingPayments={loadingPayments}
          visiblePaymentMethods={visiblePaymentMethods}
          selectedPaymentMethod={selectedPaymentMethod}
          onPaymentMethodSelect={onPaymentMethodSelect}
          isDarkTheme={isDarkTheme}
        />
        {canRenderPaymentMethodDetail(selectedPaymentMethod) && (
          <Card>
            {renderPaymentForm?.()}
          </Card>
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
              {(splitSourceItems || []).map((item: any, index: number) => {
                const assignedIndex = itemAssignments?.[item.key]
                const guestName = assignedIndex === undefined || assignedIndex === null ? "Unassigned" : (people[assignedIndex]?.name || `Guest ${Number(assignedIndex) + 1}`)
                return (
                  <button
                    key={item.key || index}
                    type="button"
                    className="pmd-kazen-assign-row"
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
        <KazenButton variant="primary" disabled={!canConfirmSplitMethod} onClick={goToSplitReview}>Review split</KazenButton>
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
                  <KazenButton variant="primary" onClick={() => setCheckoutStep?.("payment")}>Pay my share</KazenButton>
                ) : (
                  <KazenButton onClick={() => setSelectedSplitPersonId?.(person.id)}>Select payer</KazenButton>
                )}
              </Card>
            )
          })}
        </div>
        <Actions two>
          <KazenButton onClick={onPaymentLinks}><Link2 className="h-4 w-4" /> Link</KazenButton>
          <KazenButton onClick={onQrShare}><QrCode className="h-4 w-4" /> QR</KazenButton>
        </Actions>
      </>
    )
  }

  return (
    <div data-pmd-checkout-theme-root="1" data-pmd-checkout-theme="kazen_japanese" data-pmd-kazen-checkout-shell="1" data-pmd-kazen-checkout-mode={resolvedKazenCheckoutMode} className="kazen-solid-modal-overlay pmd-kazen-checkout-waiter" role="dialog" aria-modal="true">
      <div className="kazen-solid-modal-panel pmd-kazen-checkout-panel" data-kazen-solid-panel="1">
        <div className="kazen-solid-modal-sheet" aria-hidden="true" />
        <div className="kazen-solid-modal-content pmd-kazen-checkout-content">
          <ModalHead title={title} eyebrow={eyebrow} onBack={goBack} />
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

        html body .pmd-kazen-method-grid,
        html body .pmd-kazen-tabs {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .65rem !important;
        }

        html body .pmd-kazen-method,
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

        html body .pmd-kazen-method-active,
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
        html body .pmd-kazen-assign-row,
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

        html body .pmd-kazen-assign-row {
          display: grid !important;
          grid-template-columns: 1fr auto !important;
          gap: .25rem .75rem !important;
          text-align: left !important;
          width: 100% !important;
        }

        html body .pmd-kazen-assign-row em {
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

          html body .pmd-kazen-method-grid,
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
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back {
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
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back svg * {
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

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-back {
          background: rgba(8, 6, 4, .92) !important;
          border: 1px solid rgba(198,164,93,.46) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-back svg * {
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
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-apply {
          background: rgba(12, 9, 6, .86) !important;
          border: 1px solid rgba(198,164,93,.36) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-choice-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-method-active,
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

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-payment-method-tile {
          background: rgba(28, 14, 10, .64) !important;
          border-color: rgba(223,104,93,.40) !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-payment-method-tile[aria-label="Apple Pay"] img,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-payment-method-tile[aria-label="Wero"] img,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-payment-method-tile[aria-label="Cash"] img {
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
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-method-grid {
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

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-method {
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

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back,
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

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back:hover,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close:hover {
          transform: translateY(-1px) !important;
          background: rgba(255,255,255,.82) !important;
          border-color: rgba(184, 93, 89, .42) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-back-icon,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-back-icon *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back svg * {
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
        html body .pmd-kazen-checkout-waiter .pmd-kazen-method-grid,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tabs,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-actions,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-payment-action,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-list {
          animation: pmdKazenCheckoutBlockIn .28s cubic-bezier(.22, 1, .36, 1) both !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back {
          position: relative !important;
          border-radius: 0 !important;
          overflow: hidden !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back .pmd-kazen-back-icon,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back .pmd-kazen-back-icon *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back svg * {
          width: 22px !important;
          height: 22px !important;
          stroke: #242320 !important;
          color: #242320 !important;
          fill: none !important;
          opacity: 1 !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-back:active,
        html body .pmd-kazen-checkout-waiter button:active,
        html body .pmd-kazen-checkout-waiter [role="button"]:active {
          transform: translateY(0) scale(.985) !important;
        }

        html body .pmd-kazen-checkout-waiter button:not(.pmd-kazen-waiter-back),
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-btn,
        html body .pmd-kazen-checkout-waiter .kazen-primary,
        html body .pmd-kazen-checkout-waiter .kazen-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-assign-row,
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

        html body .pmd-kazen-checkout-waiter button:not(:disabled):not(.pmd-kazen-waiter-back):hover,
        html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-assign-row:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-method:hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab:hover {
          transform: translateY(-1px) !important;
          border-color: rgba(184, 93, 89, .44) !important;
          box-shadow: 0 10px 24px rgba(36, 30, 24, .07) !important;
        }

        html body .pmd-kazen-checkout-waiter button:not(.pmd-kazen-waiter-back):focus-visible,
        html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile:focus-visible,
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
        html body .pmd-kazen-checkout-waiter .pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-apply,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tip-grid button,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-assign-row {
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
        html body .pmd-kazen-checkout-waiter .pmd-kazen-method-active,
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
        html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-method *,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab * {
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
          stroke: currentColor !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-method-grid,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tabs,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tip-grid {
          gap: 10px !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile {
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

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-back .pmd-kazen-back-icon,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-back .pmd-kazen-back-icon *,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-back svg,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-waiter-back svg * {
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
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-apply,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tip-grid button,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-assign-row {
          background: rgba(12, 9, 6, .86) !important;
          border-color: rgba(198,164,93,.36) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-tab-active,
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"] .pmd-kazen-method-active,
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

      `}</style>
    </div>
  )
}
