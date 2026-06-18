"use client"

import React from "react"
import { Check, CreditCard, Link2, QrCode, Users } from "lucide-react"

import { canRenderPaymentMethodDetail } from "@/features/checkout/payment-method-utils"
import type { SplitPerson } from "@/features/checkout/types"
import { formatCurrency } from "@/lib/currency"
import { iconForPayment } from "@/lib/payment-icons"

type KazenJapaneseCheckoutShellProps = any

// PMD_KAZEN_V31_SAFE_ITEM_TOTAL_HELPER_20260618
function pmdKazenSafeNumber(value: any): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function pmdKazenItemTotal(items: any[]): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, item) => {
    const qty = pmdKazenSafeNumber(item?.quantity ?? item?.qty ?? 1)
    const price = pmdKazenSafeNumber(item?.price ?? item?.unit_price ?? item?.unitPrice ?? item?.total_price ?? item?.totalPrice ?? 0)
    const lineTotal = pmdKazenSafeNumber(item?.total ?? item?.line_total ?? item?.lineTotal ?? 0)
    return sum + (lineTotal > 0 ? lineTotal : price * Math.max(qty, 1))
  }, 0)
}

function pmdKazenPreferVisibleTotal(total: any, items: any[]): number {
  const current = pmdKazenSafeNumber(total)
  const itemTotal = pmdKazenItemTotal(items)
  return current > 0 ? current : itemTotal
}


type ButtonVariant = "primary" | "secondary"

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
  id?: string | number
  __pmdDisplayName?: string
  __pmdDisplaySubtotal?: number
}

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

function useKazenCheckoutMode(isDarkTheme?: boolean) {
  return React.useMemo(() => {
    if (isDarkTheme) return "dark"
    if (typeof window === "undefined") return "light"

    const isDarkValue = (value: unknown) => String(value || "").toLowerCase() === "dark"

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
        isDarkValue(document.body?.getAttribute("data-pmd-kazen-mode")) ||
        document.documentElement.classList.contains("dark") ||
        document.body?.classList.contains("dark")
      ) {
        return "dark"
      }
    } catch {}

    try {
      for (const iframe of Array.from(document.querySelectorAll("iframe"))) {
        try {
          const doc = (iframe as HTMLIFrameElement).contentDocument
          const href = (iframe as HTMLIFrameElement).contentWindow?.location?.href || ""
          if (!doc) continue

          const looksLikeKazen = href.includes("/themes/kazen-japanese") || Boolean(doc.querySelector(".kazen-page, .kazen-shell"))
          if (!looksLikeKazen) continue

          if (
            isDarkValue(doc.documentElement.getAttribute("data-pmd-kazen-mode")) ||
            isDarkValue(doc.body?.getAttribute("data-pmd-kazen-mode")) ||
            doc.documentElement.classList.contains("dark") ||
            doc.body?.classList.contains("dark")
          ) {
            return "dark"
          }
        } catch {}
      }
    } catch {}

    return "light"
  }, [isDarkTheme])
}

