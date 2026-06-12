"use client"

import React from "react"
import { ArrowLeft, Check, CreditCard, Link2, Minus, Plus, QrCode, Users } from "lucide-react"

import { formatCurrency } from "@/lib/currency"
import { iconForPayment } from "@/lib/payment-icons"
import { canRenderPaymentMethodDetail } from "@/features/checkout/payment-method-utils"

type DisplayItem = {
  item?: { name?: string; nameKey?: string; price?: number }
  name?: string
  quantity?: number
  qty?: number
  price?: number
  unit_price?: number
  amount?: number
  total?: number
  subtotal?: number
  menu_name?: string
  item_name?: string
  key?: string
  __pmdDisplayName?: string
  __pmdDisplaySubtotal?: number
}

type SplitPerson = {
  id: string
  name: string
  avatar?: string
  total?: number
  status?: string
  items?: Array<{ name: string; amount: number }>
  tax?: number
}

type KazenJapaneseCheckoutShellProps = any

const money = (value: number | string | null | undefined) => {
  const numeric = Number(value ?? 0)
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0)
}

const getQuantity = (item: DisplayItem) => Math.max(1, Number(item?.quantity || item?.qty || 1))

const getItemName = (item: DisplayItem, fallback = "Item") =>
  String(item?.__pmdDisplayName || item?.name || item?.item?.name || item?.menu_name || item?.item_name || fallback)

const getAmount = (item: DisplayItem) => {
  const explicitTotal = Number(item?.__pmdDisplaySubtotal ?? item?.subtotal ?? item?.total ?? item?.amount)
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal

  const unit = Number(item?.price ?? item?.unit_price ?? item?.item?.price ?? 0)
  return Number.isFinite(unit) ? unit * getQuantity(item) : 0
}

const getPaymentIconSize = (code: string) => {
  const normalized = String(code || "").toLowerCase()
  if (normalized === "wero") return { width: 58, height: 28 }
  if (normalized === "apple_pay" || normalized === "google_pay") return { width: 62, height: 32 }
  if (normalized === "paypal") return { width: 44, height: 44 }
  if (normalized === "cod") return { width: 42, height: 42 }
  return { width: 48, height: 34 }
}

function ModalHead({ title, eyebrow, onBack }: { title: string; eyebrow?: string; onBack: () => void }) {
  return (
    <div className="kazen-solid-modal-head pmd-kazen-checkout-head">
      <div>
        {eyebrow ? <div className="kazen-solid-eyebrow">{eyebrow}</div> : null}
        <h2>{title}</h2>
      </div>
      <button type="button" data-pmd-kazen-back="1" className="pmd-kazen-waiter-back" onClick={onBack} aria-label="Back">
        <ArrowLeft className="h-5 w-5 pmd-kazen-back-icon" strokeWidth={1.9} />
      </button>
    </div>
  )
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`pmd-kazen-checkout-card ${className}`}>{children}</section>
}

function Line({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={strong ? "pmd-kazen-line pmd-kazen-line-strong" : "pmd-kazen-line"}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
    </div>
  )
}

function ItemRows({ items }: { items: DisplayItem[] }) {
  const safeItems = Array.isArray(items) ? items : []

  if (safeItems.length === 0) {
    return (
      <Card>
        <span className="pmd-kazen-muted">No items yet</span>
      </Card>
    )
  }

  return (
    <div className="pmd-kazen-list">
      {safeItems.map((item, index) => (
        <div className="pmd-kazen-cart-line" key={`${getItemName(item)}-${index}`}>
          <span>{getQuantity(item)}x {getItemName(item, `Item ${index + 1}`)}</span>
          <strong>{money(getAmount(item))}</strong>
        </div>
      ))}
    </div>
  )
}

function Actions({ children, two = false }: { children: React.ReactNode; two?: boolean }) {
  return <div className={two ? "pmd-kazen-actions pmd-kazen-actions-two" : "pmd-kazen-actions"}>{children}</div>
}

function KazenButton({
  variant = "secondary",
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  return (
    <button
      {...props}
      data-pmd-kazen-button={variant}
      className={`pmd-kazen-waiter-btn pmd-kazen-waiter-btn-${variant} ${variant === "primary" ? "pmd-kazen-waiter-primary" : "pmd-kazen-waiter-secondary"} ${className}`.trim()}
    >
      {children}
    </button>
  )
}

function SplitTabs({ splitMethod, chooseSplitMethod }: any) {
  const tabs: Array<[string, React.ReactNode]> = [
    ["equal", "Split equally"],
    ["items", <>By order<br />items</>],
    ["shares", "By shares"],
  ]

  return (
    <div className="pmd-kazen-tabs">
      {tabs.map(([method, label]) => (
        <button
          key={method}
          type="button"
          data-pmd-kazen-button={splitMethod === method ? "primary" : "secondary"}
          onClick={() => chooseSplitMethod?.(method)}
          className={splitMethod === method ? "pmd-kazen-waiter-secondary pmd-kazen-tab pmd-kazen-tab-active" : "pmd-kazen-waiter-secondary pmd-kazen-tab"}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PeopleControls({ splitGuestCount = 2, addSplitGuest, removeSplitGuest }: any) {
  return (
    <div className="pmd-kazen-qty kazen-qty">
      <button type="button" aria-label="Remove guest" disabled={splitGuestCount <= 2} onClick={removeSplitGuest}>
        <Minus className="h-4 w-4" />
      </button>
      <strong>{splitGuestCount} people</strong>
      <button type="button" aria-label="Add guest" disabled={splitGuestCount >= 10} onClick={addSplitGuest}>
        <Plus className="h-4 w-4" />
      </button>
    </div>
  )
}

function GuestChips({ guests = [] }: { guests?: SplitPerson[] }) {
  if (!Array.isArray(guests) || guests.length === 0) return null

  return (
    <div className="pmd-kazen-chip-row">
      {guests.map((guest, index) => (
        <span key={`${guest.name}-${index}`} className="pmd-kazen-chip">
          <b>{guest.avatar || guest.name?.slice(0, 1) || index + 1}</b>
          {guest.name}
        </span>
      ))}
    </div>
  )
}

function PaymentMethods({ loadingPayments, visiblePaymentMethods, selectedPaymentMethod, onPaymentMethodSelect, isDarkTheme }: any) {
  const methods = Array.isArray(visiblePaymentMethods) ? visiblePaymentMethods : []

  return (
    <Card>
      <h3 className="pmd-kazen-section-title">Payment Methods</h3>
      {loadingPayments ? (
        <p className="pmd-kazen-muted">Loading payment methods...</p>
      ) : methods.length === 0 ? (
        <p className="pmd-kazen-muted">No payment methods available</p>
      ) : (
        <div className="pmd-kazen-method-grid">
          {methods.map((method: any) => {
            const code = String(method.code || "")
            const size = getPaymentIconSize(code)
            const active = selectedPaymentMethod === method.code
            const src =
              code === "card"
                ? (isDarkTheme ? "/images/payments/card-dark.svg" : "/images/payments/card-light.svg")
                : code === "paypal"
                  ? "/images/payments/paypal.png"
                  : code === "google_pay"
                    ? "/images/payments/google_pay.png"
                    : iconForPayment(code)

            return (
              <button
                key={code}
                type="button"
                onClick={() => onPaymentMethodSelect?.(code)}
                className={active ? "pmd-kazen-method pmd-kazen-method-active" : "pmd-kazen-method"}
                aria-pressed={active}
              >
                <img src={src} alt={method.name || code} width={size.width} height={size.height} />
              </button>
            )
          })}
        </div>
      )}
    </Card>
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
        <Card>
          <Line label="Subtotal" value={subtotal} />
          <Line label="Total" value={finalTotal} strong />
        </Card>
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
        <Card>
          <Line label="Order total" value={tableDraftTotal} strong />
        </Card>
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
    <div data-pmd-kazen-checkout-shell="1" className="kazen-solid-modal-overlay pmd-kazen-checkout-waiter" role="dialog" aria-modal="true">
      <div className="kazen-solid-modal-panel pmd-kazen-checkout-panel" data-kazen-solid-panel="1">
        <div className="kazen-solid-modal-sheet" aria-hidden="true" />
        <div className="kazen-solid-modal-content pmd-kazen-checkout-content">
          <ModalHead title={title} eyebrow={eyebrow} onBack={goBack} />
          <div className="pmd-kazen-checkout-body">
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

      `}</style>
    </div>
  )
}