function CheckoutButton({
  variant = "secondary",
  children,
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const cleanVariant: ButtonVariant = variant === "primary" ? "primary" : "secondary"

  return (
    <button
      {...props}
      type={type}
      data-kzco-button={cleanVariant}
      className={["kzco-btn", "kzco-btn-action", `kzco-btn-${cleanVariant}`, className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  )
}

function SquareButton({
  variant = "secondary",
  children,
  className = "",
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const cleanVariant: ButtonVariant = variant === "primary" ? "primary" : "secondary"

  return (
    <button
      {...props}
      type={type}
      data-kzco-button={cleanVariant}
      className={["kzco-btn", "kzco-btn-square", `kzco-btn-${cleanVariant}`, className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  )
}

function ModalHead({ title, eyebrow, onBack }: { title: string; eyebrow?: string; onBack: () => void }) {
  return (
    <header className="kzco-head">
      <div className="kzco-title-wrap">
        {eyebrow ? <span className="kzco-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      <SquareButton aria-label="Close" onClick={onBack} className="kzco-close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </SquareButton>
    </header>
  )
}

function ButtonRow({ children, columns = 1 }: { children: React.ReactNode; columns?: 1 | 2 | 3 }) {
  return <div className={`kzco-actions kzco-actions-${columns}`}>{children}</div>
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={["kzco-card", className].filter(Boolean).join(" ")}>{children}</section>
}

function Line({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={strong ? "kzco-line kzco-line-strong" : "kzco-line"}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
    </div>
  )
}

function ItemRows({ items }: { items: DisplayItem[] }) {
  const safeItems = Array.isArray(items) ? items : []

  if (safeItems.length === 0) {
    return <p className="kzco-muted">No items yet</p>
  }

  return (
    <div className="kzco-list kzco-items-list" aria-label="Order items">
      {safeItems.map((item, index) => (
        <div className="kzco-cart-line" key={`${getItemName(item)}-${index}`}>
          <span>{getQuantity(item)}x {getItemName(item, `Item ${index + 1}`)}</span>
          <strong>{money(getAmount(item))}</strong>
        </div>
      ))}
    </div>
  )
}

function SplitTabs({ splitMethod, chooseSplitMethod }: any) {
  const tabs: Array<[string, React.ReactNode]> = [
    ["equal", "Split equally"],
    ["items", <>By order<br />items</>],
    ["shares", "By shares"],
  ]

  return (
    <div className="kzco-tabs" role="tablist" aria-label="Split method">
      {tabs.map(([method, label]) => (
        <CheckoutButton
          key={method}
          variant="secondary"
          data-kzco-active={splitMethod === method ? "1" : "0"}
          aria-pressed={splitMethod === method}
          onClick={() => chooseSplitMethod?.(method)}
          className="kzco-btn-segment"
        >
          {label}
        </CheckoutButton>
      ))}
    </div>
  )
}

function PeopleControls({ splitGuestCount = 2, addSplitGuest, removeSplitGuest }: any) {
  return (
    <div className="kzco-stepper" data-kzco-control="people-stepper">
      <SquareButton aria-label="Remove guest" disabled={splitGuestCount <= 2} onClick={removeSplitGuest} className="kzco-stepper-btn">
        <span aria-hidden="true">−</span>
      </SquareButton>
      <strong aria-label={`${splitGuestCount} people`}>{splitGuestCount}</strong>
      <SquareButton variant="primary" aria-label="Add guest" disabled={splitGuestCount >= 10} onClick={addSplitGuest} className="kzco-stepper-btn">
        <span aria-hidden="true">＋</span>
      </SquareButton>
    </div>
  )
}

function GuestChips({ guests = [] }: { guests?: SplitPerson[] }) {
  if (!Array.isArray(guests) || guests.length === 0) return null

  return (
    <div className="kzco-chip-row">
      {guests.map((guest, index) => (
        <span key={`${guest.name}-${index}`} className="kzco-chip">
          <b>{guest.avatar || guest.name?.slice(0, 1) || index + 1}</b>
          {guest.name}
        </span>
      ))}
    </div>
  )
}

function PaymentMethods({ loadingPayments, visiblePaymentMethods, selectedPaymentMethod, onPaymentMethodSelect, canShowPaymentMethods = true, onBackToReview }: any) {
  const methods = Array.isArray(visiblePaymentMethods) ? visiblePaymentMethods : []

  return (
    <section className="kzco-section kzco-payment-methods">
      <h3 className="kzco-section-title">Payment Methods</h3>
      {loadingPayments ? (
        <p className="kzco-muted">Loading payment methods...</p>
      ) : methods.length === 0 ? (
        <p className="kzco-muted">No payment methods available</p>
      ) : (
        <>
        {!canShowPaymentMethods && (
          <div className="kzco-payment-blocked-clean">
            <strong>Send to kitchen first</strong>
            <p>Your selected items are still only in the table draft. Please confirm and send the table order to the kitchen first. Payment starts after the backend creates a real order ID.</p>
            <button type="button" data-kzco-button="secondary" className="kzco-btn kzco-btn-action kzco-btn-secondary" onClick={() => onBackToReview?.()}>
              Back to table order
            </button>
          </div>
        )}

        <div className="kzco-method-grid">
          {methods.map((method: any) => {
            const code = String(method.code || "")
            const size = getPaymentIconSize(code)
            const active = selectedPaymentMethod === method.code
            const src =
              code === "card"
                ? "/images/payments/card-light.svg"
                : code === "paypal"
                  ? "/images/payments/paypal.png"
                  : code === "google_pay"
                    ? "/images/payments/google_pay.png"
                    : iconForPayment(code)

            return (
              <button
                key={code}
                type="button"
                aria-label={method.name || code}
                aria-pressed={active}
                data-kzco-active={active ? "1" : "0"}
                className="kzco-btn kzco-btn-tile kzco-btn-secondary kzco-method-tile"
                onClick={() => onPaymentMethodSelect?.(code)}
              >
                <img src={src} alt={method.name || code} width={size.width} height={size.height} />
              </button>
            )
          })}
        </div>
        </>
      )}
    </section>
  )
}


// PMD_KAZEN_V53B_FIX_NUMBER_INPUT_LEADING_ZERO_20260618
function normalizeKzcoNumberInputValue(rawValue: string) {
  const raw = String(rawValue ?? "").trim()

  if (raw === "") return ""
  if (raw === ".") return "0."
  if (raw.startsWith(".")) return `0${raw}`

  const normalized = raw.replace(/^0+(?=\d)/, "")
  return normalized === "" ? "0" : normalized
}

function handleKzcoNumberInputFocusCapture(event: React.FocusEvent<HTMLDivElement>) {
  const target = event.target as HTMLInputElement | null
  if (!target || target.tagName !== "INPUT") return
  if (target.type !== "number") return

  if (target.value === "0") {
    target.select()
  }
}

function handleKzcoNumberInputCapture(event: React.FormEvent<HTMLDivElement>) {
  const target = event.target as HTMLInputElement | null
  if (!target || target.tagName !== "INPUT") return
  if (target.type !== "number") return

  const next = normalizeKzcoNumberInputValue(target.value)
  if (next !== target.value) {
    target.value = next
  }
}

function getItemAssignmentKey(item: DisplayItem, index: number) {
  return String(item?.key ?? item?.id ?? `${getItemName(item)}-${index}`)
}

export function KazenJapaneseCheckoutShell(props: KazenJapaneseCheckoutShellProps) {
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
    // PMD_KAZEN_V42_DECLARE_PAYMENT_TOTAL_PROPS_20260618
    paymentSubtotalAmount = 0,
    paymentVatAmount = 0,
    paymentVatPercentage = 0,
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

  const resolvedKazenCheckoutMode = useKazenCheckoutMode(Boolean(isDarkTheme))
  const isDark = resolvedKazenCheckoutMode === "dark"

  const firstNonEmptyItems = (...groups: any[]) => {
    for (const group of groups) {
      if (Array.isArray(group) && group.length > 0) return group
    }
    return []
  }

  const orderTotal = Number(submittedSnapshot?.remainingAmount ?? submittedSnapshot?.orderTotal ?? submittedSnapshot?.total ?? tableDraftTotal ?? finalTotal ?? 0)
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

  // PMD_KAZEN_V45_ROBUST_PAYMENT_TOTALS_20260618
  const pmdKazenFirstPositive = (...values: any[]) => {
    for (const value of values) {
      const numberValue = Number(value)
      if (Number.isFinite(numberValue) && numberValue > 0) return numberValue
    }
    return 0
  }

  const pmdKazenPaymentGross = pmdKazenFirstPositive(
    selectedSplitPerson?.total,
    paymentBaseAmount,
    paymentPayableTotal,
    orderTotal,
    tableDraftTotal,
    finalTotal,
    submittedSnapshot?.remainingAmount,
    submittedSnapshot?.orderTotal,
    submittedSnapshot?.total,
  )

  const pmdKazenPayableTotal = pmdKazenFirstPositive(
    paymentPayableTotal,
    Math.max(0, pmdKazenPaymentGross + Number(paymentTipAmount || 0) - Number(paymentCouponDiscount || 0)),
    pmdKazenPaymentGross,
  )

  // Backend currently logs percentage 19 but may pass enabled:false to the Kazen shell.
  // For display, show included VAT whenever we have a real payable/order amount.
  const pmdKazenVatPercent = pmdKazenPaymentGross > 0 ? Math.max(0, Number(paymentVatPercentage || 19)) : 0

  const pmdKazenVatAmount =
    Number(paymentVatAmount || 0) > 0
      ? Number(paymentVatAmount || 0)
      : pmdKazenVatPercent > 0 && pmdKazenPaymentGross > 0
        ? (pmdKazenPaymentGross * pmdKazenVatPercent) / (100 + pmdKazenVatPercent)
        : 0

  const pmdKazenNetItemsAmount =
    Number(paymentSubtotalAmount || 0) > 0
      ? Number(paymentSubtotalAmount || 0)
      : pmdKazenVatAmount > 0
        ? Math.max(0, pmdKazenPaymentGross - pmdKazenVatAmount)
        : pmdKazenPaymentGross

  // PMD_KAZEN_V46C_PAYMENT_GUARD_CSS_SAFE_20260618
  const pmdKazenRealOrderId =
    (submittedSnapshot as any)?.order_id ||
    (submittedSnapshot as any)?.orderId ||
    (submittedSnapshot as any)?.id ||
    null

  const pmdKazenCanShowPaymentMethods = Boolean(pmdKazenRealOrderId)

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
        <div className="kzco-total-box">
          <Line label="Total" value={finalTotal} strong />
        </div>
        <ButtonRow columns={2}>
          <CheckoutButton variant="secondary" onClick={onClose}>Continue ordering</CheckoutButton>
          <CheckoutButton variant="primary" onClick={handleConfirmMyItems}>Confirm</CheckoutButton>
        </ButtonRow>
      </>
    )
  } else if (checkoutStep === "review" && tableDraft) {
    title = "Table order"
    content = (
      <>
        <ItemRows items={tableDraftItems} />
        <div className="kzco-total-box">
          <Line label="Order total" value={tableDraftTotal} strong />
        </div>
        <ButtonRow columns={2}>
          <CheckoutButton variant="secondary" onClick={onClose}>Continue ordering</CheckoutButton>
          <CheckoutButton variant="primary" onClick={handleSubmitTableDraft}>Send to kitchen</CheckoutButton>
        </ButtonRow>
      </>
    )
  } else if (checkoutStep === "submitted") {
    title = ""
    eyebrow = undefined
    content = (
      <>
        <div className="kzco-status-copy kzco-status-copy-hero">
          <span className="kzco-status-pulse"><Check className="h-5 w-5" /></span>
          <div className="kzco-status-text-block">
            <em className="kzco-status-time">{estimatedMinutes} min</em>
            <p>We received your order.</p>
          </div>
        </div>
        <div className="kzco-total-box">
          <Line label="Order total" value={orderTotal} strong />
        </div>
        <section className="kzco-summary">
          <h3 className="kzco-section-title">Order Summary</h3>
          <ItemRows items={submittedDisplayItems} />
        </section>
        <ButtonRow>
          <CheckoutButton variant="primary" onClick={() => setCheckoutStep?.("payment")}>Pay in full</CheckoutButton>
          <CheckoutButton variant="secondary" onClick={() => startSplitFlow?.("equal")}><Users className="h-4 w-4" /> Split bill</CheckoutButton>
          <CheckoutButton variant="secondary" onClick={onClose}>Continue ordering</CheckoutButton>
        </ButtonRow>
      </>
    )
  } else if (checkoutStep === "payment") {
    title = "Payment"
    eyebrow = "Ready to pay"
    content = (
      <>
        <Card className="kzco-payment-hero">
          <div className="kzco-payment-intro">
            <span><CreditCard className="h-5 w-5" /></span>
            <div>
              <strong>{paymentHeader}</strong>
              <p>{money(paymentPayableTotal)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <Line
            label={selectedSplitPerson ? "Share amount" : "Items total"}
            value={pmdKazenNetItemsAmount}
          />
          {pmdKazenVatAmount > 0 && (
            <Line
              label={pmdKazenVatPercent > 0 ? `VAT included (${pmdKazenVatPercent.toFixed(0)}%)` : "VAT included"}
              value={pmdKazenVatAmount}
            />
          )}
          {paymentTipAmount > 0 && <Line label="Tip" value={paymentTipAmount} />}
          {paymentCouponDiscount > 0 && <div className="kzco-line kzco-discount"><span>Coupon</span><strong>-{money(paymentCouponDiscount)}</strong></div>}
          <Line label="Payable total" value={pmdKazenPayableTotal} strong />
        </Card>
        {tipEnabled && (
          <section className="kzco-section">
            <h3 className="kzco-section-title">Add tip</h3>
            <div className="kzco-tip-grid">
              {[0, ...tipPercentages.filter((percentage: number) => Number(percentage) !== 0)].map((percentage: number) => (
                <CheckoutButton
                  key={percentage}
                  variant="secondary"
                  data-kzco-active={paymentTipPercentage === percentage && !paymentCustomTip ? "1" : "0"}
                  onClick={() => updatePaymentTipPercentage?.(percentage)}
                >
                  {percentage}%
                </CheckoutButton>
              ))}
              <input
                type="number"
                min="0"
                step="0.01"
                value={paymentCustomTip ?? ""}
                onChange={(event) => updatePaymentCustomTip?.(event.target.value)}
                placeholder="Custom"
                className="kzco-field"
              />
            </div>
          </section>
        )}
        <section className="kzco-section">
          {!appliedCoupon || selectedSplitPerson ? (
            <div className="kzco-coupon-row">
              <input
                type="text"
                value={couponCode || ""}
                onChange={(event) => setCouponCode?.(event.target.value.toUpperCase())}
                placeholder="Coupon code"
                disabled={couponLoading}
                className="kzco-field"
              />
              <CheckoutButton variant="secondary" disabled={couponLoading || !String(couponCode || "").trim()} onClick={onApplyCoupon} className="kzco-apply">
                {couponLoading ? "Checking" : "Apply"}
              </CheckoutButton>
            </div>
          ) : (
            <div className="kzco-applied-coupon">
              <span>{appliedCoupon.name || "Coupon"} {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
              <CheckoutButton variant="secondary" onClick={onRemoveCoupon}>Remove</CheckoutButton>
            </div>
          )}
          {couponError && <p className="kzco-error">{couponError}</p>}
        </section>
        <PaymentMethods
          loadingPayments={loadingPayments}
          visiblePaymentMethods={visiblePaymentMethods}
          selectedPaymentMethod={selectedPaymentMethod}
          onPaymentMethodSelect={onPaymentMethodSelect}
          canShowPaymentMethods={pmdKazenCanShowPaymentMethods}
          onBackToReview={() => setCheckoutStep?.("review")}
        />
        {canRenderPaymentMethodDetail(selectedPaymentMethod) && (
          <section className="kzco-section kzco-payment-detail">
            {renderPaymentForm?.()}
          </section>
        )}
        <div className="kzco-payment-action">
          {renderPaymentButton?.()}
        </div>
      </>
    )
  } else if (checkoutStep === "split" || checkoutStep === "split-items" || checkoutStep === "split-shares") {
    title = ""
    eyebrow = `Share ${money(splitGrandTotal)}`
    content = (
      <>
        <SplitTabs splitMethod={splitMethod} chooseSplitMethod={chooseSplitMethod} />
        <div className="kzco-people-inline" data-kzco-people-inline="1">
          <PeopleControls splitGuestCount={splitGuestCount} addSplitGuest={addSplitGuest} removeSplitGuest={removeSplitGuest} />
          <GuestChips guests={people} />
        </div>
        {splitMethod === "equal" && (
          <div className="kzco-list">
            {equalPeople.map((person: SplitPerson, index: number) => (
              <div className="kzco-cart-line" key={person.id || index}>
                <span>{person.name}</span>
                <strong>{money(person.total)}</strong>
              </div>
            ))}
          </div>
        )}
        {splitMethod === "items" && (
          <Card>
            <p className="kzco-muted">Tap an item to assign it to guests.</p>
            <div className="kzco-list">
              {(splitDisplayItems || []).map((item: DisplayItem, index: number) => {
                const itemKey = getItemAssignmentKey(item, index)
                const assignedIndex = itemAssignments?.[itemKey]
                const guestName = assignedIndex === undefined || assignedIndex === null ? "Unassigned" : (people[assignedIndex]?.name || `Guest ${Number(assignedIndex) + 1}`)
                return (
                  <button
                    key={itemKey}
                    type="button"
                    className="kzco-btn kzco-btn-list kzco-btn-secondary kzco-assign-row"
                    onClick={() => setItemAssignments?.((prev: Record<string, number | null | undefined>) => {
                      const current = prev?.[itemKey]
                      const next = current === undefined || current === null ? 0 : current >= splitGuestCount - 1 ? null : Number(current) + 1
                      return { ...(prev || {}), [itemKey]: next }
                    })}
                  >
                    <span>{getItemName(item)}</span>
                    <strong>{money(getAmount(item))}</strong>
                    <em>{guestName}</em>
                  </button>
                )
              })}
            </div>
          </Card>
        )}
        {splitMethod === "shares" && (
          <Card>
            <div className={sharePercentTotal === 100 ? "kzco-share-total" : "kzco-share-total kzco-share-total-bad"}>
              {sharePercentTotal === 100 ? "100% ready" : sharePercentTotal < 100 ? `${100 - sharePercentTotal}% remaining` : `Over by ${sharePercentTotal - 100}%`}
            </div>
            <div className="kzco-list">
              {(sharePercents || []).slice(0, splitGuestCount).map((percent: number, index: number) => (
                <div className="kzco-share-row" key={index}>
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
                    className="kzco-field kzco-share-input"
                  />
                  <strong>%</strong>
                </div>
              ))}
            </div>
          </Card>
        )}
        <CheckoutButton variant="primary" disabled={!canConfirmSplitMethod} onClick={goToSplitReview}>Review split</CheckoutButton>
      </>
    )
  } else if (checkoutStep === "split-review") {
    title = "Review split"
    eyebrow = "Choose payer"
    content = (
      <>
        <div className="kzco-list">
          {reviewPeople.map((person: SplitPerson) => {
            const selected = selectedSplitPersonId === person.id
            return (
              <Card key={person.id} className={selected ? "kzco-person-selected" : ""}>
                <div className="kzco-person-head">
                  <span><b>{person.avatar || person.name?.slice(0, 1)}</b>{person.name}</span>
                  <em>{person.status || "Pending"}</em>
                </div>
                <Line label="Total" value={Number(person.total || 0)} strong />
                {selected ? (
                  <CheckoutButton variant="primary" onClick={() => setCheckoutStep?.("payment")}>Pay my share</CheckoutButton>
                ) : (
                  <CheckoutButton variant="secondary" onClick={() => setSelectedSplitPersonId?.(person.id)}>Select payer</CheckoutButton>
                )}
              </Card>
            )
          })}
        </div>
        <ButtonRow columns={2}>
          <CheckoutButton variant="secondary" onClick={onPaymentLinks}><Link2 className="h-4 w-4" /> Link</CheckoutButton>
          <CheckoutButton variant="secondary" onClick={onQrShare}><QrCode className="h-4 w-4" /> QR</CheckoutButton>
        </ButtonRow>
      </>
    )
  }

  return (
    <div
      data-kzco-root="1"
      onFocusCapture={handleKzcoNumberInputFocusCapture}
      onInputCapture={handleKzcoNumberInputCapture}
      data-kzco-step={checkoutStep}
      data-kzco-can-pay={pmdKazenCanShowPaymentMethods ? "1" : "0"}
      data-kzco-mode={resolvedKazenCheckoutMode}
      data-pmd-checkout-theme="kazen_japanese"
      className="kzco-overlay"
      role="dialog"
      aria-modal="true"
    >
      <div className="kzco-panel" data-kzco-panel="1">
        <div className="kzco-content">
          <ModalHead title={title} eyebrow={eyebrow} onBack={goBack} />
          <main key={checkoutStep} className="kzco-body" data-kzco-step={checkoutStep}>
            {content}
          </main>
        </div>
      </div>
      <style>{`
        /* PMD_KAZEN_V30_CLEAN_CHECKOUT_REWRITE_20260618
           Isolated checkout UI. No old pmd-kazen checkout classes are used here.
           Button contract:
           - primary = red action buttons
           - secondary = cancel/continue/split/link/QR/tabs/tile/list buttons
           - square = close/stepper buttons
        */

        html body .kzco-overlay {
          position: fixed !important;
          inset: 0 !important;
          z-index: 9999999 !important;
          display: grid !important;
          place-items: center !important;
          padding: 1rem !important;
          background: rgba(36, 32, 28, .42) !important;
          color: #242320 !important;
          box-sizing: border-box !important;
          isolation: isolate !important;
        }

        html body .kzco-overlay,
        html body .kzco-overlay * {
          box-sizing: border-box !important;
          text-shadow: none !important;
        }

        html body .kzco-overlay {
          --kzco-panel-bg: #fbf8f2;
          --kzco-panel-text: #242320;
          --kzco-panel-muted: #77716a;
          --kzco-panel-border: rgba(35, 34, 31, .24);
          --kzco-panel-line: rgba(35, 34, 31, .12);
          --kzco-card-bg: rgba(255, 255, 255, .38);
          --kzco-card-border: rgba(36, 35, 32, .14);
          --kzco-accent: #b85d59;
          --kzco-accent-hover: #c86460;
          --kzco-accent-text: #fffaf3;
          --kzco-accent-border: rgba(143, 55, 51, .56);
          --kzco-accent-border-hover: rgba(143, 55, 51, .72);
          --kzco-secondary-bg: rgba(255, 255, 255, .44);
          --kzco-secondary-bg-hover: rgba(255, 255, 255, .64);
          --kzco-secondary-text: #242320;
          --kzco-secondary-border: rgba(36, 35, 32, .22);
          --kzco-secondary-border-hover: rgba(36, 35, 32, .36);
          --kzco-price: #b85d59;
          --kzco-action-height: 48px;
          --kzco-square: 48px;
        }

        html body .kzco-overlay[data-kzco-mode="dark"] {
          background: rgba(0, 0, 0, .72) !important;
          --kzco-panel-bg: linear-gradient(144deg, rgba(18, 12, 8, .96), rgba(5, 3, 2, .985) 58%, rgba(55, 19, 14, .86));
          --kzco-panel-text: #f6e8c8;
          --kzco-panel-muted: rgba(246, 232, 200, .70);
          --kzco-panel-border: rgba(198, 164, 93, .42);
          --kzco-panel-line: rgba(198, 164, 93, .22);
          --kzco-card-bg: rgba(8, 6, 4, .62);
          --kzco-card-border: rgba(198, 164, 93, .28);
          --kzco-secondary-bg: rgba(8, 6, 4, .88);
          --kzco-secondary-bg-hover: rgba(246, 232, 200, .08);
          --kzco-secondary-text: #f6e8c8;
          --kzco-secondary-border: rgba(198, 164, 93, .36);
          --kzco-secondary-border-hover: rgba(198, 164, 93, .54);
          --kzco-price: #ec8a82;
          --kzco-accent-border: rgba(223, 104, 93, .72);
          --kzco-accent-border-hover: rgba(223, 104, 93, .88);
        }

        html body .kzco-panel {
          width: min(100%, 430px) !important;
          max-height: min(88dvh, 740px) !important;
          overflow: auto !important;
          border-radius: 0 !important;
          border: 1px solid var(--kzco-panel-border) !important;
          background: var(--kzco-panel-bg) !important;
          color: var(--kzco-panel-text) !important;
          box-shadow: 0 28px 78px rgba(36, 30, 24, .34) !important;
        }

        html body .kzco-content {
          position: relative !important;
          display: flex !important;
          min-height: 100% !important;
          flex-direction: column !important;
          background: transparent !important;
        }

        html body .kzco-head {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 1rem !important;
          padding: 1.35rem 1.45rem 1.05rem !important;
          border-bottom: 1px solid var(--kzco-panel-line) !important;
        }

        html body .kzco-title-wrap {
          min-width: 0 !important;
        }

        html body .kzco-eyebrow {
          display: block !important;
          margin-bottom: .12rem !important;
          color: var(--kzco-panel-text) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .86rem !important;
          font-weight: 520 !important;
          letter-spacing: .01em !important;
          text-transform: none !important;
        }

        html body .kzco-head h2 {
          margin: 0 !important;
          color: var(--kzco-panel-text) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: clamp(2.6rem, 9vw, 4.2rem) !important;
          font-weight: 900 !important;
          line-height: .88 !important;
          letter-spacing: .075em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-body {
          display: grid !important;
          gap: 1rem !important;
          padding: 1.25rem 1.45rem 1.45rem !important;
        }

        html body .kzco-btn {
          border-radius: 0 !important;
          box-shadow: none !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          background-image: none !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          opacity: 1 !important;
          filter: none !important;
          transform: none !important;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease !important;
          cursor: pointer !important;
        }

        html body .kzco-btn-action {
          width: 100% !important;
          min-height: var(--kzco-action-height) !important;
          height: var(--kzco-action-height) !important;
          padding: .82rem 1rem !important;
        }

        html body .kzco-btn-square {
          width: var(--kzco-square) !important;
          height: var(--kzco-square) !important;
          min-width: var(--kzco-square) !important;
          min-height: var(--kzco-square) !important;
          max-width: var(--kzco-square) !important;
          max-height: var(--kzco-square) !important;
          padding: 0 !important;
        }

        html body .kzco-btn-primary {
          background: var(--kzco-accent) !important;
          background-color: var(--kzco-accent) !important;
          color: var(--kzco-accent-text) !important;
          -webkit-text-fill-color: var(--kzco-accent-text) !important;
          border: 1px solid var(--kzco-accent-border) !important;
        }

        html body .kzco-btn-primary:not(:disabled):not([aria-disabled="true"]):hover {
          background: var(--kzco-accent-hover) !important;
          background-color: var(--kzco-accent-hover) !important;
          border-color: var(--kzco-accent-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        html body .kzco-btn-secondary {
          background: var(--kzco-secondary-bg) !important;
          background-color: var(--kzco-secondary-bg) !important;
          color: var(--kzco-secondary-text) !important;
          -webkit-text-fill-color: var(--kzco-secondary-text) !important;
          border: 1px solid var(--kzco-secondary-border) !important;
        }

        html body .kzco-btn-secondary:not(:disabled):not([aria-disabled="true"]):hover,
        html body .kzco-btn-secondary[data-kzco-active="1"] {
          background: var(--kzco-secondary-bg-hover) !important;
          background-color: var(--kzco-secondary-bg-hover) !important;
          color: var(--kzco-secondary-text) !important;
          -webkit-text-fill-color: var(--kzco-secondary-text) !important;
          border-color: var(--kzco-secondary-border-hover) !important;
        }

        html body .kzco-btn-secondary:not(:disabled):not([aria-disabled="true"]):hover {
          transform: translateY(-1px) !important;
        }

        html body .kzco-btn:disabled,
        html body .kzco-btn[aria-disabled="true"] {
          cursor: not-allowed !important;
          opacity: .56 !important;
          transform: none !important;
        }

        html body .kzco-btn :is(svg, svg *, span) {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
        }

        html body .kzco-actions {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: .72rem !important;
          width: 100% !important;
        }

        html body .kzco-actions-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        html body .kzco-actions-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        html body .kzco-line,
        html body .kzco-cart-line {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 1rem !important;
          color: var(--kzco-panel-text) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: 1rem !important;
          font-weight: 800 !important;
        }

        html body .kzco-line strong,
        html body .kzco-cart-line strong {
          color: var(--kzco-price) !important;
          -webkit-text-fill-color: var(--kzco-price) !important;
          font-weight: 900 !important;
        }

        html body .kzco-line-strong {
          padding-top: .8rem !important;
          border-top: 1px solid var(--kzco-panel-line) !important;
          font-size: 1.08rem !important;
        }

        html body .kzco-list,
        html body .kzco-items-list,
        html body .kzco-summary {
          display: grid !important;
          gap: .78rem !important;
        }

        html body .kzco-total-box,
        html body .kzco-card,
        html body .kzco-section {
          display: grid !important;
          gap: .78rem !important;
        }

        html body .kzco-card,
        html body .kzco-total-box {
          padding: 1rem !important;
          border: 1px solid var(--kzco-card-border) !important;
          background: var(--kzco-card-bg) !important;
        }

        html body .kzco-section-title {
          margin: 0 !important;
          color: var(--kzco-panel-text) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 1.28rem !important;
          font-weight: 900 !important;
          letter-spacing: .02em !important;
          text-transform: uppercase !important;
        }

        html body .kzco-muted,
        html body .kzco-error {
          margin: 0 !important;
          color: var(--kzco-panel-muted) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .95rem !important;
          font-weight: 620 !important;
        }

        html body .kzco-error {
          color: var(--kzco-accent) !important;
        }

        html body .kzco-status-copy,
        html body .kzco-payment-intro,
        html body .kzco-person-head {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 1rem !important;
        }

        html body .kzco-status-copy {
          justify-content: flex-start !important;
        }

        html body .kzco-status-copy > span,
        html body .kzco-payment-intro > span {
          display: inline-flex !important;
          width: 48px !important;
          height: 48px !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid var(--kzco-accent-border) !important;
          color: var(--kzco-accent) !important;
        }

        html body .kzco-status-copy p,
        html body .kzco-payment-intro p {
          margin: 0 !important;
          color: var(--kzco-price) !important;
          font-weight: 900 !important;
        }

        html body .kzco-payment-intro strong {
          color: var(--kzco-panel-text) !important;
          font-weight: 900 !important;
        }

        html body .kzco-tabs,
        html body .kzco-tip-grid,
        html body .kzco-method-grid {
          display: grid !important;
          gap: .65rem !important;
        }

        html body .kzco-tabs {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        html body .kzco-btn-segment {
          min-height: 58px !important;
          height: 58px !important;
          white-space: normal !important;
        }

        html body .kzco-stepper {
          display: grid !important;
          grid-template-columns: 48px 1fr 48px !important;
          align-items: stretch !important;
          min-height: 48px !important;
          border: 1px solid var(--kzco-secondary-border) !important;
          background: var(--kzco-card-bg) !important;
        }

        html body .kzco-stepper > strong {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: var(--kzco-panel-text) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .96rem !important;
          font-weight: 850 !important;
        }

        html body .kzco-chip-row {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: .55rem !important;
        }

        html body .kzco-chip {
          display: inline-flex !important;
          align-items: center !important;
          gap: .45rem !important;
          min-height: 40px !important;
          padding: .55rem .7rem !important;
          border: 1px solid var(--kzco-secondary-border) !important;
          background: var(--kzco-secondary-bg) !important;
          color: var(--kzco-secondary-text) !important;
          font-weight: 760 !important;
        }

        html body .kzco-chip b,
        html body .kzco-person-head b {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 24px !important;
          height: 24px !important;
          margin-right: .45rem !important;
          background: var(--kzco-secondary-bg-hover) !important;
          color: var(--kzco-secondary-text) !important;
        }

        html body .kzco-assign-row {
          width: 100% !important;
          min-height: 48px !important;
          padding: .85rem 1rem !important;
          display: grid !important;
          grid-template-columns: 1fr auto auto !important;
          gap: .8rem !important;
          align-items: center !important;
          text-align: left !important;
        }

        html body .kzco-assign-row span,
        html body .kzco-assign-row strong,
        html body .kzco-assign-row em {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          font-style: normal !important;
          white-space: nowrap !important;
        }

        html body .kzco-share-total {
          color: var(--kzco-panel-text) !important;
          font-weight: 900 !important;
        }

        html body .kzco-share-total-bad {
          color: var(--kzco-accent) !important;
        }

        html body .kzco-share-row,
        html body .kzco-coupon-row,
        html body .kzco-applied-coupon {
          display: grid !important;
          grid-template-columns: 1fr auto auto !important;
          align-items: center !important;
          gap: .7rem !important;
        }

        html body .kzco-coupon-row {
          grid-template-columns: 1fr auto !important;
        }

        html body .kzco-field {
          min-height: 48px !important;
          width: 100% !important;
          border-radius: 0 !important;
          border: 1px solid var(--kzco-secondary-border) !important;
          background: var(--kzco-card-bg) !important;
          color: var(--kzco-panel-text) !important;
          -webkit-text-fill-color: var(--kzco-panel-text) !important;
          padding: .82rem .95rem !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .92rem !important;
          font-weight: 750 !important;
          outline: none !important;
        }

        html body .kzco-method-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        html body .kzco-method-tile {
          width: 100% !important;
          min-height: 60px !important;
          height: 60px !important;
          padding: .6rem !important;
        }

        html body .kzco-method-tile[data-kzco-active="1"] {
          border-color: var(--kzco-accent-border) !important;
          outline: 1px solid var(--kzco-accent-border) !important;
          outline-offset: -2px !important;
        }

        html body .kzco-method-tile img {
          display: block !important;
          max-width: 100% !important;
          height: auto !important;
          object-fit: contain !important;
        }

        html body .kzco-person-selected {
          border-color: var(--kzco-accent-border) !important;
        }

        html body .kzco-person-head span,
        html body .kzco-person-head em {
          color: var(--kzco-panel-text) !important;
          font-style: normal !important;
          font-weight: 760 !important;
        }

        html body .kzco-person-head em {
          color: var(--kzco-price) !important;
        }

        /* External payment/cash/stripe buttons rendered by existing payment system become Type 1 red. */
        html body .kzco-payment-action :is(button, [role="button"], input[type="submit"]),
        html body .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]) {
          width: 100% !important;
          min-height: var(--kzco-action-height) !important;
          height: var(--kzco-action-height) !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: var(--kzco-accent) !important;
          background-color: var(--kzco-accent) !important;
          color: var(--kzco-accent-text) !important;
          -webkit-text-fill-color: var(--kzco-accent-text) !important;
          border: 1px solid var(--kzco-accent-border) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          padding: .82rem 1rem !important;
          opacity: 1 !important;
          filter: none !important;
          transform: none !important;
        }

        html body .kzco-payment-action :is(button, [role="button"], input[type="submit"]):not(:disabled):hover,
        html body .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]):not(:disabled):hover {
          background: var(--kzco-accent-hover) !important;
          background-color: var(--kzco-accent-hover) !important;
          border-color: var(--kzco-accent-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        html body .kzco-payment-action :is(button, [role="button"], input[type="submit"]):disabled,
        html body .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]):disabled {
          opacity: .56 !important;
          cursor: not-allowed !important;
        }

        html body .kzco-payment-action :is(button, [role="button"], input[type="submit"]) :is(svg, svg *, span),
        html body .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]) :is(svg, svg *, span) {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay {
            padding: .75rem !important;
          }

          html body .kzco-panel {
            width: min(100%, 430px) !important;
            max-height: 90dvh !important;
          }

          html body .kzco-head {
            padding: 1.05rem 1rem .9rem !important;
          }

          html body .kzco-body {
            padding: 1rem !important;
          }

          html body .kzco-head h2 {
            font-size: clamp(2.35rem, 12vw, 3.6rem) !important;
          }

          html body .kzco-actions-2,
          html body .kzco-actions-3 {
            grid-template-columns: 1fr !important;
          }

          html body .kzco-tabs {
            grid-template-columns: 1fr !important;
          }

          html body .kzco-method-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          html body .kzco-assign-row {
            grid-template-columns: 1fr !important;
            text-align: center !important;
          }
        }


        /* PMD_KAZEN_V33_ACTIVE_V30_BUTTON_CONTRACT_20260618
           FINAL ACTIVE FIX:
           This is inserted inside the real V30 style tag.
           V31/V32 were present in source but not rendered in browser.
           Do not rely on kzco-accent for primary background; force concrete values.
        */

        html body .kzco-overlay[data-kzco-root="1"] {
          --kzco-action-height: 48px !important;
          --kzco-square: 48px !important;

          --kzco-primary-real-bg: #b85d59 !important;
          --kzco-primary-real-bg-hover: #c86460 !important;
          --kzco-primary-real-text: #fffaf3 !important;
          --kzco-primary-real-border: rgba(143, 55, 51, .58) !important;

          --kzco-secondary-real-bg: rgba(255, 255, 255, .44) !important;
          --kzco-secondary-real-bg-hover: rgba(255, 255, 255, .64) !important;
          --kzco-secondary-real-text: #242320 !important;
          --kzco-secondary-real-border: rgba(36, 35, 32, .24) !important;

          --kzco-close-real-bg: rgba(255, 255, 255, .44) !important;
          --kzco-close-real-text: #242320 !important;
          --kzco-close-real-border: rgba(36, 35, 32, .24) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] {
          --kzco-secondary-real-bg: rgba(8, 6, 4, .88) !important;
          --kzco-secondary-real-bg-hover: rgba(246, 232, 200, .08) !important;
          --kzco-secondary-real-text: #f6e8c8 !important;
          --kzco-secondary-real-border: rgba(198, 164, 93, .38) !important;

          --kzco-close-real-bg: rgba(246, 232, 200, .055) !important;
          --kzco-close-real-text: #f6e8c8 !important;
          --kzco-close-real-border: rgba(198, 164, 93, .32) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-btn,
          button[data-kzco-button],
          .pmd-themed-button,
          [data-pmd-stripe-native-button="1"]
        ) {
          min-height: var(--kzco-action-height) !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          padding: .82rem 1rem !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          filter: none !important;
          transform: none !important;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease !important;
        }

        /* TYPE 1: red actions */
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-btn-primary,
          button[data-kzco-button="primary"],
          .pmd-themed-button[data-pmd-themed-button="primary"],
          [data-pmd-stripe-native-button="1"]
        ),
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action :is(button, [role="button"], input[type="submit"]),
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"]) {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .58) !important;
          opacity: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-btn-primary,
          button[data-kzco-button="primary"],
          .pmd-themed-button[data-pmd-themed-button="primary"],
          [data-pmd-stripe-native-button="1"]
        ):not(:disabled):not([aria-disabled="true"]):hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action :is(button, [role="button"], input[type="submit"]):not(:disabled):hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"]):not(:disabled):hover {
          background: #c86460 !important;
          background-color: #c86460 !important;
          background-image: linear-gradient(#c86460, #c86460) !important;
          border-color: rgba(143, 55, 51, .72) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          transform: translateY(-1px) !important;
        }

        /* TYPE 2: secondary actions + split tabs */
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-btn-secondary,
          button[data-kzco-button="secondary"],
          .kzco-tab,
          .kzco-method-tile
        ) {
          background: var(--kzco-secondary-real-bg) !important;
          background-color: var(--kzco-secondary-real-bg) !important;
          background-image: linear-gradient(var(--kzco-secondary-real-bg), var(--kzco-secondary-real-bg)) !important;
          color: var(--kzco-secondary-real-text) !important;
          -webkit-text-fill-color: var(--kzco-secondary-real-text) !important;
          border: 1px solid var(--kzco-secondary-real-border) !important;
          opacity: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-btn-secondary,
          button[data-kzco-button="secondary"],
          .kzco-tab,
          .kzco-method-tile
        ):not(:disabled):not([aria-disabled="true"]):hover,
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-tab, .kzco-method-tile)[data-kzco-active="1"] {
          background: var(--kzco-secondary-real-bg-hover) !important;
          background-color: var(--kzco-secondary-real-bg-hover) !important;
          background-image: linear-gradient(var(--kzco-secondary-real-bg-hover), var(--kzco-secondary-real-bg-hover)) !important;
          border-color: var(--kzco-secondary-real-border) !important;
          color: var(--kzco-secondary-real-text) !important;
          -webkit-text-fill-color: var(--kzco-secondary-real-text) !important;
          transform: translateY(-1px) !important;
        }

        /* Square controls: close / plus / minus */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-square, .kzco-close, .kzco-stepper-btn) {
          width: var(--kzco-square) !important;
          height: var(--kzco-square) !important;
          min-width: var(--kzco-square) !important;
          min-height: var(--kzco-square) !important;
          max-width: var(--kzco-square) !important;
          max-height: var(--kzco-square) !important;
          padding: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-close, .kzco-btn-square:not(.kzco-btn-primary)) {
          background: var(--kzco-close-real-bg) !important;
          background-color: var(--kzco-close-real-bg) !important;
          background-image: linear-gradient(var(--kzco-close-real-bg), var(--kzco-close-real-bg)) !important;
          color: var(--kzco-close-real-text) !important;
          -webkit-text-fill-color: var(--kzco-close-real-text) !important;
          border: 1px solid var(--kzco-close-real-border) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper-btn.kzco-btn-primary {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .58) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn, button[data-kzco-button], .kzco-close, .kzco-stepper-btn) :is(svg, svg *, span) {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        /* Disabled stays readable, never invisible white */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-primary, button[data-kzco-button="primary"], .pmd-themed-button[data-pmd-themed-button="primary"], [data-pmd-stripe-native-button="1"]):disabled,
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-primary, button[data-kzco-button="primary"], .pmd-themed-button[data-pmd-themed-button="primary"], [data-pmd-stripe-native-button="1"])[aria-disabled="true"] {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .58) !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-secondary, button[data-kzco-button="secondary"], .kzco-tab, .kzco-method-tile):disabled,
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-secondary, button[data-kzco-button="secondary"], .kzco-tab, .kzco-method-tile)[aria-disabled="true"] {
          opacity: .58 !important;
          cursor: not-allowed !important;
        }



        /* PMD_KAZEN_V35_TITLE_SIZE_POLISH_20260618
           Slightly reduce giant Kazen checkout titles so PAYMENT / ORDER STATUS
           no longer crowd the close button.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          gap: 1.15rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap {
          min-width: 0 !important;
          max-width: calc(100% - 5.9rem) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2 {
          font-size: clamp(3.75rem, 11.8vw, 6.35rem) !important;
          line-height: .86 !important;
          letter-spacing: .115em !important;
          max-width: 100% !important;
          overflow-wrap: normal !important;
          word-break: normal !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2 {
            font-size: clamp(3.05rem, 17vw, 4.9rem) !important;
            letter-spacing: .095em !important;
          }
        }



        /* PMD_KAZEN_V36_MUCH_SMALLER_TITLES_20260618
           Strong override: previous title clamp was still too large.
           Keep the Kazen feeling, but stop the title from dominating the card.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          gap: 1rem !important;
          align-items: start !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap {
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          padding-right: .25rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
          font-size: clamp(2.45rem, 7.2vw, 4.35rem) !important;
          line-height: .92 !important;
          letter-spacing: .075em !important;
          max-width: 100% !important;
          margin: 0 !important;
          overflow: visible !important;
          overflow-wrap: normal !important;
          word-break: normal !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: clamp(2.05rem, 10.5vw, 3.15rem) !important;
            line-height: .96 !important;
            letter-spacing: .055em !important;
          }
        }

        @media (max-width: 390px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: clamp(1.85rem, 9.5vw, 2.75rem) !important;
            letter-spacing: .045em !important;
          }
        }



        /* PMD_KAZEN_V37_STANDARD_SMALL_TITLES_20260618
           FINAL: normal readable app title size, not huge poster title.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          gap: .9rem !important;
          align-items: start !important;
          padding-top: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap {
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          padding-right: .5rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
          font-size: 2.15rem !important;
          line-height: 1.08 !important;
          letter-spacing: .075em !important;
          max-width: 100% !important;
          margin: 0 !important;
          overflow: visible !important;
          overflow-wrap: normal !important;
          word-break: normal !important;
          white-space: normal !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-eyebrow {
          font-size: .92rem !important;
          line-height: 1.2 !important;
          margin-bottom: .35rem !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: 1.9rem !important;
            line-height: 1.08 !important;
            letter-spacing: .06em !important;
          }
        }

        @media (max-width: 390px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: 1.7rem !important;
            letter-spacing: .045em !important;
          }
        }



        /* PMD_KAZEN_V39_HEADER_DOWN_REMOVE_SUMMARY_FRAMES_20260618
           Move checkout title area a bit lower and remove unnecessary frames
           around display-only summary/total boxes. Keep frames on real inputs,
           buttons, coupon field, and payment method tiles.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          padding-top: 2.05rem !important;
          padding-bottom: 1.2rem !important;
          padding-left: 1.45rem !important;
          padding-right: 1.45rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-eyebrow {
          margin-bottom: .42rem !important;
        }

        /* Remove decorative frames from display-only total/summary blocks */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-hero,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-card:not(.kzco-person-selected):not(:has(.kzco-field)):not(:has(.kzco-btn)):not(:has(.kzco-method-grid)):not(:has(.kzco-share-row)) {
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          padding: .15rem 0 !important;
        }

        /* Payment summary card has only lines, so keep it clean too */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-card:has(.kzco-line):not(:has(.kzco-field)):not(:has(.kzco-btn)):not(:has(.kzco-method-grid)) {
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          padding: .1rem 0 !important;
        }

        /* Remove random inner divider lines from totals */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box .kzco-line-strong,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-card:has(.kzco-line):not(:has(.kzco-field)):not(:has(.kzco-btn)) .kzco-line-strong {
          border-top: 0 !important;
          padding-top: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box .kzco-line,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-card:has(.kzco-line):not(:has(.kzco-field)):not(:has(.kzco-btn)) .kzco-line {
          padding-top: .35rem !important;
          padding-bottom: .35rem !important;
        }

        /* Keep these framed because they are real controls */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-share-input {
          box-shadow: none !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
            padding-top: 1.65rem !important;
            padding-bottom: 1.05rem !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
        }



        /* PMD_KAZEN_V40_VISUAL_CLEANUP_COLORS_TITLES_PAYMENT_20260618
           Normalize Kazen checkout:
           - body text/title/items/prices are ink, not red
           - red is reserved for primary action buttons and small accent states
           - titles are standard modal size
           - payment duplicate hero frame is hidden
           - display-only total frames stay removed
        */

        html body .kzco-overlay[data-kzco-root="1"] {
          --kzco-ink-clean: #242320;
          --kzco-muted-clean: rgba(36, 35, 32, .66);
          --kzco-title-clean: #242320;
          --kzco-accent-clean: #b85d59;
          color: var(--kzco-ink-clean) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] {
          --kzco-ink-clean: #f6e8c8;
          --kzco-muted-clean: rgba(246, 232, 200, .68);
          --kzco-title-clean: #f6e8c8;
          --kzco-accent-clean: #c86460;
          color: var(--kzco-ink-clean) !important;
        }

        /* Titles: standard size, not poster-size */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          align-items: start !important;
          gap: .9rem !important;
          padding-top: 1.65rem !important;
          padding-bottom: 1rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap {
          max-width: 100% !important;
          min-width: 0 !important;
          padding-right: .5rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
          color: var(--kzco-title-clean) !important;
          -webkit-text-fill-color: var(--kzco-title-clean) !important;
          font-size: 1.95rem !important;
          line-height: 1.08 !important;
          letter-spacing: .07em !important;
          margin: 0 !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-eyebrow {
          color: var(--kzco-ink-clean) !important;
          -webkit-text-fill-color: var(--kzco-ink-clean) !important;
          font-size: .88rem !important;
          line-height: 1.2 !important;
          margin-bottom: .28rem !important;
        }

        /* Main content text: ink, not red */
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-body,
          .kzco-body *,
          .kzco-card,
          .kzco-card *,
          .kzco-total-box,
          .kzco-total-box *,
          .kzco-line,
          .kzco-line *,
          .kzco-section-title,
          .kzco-summary,
          .kzco-summary *,
          .kzco-item,
          .kzco-item *,
          .kzco-item-row,
          .kzco-item-row *,
          .kzco-list,
          .kzco-list *,
          .kzco-order-row,
          .kzco-order-row *
        ) {
          color: var(--kzco-ink-clean) !important;
          -webkit-text-fill-color: var(--kzco-ink-clean) !important;
        }

        /* Softer secondary/helper text */
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-muted,
          .kzco-help,
          .kzco-context,
          .kzco-small,
          .kzco-caption
        ) {
          color: var(--kzco-muted-clean) !important;
          -webkit-text-fill-color: var(--kzco-muted-clean) !important;
        }

        /* Section headings can keep a subtle Kazen accent, but not every item/price */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-section-title, .kzco-heading) {
          color: var(--kzco-ink-clean) !important;
          -webkit-text-fill-color: var(--kzco-ink-clean) !important;
        }

        /* Keep status accent readable */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-message,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-success-message {
          color: var(--kzco-accent-clean) !important;
          -webkit-text-fill-color: var(--kzco-accent-clean) !important;
        }

        /* Hide duplicated payment hero: it repeats Order total at the top */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-hero {
          display: none !important;
        }

        /* Keep display-only summaries frameless */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-total-box,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-card:has(.kzco-line):not(:has(.kzco-field)):not(:has(.kzco-btn)):not(:has(.kzco-method-grid)) {
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          padding: .1rem 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-line-strong {
          border-top: 0 !important;
          padding-top: .2rem !important;
        }

        /* Buttons must keep their own colors */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-primary, button[data-kzco-button="primary"]) {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border-color: rgba(143, 55, 51, .58) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-secondary, button[data-kzco-button="secondary"]) {
          color: var(--kzco-ink-clean) !important;
          -webkit-text-fill-color: var(--kzco-ink-clean) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-btn-primary, .kzco-btn-primary *, button[data-kzco-button="primary"], button[data-kzco-button="primary"] *) {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
        }

        /* Inputs and method tiles keep frames */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-field, .kzco-method-tile, .kzco-share-input) {
          border-width: 1px !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: 1.72rem !important;
            letter-spacing: .055em !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-head {
            padding-top: 1.35rem !important;
          }
        }



        /* PMD_KAZEN_V41_FLOW_UI_CLEANUP_20260618
           Flow UI polish:
           - no ORDER STATUS poster title
           - received/timer hero in body with one-time slow pulse
           - split uses Share amount as title
           - compact people stepper
           - sharp input corners
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
          font-size: 1.58rem !important;
          line-height: 1.12 !important;
          letter-spacing: .055em !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-title-wrap,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-title-wrap h2 {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="submitted"] .kzco-head {
          grid-template-columns: 1fr 48px !important;
          min-height: 4.25rem !important;
          padding-top: 1.15rem !important;
          padding-bottom: .75rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-copy-hero {
          display: grid !important;
          grid-template-columns: 58px minmax(0, 1fr) !important;
          align-items: center !important;
          gap: 1rem !important;
          margin-top: .35rem !important;
          margin-bottom: 1.6rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-pulse {
          width: 58px !important;
          height: 58px !important;
          min-width: 58px !important;
          min-height: 58px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid rgba(184, 93, 89, .55) !important;
          color: #b85d59 !important;
          animation: kzco-status-soft-pop 1.7s ease-out 1 both !important;
          transform-origin: center !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-pulse svg {
          width: 1.35rem !important;
          height: 1.35rem !important;
          stroke: currentColor !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-text-block {
          display: grid !important;
          gap: .22rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-time {
          font-style: normal !important;
          font-size: .92rem !important;
          font-weight: 800 !important;
          letter-spacing: .06em !important;
          color: rgba(36, 35, 32, .72) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .72) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-status-time {
          color: rgba(246, 232, 200, .72) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .72) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-status-copy-hero p {
          margin: 0 !important;
          font-size: 1.03rem !important;
          font-weight: 850 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        @keyframes kzco-status-soft-pop {
          0% { transform: scale(.88); opacity: .72; }
          45% { transform: scale(1.12); opacity: 1; }
          72% { transform: scale(.97); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }

        /* Split steps: hide empty h2 and make Share amount the visual title */
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-items"] .kzco-title-wrap h2,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-shares"] .kzco-title-wrap h2 {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split"] .kzco-eyebrow,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-items"] .kzco-eyebrow,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-shares"] .kzco-eyebrow {
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 1.85rem !important;
          font-weight: 800 !important;
          line-height: 1.05 !important;
          letter-spacing: .055em !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          margin: 0 !important;
        }

        /* People stepper: compact like item quantity stepper */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] {
          display: inline-grid !important;
          grid-template-columns: 34px minmax(86px, 1fr) 34px !important;
          width: min(190px, 100%) !important;
          height: 36px !important;
          min-height: 36px !important;
          align-items: center !important;
          overflow: hidden !important;
          border: 1px solid rgba(36, 35, 32, .18) !important;
          background: rgba(255, 252, 246, .68) !important;
          margin-block: .35rem .65rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] .kzco-stepper-btn,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] .kzco-btn-square {
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
          min-height: 34px !important;
          max-width: 34px !important;
          max-height: 34px !important;
          padding: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          border: 0 !important;
          font-size: 1.22rem !important;
          font-weight: 800 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] .kzco-stepper-btn:last-child {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] strong {
          height: 34px !important;
          min-height: 34px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          font-size: .92rem !important;
          font-weight: 850 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          background: rgba(255, 255, 255, .32) !important;
          border-inline: 1px solid rgba(36, 35, 32, .16) !important;
        }

        /* Inputs: sharp corners */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] input.kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] textarea.kzco-field {
          border-radius: 0 !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title-wrap h2,
          html body .kzco-overlay[data-kzco-root="1"] h2.kzco-title,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-title {
            font-size: 1.38rem !important;
          }

          html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split"] .kzco-eyebrow,
          html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-items"] .kzco-eyebrow,
          html body .kzco-overlay[data-kzco-root="1"][data-kzco-step="split-shares"] .kzco-eyebrow {
            font-size: 1.55rem !important;
          }
        }



        /* PMD_KAZEN_V43_NATIVE_PAY_BUTTON_DIRECT_FIX_20260618
           renderPaymentButton() returns .pmd-themed-button, not kzco-btn.
           Force it to the same Kazen primary button contract.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button.pmd-themed-button,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-themed-button="primary"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-stripe-native-button="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button.pmd-themed-button,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-themed-button="primary"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-stripe-native-button="1"] {
          width: 100% !important;
          min-height: 48px !important;
          height: 48px !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          filter: none !important;
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border: 1px solid rgba(143, 55, 51, .62) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          opacity: 1 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          line-height: 1 !important;
          padding: .82rem 1rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button.pmd-themed-button *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-themed-button="primary"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-stripe-native-button="1"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button.pmd-themed-button *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-themed-button="primary"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-stripe-native-button="1"] * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: currentColor !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button.pmd-themed-button:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-themed-button="primary"]:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-stripe-native-button="1"]:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button.pmd-themed-button:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-themed-button="primary"]:disabled,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail button[data-pmd-stripe-native-button="1"]:disabled {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .62) !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button.pmd-themed-button:not(:disabled):hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-themed-button="primary"]:not(:disabled):hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-action button[data-pmd-stripe-native-button="1"]:not(:disabled):hover {
          background: #c86460 !important;
          background-color: #c86460 !important;
          background-image: linear-gradient(#c86460, #c86460) !important;
          transform: translateY(-1px) !important;
        }

        /* Stripe/payment form inputs also sharp, no rounded default */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail input,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-detail .kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-coupon-row input.kzco-field,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tip-grid input.kzco-field {
          border-radius: 0 !important;
        }



        /* PMD_KAZEN_V44_PAY_BUTTON_ABSOLUTE_FINAL_20260618
           Last override for shared/native payment renderer.
        */
        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-payment-action, .kzco-payment-detail) :is(
          button.pmd-themed-button,
          button[data-pmd-themed-button],
          button[data-pmd-stripe-native-button],
          button[type="submit"]
        ) {
          width: 100% !important;
          height: 48px !important;
          min-height: 48px !important;
          border-radius: 0 !important;
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border: 1px solid rgba(143, 55, 51, .62) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          box-shadow: none !important;
          filter: none !important;
          opacity: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-payment-action, .kzco-payment-detail) :is(
          button.pmd-themed-button,
          button[data-pmd-themed-button],
          button[data-pmd-stripe-native-button],
          button[type="submit"]
        ) * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: currentColor !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(.kzco-payment-action, .kzco-payment-detail) :is(
          button.pmd-themed-button,
          button[data-pmd-themed-button],
          button[data-pmd-stripe-native-button],
          button[type="submit"]
        ):disabled {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
        }



        /* PMD_KAZEN_V46C_PAYMENT_GUARD_CSS_SAFE_20260618
           Hide payment methods/fields until backend has created a real order_id.
           Make payment method logos compact and unframed when visible.
        */

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-can-pay="0"] .kzco-method-grid,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-can-pay="0"] .kzco-payment-detail,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-can-pay="0"] .kzco-payment-action,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-can-pay="0"] .kzco-section-title:has(+ .kzco-method-grid) {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-can-pay="1"] .kzco-payment-blocked-clean {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-blocked-clean {
          margin-top: 1rem !important;
          padding: .9rem 0 0 !important;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-blocked-clean strong {
          display: block !important;
          font-size: 1rem !important;
          font-weight: 850 !important;
          margin-bottom: .35rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-payment-blocked-clean p {
          margin: 0 0 .9rem !important;
          font-size: .9rem !important;
          line-height: 1.45 !important;
          color: rgba(36, 35, 32, .72) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .72) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .5rem !important;
          margin-bottom: .95rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile {
          min-height: 48px !important;
          height: 48px !important;
          padding: .25rem .35rem !important;
          border: 0 !important;
          outline: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          filter: none !important;
          opacity: .74 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile[data-kzco-active="1"] {
          opacity: 1 !important;
          border-bottom: 2px solid #b85d59 !important;
          background: rgba(184, 93, 89, .035) !important;
          background-color: rgba(184, 93, 89, .035) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile:hover {
          opacity: 1 !important;
          background: rgba(36, 35, 32, .035) !important;
          background-color: rgba(36, 35, 32, .035) !important;
          transform: translateY(-1px) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-method-tile img {
          max-width: 64px !important;
          max-height: 26px !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
        }



        /* PMD_KAZEN_V47_SPLIT_TABS_FIXED_20260618
           Keep Split / By order / By shares tabs stable in all split states.
           Selected tab gets a clear secondary active effect.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .58rem !important;
          align-items: stretch !important;
          width: 100% !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          height: 58px !important;
          min-height: 58px !important;
          padding: .5rem .3rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
          line-height: 1.05 !important;
          border-radius: 0 !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          background: rgba(255, 255, 255, .42) !important;
          background-color: rgba(255, 255, 255, .42) !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          box-shadow: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-label {
          display: grid !important;
          grid-template-rows: auto auto !important;
          gap: .12rem !important;
          align-items: center !important;
          justify-items: center !important;
          width: 100% !important;
          max-width: 100% !important;
          text-align: center !important;
          line-height: 1.02 !important;
          font-size: .82rem !important;
          font-weight: 900 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
          white-space: normal !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-label span {
          display: block !important;
          width: 100% !important;
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
        }

        /* Fallback for tabs still using plain text */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment:not(:has(.kzco-segment-label)),
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab:not(:has(.kzco-segment-label)) {
          font-size: .8rem !important;
          letter-spacing: .12em !important;
          line-height: 1.05 !important;
          text-wrap: balance !important;
        }

        /* Active selected split way */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment[data-kzco-active="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab[data-kzco-active="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment[data-kzco-active="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment[aria-pressed="true"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab[aria-pressed="true"] {
          border: 1px solid rgba(184, 93, 89, .72) !important;
          background: rgba(184, 93, 89, .085) !important;
          background-color: rgba(184, 93, 89, .085) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          box-shadow: inset 0 -2px 0 #b85d59 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment[data-kzco-active="1"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab[data-kzco-active="1"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment[data-kzco-active="1"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment[aria-pressed="true"] *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab[aria-pressed="true"] * {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment:not([data-kzco-active="1"]):not([aria-pressed="true"]):hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tab:not([data-kzco-active="1"]):not([aria-pressed="true"]):hover {
          border-color: rgba(36, 35, 32, .32) !important;
          background: rgba(255, 255, 255, .62) !important;
          background-color: rgba(255, 255, 255, .62) !important;
          transform: translateY(-1px) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-tab,
        html body .kzco-overlay[data-kzco-root="1"][data-kzco-mode="dark"] .kzco-segment {
          border-color: rgba(246, 232, 200, .22) !important;
          background: rgba(8, 6, 4, .72) !important;
          background-color: rgba(8, 6, 4, .72) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs {
            gap: .42rem !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-btn-segment,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tab {
            height: 54px !important;
            min-height: 54px !important;
            padding-inline: .18rem !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-label {
            font-size: .72rem !important;
            letter-spacing: .105em !important;
          }
        }



        /* PMD_KAZEN_V48_SPLIT_TABS_CHIPS_POLISH_20260618
           Real final split tab fix:
           Force stable two-line labels with nth-child pseudo-content,
           so BY SHARES can never collapse into one line.
           Also polish people chips row.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .52rem !important;
          align-items: stretch !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          flex: 1 1 0 !important;
          height: 56px !important;
          min-height: 56px !important;
          padding: .42rem .18rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          text-align: center !important;
          overflow: hidden !important;
          white-space: normal !important;
          border-radius: 0 !important;
          font-size: 0 !important;
          letter-spacing: 0 !important;
          line-height: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment > *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment > *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab > *,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab > * {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab::before {
          display: block !important;
          white-space: pre-line !important;
          text-align: center !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .74rem !important;
          font-weight: 900 !important;
          line-height: 1.08 !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(1)::before {
          content: "SPLIT\\A EQUALLY" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(2)::before {
          content: "BY ORDER\\A ITEMS" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(3)::before {
          content: "BY\\A SHARES" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > :is(.kzco-btn-segment, .kzco-tab)[data-kzco-active="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > :is(.kzco-btn-segment, .kzco-tab)[data-kzco-active="1"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > :is(.kzco-btn-segment, .kzco-tab)[aria-pressed="true"],
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > :is(.kzco-btn-segment, .kzco-tab)[aria-pressed="true"] {
          border-color: rgba(184, 93, 89, .8) !important;
          background: rgba(184, 93, 89, .095) !important;
          background-color: rgba(184, 93, 89, .095) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          box-shadow: inset 0 -2px 0 #b85d59 !important;
        }

        /* People/guest chips: sit compactly to the right of the stepper and wrap nicely */
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-people-row,
          .kzco-guest-row,
          .kzco-guests-row,
          .kzco-person-row,
          .kzco-people-list,
          .kzco-guests-list,
          .kzco-person-list,
          .kzco-payer-list,
          .kzco-split-people,
          .kzco-people-chips,
          .kzco-guest-chips,
          .kzco-person-chips
        ) {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: .45rem .55rem !important;
          margin-top: .65rem !important;
          margin-left: min(205px, 42%) !important;
          min-height: 38px !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-person-chip,
          .kzco-guest-chip,
          .kzco-payer-chip,
          .kzco-person-pill,
          .kzco-guest-pill,
          .kzco-payer-pill
        ),
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-people-row,
          .kzco-guest-row,
          .kzco-guests-row,
          .kzco-person-row,
          .kzco-people-list,
          .kzco-guests-list,
          .kzco-person-list,
          .kzco-payer-list,
          .kzco-split-people,
          .kzco-people-chips,
          .kzco-guest-chips,
          .kzco-person-chips
        ) > button {
          animation: kzco-person-chip-in .24s ease-out both !important;
          transition: transform .18s ease, opacity .18s ease, border-color .18s ease, background-color .18s ease !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-person-chip,
          .kzco-guest-chip,
          .kzco-payer-chip,
          .kzco-person-pill,
          .kzco-guest-pill,
          .kzco-payer-pill
        ):hover,
        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-people-row,
          .kzco-guest-row,
          .kzco-guests-row,
          .kzco-person-row,
          .kzco-people-list,
          .kzco-guests-list,
          .kzco-person-list,
          .kzco-payer-list,
          .kzco-split-people,
          .kzco-people-chips,
          .kzco-guest-chips,
          .kzco-person-chips
        ) > button:hover {
          transform: translateY(-1px) !important;
        }

        @keyframes kzco-person-chip-in {
          from { opacity: 0; transform: translateY(5px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs {
            gap: .36rem !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab {
            height: 52px !important;
            min-height: 52px !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment::before,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment::before,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab::before,
          html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab::before {
            font-size: .66rem !important;
            letter-spacing: .09em !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] :is(
            .kzco-people-row,
            .kzco-guest-row,
            .kzco-guests-row,
            .kzco-person-row,
            .kzco-people-list,
            .kzco-guests-list,
            .kzco-person-list,
            .kzco-payer-list,
            .kzco-split-people,
            .kzco-people-chips,
            .kzco-guest-chips,
            .kzco-person-chips
          ) {
            margin-left: 0 !important;
            margin-top: .55rem !important;
          }
        }



        /* PMD_KAZEN_V49_REAL_SPLIT_TABS_CHIPS_FIX_20260618
           Fix V48 escaped newline issue and force guest chips beside stepper.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab {
          font-size: 0 !important;
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          overflow: hidden !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab::before {
          display: block !important;
          white-space: pre-line !important;
          text-align: center !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .74rem !important;
          font-weight: 900 !important;
          line-height: 1.08 !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(1)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(1)::before {
          content: "SPLIT\\A EQUALLY" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(2)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(2)::before {
          content: "BY ORDER\\A ITEMS" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-btn-segment:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-btn-segment:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > .kzco-tab:nth-child(3)::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > .kzco-tab:nth-child(3)::before {
          content: "BY\\A SHARES" !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > :is(.kzco-btn-segment, .kzco-tab)[data-kzco-active="1"]::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > :is(.kzco-btn-segment, .kzco-tab)[data-kzco-active="1"]::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-segment-grid > :is(.kzco-btn-segment, .kzco-tab)[aria-pressed="true"]::before,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-tabs > :is(.kzco-btn-segment, .kzco-tab)[aria-pressed="true"]::before {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        /* Put people chips beside the stepper, not below with empty gap */
        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] {
          float: left !important;
          margin: 0 .75rem .72rem 0 !important;
          width: 190px !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] + * {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: .45rem .55rem !important;
          margin-top: 0 !important;
          padding-top: 0 !important;
          min-height: 38px !important;
          animation: kzco-person-chip-row-in .22s ease-out both !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] + * > * {
          animation: kzco-person-chip-in .24s ease-out both !important;
          transition: transform .18s ease, opacity .18s ease, border-color .18s ease, background-color .18s ease !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] + * > *:hover {
          transform: translateY(-1px) !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] :is(
          .kzco-assignment-panel,
          .kzco-assignment-box,
          .kzco-items-assignment,
          .kzco-share-box,
          .kzco-share-grid,
          .kzco-ready-box,
          .kzco-split-ready,
          .kzco-review-actions
        ) {
          clear: both !important;
        }

        @keyframes kzco-person-chip-row-in {
          from { opacity: .72; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 620px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] {
            float: none !important;
            width: 190px !important;
            margin: 0 0 .55rem 0 !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-stepper[data-kzco-control="people-stepper"] + * {
            width: 100% !important;
          }
        }



        /* PMD_KAZEN_V50_PEOPLE_INLINE_PAYMENT_SCOPE_20260618
           Stepper + people chips are now a real JSX row, not guessed by float.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline {
          display: grid !important;
          grid-template-columns: 190px minmax(0, 1fr) !important;
          align-items: start !important;
          gap: .55rem .7rem !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] {
          float: none !important;
          width: 190px !important;
          max-width: 190px !important;
          min-width: 190px !important;
          height: 36px !important;
          min-height: 36px !important;
          margin: 0 !important;
          grid-template-columns: 36px minmax(0, 1fr) 36px !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] .kzco-stepper-btn,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] .kzco-btn-square {
          width: 36px !important;
          height: 36px !important;
          min-width: 36px !important;
          min-height: 36px !important;
          max-width: 36px !important;
          max-height: 36px !important;
          padding: 0 !important;
          font-size: 1.35rem !important;
          line-height: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] strong {
          height: 36px !important;
          min-height: 36px !important;
          font-size: .92rem !important;
          white-space: nowrap !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip-row {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          align-content: flex-start !important;
          gap: .42rem .5rem !important;
          width: 100% !important;
          max-width: 100% !important;
          min-height: 36px !important;
          margin: 0 !important;
          padding: 0 !important;
          animation: kzco-person-chip-row-in .22s ease-out both !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip {
          min-height: 36px !important;
          height: 36px !important;
          padding: .42rem .58rem !important;
          font-size: .88rem !important;
          line-height: 1 !important;
          animation: kzco-person-chip-in .24s ease-out both !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip b {
          width: 24px !important;
          height: 24px !important;
          min-width: 24px !important;
          margin-right: .36rem !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline + :is(.kzco-card, .kzco-list, section, button) {
          clear: both !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline {
            grid-template-columns: 1fr !important;
          }

          html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] {
            width: 190px !important;
            max-width: 190px !important;
          }
        }



        /* PMD_KAZEN_V51_COMPACT_STEPPER_WIDE_CHIPS_20260618
           Make split people control the same small size as item quantity stepper.
           This gives the guest chips enough horizontal space beside it.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline {
          display: grid !important;
          grid-template-columns: 106px minmax(0, 1fr) !important;
          align-items: start !important;
          gap: .55rem .72rem !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] {
          width: 106px !important;
          min-width: 106px !important;
          max-width: 106px !important;
          height: 36px !important;
          min-height: 36px !important;
          max-height: 36px !important;
          grid-template-columns: 34px 38px 34px !important;
          overflow: hidden !important;
          border-radius: 0 !important;
          margin: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] .kzco-stepper-btn,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] .kzco-btn-square {
          width: 34px !important;
          height: 34px !important;
          min-width: 34px !important;
          min-height: 34px !important;
          max-width: 34px !important;
          max-height: 34px !important;
          padding: 0 !important;
          font-size: 1.38rem !important;
          line-height: 1 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-stepper[data-kzco-control="people-stepper"] strong {
          width: 38px !important;
          min-width: 38px !important;
          height: 34px !important;
          min-height: 34px !important;
          font-size: .95rem !important;
          font-weight: 850 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip-row {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: flex-start !important;
          justify-content: flex-start !important;
          align-content: flex-start !important;
          gap: .42rem .46rem !important;
          min-height: 36px !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip {
          flex: 0 0 auto !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: 100% !important;
          height: 36px !important;
          min-height: 36px !important;
          padding: .38rem .52rem !important;
          gap: .36rem !important;
          font-size: .84rem !important;
          line-height: 1 !important;
          white-space: nowrap !important;
          animation: kzco-person-chip-in .24s ease-out both !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip b {
          width: 24px !important;
          height: 24px !important;
          min-width: 24px !important;
          margin-right: .26rem !important;
        }

        @media (max-width: 520px) {
          html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline {
            grid-template-columns: 106px minmax(0, 1fr) !important;
          }
        }



        /* PMD_KAZEN_V52_HIDE_GUEST_INITIAL_ICONS_20260618
           Remove the ugly initial-letter boxes inside split guest chips.
           Keep chips clean: Luna / Milo / Zara without fake icons.
        */

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip b,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-chip-row .kzco-chip b {
          display: none !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-chip-row .kzco-chip {
          min-width: auto !important;
          height: 36px !important;
          min-height: 36px !important;
          padding: .42rem .74rem !important;
          gap: 0 !important;
          justify-content: center !important;
          font-size: .88rem !important;
          font-weight: 820 !important;
          letter-spacing: .01em !important;
          white-space: nowrap !important;
        }

        html body .kzco-overlay[data-kzco-root="1"] .kzco-people-inline .kzco-chip:hover,
        html body .kzco-overlay[data-kzco-root="1"] .kzco-chip-row .kzco-chip:hover {
          border-color: rgba(184, 93, 89, .38) !important;
          background: rgba(184, 93, 89, .035) !important;
          transform: translateY(-1px) !important;
        }

      `}</style>


      <style jsx global>{`
        /* PMD_KAZEN_V31_CLEAN_CHECKOUT_POLISH_20260618
           Final polish after V30 clean rewrite:
           - readable disabled buttons
           - unified primary/secondary/tabs/payment buttons
           - no blue Safari focus block
           - payment form buttons included
        */

        html body .pmd-kazen-checkout-waiter,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] {
          --kz-primary-bg: #b85d59;
          --kz-primary-bg-hover: #c86460;
          --kz-primary-text: #fffaf3;
          --kz-primary-border: rgba(143, 55, 51, .56);

          --kz-secondary-bg: rgba(255, 255, 255, .42);
          --kz-secondary-bg-hover: rgba(255, 255, 255, .62);
          --kz-secondary-text: #242320;
          --kz-secondary-border: rgba(36, 35, 32, .22);

          --kz-close-bg: rgba(255, 255, 255, .42);
          --kz-close-text: #242320;
          --kz-close-border: rgba(36, 35, 32, .22);

          --kz-disabled-bg: rgba(184, 93, 89, .16);
          --kz-disabled-text: rgba(184, 93, 89, .78);
          --kz-disabled-border: rgba(184, 93, 89, .42);
        }

        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] {
          --kz-primary-bg: #b85d59;
          --kz-primary-bg-hover: #c86460;
          --kz-primary-text: #fffaf3;
          --kz-primary-border: rgba(223, 104, 93, .72);

          --kz-secondary-bg: rgba(8, 6, 4, .88);
          --kz-secondary-bg-hover: rgba(246, 232, 200, .08);
          --kz-secondary-text: #f6e8c8;
          --kz-secondary-border: rgba(198, 164, 93, .36);

          --kz-close-bg: rgba(246, 232, 200, .055);
          --kz-close-text: #f6e8c8;
          --kz-close-border: rgba(198, 164, 93, .30);

          --kz-disabled-bg: rgba(184, 93, 89, .28);
          --kz-disabled-text: rgba(255, 250, 243, .68);
          --kz-disabled-border: rgba(223, 104, 93, .34);
        }

        html body .pmd-kazen-checkout-waiter button,
        html body .pmd-kazen-checkout-waiter [role="button"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] button,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] [role="button"] {
          border-radius: 0 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          outline-offset: 3px !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          text-transform: uppercase !important;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease !important;
          -webkit-appearance: none !important;
          appearance: none !important;
        }

        html body .pmd-kazen-checkout-waiter button:focus,
        html body .pmd-kazen-checkout-waiter button:focus-visible {
          outline: 2px solid rgba(184, 93, 89, .42) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-close-clean {
          width: 48px !important;
          height: 48px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          padding: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: var(--kz-close-bg) !important;
          color: var(--kz-close-text) !important;
          -webkit-text-fill-color: var(--kz-close-text) !important;
          border: 1px solid var(--kz-close-border) !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close svg,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-action-close svg *,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close svg,
        html body .pmd-kazen-checkout-waiter .kazen-solid-close svg * {
          color: var(--kz-close-text) !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        /* TYPE 1: PRIMARY RED */
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button="primary"],
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-primary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-action-primary-clean,
        html body .pmd-kazen-checkout-waiter .pmd-themed-button[data-pmd-themed-button="primary"],
        html body .pmd-kazen-checkout-waiter [data-pmd-stripe-native-button="1"],
        html body .pmd-kazen-checkout-waiter button[type="submit"],
        html body .pmd-kazen-checkout-waiter button:has(.lucide-lock) {
          min-height: 48px !important;
          padding: .82rem 1rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          background: var(--kz-primary-bg) !important;
          background-color: var(--kz-primary-bg) !important;
          color: var(--kz-primary-text) !important;
          -webkit-text-fill-color: var(--kz-primary-text) !important;
          border: 1px solid var(--kz-primary-border) !important;
        }

        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button="primary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body .pmd-kazen-checkout-waiter .pmd-themed-button[data-pmd-themed-button="primary"]:not(:disabled):hover,
        html body .pmd-kazen-checkout-waiter [data-pmd-stripe-native-button="1"]:not(:disabled):hover {
          background: var(--kz-primary-bg-hover) !important;
          background-color: var(--kz-primary-bg-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* TYPE 2: SECONDARY + TABS */
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button="secondary"],
        html body .pmd-kazen-checkout-waiter .pmd-kzui-btn-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-checkout-action-secondary-clean,
        html body .pmd-kazen-checkout-waiter .kazen-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab-active,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-waiter-secondary,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-split-stepper-btn,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-assign-row,
        html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-method,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-apply {
          min-height: 48px !important;
          padding: .82rem 1rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          background: var(--kz-secondary-bg) !important;
          background-color: var(--kz-secondary-bg) !important;
          color: var(--kz-secondary-text) !important;
          -webkit-text-fill-color: var(--kz-secondary-text) !important;
          border: 1px solid var(--kz-secondary-border) !important;
        }

        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button="secondary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab:not(:disabled):hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-split-stepper-btn:not(:disabled):hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-assign-row:not(:disabled):hover,
        html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile:not(:disabled):hover,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-method:not(:disabled):hover {
          background: var(--kz-secondary-bg-hover) !important;
          background-color: var(--kz-secondary-bg-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* Active tabs stay type-2, only border becomes stronger */
        html body .pmd-kazen-checkout-waiter .pmd-kazen-tab-active {
          background: var(--kz-secondary-bg) !important;
          background-color: var(--kz-secondary-bg) !important;
          color: var(--kz-secondary-text) !important;
          -webkit-text-fill-color: var(--kz-secondary-text) !important;
          border: 1px solid var(--kz-primary-bg) !important;
          box-shadow: inset 0 -2px 0 var(--kz-primary-bg) !important;
        }

        /* Disabled must be readable, never white-on-white */
        html body .pmd-kazen-checkout-waiter button:disabled,
        html body .pmd-kazen-checkout-waiter button[disabled],
        html body .pmd-kazen-checkout-waiter [aria-disabled="true"],
        html body .pmd-kazen-checkout-waiter [data-pmd-kazen-button="primary"]:disabled,
        html body .pmd-kazen-checkout-waiter .pmd-themed-button:disabled,
        html body .pmd-kazen-checkout-waiter [data-pmd-stripe-native-button="1"]:disabled {
          opacity: 1 !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
          transform: none !important;
          background: var(--kz-disabled-bg) !important;
          background-color: var(--kz-disabled-bg) !important;
          color: var(--kz-disabled-text) !important;
          -webkit-text-fill-color: var(--kz-disabled-text) !important;
          border: 1px solid var(--kz-disabled-border) !important;
          filter: none !important;
        }

        html body .pmd-kazen-checkout-waiter button svg,
        html body .pmd-kazen-checkout-waiter button svg *,
        html body .pmd-kazen-checkout-waiter [role="button"] svg,
        html body .pmd-kazen-checkout-waiter [role="button"] svg * {
          color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        html body .pmd-kazen-checkout-waiter .pmd-payment-method-tile img,
        html body .pmd-kazen-checkout-waiter .pmd-kazen-method img {
          max-width: 72px !important;
          max-height: 34px !important;
          object-fit: contain !important;
        }
      `}</style>


      <style jsx global>{`
        /* PMD_KAZEN_V32_REAL_KZCO_BUTTON_NORMAL_STATE_FIX_20260618
           The clean checkout rewrite uses kzco-btn / data-kzco-button.
           This is the real final contract for normal + hover + disabled states.
        */

        html body .kzco-shell,
        html body .kzco-overlay,
        html body .kzco-card,
        html body .pmd-kazen-checkout-waiter,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"] {
          --kzco-primary-bg: #b85d59;
          --kzco-primary-hover: #c86460;
          --kzco-primary-text: #fffaf3;
          --kzco-primary-border: rgba(143, 55, 51, .58);

          --kzco-secondary-bg: rgba(255, 255, 255, .42);
          --kzco-secondary-hover: rgba(255, 255, 255, .62);
          --kzco-secondary-text: #242320;
          --kzco-secondary-border: rgba(36, 35, 32, .24);

          --kzco-close-bg: rgba(255, 255, 255, .42);
          --kzco-close-text: #242320;
          --kzco-close-border: rgba(36, 35, 32, .24);

          --kzco-disabled-bg: rgba(184, 93, 89, .14);
          --kzco-disabled-text: rgba(184, 93, 89, .82);
          --kzco-disabled-border: rgba(184, 93, 89, .48);
        }

        html body .kzco-shell[data-kzco-mode="dark"],
        html body .kzco-overlay[data-kzco-mode="dark"],
        html body .kzco-card[data-kzco-mode="dark"],
        html body .pmd-kazen-checkout-waiter[data-pmd-kazen-checkout-mode="dark"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="kazen_japanese"][data-pmd-kazen-checkout-mode="dark"] {
          --kzco-primary-bg: #b85d59;
          --kzco-primary-hover: #c86460;
          --kzco-primary-text: #fffaf3;
          --kzco-primary-border: rgba(223, 104, 93, .72);

          --kzco-secondary-bg: rgba(8, 6, 4, .88);
          --kzco-secondary-hover: rgba(246, 232, 200, .08);
          --kzco-secondary-text: #f6e8c8;
          --kzco-secondary-border: rgba(198, 164, 93, .38);

          --kzco-close-bg: rgba(246, 232, 200, .055);
          --kzco-close-text: #f6e8c8;
          --kzco-close-border: rgba(198, 164, 93, .32);

          --kzco-disabled-bg: rgba(184, 93, 89, .26);
          --kzco-disabled-text: rgba(255, 250, 243, .72);
          --kzco-disabled-border: rgba(223, 104, 93, .40);
        }

        html body button.kzco-btn,
        html body .kzco-btn,
        html body button[data-kzco-button],
        html body button[data-pmd-kazen-button],
        html body .pmd-themed-button,
        html body [data-pmd-stripe-native-button="1"] {
          min-height: 48px !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          text-shadow: none !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .12em !important;
          line-height: 1.08 !important;
          text-transform: uppercase !important;
          text-align: center !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          padding: .82rem 1rem !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          background-image: none !important;
          transition: background-color .18s ease, border-color .18s ease, color .18s ease, transform .18s ease !important;
        }

        /* TYPE 1: red primary */
        html body button.kzco-btn-primary,
        html body .kzco-btn-primary,
        html body button[data-kzco-button="primary"],
        html body button[data-pmd-kazen-button="primary"],
        html body .pmd-themed-button[data-pmd-themed-button="primary"],
        html body [data-pmd-stripe-native-button="1"],
        html body button[type="submit"][data-pmd-themed-button="primary"],
        html body button:has(.lucide-lock) {
          background: var(--kzco-primary-bg) !important;
          background-color: var(--kzco-primary-bg) !important;
          color: var(--kzco-primary-text) !important;
          -webkit-text-fill-color: var(--kzco-primary-text) !important;
          border: 1px solid var(--kzco-primary-border) !important;
        }

        html body button.kzco-btn-primary:not(:disabled):not([aria-disabled="true"]):hover,
        html body button[data-kzco-button="primary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body button[data-pmd-kazen-button="primary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body .pmd-themed-button[data-pmd-themed-button="primary"]:not(:disabled):hover,
        html body [data-pmd-stripe-native-button="1"]:not(:disabled):hover {
          background: var(--kzco-primary-hover) !important;
          background-color: var(--kzco-primary-hover) !important;
          color: var(--kzco-primary-text) !important;
          -webkit-text-fill-color: var(--kzco-primary-text) !important;
          transform: translateY(-1px) !important;
        }

        /* TYPE 2: secondary + split tabs */
        html body button.kzco-btn-secondary,
        html body .kzco-btn-secondary,
        html body button[data-kzco-button="secondary"],
        html body button[data-pmd-kazen-button="secondary"],
        html body .kzco-tab,
        html body button.kzco-tab,
        html body .kzco-btn-tab,
        html body .kzco-choice,
        html body .kzco-method,
        html body .kzco-assign-row,
        html body .kzco-stepper-btn,
        html body .pmd-payment-method-tile,
        html body .pmd-kazen-method,
        html body .pmd-kazen-tab,
        html body .pmd-kazen-split-stepper-btn,
        html body .pmd-kazen-assign-row {
          background: var(--kzco-secondary-bg) !important;
          background-color: var(--kzco-secondary-bg) !important;
          color: var(--kzco-secondary-text) !important;
          -webkit-text-fill-color: var(--kzco-secondary-text) !important;
          border: 1px solid var(--kzco-secondary-border) !important;
        }

        html body button.kzco-btn-secondary:not(:disabled):hover,
        html body button[data-kzco-button="secondary"]:not(:disabled):hover,
        html body .kzco-tab:not(:disabled):hover,
        html body .kzco-method:not(:disabled):hover,
        html body .kzco-assign-row:not(:disabled):hover,
        html body .kzco-stepper-btn:not(:disabled):hover,
        html body .pmd-payment-method-tile:not(:disabled):hover {
          background: var(--kzco-secondary-hover) !important;
          background-color: var(--kzco-secondary-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* Active tab is still TYPE 2, only stronger border */
        html body .kzco-tab-active,
        html body .pmd-kazen-tab-active {
          background: var(--kzco-secondary-bg) !important;
          background-color: var(--kzco-secondary-bg) !important;
          color: var(--kzco-secondary-text) !important;
          -webkit-text-fill-color: var(--kzco-secondary-text) !important;
          border: 1px solid var(--kzco-primary-bg) !important;
          box-shadow: inset 0 -2px 0 var(--kzco-primary-bg) !important;
        }

        /* Close square */
        html body .kzco-close,
        html body button.kzco-close,
        html body .kzco-btn-close,
        html body .pmd-kazen-action-close,
        html body .kazen-solid-close,
        html body .pmd-kazen-checkout-close-clean {
          width: 48px !important;
          height: 48px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          max-width: 48px !important;
          max-height: 48px !important;
          padding: 0 !important;
          background: var(--kzco-close-bg) !important;
          background-color: var(--kzco-close-bg) !important;
          color: var(--kzco-close-text) !important;
          -webkit-text-fill-color: var(--kzco-close-text) !important;
          border: 1px solid var(--kzco-close-border) !important;
        }

        html body .kzco-close svg,
        html body .kzco-close svg *,
        html body .pmd-kazen-action-close svg,
        html body .pmd-kazen-action-close svg *,
        html body button.kzco-btn svg,
        html body button.kzco-btn svg *,
        html body button[data-kzco-button] svg,
        html body button[data-kzco-button] svg * {
          color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        /* Disabled primary/secondary: readable, never white text on white background */
        html body button.kzco-btn:disabled,
        html body button[data-kzco-button]:disabled,
        html body button[data-pmd-kazen-button]:disabled,
        html body button[disabled].kzco-btn,
        html body .pmd-themed-button:disabled,
        html body [data-pmd-stripe-native-button="1"]:disabled {
          opacity: 1 !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
          transform: none !important;
          background: var(--kzco-disabled-bg) !important;
          background-color: var(--kzco-disabled-bg) !important;
          color: var(--kzco-disabled-text) !important;
          -webkit-text-fill-color: var(--kzco-disabled-text) !important;
          border: 1px solid var(--kzco-disabled-border) !important;
          filter: none !important;
        }
      `}</style>


    </div>
  )
}

// PMD_KAZEN_V46D_REPAIR_PAYMENT_GUARD_SYNTAX_20260618
