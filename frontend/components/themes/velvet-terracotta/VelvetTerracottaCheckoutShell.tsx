"use client"

import React from "react"
import { Check, Clock3, CreditCard, Globe2, Instagram, Link2, MessageSquare, QrCode, Star, Users } from "lucide-react"

import { canRenderPaymentMethodDetail } from "@/features/checkout/payment-method-utils"
import type { SplitPerson } from "@/features/checkout/types"
import { formatCurrency } from "@/lib/currency"
import { iconForPayment } from "@/lib/payment-icons"

type VelvetTerracottaCheckoutShellProps = any

// PMD_VELVET_V31_SAFE_ITEM_TOTAL_HELPER_20260618
function pmdVelvetSafeNumber(value: any): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function pmdVelvetItemTotal(items: any[]): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, item) => {
    const qty = pmdVelvetSafeNumber(item?.quantity ?? item?.qty ?? 1)
    const price = pmdVelvetSafeNumber(item?.price ?? item?.unit_price ?? item?.unitPrice ?? item?.total_price ?? item?.totalPrice ?? 0)
    const lineTotal = pmdVelvetSafeNumber(item?.total ?? item?.line_total ?? item?.lineTotal ?? 0)
    return sum + (lineTotal > 0 ? lineTotal : price * Math.max(qty, 1))
  }, 0)
}

function pmdVelvetPreferVisibleTotal(total: any, items: any[]): number {
  const current = pmdVelvetSafeNumber(total)
  const itemTotal = pmdVelvetItemTotal(items)
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

function useVelvetCheckoutMode(isDarkTheme?: boolean) {
  return React.useMemo(() => {
    if (isDarkTheme) return "dark"
    if (typeof window === "undefined") return "light"

    const isDarkValue = (value: unknown) => String(value || "").toLowerCase() === "dark"

    try {
      const params = new URLSearchParams(window.location.search)
      if (isDarkValue(params.get("mode"))) return "dark"
    } catch {}

    try {
      if (isDarkValue(window.localStorage.getItem("pmd-velvet-terracotta-mode"))) return "dark"
    } catch {}

    try {
      if (
        isDarkValue(document.documentElement.getAttribute("data-pmd-velvet-mode")) ||
        isDarkValue(document.body?.getAttribute("data-pmd-velvet-mode")) ||
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

          const looksLikeVelvet = href.includes("/themes/velvet-terracotta") || Boolean(doc.querySelector(".velvet-page, .velvet-shell"))
          if (!looksLikeVelvet) continue

          if (
            isDarkValue(doc.documentElement.getAttribute("data-pmd-velvet-mode")) ||
            isDarkValue(doc.body?.getAttribute("data-pmd-velvet-mode")) ||
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
      data-vtco-button={cleanVariant}
      className={["vtco-btn", "vtco-btn-action", `vtco-btn-${cleanVariant}`, className].filter(Boolean).join(" ")}
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
      data-vtco-button={cleanVariant}
      className={["vtco-btn", "vtco-btn-square", `vtco-btn-${cleanVariant}`, className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  )
}

function ModalHead({ title, eyebrow, onBack }: { title: string; eyebrow?: string; onBack: () => void }) {
  return (
    <header className="vtco-head">
      <div className="vtco-title-wrap">
        {eyebrow ? <span className="vtco-eyebrow">{eyebrow}</span> : null}
        <h2>{title}</h2>
      </div>
      <SquareButton aria-label="Close" onClick={onBack} className="vtco-close">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </SquareButton>
    </header>
  )
}

function ButtonRow({ children, columns = 1 }: { children: React.ReactNode; columns?: 1 | 2 | 3 }) {
  return <div className={`vtco-actions vtco-actions-${columns}`}>{children}</div>
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={["vtco-card", className].filter(Boolean).join(" ")}>{children}</section>
}

function Line({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={strong ? "vtco-line vtco-line-strong" : "vtco-line"}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
    </div>
  )
}

function ItemRows({ items }: { items: DisplayItem[] }) {
  const safeItems = Array.isArray(items) ? items : []

  if (safeItems.length === 0) {
    return <p className="vtco-muted">No items yet</p>
  }

  return (
    <div className="vtco-list vtco-items-list" aria-label="Order items">
      {safeItems.map((item, index) => (
        <div className="vtco-cart-line" key={`${getItemName(item)}-${index}`}>
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
    <div className="vtco-tabs" role="tablist" aria-label="Split method">
      {tabs.map(([method, label]) => (
        <CheckoutButton
          key={method}
          variant="secondary"
          data-vtco-active={splitMethod === method ? "1" : "0"}
          aria-pressed={splitMethod === method}
          onClick={() => chooseSplitMethod?.(method)}
          className="vtco-btn-segment"
        >
          {label}
        </CheckoutButton>
      ))}
    </div>
  )
}

function PeopleControls({ splitGuestCount = 2, addSplitGuest, removeSplitGuest }: any) {
  return (
    <div className="vtco-stepper" data-vtco-control="people-stepper">
      <SquareButton aria-label="Remove guest" disabled={splitGuestCount <= 2} onClick={removeSplitGuest} className="vtco-stepper-btn">
        <span aria-hidden="true">−</span>
      </SquareButton>
      <strong aria-label={`${splitGuestCount} people`}>{splitGuestCount}</strong>
      <SquareButton variant="primary" aria-label="Add guest" disabled={splitGuestCount >= 10} onClick={addSplitGuest} className="vtco-stepper-btn">
        <span aria-hidden="true">＋</span>
      </SquareButton>
    </div>
  )
}

function GuestChips({ guests = [] }: { guests?: SplitPerson[] }) {
  if (!Array.isArray(guests) || guests.length === 0) return null

  return (
    <div className="vtco-chip-row">
      {guests.map((guest, index) => (
        <span key={`${guest.name}-${index}`} className="vtco-chip">
          <b>{guest.avatar || guest.name?.slice(0, 1) || index + 1}</b>
          {guest.name}
        </span>
      ))}
    </div>
  )
}




function VelvetPaymentMethodMark({ code, label }: { code?: string; label?: string }) {
  const normalized = String(code || "").toLowerCase()
  const safeLabel = String(label || code || "Payment").replace(/[_-]+/g, " ")

  if (normalized === "card" || normalized === "stripe" || normalized === "credit_card") {
    return (
      <span className="vtco-paymark vtco-paymark-card" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img" focusable="false">
          <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
          <path d="M3.5 9h17" />
          <path d="M7 15h4.2" />
        </svg>
        <span className="vtco-paymark-label">Card</span>
      </span>
    )
  }

  if (normalized === "apple_pay" || normalized === "applepay") {
    return (
      <span className="vtco-paymark vtco-paymark-apple" aria-hidden="true">
        <span className="vtco-paymark-symbol"></span>
        <span className="vtco-paymark-label">Pay</span>
      </span>
    )
  }

  if (normalized === "google_pay" || normalized === "googlepay" || normalized === "gpay") {
    return (
      <span className="vtco-paymark vtco-paymark-google" aria-hidden="true">
        <span className="vtco-paymark-g">G</span>
        <span className="vtco-paymark-label">Pay</span>
      </span>
    )
  }

  if (normalized === "wero") {
    return (
      <span className="vtco-paymark vtco-paymark-wero" aria-hidden="true">
        <span className="vtco-paymark-label">wero</span>
      </span>
    )
  }

  if (normalized === "paypal" || normalized === "pay_pal") {
    return (
      <span className="vtco-paymark vtco-paymark-paypal" aria-hidden="true">
        <span className="vtco-paymark-p">P</span>
        <span className="vtco-paymark-label">PayPal</span>
      </span>
    )
  }

  if (normalized === "cod" || normalized === "cash" || normalized === "cash_on_delivery") {
    return (
      <span className="vtco-paymark vtco-paymark-cash" aria-hidden="true">
        <svg viewBox="0 0 24 24" role="img" focusable="false">
          <path d="M4 8.5h16v9H4z" />
          <circle cx="12" cy="13" r="2.2" />
          <path d="M7 13h1.2M15.8 13H17" />
          <path d="M6.5 6.5h15v8" />
        </svg>
      </span>
    )
  }

  return (
    <span className="vtco-paymark vtco-paymark-text" aria-hidden="true">
      <span className="vtco-paymark-label">{safeLabel}</span>
    </span>
  )
}


function PaymentMethods({ loadingPayments, visiblePaymentMethods, selectedPaymentMethod, onPaymentMethodSelect, canShowPaymentMethods = true, onBackToReview }: any) {
  const methods = Array.isArray(visiblePaymentMethods) ? visiblePaymentMethods : []

  return (
    <section className="vtco-section vtco-payment-methods">
      <h3 className="vtco-section-title">Payment Methods</h3>
      {loadingPayments ? (
        <p className="vtco-muted">Loading payment methods...</p>
      ) : methods.length === 0 ? (
        <p className="vtco-muted">No payment methods available</p>
      ) : (
        <>
        {!canShowPaymentMethods && (
          <div className="vtco-payment-blocked-clean">
            <strong>Send to kitchen first</strong>
            <p>Your selected items are still only in the table draft. Please confirm and send the table order to the kitchen first. Payment starts after the backend creates a real order ID.</p>
            <button type="button" data-vtco-button="secondary" className="vtco-btn vtco-btn-action vtco-btn-secondary" onClick={() => onBackToReview?.()}>
              Back to table order
            </button>
          </div>
        )}

        <div className="vtco-method-grid">
          {methods.map((method: any) => {
            const code = String(method.code || "")
            const active = selectedPaymentMethod === method.code

            return (
              <button
                key={code}
                type="button"
                aria-label={method.name || code}
                aria-pressed={active}
                data-vtco-active={active ? "1" : "0"}
                className="vtco-btn vtco-btn-tile vtco-btn-secondary vtco-method-tile"
                onClick={() => onPaymentMethodSelect?.(code)}
              >
                <VelvetPaymentMethodMark code={code} label={method.name || code} />
              </button>
            )
          })}
        </div>
        </>
      )}
    </section>
  )
}


// PMD_VELVET_V53B_FIX_NUMBER_INPUT_LEADING_ZERO_20260618
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

function formatVelvetTipPresetAmount(baseAmount: number, percentage: number) {
  const base = Math.max(0, Number(baseAmount || 0))
  const percent = Math.max(0, Number(percentage || 0))
  return ((base * percent) / 100).toFixed(2)
}

function normalizeVelvetCustomTipValue(value: string) {
  const cleaned = String(value || "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "")
  const firstDot = cleaned.indexOf(".")
  if (firstDot === -1) return cleaned
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "")
}

function getItemAssignmentKey(item: DisplayItem, index: number) {
  return String(item?.key ?? item?.id ?? `${getItemName(item)}-${index}`)
}

export function VelvetTerracottaCheckoutShell(props: VelvetTerracottaCheckoutShellProps) {
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
    // PMD_VELVET_V42_DECLARE_PAYMENT_TOTAL_PROPS_20260618
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
    setCouponError,
    setCouponLoading,
    validateCoupon,
    onApplyCoupon,
    onRemoveCoupon,
    removeCoupon,
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
    reviewRating = 0,
    setReviewRating,
    reviewComment = "",
    setReviewComment,
    reviewSubmitStatus = "idle",
    setReviewSubmitStatus,
    reviewSubmitMessage,
    canSubmitReview = false,
    handleSubmitReview,
    merchantSettings,
    activeReviewSharePlatforms = [],
    handleDownloadBusinessInvoice,
    invoiceDownloadStatus,
    invoiceDownloadMessage,
    isDarkTheme,
  } = props

  const resolvedVelvetCheckoutMode = useVelvetCheckoutMode(Boolean(isDarkTheme))
  const isDark = resolvedVelvetCheckoutMode === "dark"

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

  // PMD_VELVET_V45_ROBUST_PAYMENT_TOTALS_20260618
  const pmdVelvetFirstPositive = (...values: any[]) => {
    for (const value of values) {
      const numberValue = Number(value)
      if (Number.isFinite(numberValue) && numberValue > 0) return numberValue
    }
    return 0
  }

  const pmdVelvetPaymentGross = pmdVelvetFirstPositive(
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

  const pmdVelvetPayableTotal = pmdVelvetFirstPositive(
    paymentPayableTotal,
    Math.max(0, pmdVelvetPaymentGross + Number(paymentTipAmount || 0) - Number(paymentCouponDiscount || 0)),
    pmdVelvetPaymentGross,
  )

  // Backend currently logs percentage 19 but may pass enabled:false to the Velvet shell.
  // For display, show included VAT whenever we have a real payable/order amount.
  const pmdVelvetVatPercent = pmdVelvetPaymentGross > 0 ? Math.max(0, Number(paymentVatPercentage || 19)) : 0

  const pmdVelvetVatAmount =
    Number(paymentVatAmount || 0) > 0
      ? Number(paymentVatAmount || 0)
      : pmdVelvetVatPercent > 0 && pmdVelvetPaymentGross > 0
        ? (pmdVelvetPaymentGross * pmdVelvetVatPercent) / (100 + pmdVelvetVatPercent)
        : 0

  const pmdVelvetNetItemsAmount =
    Number(paymentSubtotalAmount || 0) > 0
      ? Number(paymentSubtotalAmount || 0)
      : pmdVelvetVatAmount > 0
        ? Math.max(0, pmdVelvetPaymentGross - pmdVelvetVatAmount)
        : pmdVelvetPaymentGross

  // PMD_VELVET_V46C_PAYMENT_GUARD_CSS_SAFE_20260618
  const pmdVelvetRealOrderId =
    (submittedSnapshot as any)?.order_id ||
    (submittedSnapshot as any)?.orderId ||
    (submittedSnapshot as any)?.id ||
    null

  const pmdVelvetCanShowPaymentMethods = Boolean(pmdVelvetRealOrderId)

  // PMD_VELVET_V62_SUBMITTED_PREP_TIMER_REVEAL_20260620
  // Keep the submitted-state header calm: show a quick confirmation check,
  // then reveal the prep time as real text instead of relying on overlapping CSS animations.
  const [showSubmittedPrepTime, setShowSubmittedPrepTime] = React.useState(false)

  React.useEffect(() => {
    if (checkoutStep !== "submitted") {
      setShowSubmittedPrepTime(false)
      return
    }

    setShowSubmittedPrepTime(false)
    const revealTimer = window.setTimeout(() => {
      setShowSubmittedPrepTime(true)
    }, 650)

    return () => window.clearTimeout(revealTimer)
  }, [checkoutStep, estimatedMinutes, pmdVelvetRealOrderId])

  const handleVelvetRemoveCoupon = () => {
    console.info("PMD_VELVET_COUPON_REMOVE_CLICK", {
      hasRemoveCoupon: typeof removeCoupon === "function",
      hasOnRemoveCoupon: typeof onRemoveCoupon === "function",
      appliedCouponCode: appliedCoupon?.code || null,
    })

    try {
      if (typeof removeCoupon === "function") {
        removeCoupon()
      } else if (typeof onRemoveCoupon === "function") {
        onRemoveCoupon()
      }
    } finally {
      setCouponCode?.("")
      setCouponError?.(null)
      setCouponLoading?.(false)
    }
  }

  const handleVelvetApplyCoupon = async () => {
    const code = String(couponCode || "").trim().toUpperCase()

    console.info("PMD_VELVET_COUPON_APPLY_CLICK", {
      code,
      paymentBaseAmount,
      pmdVelvetPaymentGross,
      pmdVelvetPayableTotal,
      hasValidateCoupon: typeof validateCoupon === "function",
      hasOnApplyCoupon: typeof onApplyCoupon === "function",
      selectedSplitPersonId: selectedSplitPersonId || null,
    })

    if (!code) return

    if (selectedSplitPerson) {
      setCouponError?.("Coupon validation for split payments is coming soon.")
      return
    }

    if (typeof validateCoupon === "function") {
      setCouponLoading?.(true)
      setCouponError?.(null)

      try {
        const baseAmount = Number(paymentBaseAmount || pmdVelvetPaymentGross || pmdVelvetPayableTotal || orderTotal || finalTotal || 0)
        const result = await validateCoupon(code, baseAmount)

        console.info("PMD_VELVET_COUPON_RESULT", result)

        if (!result?.success) {
          setCouponError?.(result?.message || "Invalid coupon code.")
          return
        }

        setCouponCode?.("")
      } catch (error) {
        console.error("PMD_VELVET_COUPON_ERROR", error)
        setCouponError?.("Coupon validation failed.")
      } finally {
        setCouponLoading?.(false)
      }

      return
    }

    if (typeof onApplyCoupon === "function") {
      await onApplyCoupon()
      return
    }

    setCouponError?.("Coupon validation is unavailable.")
  }

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
        <div className="vtco-total-box">
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
        <div className="vtco-total-box">
          <Line label="Order total" value={tableDraftTotal} strong />
        </div>
        <ButtonRow columns={2}>
          <CheckoutButton variant="secondary" onClick={onClose}>Continue ordering</CheckoutButton>
          <CheckoutButton variant="primary" onClick={handleSubmitTableDraft}>Send to kitchen</CheckoutButton>
        </ButtonRow>
      </>
    )
  } else if (checkoutStep === "submitted") {
    title = "We received your order."
    eyebrow = undefined
    content = (
      <>
        <div className="vtco-status-copy vtco-status-copy-hero" aria-live="polite">
          <span
            className="vtco-status-pulse"
            data-vtco-show-time={showSubmittedPrepTime ? "1" : "0"}
            aria-label={showSubmittedPrepTime ? `Estimated preparation time ${estimatedMinutes} minutes` : "Order confirmed"}
          >
            {showSubmittedPrepTime ? (
              <em className="vtco-status-time" key="prep-time">
                <Clock3 className="vtco-status-clock h-4 w-4" aria-hidden="true" />
                <strong>{estimatedMinutes}</strong>
                <span>min</span>
              </em>
            ) : (
              <Check className="vtco-status-check h-5 w-5" key="check" aria-hidden="true" />
            )}
          </span>
        </div>
        <div className="vtco-total-box">
          <Line label="Order total" value={orderTotal} strong />
        </div>
        <section className="vtco-summary">
          <h3 className="vtco-section-title">Order Summary</h3>
          <ItemRows items={submittedDisplayItems} />
        </section>
        <ButtonRow>
          <CheckoutButton variant="primary" onClick={() => setCheckoutStep?.("payment")}>Pay in full</CheckoutButton>
          <CheckoutButton variant="secondary" onClick={() => startSplitFlow?.("equal")}><Users className="h-4 w-4" /> Split bill</CheckoutButton>
          <CheckoutButton variant="secondary" onClick={onClose}>Continue ordering</CheckoutButton>
        </ButtonRow>
      </>
    )
  } else if (checkoutStep === "paid") {
    title = "Payment confirmed."
    eyebrow = undefined

    const paidOrderId = Number(submittedSnapshot?.orderId ?? submittedSnapshot?.order_id ?? submittedSnapshot?.id ?? 0)
    const paidAmount = Number(submittedSnapshot?.paidTotal ?? submittedSnapshot?.paid_total ?? paymentPayableTotal ?? orderTotal ?? finalTotal ?? 0)
    const showPaidEta = Number(estimatedMinutes || 0) > 0 && (submittedSnapshot?.showCustomerEta ?? true) !== false

    content = (
      <>
        <div className="vtco-paid-time-wrap" aria-label={showPaidEta ? `Estimated preparation time ${estimatedMinutes} minutes` : "Paid"}>
          {showPaidEta ? (
            <em className="vtco-status-time vtco-paid-time">
              <Clock3 className="vtco-status-clock h-4 w-4" aria-hidden="true" />
              <strong>{estimatedMinutes}</strong>
              <span>min</span>
            </em>
          ) : (
            <em className="vtco-status-time vtco-paid-time">
              <Check className="vtco-status-clock h-4 w-4" aria-hidden="true" />
              <strong>Paid</strong>
            </em>
          )}
        </div>
        <div className="vtco-total-box vtco-paid-total-box">
          {paidOrderId > 0 ? (
            <div className="vtco-line">
              <span>Order number</span>
              <strong>#{paidOrderId}</strong>
            </div>
          ) : null}
          <Line label="Amount paid" value={paidAmount} strong />
        </div>
        <section className="vtco-summary">
          <h3 className="vtco-section-title">Order Summary</h3>
          <ItemRows items={submittedDisplayItems} />
        </section>
        <section className="vtco-card vtco-review-card" aria-label="Visit feedback">
          <div className="vtco-review-head">
            <span><MessageSquare className="h-4 w-4" /></span>
            <div>
              <h3>How was your visit?</h3>
              <p>A quick note helps the restaurant improve.</p>
            </div>
          </div>
          <div className="vtco-stars" aria-label="Restaurant rating">
            {[1, 2, 3, 4, 5].map((star) => {
              const active = Number(reviewRating || 0) >= star
              return (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} star${star > 1 ? "s" : ""}`}
                  data-vtco-active={active ? "1" : "0"}
                  onClick={() => {
                    setReviewRating?.(star)
                    if (reviewSubmitStatus !== "loading") setReviewSubmitStatus?.("idle")
                  }}
                >
                  <Star className="h-5 w-5" />
                </button>
              )
            })}
          </div>
          <textarea
            value={String(reviewComment || "")}
            onChange={(event) => {
              setReviewComment?.(event.target.value)
              if (reviewSubmitStatus !== "loading") setReviewSubmitStatus?.("idle")
            }}
            placeholder="Optional comment for the restaurant"
            className="vtco-field vtco-review-textarea"
          />
          <CheckoutButton
            variant="primary"
            disabled={!canSubmitReview || reviewSubmitStatus === "loading" || reviewSubmitStatus === "success"}
            onClick={handleSubmitReview}
            className="vtco-review-submit"
          >
            {reviewSubmitStatus === "loading" ? "Submitting" : reviewSubmitStatus === "success" ? "Review submitted" : "Submit feedback"}
          </CheckoutButton>
          {reviewSubmitMessage ? <p className={reviewSubmitStatus === "error" ? "vtco-review-message vtco-review-error" : "vtco-review-message"}>{reviewSubmitMessage}</p> : null}
          {reviewSubmitStatus === "success" && merchantSettings?.reviewSocial?.sharePromptEnabled && Array.isArray(activeReviewSharePlatforms) && activeReviewSharePlatforms.length > 0 ? (
            <div className="vtco-review-share">
              <p>Share publicly?</p>
              <div>
                {activeReviewSharePlatforms.map(({ id, label, icon: Icon }: any) => {
                  const shareId = String(id || "").toLowerCase()
                  const ShareIcon = shareId === "instagram"
                    ? Instagram
                    : shareId === "website"
                      ? Globe2
                      : shareId === "reviews"
                        ? MessageSquare
                        : shareId === "trustpilot" || shareId === "google"
                          ? Star
                          : Icon || Link2

                  return (
                    <a
                      key={id}
                      href={merchantSettings.reviewSocial.platforms[id].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      title={label}
                    >
                      <ShareIcon className="h-4 w-4" />
                      <span>{label}</span>
                    </a>
                  )
                })}
              </div>
            </div>
          ) : null}
        </section>
        <div className="vtco-powered-by" aria-label="Powered by PayMyDine">
          <span>Powered by</span>
          <img src="/assets/media/uploads/Paymydinelogo.png" alt="PayMyDine" loading="lazy" />
        </div>
        <ButtonRow>
          <CheckoutButton variant="secondary" onClick={onClose}>Back to menu</CheckoutButton>
        </ButtonRow>
      </>
    )
  } else if (checkoutStep === "payment") {
    title = "Payment"
    eyebrow = "Ready to pay"
    content = (
      <>
        <Card className="vtco-payment-hero">
          <div className="vtco-payment-intro">
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
            value={pmdVelvetNetItemsAmount}
          />
          {pmdVelvetVatAmount > 0 && (
            <Line
              label={pmdVelvetVatPercent > 0 ? `VAT included (${pmdVelvetVatPercent.toFixed(0)}%)` : "VAT included"}
              value={pmdVelvetVatAmount}
            />
          )}
          {paymentTipAmount > 0 && <Line label="Tip" value={paymentTipAmount} />}
          {paymentCouponDiscount > 0 && <div className="vtco-line vtco-discount"><span>Coupon</span><strong>-{money(paymentCouponDiscount)}</strong></div>}
          <Line label="Payable total" value={pmdVelvetPayableTotal} strong />
        </Card>
        {tipEnabled && (
          <section className="vtco-section">
            <h3 className="vtco-section-title">Add tip</h3>
            <div className="vtco-tip-grid">
              {Array.from(
                new Set([0, 5, 10, ...(Array.isArray(tipPercentages) ? tipPercentages : [])].map((value) => Number(value || 0)))
              )
                .filter((value) => Number.isFinite(value) && value >= 0)
                .sort((a, b) => a - b)
                .map((percentage: number) => {
                  // PMD_VELVET_TIP_ACTIVE_LOGIC_V32
                  const expectedAmount = Number(formatVelvetTipPresetAmount(pmdVelvetPaymentGross, percentage))
                  const currentCustomTip = Number(paymentCustomTip || 0)
                  const hasCustomTipAmount = Number.isFinite(currentCustomTip) && Math.abs(currentCustomTip) > 0.005
                  const active = hasCustomTipAmount
                    ? Math.abs(currentCustomTip - expectedAmount) < 0.005
                    : Number(paymentTipPercentage || 0) === percentage

                  return (
                    <CheckoutButton
                      key={percentage}
                      variant="secondary"
                      data-vtco-active={active ? "1" : "0"}
                      onClick={() => {
                        const nextTipAmount = formatVelvetTipPresetAmount(pmdVelvetPaymentGross, percentage)
                        console.info("PMD_VELVET_TIP_PRESET_CLICK", {
                          percentage,
                          baseAmount: pmdVelvetPaymentGross,
                          tipAmount: nextTipAmount,
                        })
                        updatePaymentTipPercentage?.(percentage)
                        updatePaymentCustomTip?.(nextTipAmount)
                      }}
                      className="vtco-tip-preset"
                    >
                      {percentage}%
                    </CheckoutButton>
                  )
                })}
              <div className="vtco-tip-custom-wrap">
                <span aria-hidden="true">€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentCustomTip ?? ""}
                  data-pmd-velvet-tip-custom-input-v36="1"
                  onChange={(event) => {
                    updatePaymentTipPercentage?.(undefined)
                    updatePaymentCustomTip?.(normalizeVelvetCustomTipValue(event.target.value))
                  }}
                  placeholder="Custom"
                  className="vtco-field"
                  aria-label="Custom tip amount in euro"
                />
              </div>
            </div>
          </section>
        )}
        <section className="vtco-section">
          {!appliedCoupon || selectedSplitPerson ? (
            <div className="vtco-coupon-row">
              <input
                type="text"
                value={couponCode || ""}
                onChange={(event) => setCouponCode?.(event.target.value.toUpperCase())}
                placeholder="Coupon code"
                disabled={couponLoading}
                className="vtco-field"
              />
              <CheckoutButton
                variant="secondary"
                disabled={couponLoading || !String(couponCode || "").trim()}
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  void handleVelvetApplyCoupon()
                }}
                className="vtco-apply"
              >
                {couponLoading ? "Checking" : "Apply"}
              </CheckoutButton>
            </div>
          ) : (
            <div className="vtco-applied-coupon">
              <span>{appliedCoupon.name || "Coupon"} {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
              <CheckoutButton
                variant="secondary"
                onClick={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  handleVelvetRemoveCoupon()
                }}
              >
                Remove
              </CheckoutButton>
            </div>
          )}
          {couponError && <p className="vtco-error">{couponError}</p>}
        </section>
        <PaymentMethods
          loadingPayments={loadingPayments}
          visiblePaymentMethods={visiblePaymentMethods}
          selectedPaymentMethod={selectedPaymentMethod}
          onPaymentMethodSelect={onPaymentMethodSelect}
          canShowPaymentMethods={pmdVelvetCanShowPaymentMethods}
          onBackToReview={() => setCheckoutStep?.("review")}
        />
        {canRenderPaymentMethodDetail(selectedPaymentMethod) && (
          <section className="vtco-section vtco-payment-detail">
            {renderPaymentForm?.()}
          </section>
        )}
        <div className="vtco-payment-action">
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
        <div className="vtco-people-inline" data-vtco-people-inline="1">
          <PeopleControls splitGuestCount={splitGuestCount} addSplitGuest={addSplitGuest} removeSplitGuest={removeSplitGuest} />
          <GuestChips guests={people} />
        </div>
        {splitMethod === "equal" && (
          <div className="vtco-list">
            {equalPeople.map((person: SplitPerson, index: number) => (
              <div className="vtco-cart-line" key={person.id || index}>
                <span>{person.name}</span>
                <strong>{money(person.total)}</strong>
              </div>
            ))}
          </div>
        )}
        {splitMethod === "items" && (
          <Card>
            <p className="vtco-muted">Tap an item to assign it to guests.</p>
            <div className="vtco-list">
              {(splitDisplayItems || []).map((item: DisplayItem, index: number) => {
                const itemKey = getItemAssignmentKey(item, index)
                const assignedIndex = itemAssignments?.[itemKey]
                const guestName = assignedIndex === undefined || assignedIndex === null ? "Unassigned" : (people[assignedIndex]?.name || `Guest ${Number(assignedIndex) + 1}`)
                return (
                  <button
                    key={itemKey}
                    type="button"
                    className="vtco-btn vtco-btn-list vtco-btn-secondary vtco-assign-row"
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
            <div className={sharePercentTotal === 100 ? "vtco-share-total" : "vtco-share-total vtco-share-total-bad"}>
              {sharePercentTotal === 100 ? "100% ready" : sharePercentTotal < 100 ? `${100 - sharePercentTotal}% remaining` : `Over by ${sharePercentTotal - 100}%`}
            </div>
            <div className="vtco-list">
              {(sharePercents || []).slice(0, splitGuestCount).map((percent: number, index: number) => (
                <div className="vtco-share-row" key={index}>
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
                    className="vtco-field vtco-share-input"
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
        <div className="vtco-list">
          {reviewPeople.map((person: SplitPerson) => {
            const selected = selectedSplitPersonId === person.id
            return (
              <Card key={person.id} className={selected ? "vtco-person-selected" : ""}>
                <div className="vtco-person-head">
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
      data-vtco-root="1"
      onFocusCapture={handleKzcoNumberInputFocusCapture}
      onInputCapture={handleKzcoNumberInputCapture}
      data-vtco-step={checkoutStep}
      data-vtco-can-pay={pmdVelvetCanShowPaymentMethods ? "1" : "0"}
      data-vtco-mode={resolvedVelvetCheckoutMode}
      data-pmd-checkout-theme="velvet_japanese"
      className="vtco-overlay"
      role="dialog"
      aria-modal="true"
    >
      <div className="vtco-panel" data-vtco-panel="1">
        <div className="vtco-content">
          <ModalHead title={title} eyebrow={eyebrow} onBack={goBack} />
          <main key={checkoutStep} className="vtco-body" data-vtco-step={checkoutStep}>
            {content}
          </main>
        </div>
      </div>
      <style>{`
        /* PMD_VELVET_V30_CLEAN_CHECKOUT_REWRITE_20260618
           Isolated checkout UI. No old pmd-velvet checkout classes are used here.
           Button contract:
           - primary = red action buttons
           - secondary = cancel/continue/split/link/QR/tabs/tile/list buttons
           - square = close/stepper buttons
        */

        html body .vtco-overlay {
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

        html body .vtco-overlay,
        html body .vtco-overlay * {
          box-sizing: border-box !important;
          text-shadow: none !important;
        }

        html body .vtco-overlay {
          --vtco-panel-bg: #fbf8f2;
          --vtco-panel-text: #242320;
          --vtco-panel-muted: #77716a;
          --vtco-panel-border: rgba(35, 34, 31, .24);
          --vtco-panel-line: rgba(35, 34, 31, .12);
          --vtco-card-bg: rgba(255, 255, 255, .38);
          --vtco-card-border: rgba(36, 35, 32, .14);
          --vtco-accent: #b85d59;
          --vtco-accent-hover: #c86460;
          --vtco-accent-text: #fffaf3;
          --vtco-accent-border: rgba(143, 55, 51, .56);
          --vtco-accent-border-hover: rgba(143, 55, 51, .72);
          --vtco-secondary-bg: rgba(255, 255, 255, .44);
          --vtco-secondary-bg-hover: rgba(255, 255, 255, .64);
          --vtco-secondary-text: #242320;
          --vtco-secondary-border: rgba(36, 35, 32, .22);
          --vtco-secondary-border-hover: rgba(36, 35, 32, .36);
          --vtco-price: #b85d59;
          --vtco-action-height: 48px;
          --vtco-square: 48px;
        }

        html body .vtco-overlay[data-vtco-mode="dark"] {
          background: rgba(0, 0, 0, .72) !important;
          --vtco-panel-bg: linear-gradient(144deg, rgba(18, 12, 8, .96), rgba(5, 3, 2, .985) 58%, rgba(55, 19, 14, .86));
          --vtco-panel-text: #f6e8c8;
          --vtco-panel-muted: rgba(246, 232, 200, .70);
          --vtco-panel-border: rgba(198, 164, 93, .42);
          --vtco-panel-line: rgba(198, 164, 93, .22);
          --vtco-card-bg: rgba(8, 6, 4, .62);
          --vtco-card-border: rgba(198, 164, 93, .28);
          --vtco-secondary-bg: rgba(8, 6, 4, .88);
          --vtco-secondary-bg-hover: rgba(246, 232, 200, .08);
          --vtco-secondary-text: #f6e8c8;
          --vtco-secondary-border: rgba(198, 164, 93, .36);
          --vtco-secondary-border-hover: rgba(198, 164, 93, .54);
          --vtco-price: #ec8a82;
          --vtco-accent-border: rgba(223, 104, 93, .72);
          --vtco-accent-border-hover: rgba(223, 104, 93, .88);
        }

        html body .vtco-panel {
          width: min(100%, 430px) !important;
          max-height: min(88dvh, 740px) !important;
          overflow: auto !important;
          border-radius: 0 !important;
          border: 1px solid var(--vtco-panel-border) !important;
          background: var(--vtco-panel-bg) !important;
          color: var(--vtco-panel-text) !important;
          box-shadow: 0 28px 78px rgba(36, 30, 24, .34) !important;
        }

        html body .vtco-content {
          position: relative !important;
          display: flex !important;
          min-height: 100% !important;
          flex-direction: column !important;
          background: transparent !important;
        }

        html body .vtco-head {
          display: flex !important;
          align-items: flex-start !important;
          justify-content: space-between !important;
          gap: 1rem !important;
          padding: 1.35rem 1.45rem 1.05rem !important;
          border-bottom: 1px solid var(--vtco-panel-line) !important;
        }

        html body .vtco-title-wrap {
          min-width: 0 !important;
        }

        html body .vtco-eyebrow {
          display: block !important;
          margin-bottom: .12rem !important;
          color: var(--vtco-panel-text) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .86rem !important;
          font-weight: 520 !important;
          letter-spacing: .01em !important;
          text-transform: none !important;
        }

        html body .vtco-head h2 {
          margin: 0 !important;
          color: var(--vtco-panel-text) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: clamp(2.6rem, 9vw, 4.2rem) !important;
          font-weight: 900 !important;
          line-height: .88 !important;
          letter-spacing: .075em !important;
          text-transform: uppercase !important;
        }

        html body .vtco-body {
          display: grid !important;
          gap: 1rem !important;
          padding: 1.25rem 1.45rem 1.45rem !important;
        }

        html body .vtco-btn {
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

        html body .vtco-btn-action {
          width: 100% !important;
          min-height: var(--vtco-action-height) !important;
          height: var(--vtco-action-height) !important;
          padding: .82rem 1rem !important;
        }

        html body .vtco-btn-square {
          width: var(--vtco-square) !important;
          height: var(--vtco-square) !important;
          min-width: var(--vtco-square) !important;
          min-height: var(--vtco-square) !important;
          max-width: var(--vtco-square) !important;
          max-height: var(--vtco-square) !important;
          padding: 0 !important;
        }

        html body .vtco-btn-primary {
          background: var(--vtco-accent) !important;
          background-color: var(--vtco-accent) !important;
          color: var(--vtco-accent-text) !important;
          -webkit-text-fill-color: var(--vtco-accent-text) !important;
          border: 1px solid var(--vtco-accent-border) !important;
        }

        html body .vtco-btn-primary:not(:disabled):not([aria-disabled="true"]):hover {
          background: var(--vtco-accent-hover) !important;
          background-color: var(--vtco-accent-hover) !important;
          border-color: var(--vtco-accent-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        html body .vtco-btn-secondary {
          background: var(--vtco-secondary-bg) !important;
          background-color: var(--vtco-secondary-bg) !important;
          color: var(--vtco-secondary-text) !important;
          -webkit-text-fill-color: var(--vtco-secondary-text) !important;
          border: 1px solid var(--vtco-secondary-border) !important;
        }

        html body .vtco-btn-secondary:not(:disabled):not([aria-disabled="true"]):hover,
        html body .vtco-btn-secondary[data-vtco-active="1"] {
          background: var(--vtco-secondary-bg-hover) !important;
          background-color: var(--vtco-secondary-bg-hover) !important;
          color: var(--vtco-secondary-text) !important;
          -webkit-text-fill-color: var(--vtco-secondary-text) !important;
          border-color: var(--vtco-secondary-border-hover) !important;
        }

        html body .vtco-btn-secondary:not(:disabled):not([aria-disabled="true"]):hover {
          transform: translateY(-1px) !important;
        }

        html body .vtco-btn:disabled,
        html body .vtco-btn[aria-disabled="true"] {
          cursor: not-allowed !important;
          opacity: .56 !important;
          transform: none !important;
        }

        html body .vtco-btn :is(svg, svg *, span) {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
        }

        html body .vtco-actions {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: .72rem !important;
          width: 100% !important;
        }

        html body .vtco-actions-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }

        html body .vtco-actions-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        html body .vtco-line,
        html body .vtco-cart-line {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 1rem !important;
          color: var(--vtco-panel-text) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: 1rem !important;
          font-weight: 800 !important;
        }

        html body .vtco-line strong,
        html body .vtco-cart-line strong {
          color: var(--vtco-price) !important;
          -webkit-text-fill-color: var(--vtco-price) !important;
          font-weight: 900 !important;
        }

        html body .vtco-line-strong {
          padding-top: .8rem !important;
          border-top: 1px solid var(--vtco-panel-line) !important;
          font-size: 1.08rem !important;
        }

        html body .vtco-list,
        html body .vtco-items-list,
        html body .vtco-summary {
          display: grid !important;
          gap: .78rem !important;
        }

        html body .vtco-total-box,
        html body .vtco-card,
        html body .vtco-section {
          display: grid !important;
          gap: .78rem !important;
        }

        html body .vtco-card,
        html body .vtco-total-box {
          padding: 1rem !important;
          border: 1px solid var(--vtco-card-border) !important;
          background: var(--vtco-card-bg) !important;
        }

        html body .vtco-section-title {
          margin: 0 !important;
          color: var(--vtco-panel-text) !important;
          font-family: Georgia, "Times New Roman", serif !important;
          font-size: 1.28rem !important;
          font-weight: 900 !important;
          letter-spacing: .02em !important;
          text-transform: uppercase !important;
        }

        html body .vtco-muted,
        html body .vtco-error {
          margin: 0 !important;
          color: var(--vtco-panel-muted) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .95rem !important;
          font-weight: 620 !important;
        }

        html body .vtco-error {
          color: var(--vtco-accent) !important;
        }

        html body .vtco-status-copy,
        html body .vtco-payment-intro,
        html body .vtco-person-head {
          display: flex !important;
          align-items: center !important;
          justify-content: space-between !important;
          gap: 1rem !important;
        }

        html body .vtco-status-copy {
          justify-content: flex-start !important;
        }

        html body .vtco-status-copy > span,
        html body .vtco-payment-intro > span {
          display: inline-flex !important;
          width: 48px !important;
          height: 48px !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid var(--vtco-accent-border) !important;
          color: var(--vtco-accent) !important;
        }

        html body .vtco-status-copy p,
        html body .vtco-payment-intro p {
          margin: 0 !important;
          color: var(--vtco-price) !important;
          font-weight: 900 !important;
        }

        html body .vtco-payment-intro strong {
          color: var(--vtco-panel-text) !important;
          font-weight: 900 !important;
        }

        html body .vtco-tabs,
        html body .vtco-tip-grid,
        html body .vtco-method-grid {
          display: grid !important;
          gap: .65rem !important;
        }

        html body .vtco-tabs {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        html body .vtco-btn-segment {
          min-height: 58px !important;
          height: 58px !important;
          white-space: normal !important;
        }

        html body .vtco-stepper {
          display: grid !important;
          grid-template-columns: 48px 1fr 48px !important;
          align-items: stretch !important;
          min-height: 48px !important;
          border: 1px solid var(--vtco-secondary-border) !important;
          background: var(--vtco-card-bg) !important;
        }

        html body .vtco-stepper > strong {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          color: var(--vtco-panel-text) !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .96rem !important;
          font-weight: 850 !important;
        }

        html body .vtco-chip-row {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: .55rem !important;
        }

        html body .vtco-chip {
          display: inline-flex !important;
          align-items: center !important;
          gap: .45rem !important;
          min-height: 40px !important;
          padding: .55rem .7rem !important;
          border: 1px solid var(--vtco-secondary-border) !important;
          background: var(--vtco-secondary-bg) !important;
          color: var(--vtco-secondary-text) !important;
          font-weight: 760 !important;
        }

        html body .vtco-chip b,
        html body .vtco-person-head b {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 24px !important;
          height: 24px !important;
          margin-right: .45rem !important;
          background: var(--vtco-secondary-bg-hover) !important;
          color: var(--vtco-secondary-text) !important;
        }

        html body .vtco-assign-row {
          width: 100% !important;
          min-height: 48px !important;
          padding: .85rem 1rem !important;
          display: grid !important;
          grid-template-columns: 1fr auto auto !important;
          gap: .8rem !important;
          align-items: center !important;
          text-align: left !important;
        }

        html body .vtco-assign-row span,
        html body .vtco-assign-row strong,
        html body .vtco-assign-row em {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          font-style: normal !important;
          white-space: nowrap !important;
        }

        html body .vtco-share-total {
          color: var(--vtco-panel-text) !important;
          font-weight: 900 !important;
        }

        html body .vtco-share-total-bad {
          color: var(--vtco-accent) !important;
        }

        html body .vtco-share-row,
        html body .vtco-coupon-row,
        html body .vtco-applied-coupon {
          display: grid !important;
          grid-template-columns: 1fr auto auto !important;
          align-items: center !important;
          gap: .7rem !important;
        }

        html body .vtco-coupon-row {
          grid-template-columns: 1fr auto !important;
        }

        html body .vtco-field {
          min-height: 48px !important;
          width: 100% !important;
          border-radius: 0 !important;
          border: 1px solid var(--vtco-secondary-border) !important;
          background: var(--vtco-card-bg) !important;
          color: var(--vtco-panel-text) !important;
          -webkit-text-fill-color: var(--vtco-panel-text) !important;
          padding: .82rem .95rem !important;
          font-family: Inter, ui-sans-serif, system-ui, sans-serif !important;
          font-size: .92rem !important;
          font-weight: 750 !important;
          outline: none !important;
        }

        html body .vtco-method-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }

        html body .vtco-method-tile {
          width: 100% !important;
          min-height: 60px !important;
          height: 60px !important;
          padding: .6rem !important;
        }

        html body .vtco-method-tile[data-vtco-active="1"] {
          border-color: var(--vtco-accent-border) !important;
          outline: 1px solid var(--vtco-accent-border) !important;
          outline-offset: -2px !important;
        }

        html body .vtco-method-tile img {
          display: block !important;
          max-width: 100% !important;
          height: auto !important;
          object-fit: contain !important;
        }

        html body .vtco-person-selected {
          border-color: var(--vtco-accent-border) !important;
        }

        html body .vtco-person-head span,
        html body .vtco-person-head em {
          color: var(--vtco-panel-text) !important;
          font-style: normal !important;
          font-weight: 760 !important;
        }

        html body .vtco-person-head em {
          color: var(--vtco-price) !important;
        }

        /* External payment/cash/stripe buttons rendered by existing payment system become Type 1 red. */
        html body .vtco-payment-action :is(button, [role="button"], input[type="submit"]),
        html body .vtco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]) {
          width: 100% !important;
          min-height: var(--vtco-action-height) !important;
          height: var(--vtco-action-height) !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          background: var(--vtco-accent) !important;
          background-color: var(--vtco-accent) !important;
          color: var(--vtco-accent-text) !important;
          -webkit-text-fill-color: var(--vtco-accent-text) !important;
          border: 1px solid var(--vtco-accent-border) !important;
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

        html body .vtco-payment-action :is(button, [role="button"], input[type="submit"]):not(:disabled):hover,
        html body .vtco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]):not(:disabled):hover {
          background: var(--vtco-accent-hover) !important;
          background-color: var(--vtco-accent-hover) !important;
          border-color: var(--vtco-accent-border-hover) !important;
          transform: translateY(-1px) !important;
        }

        html body .vtco-payment-action :is(button, [role="button"], input[type="submit"]):disabled,
        html body .vtco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]):disabled {
          opacity: .56 !important;
          cursor: not-allowed !important;
        }

        html body .vtco-payment-action :is(button, [role="button"], input[type="submit"]) :is(svg, svg *, span),
        html body .vtco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"], button[style*="rgb(23, 18, 14)"]) :is(svg, svg *, span) {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
        }

        @media (max-width: 520px) {
          html body .vtco-overlay {
            padding: .75rem !important;
          }

          html body .vtco-panel {
            width: min(100%, 430px) !important;
            max-height: 90dvh !important;
          }

          html body .vtco-head {
            padding: 1.05rem 1rem .9rem !important;
          }

          html body .vtco-body {
            padding: 1rem !important;
          }

          html body .vtco-head h2 {
            font-size: clamp(2.35rem, 12vw, 3.6rem) !important;
          }

          html body .vtco-actions-2,
          html body .vtco-actions-3 {
            grid-template-columns: 1fr !important;
          }

          html body .vtco-tabs {
            grid-template-columns: 1fr !important;
          }

          html body .vtco-method-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }

          html body .vtco-assign-row {
            grid-template-columns: 1fr !important;
            text-align: center !important;
          }
        }


        /* PMD_VELVET_V33_ACTIVE_V30_BUTTON_CONTRACT_20260618
           FINAL ACTIVE FIX:
           This is inserted inside the real V30 style tag.
           V31/V32 were present in source but not rendered in browser.
           Do not rely on vtco-accent for primary background; force concrete values.
        */

        html body .vtco-overlay[data-vtco-root="1"] {
          --vtco-action-height: 48px !important;
          --vtco-square: 48px !important;

          --vtco-primary-real-bg: #b85d59 !important;
          --vtco-primary-real-bg-hover: #c86460 !important;
          --vtco-primary-real-text: #fffaf3 !important;
          --vtco-primary-real-border: rgba(143, 55, 51, .58) !important;

          --vtco-secondary-real-bg: rgba(255, 255, 255, .44) !important;
          --vtco-secondary-real-bg-hover: rgba(255, 255, 255, .64) !important;
          --vtco-secondary-real-text: #242320 !important;
          --vtco-secondary-real-border: rgba(36, 35, 32, .24) !important;

          --vtco-close-real-bg: rgba(255, 255, 255, .44) !important;
          --vtco-close-real-text: #242320 !important;
          --vtco-close-real-border: rgba(36, 35, 32, .24) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] {
          --vtco-secondary-real-bg: rgba(8, 6, 4, .88) !important;
          --vtco-secondary-real-bg-hover: rgba(246, 232, 200, .08) !important;
          --vtco-secondary-real-text: #f6e8c8 !important;
          --vtco-secondary-real-border: rgba(198, 164, 93, .38) !important;

          --vtco-close-real-bg: rgba(246, 232, 200, .055) !important;
          --vtco-close-real-text: #f6e8c8 !important;
          --vtco-close-real-border: rgba(198, 164, 93, .32) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-btn,
          button[data-vtco-button],
          .pmd-themed-button,
          [data-pmd-stripe-native-button="1"]
        ) {
          min-height: var(--vtco-action-height) !important;
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
        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-btn-primary,
          button[data-vtco-button="primary"],
          .pmd-themed-button[data-pmd-themed-button="primary"],
          [data-pmd-stripe-native-button="1"]
        ),
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action :is(button, [role="button"], input[type="submit"]),
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"]) {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .58) !important;
          opacity: 1 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-btn-primary,
          button[data-vtco-button="primary"],
          .pmd-themed-button[data-pmd-themed-button="primary"],
          [data-pmd-stripe-native-button="1"]
        ):not(:disabled):not([aria-disabled="true"]):hover,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action :is(button, [role="button"], input[type="submit"]):not(:disabled):hover,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail :is(button[type="submit"], button[data-pmd-themed-button="primary"], .pmd-themed-button, [data-pmd-stripe-native-button="1"]):not(:disabled):hover {
          background: #c86460 !important;
          background-color: #c86460 !important;
          background-image: linear-gradient(#c86460, #c86460) !important;
          border-color: rgba(143, 55, 51, .72) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          transform: translateY(-1px) !important;
        }

        /* TYPE 2: secondary actions + split tabs */
        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-btn-secondary,
          button[data-vtco-button="secondary"],
          .vtco-tab,
          .vtco-method-tile
        ) {
          background: var(--vtco-secondary-real-bg) !important;
          background-color: var(--vtco-secondary-real-bg) !important;
          background-image: linear-gradient(var(--vtco-secondary-real-bg), var(--vtco-secondary-real-bg)) !important;
          color: var(--vtco-secondary-real-text) !important;
          -webkit-text-fill-color: var(--vtco-secondary-real-text) !important;
          border: 1px solid var(--vtco-secondary-real-border) !important;
          opacity: 1 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-btn-secondary,
          button[data-vtco-button="secondary"],
          .vtco-tab,
          .vtco-method-tile
        ):not(:disabled):not([aria-disabled="true"]):hover,
        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-tab, .vtco-method-tile)[data-vtco-active="1"] {
          background: var(--vtco-secondary-real-bg-hover) !important;
          background-color: var(--vtco-secondary-real-bg-hover) !important;
          background-image: linear-gradient(var(--vtco-secondary-real-bg-hover), var(--vtco-secondary-real-bg-hover)) !important;
          border-color: var(--vtco-secondary-real-border) !important;
          color: var(--vtco-secondary-real-text) !important;
          -webkit-text-fill-color: var(--vtco-secondary-real-text) !important;
          transform: translateY(-1px) !important;
        }

        /* Square controls: close / plus / minus */
        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-btn-square, .vtco-close, .vtco-stepper-btn) {
          width: var(--vtco-square) !important;
          height: var(--vtco-square) !important;
          min-width: var(--vtco-square) !important;
          min-height: var(--vtco-square) !important;
          max-width: var(--vtco-square) !important;
          max-height: var(--vtco-square) !important;
          padding: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-close, .vtco-btn-square:not(.vtco-btn-primary)) {
          background: var(--vtco-close-real-bg) !important;
          background-color: var(--vtco-close-real-bg) !important;
          background-image: linear-gradient(var(--vtco-close-real-bg), var(--vtco-close-real-bg)) !important;
          color: var(--vtco-close-real-text) !important;
          -webkit-text-fill-color: var(--vtco-close-real-text) !important;
          border: 1px solid var(--vtco-close-real-border) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper-btn.vtco-btn-primary {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .58) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-btn, button[data-vtco-button], .vtco-close, .vtco-stepper-btn) :is(svg, svg *, span) {
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        /* Disabled stays readable, never invisible white */
        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-btn-primary, button[data-vtco-button="primary"], .pmd-themed-button[data-pmd-themed-button="primary"], [data-pmd-stripe-native-button="1"]):disabled,
        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-btn-primary, button[data-vtco-button="primary"], .pmd-themed-button[data-pmd-themed-button="primary"], [data-pmd-stripe-native-button="1"])[aria-disabled="true"] {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .58) !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-btn-secondary, button[data-vtco-button="secondary"], .vtco-tab, .vtco-method-tile):disabled,
        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-btn-secondary, button[data-vtco-button="secondary"], .vtco-tab, .vtco-method-tile)[aria-disabled="true"] {
          opacity: .58 !important;
          cursor: not-allowed !important;
        }



        /* PMD_VELVET_V35_TITLE_SIZE_POLISH_20260618
           Slightly reduce giant Velvet checkout titles so PAYMENT / ORDER STATUS
           no longer crowd the close button.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head {
          gap: 1.15rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap {
          min-width: 0 !important;
          max-width: calc(100% - 5.9rem) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2 {
          font-size: clamp(3.75rem, 11.8vw, 6.35rem) !important;
          line-height: .86 !important;
          letter-spacing: .115em !important;
          max-width: 100% !important;
          overflow-wrap: normal !important;
          word-break: normal !important;
        }

        @media (max-width: 520px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2 {
            font-size: clamp(3.05rem, 17vw, 4.9rem) !important;
            letter-spacing: .095em !important;
          }
        }



        /* PMD_VELVET_V36_MUCH_SMALLER_TITLES_20260618
           Strong override: previous title clamp was still too large.
           Keep the Velvet feeling, but stop the title from dominating the card.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          gap: 1rem !important;
          align-items: start !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap {
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          padding-right: .25rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2,
        html body .vtco-overlay[data-vtco-root="1"] h2.vtco-title,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-title {
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
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2,
          html body .vtco-overlay[data-vtco-root="1"] h2.vtco-title,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title {
            font-size: clamp(2.05rem, 10.5vw, 3.15rem) !important;
            line-height: .96 !important;
            letter-spacing: .055em !important;
          }
        }

        @media (max-width: 390px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2,
          html body .vtco-overlay[data-vtco-root="1"] h2.vtco-title,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title {
            font-size: clamp(1.85rem, 9.5vw, 2.75rem) !important;
            letter-spacing: .045em !important;
          }
        }



        /* PMD_VELVET_V37_STANDARD_SMALL_TITLES_20260618
           FINAL: normal readable app title size, not huge poster title.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          gap: .9rem !important;
          align-items: start !important;
          padding-top: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap {
          min-width: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          padding-right: .5rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2,
        html body .vtco-overlay[data-vtco-root="1"] h2.vtco-title,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-title {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-eyebrow {
          font-size: .92rem !important;
          line-height: 1.2 !important;
          margin-bottom: .35rem !important;
        }

        @media (max-width: 520px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2,
          html body .vtco-overlay[data-vtco-root="1"] h2.vtco-title,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title {
            font-size: 1.9rem !important;
            line-height: 1.08 !important;
            letter-spacing: .06em !important;
          }
        }

        @media (max-width: 390px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2,
          html body .vtco-overlay[data-vtco-root="1"] h2.vtco-title,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title {
            font-size: 1.7rem !important;
            letter-spacing: .045em !important;
          }
        }



        /* PMD_VELVET_V39_HEADER_DOWN_REMOVE_SUMMARY_FRAMES_20260618
           Move checkout title area a bit lower and remove unnecessary frames
           around display-only summary/total boxes. Keep frames on real inputs,
           buttons, coupon field, and payment method tiles.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head {
          padding-top: 2.05rem !important;
          padding-bottom: 1.2rem !important;
          padding-left: 1.45rem !important;
          padding-right: 1.45rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-eyebrow {
          margin-bottom: .42rem !important;
        }

        /* Remove decorative frames from display-only total/summary blocks */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-hero,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-card:not(.vtco-person-selected):not(:has(.vtco-field)):not(:has(.vtco-btn)):not(:has(.vtco-method-grid)):not(:has(.vtco-share-row)) {
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          padding: .15rem 0 !important;
        }

        /* Payment summary card has only lines, so keep it clean too */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-card:has(.vtco-line):not(:has(.vtco-field)):not(:has(.vtco-btn)):not(:has(.vtco-method-grid)) {
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          padding: .1rem 0 !important;
        }

        /* Remove random inner divider lines from totals */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box .vtco-line-strong,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-card:has(.vtco-line):not(:has(.vtco-field)):not(:has(.vtco-btn)) .vtco-line-strong {
          border-top: 0 !important;
          padding-top: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box .vtco-line,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-card:has(.vtco-line):not(:has(.vtco-field)):not(:has(.vtco-btn)) .vtco-line {
          padding-top: .35rem !important;
          padding-bottom: .35rem !important;
        }

        /* Keep these framed because they are real controls */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-field,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-share-input {
          box-shadow: none !important;
        }

        @media (max-width: 520px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-head {
            padding-top: 1.65rem !important;
            padding-bottom: 1.05rem !important;
            padding-left: 1rem !important;
            padding-right: 1rem !important;
          }
        }



        /* PMD_VELVET_V40_VISUAL_CLEANUP_COLORS_TITLES_PAYMENT_20260618
           Normalize Velvet checkout:
           - body text/title/items/prices are ink, not red
           - red is reserved for primary action buttons and small accent states
           - titles are standard modal size
           - payment duplicate hero frame is hidden
           - display-only total frames stay removed
        */

        html body .vtco-overlay[data-vtco-root="1"] {
          --vtco-ink-clean: #242320;
          --vtco-muted-clean: rgba(36, 35, 32, .66);
          --vtco-title-clean: #242320;
          --vtco-accent-clean: #b85d59;
          color: var(--vtco-ink-clean) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] {
          --vtco-ink-clean: #f6e8c8;
          --vtco-muted-clean: rgba(246, 232, 200, .68);
          --vtco-title-clean: #f6e8c8;
          --vtco-accent-clean: #c86460;
          color: var(--vtco-ink-clean) !important;
        }

        /* Titles: standard size, not poster-size */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          align-items: start !important;
          gap: .9rem !important;
          padding-top: 1.65rem !important;
          padding-bottom: 1rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap {
          max-width: 100% !important;
          min-width: 0 !important;
          padding-right: .5rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2,
        html body .vtco-overlay[data-vtco-root="1"] h2.vtco-title,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-title {
          color: var(--vtco-title-clean) !important;
          -webkit-text-fill-color: var(--vtco-title-clean) !important;
          font-size: 1.95rem !important;
          line-height: 1.08 !important;
          letter-spacing: .07em !important;
          margin: 0 !important;
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: normal !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-eyebrow {
          color: var(--vtco-ink-clean) !important;
          -webkit-text-fill-color: var(--vtco-ink-clean) !important;
          font-size: .88rem !important;
          line-height: 1.2 !important;
          margin-bottom: .28rem !important;
        }

        /* Main content text: ink, not red */
        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-body,
          .vtco-body *,
          .vtco-card,
          .vtco-card *,
          .vtco-total-box,
          .vtco-total-box *,
          .vtco-line,
          .vtco-line *,
          .vtco-section-title,
          .vtco-summary,
          .vtco-summary *,
          .vtco-item,
          .vtco-item *,
          .vtco-item-row,
          .vtco-item-row *,
          .vtco-list,
          .vtco-list *,
          .vtco-order-row,
          .vtco-order-row *
        ) {
          color: var(--vtco-ink-clean) !important;
          -webkit-text-fill-color: var(--vtco-ink-clean) !important;
        }

        /* Softer secondary/helper text */
        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-muted,
          .vtco-help,
          .vtco-context,
          .vtco-small,
          .vtco-caption
        ) {
          color: var(--vtco-muted-clean) !important;
          -webkit-text-fill-color: var(--vtco-muted-clean) !important;
        }

        /* Section headings can keep a subtle Velvet accent, but not every item/price */
        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-section-title, .vtco-heading) {
          color: var(--vtco-ink-clean) !important;
          -webkit-text-fill-color: var(--vtco-ink-clean) !important;
        }

        /* Keep status accent readable */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-message,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-success-message {
          color: var(--vtco-accent-clean) !important;
          -webkit-text-fill-color: var(--vtco-accent-clean) !important;
        }

        /* Hide duplicated payment hero: it repeats Order total at the top */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-hero {
          display: none !important;
        }

        /* Keep display-only summaries frameless */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-card:has(.vtco-line):not(:has(.vtco-field)):not(:has(.vtco-btn)):not(:has(.vtco-method-grid)) {
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          background-color: transparent !important;
          box-shadow: none !important;
          padding: .1rem 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-line-strong {
          border-top: 0 !important;
          padding-top: .2rem !important;
        }

        /* Buttons must keep their own colors */
        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-btn-primary, button[data-vtco-button="primary"]) {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border-color: rgba(143, 55, 51, .58) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-btn-secondary, button[data-vtco-button="secondary"]) {
          color: var(--vtco-ink-clean) !important;
          -webkit-text-fill-color: var(--vtco-ink-clean) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-btn-primary, .vtco-btn-primary *, button[data-vtco-button="primary"], button[data-vtco-button="primary"] *) {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
        }

        /* Inputs and method tiles keep frames */
        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-field, .vtco-method-tile, .vtco-share-input) {
          border-width: 1px !important;
        }

        @media (max-width: 520px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2,
          html body .vtco-overlay[data-vtco-root="1"] h2.vtco-title,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title {
            font-size: 1.72rem !important;
            letter-spacing: .055em !important;
          }

          html body .vtco-overlay[data-vtco-root="1"] .vtco-head {
            padding-top: 1.35rem !important;
          }
        }



        /* PMD_VELVET_V41_FLOW_UI_CLEANUP_20260618
           Flow UI polish:
           - no ORDER STATUS poster title
           - received/timer hero in body with one-time slow pulse
           - split uses Share amount as title
           - compact people stepper
           - sharp input corners
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2,
        html body .vtco-overlay[data-vtco-root="1"] h2.vtco-title,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-title {
          font-size: 1.58rem !important;
          line-height: 1.12 !important;
          letter-spacing: .055em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-title-wrap {
          display: block !important;
          max-width: calc(100% - 4.5rem) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-title-wrap h2 {
          display: block !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: clamp(1.35rem, 5.2vw, 1.95rem) !important;
          line-height: 1.08 !important;
          letter-spacing: -.025em !important;
          text-transform: none !important;
          overflow-wrap: normal !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-head {
          grid-template-columns: minmax(0, 1fr) 48px !important;
          min-height: 4.25rem !important;
          padding-top: 1.15rem !important;
          padding-bottom: 1rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-copy-hero {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin-top: .45rem !important;
          margin-bottom: 1.15rem !important;
          min-height: 2.95rem !important;
          text-align: center !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-pulse {
          position: relative !important;
          width: auto !important;
          min-width: 3.25rem !important;
          height: 2.6rem !important;
          min-height: 2.6rem !important;
          padding: 0 .35rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0 !important;
          background: transparent !important;
          color: #b85d59 !important;
          transform-origin: center !important;
          overflow: visible !important;
          transition: min-width .42s cubic-bezier(.2, .9, .2, 1), color .36s ease !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-pulse[data-vtco-show-time="1"] {
          min-width: 5.45rem !important;
          color: rgba(36, 35, 32, .9) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-check {
          width: 1.45rem !important;
          height: 1.45rem !important;
          stroke: currentColor !important;
          animation: vtco-status-check-in .46s cubic-bezier(.2, .9, .2, 1) 1 both !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time {
          display: inline-flex !important;
          align-items: baseline !important;
          justify-content: center !important;
          gap: .34rem !important;
          min-width: 0 !important;
          height: auto !important;
          margin: 0 !important;
          padding: .12rem .2rem .22rem !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          font-style: normal !important;
          line-height: 1 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          animation: vtco-status-time-reveal .5s cubic-bezier(.2, .9, .2, 1) 1 both !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-clock {
          width: .9rem !important;
          height: .9rem !important;
          flex: 0 0 auto !important;
          color: #b85d59 !important;
          stroke: currentColor !important;
          stroke-width: 2.25 !important;
          -webkit-text-fill-color: #b85d59 !important;
          transform: translateY(.05rem) !important;
          opacity: .9 !important;
          animation: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time strong {
          display: inline-block !important;
          font-size: 1.7rem !important;
          font-weight: 950 !important;
          letter-spacing: -.025em !important;
          line-height: .9 !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time span {
          display: inline-block !important;
          transform: translateY(-.02rem) !important;
          font-size: .72rem !important;
          font-weight: 900 !important;
          letter-spacing: .105em !important;
          line-height: 1 !important;
          text-transform: uppercase !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-status-pulse {
          color: #ec8a82 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-status-pulse[data-vtco-show-time="1"] {
          color: rgba(246, 232, 200, .95) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-status-time {
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: rgba(246, 232, 200, .95) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .95) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-status-time strong {
          color: rgba(246, 232, 200, .98) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .98) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-status-clock,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-status-time span {
          color: #ec8a82 !important;
          -webkit-text-fill-color: #ec8a82 !important;
        }

        @keyframes vtco-status-check-in {
          0% { opacity: 0; transform: scale(.82); }
          58% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }

        @keyframes vtco-status-time-reveal {
          0% { opacity: 0; transform: translateY(5px); filter: blur(1px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0); }
        }

        /* Split steps: hide empty h2 and make Share amount the visual title */
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="split"] .vtco-title-wrap h2,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="split-items"] .vtco-title-wrap h2,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="split-shares"] .vtco-title-wrap h2 {
          display: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="split"] .vtco-eyebrow,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="split-items"] .vtco-eyebrow,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="split-shares"] .vtco-eyebrow {
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
        html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] .vtco-stepper-btn,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] .vtco-btn-square {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] .vtco-stepper-btn:last-child {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] strong {
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
        html body .vtco-overlay[data-vtco-root="1"] .vtco-field,
        html body .vtco-overlay[data-vtco-root="1"] input.vtco-field,
        html body .vtco-overlay[data-vtco-root="1"] textarea.vtco-field {
          border-radius: 0 !important;
        }

        @media (max-width: 520px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2,
          html body .vtco-overlay[data-vtco-root="1"] h2.vtco-title,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title {
            font-size: 1.38rem !important;
          }

          html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="split"] .vtco-eyebrow,
          html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="split-items"] .vtco-eyebrow,
          html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="split-shares"] .vtco-eyebrow {
            font-size: 1.55rem !important;
          }
        }



        /* PMD_VELVET_V43_NATIVE_PAY_BUTTON_DIRECT_FIX_20260618
           renderPaymentButton() returns .pmd-themed-button, not vtco-btn.
           Force it to the same Velvet primary button contract.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button.pmd-themed-button,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button[data-pmd-themed-button="primary"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button[data-pmd-stripe-native-button="1"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail button.pmd-themed-button,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail button[data-pmd-themed-button="primary"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail button[data-pmd-stripe-native-button="1"] {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button.pmd-themed-button *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button[data-pmd-themed-button="primary"] *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button[data-pmd-stripe-native-button="1"] *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail button.pmd-themed-button *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail button[data-pmd-themed-button="primary"] *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail button[data-pmd-stripe-native-button="1"] * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: currentColor !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button.pmd-themed-button:disabled,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button[data-pmd-themed-button="primary"]:disabled,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button[data-pmd-stripe-native-button="1"]:disabled,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail button.pmd-themed-button:disabled,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail button[data-pmd-themed-button="primary"]:disabled,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail button[data-pmd-stripe-native-button="1"]:disabled {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          border: 1px solid rgba(143, 55, 51, .62) !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button.pmd-themed-button:not(:disabled):hover,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button[data-pmd-themed-button="primary"]:not(:disabled):hover,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-action button[data-pmd-stripe-native-button="1"]:not(:disabled):hover {
          background: #c86460 !important;
          background-color: #c86460 !important;
          background-image: linear-gradient(#c86460, #c86460) !important;
          transform: translateY(-1px) !important;
        }

        /* Stripe/payment form inputs also sharp, no rounded default */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail input,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-detail .vtco-field,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-coupon-row input.vtco-field,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tip-grid input.vtco-field {
          border-radius: 0 !important;
        }



        /* PMD_VELVET_V44_PAY_BUTTON_ABSOLUTE_FINAL_20260618
           Last override for shared/native payment renderer.
        */
        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-payment-action, .vtco-payment-detail) :is(
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

        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-payment-action, .vtco-payment-detail) :is(
          button.pmd-themed-button,
          button[data-pmd-themed-button],
          button[data-pmd-stripe-native-button],
          button[type="submit"]
        ) * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: currentColor !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(.vtco-payment-action, .vtco-payment-detail) :is(
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



        /* PMD_VELVET_V46C_PAYMENT_GUARD_CSS_SAFE_20260618
           Hide payment methods/fields until backend has created a real order_id.
           Make payment method logos compact and unframed when visible.
        */

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-can-pay="0"] .vtco-method-grid,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-can-pay="0"] .vtco-payment-detail,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-can-pay="0"] .vtco-payment-action,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-can-pay="0"] .vtco-section-title:has(+ .vtco-method-grid) {
          display: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-can-pay="1"] .vtco-payment-blocked-clean {
          display: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-blocked-clean {
          margin-top: 1rem !important;
          padding: .9rem 0 0 !important;
          border: 0 !important;
          outline: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-blocked-clean strong {
          display: block !important;
          font-size: 1rem !important;
          font-weight: 850 !important;
          margin-bottom: .35rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-blocked-clean p {
          margin: 0 0 .9rem !important;
          font-size: .9rem !important;
          line-height: 1.45 !important;
          color: rgba(36, 35, 32, .72) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .72) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .5rem !important;
          margin-bottom: .95rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile[data-vtco-active="1"] {
          opacity: 1 !important;
          border-bottom: 2px solid #b85d59 !important;
          background: rgba(184, 93, 89, .035) !important;
          background-color: rgba(184, 93, 89, .035) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile:hover {
          opacity: 1 !important;
          background: rgba(36, 35, 32, .035) !important;
          background-color: rgba(36, 35, 32, .035) !important;
          transform: translateY(-1px) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile img {
          max-width: 64px !important;
          max-height: 26px !important;
          width: auto !important;
          height: auto !important;
          object-fit: contain !important;
        }



        /* PMD_VELVET_V47_SPLIT_TABS_FIXED_20260618
           Keep Split / By order / By shares tabs stable in all split states.
           Selected tab gets a clear secondary active effect.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .58rem !important;
          align-items: stretch !important;
          width: 100% !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-segment,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tab {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-label {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-label span {
          display: block !important;
          width: 100% !important;
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
        }

        /* Fallback for tabs still using plain text */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-segment:not(:has(.vtco-segment-label)),
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tab:not(:has(.vtco-segment-label)) {
          font-size: .8rem !important;
          letter-spacing: .12em !important;
          line-height: 1.05 !important;
          text-wrap: balance !important;
        }

        /* Active selected split way */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-segment[data-vtco-active="1"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tab[data-vtco-active="1"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment[data-vtco-active="1"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-segment[aria-pressed="true"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tab[aria-pressed="true"] {
          border: 1px solid rgba(184, 93, 89, .72) !important;
          background: rgba(184, 93, 89, .085) !important;
          background-color: rgba(184, 93, 89, .085) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          box-shadow: inset 0 -2px 0 #b85d59 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-segment[data-vtco-active="1"] *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tab[data-vtco-active="1"] *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment[data-vtco-active="1"] *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-segment[aria-pressed="true"] *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tab[aria-pressed="true"] * {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-segment:not([data-vtco-active="1"]):not([aria-pressed="true"]):hover,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tab:not([data-vtco-active="1"]):not([aria-pressed="true"]):hover {
          border-color: rgba(36, 35, 32, .32) !important;
          background: rgba(255, 255, 255, .62) !important;
          background-color: rgba(255, 255, 255, .62) !important;
          transform: translateY(-1px) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-btn-segment,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-tab,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-segment {
          border-color: rgba(246, 232, 200, .22) !important;
          background: rgba(8, 6, 4, .72) !important;
          background-color: rgba(8, 6, 4, .72) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        @media (max-width: 520px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs {
            gap: .42rem !important;
          }

          html body .vtco-overlay[data-vtco-root="1"] .vtco-segment,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-segment,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-tab {
            height: 54px !important;
            min-height: 54px !important;
            padding-inline: .18rem !important;
          }

          html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-label {
            font-size: .72rem !important;
            letter-spacing: .105em !important;
          }
        }



        /* PMD_VELVET_V48_SPLIT_TABS_CHIPS_POLISH_20260618
           Real final split tab fix:
           Force stable two-line labels with nth-child pseudo-content,
           so BY SHARES can never collapse into one line.
           Also polish people chips row.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .52rem !important;
          align-items: stretch !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow: hidden !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment > *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment > *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab > *,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab > * {
          display: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab::before {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment:nth-child(1)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment:nth-child(1)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab:nth-child(1)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab:nth-child(1)::before {
          content: "SPLIT\\A EQUALLY" !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment:nth-child(2)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment:nth-child(2)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab:nth-child(2)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab:nth-child(2)::before {
          content: "BY ORDER\\A ITEMS" !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment:nth-child(3)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment:nth-child(3)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab:nth-child(3)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab:nth-child(3)::before {
          content: "BY\\A SHARES" !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > :is(.vtco-btn-segment, .vtco-tab)[data-vtco-active="1"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > :is(.vtco-btn-segment, .vtco-tab)[data-vtco-active="1"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > :is(.vtco-btn-segment, .vtco-tab)[aria-pressed="true"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > :is(.vtco-btn-segment, .vtco-tab)[aria-pressed="true"] {
          border-color: rgba(184, 93, 89, .8) !important;
          background: rgba(184, 93, 89, .095) !important;
          background-color: rgba(184, 93, 89, .095) !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          box-shadow: inset 0 -2px 0 #b85d59 !important;
        }

        /* People/guest chips: sit compactly to the right of the stepper and wrap nicely */
        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-people-row,
          .vtco-guest-row,
          .vtco-guests-row,
          .vtco-person-row,
          .vtco-people-list,
          .vtco-guests-list,
          .vtco-person-list,
          .vtco-payer-list,
          .vtco-split-people,
          .vtco-people-chips,
          .vtco-guest-chips,
          .vtco-person-chips
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

        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-person-chip,
          .vtco-guest-chip,
          .vtco-payer-chip,
          .vtco-person-pill,
          .vtco-guest-pill,
          .vtco-payer-pill
        ),
        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-people-row,
          .vtco-guest-row,
          .vtco-guests-row,
          .vtco-person-row,
          .vtco-people-list,
          .vtco-guests-list,
          .vtco-person-list,
          .vtco-payer-list,
          .vtco-split-people,
          .vtco-people-chips,
          .vtco-guest-chips,
          .vtco-person-chips
        ) > button {
          animation: vtco-person-chip-in .24s ease-out both !important;
          transition: transform .18s ease, opacity .18s ease, border-color .18s ease, background-color .18s ease !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-person-chip,
          .vtco-guest-chip,
          .vtco-payer-chip,
          .vtco-person-pill,
          .vtco-guest-pill,
          .vtco-payer-pill
        ):hover,
        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-people-row,
          .vtco-guest-row,
          .vtco-guests-row,
          .vtco-person-row,
          .vtco-people-list,
          .vtco-guests-list,
          .vtco-person-list,
          .vtco-payer-list,
          .vtco-split-people,
          .vtco-people-chips,
          .vtco-guest-chips,
          .vtco-person-chips
        ) > button:hover {
          transform: translateY(-1px) !important;
        }

        @keyframes vtco-person-chip-in {
          from { opacity: 0; transform: translateY(5px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }

        @media (max-width: 520px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs {
            gap: .36rem !important;
          }

          html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab {
            height: 52px !important;
            min-height: 52px !important;
          }

          html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment::before,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment::before,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab::before,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab::before {
            font-size: .66rem !important;
            letter-spacing: .09em !important;
          }

          html body .vtco-overlay[data-vtco-root="1"] :is(
            .vtco-people-row,
            .vtco-guest-row,
            .vtco-guests-row,
            .vtco-person-row,
            .vtco-people-list,
            .vtco-guests-list,
            .vtco-person-list,
            .vtco-payer-list,
            .vtco-split-people,
            .vtco-people-chips,
            .vtco-guest-chips,
            .vtco-person-chips
          ) {
            margin-left: 0 !important;
            margin-top: .55rem !important;
          }
        }



        /* PMD_VELVET_V49_REAL_SPLIT_TABS_CHIPS_FIX_20260618
           Fix V48 escaped newline issue and force guest chips beside stepper.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab {
          font-size: 0 !important;
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
          overflow: hidden !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab::before {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment:nth-child(1)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment:nth-child(1)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab:nth-child(1)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab:nth-child(1)::before {
          content: "SPLIT\\A EQUALLY" !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment:nth-child(2)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment:nth-child(2)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab:nth-child(2)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab:nth-child(2)::before {
          content: "BY ORDER\\A ITEMS" !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-btn-segment:nth-child(3)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-btn-segment:nth-child(3)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > .vtco-tab:nth-child(3)::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > .vtco-tab:nth-child(3)::before {
          content: "BY\\A SHARES" !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > :is(.vtco-btn-segment, .vtco-tab)[data-vtco-active="1"]::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > :is(.vtco-btn-segment, .vtco-tab)[data-vtco-active="1"]::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-segment-grid > :is(.vtco-btn-segment, .vtco-tab)[aria-pressed="true"]::before,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tabs > :is(.vtco-btn-segment, .vtco-tab)[aria-pressed="true"]::before {
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        /* Put people chips beside the stepper, not below with empty gap */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] {
          float: left !important;
          margin: 0 .75rem .72rem 0 !important;
          width: 190px !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] + * {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: .45rem .55rem !important;
          margin-top: 0 !important;
          padding-top: 0 !important;
          min-height: 38px !important;
          animation: vtco-person-chip-row-in .22s ease-out both !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] + * > * {
          animation: vtco-person-chip-in .24s ease-out both !important;
          transition: transform .18s ease, opacity .18s ease, border-color .18s ease, background-color .18s ease !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] + * > *:hover {
          transform: translateY(-1px) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] :is(
          .vtco-assignment-panel,
          .vtco-assignment-box,
          .vtco-items-assignment,
          .vtco-share-box,
          .vtco-share-grid,
          .vtco-ready-box,
          .vtco-split-ready,
          .vtco-review-actions
        ) {
          clear: both !important;
        }

        @keyframes vtco-person-chip-row-in {
          from { opacity: .72; transform: translateY(3px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 620px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] {
            float: none !important;
            width: 190px !important;
            margin: 0 0 .55rem 0 !important;
          }

          html body .vtco-overlay[data-vtco-root="1"] .vtco-stepper[data-vtco-control="people-stepper"] + * {
            width: 100% !important;
          }
        }



        /* PMD_VELVET_V50_PEOPLE_INLINE_PAYMENT_SCOPE_20260618
           Stepper + people chips are now a real JSX row, not guessed by float.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-stepper[data-vtco-control="people-stepper"] {
          float: none !important;
          width: 190px !important;
          max-width: 190px !important;
          min-width: 190px !important;
          height: 36px !important;
          min-height: 36px !important;
          margin: 0 !important;
          grid-template-columns: 36px minmax(0, 1fr) 36px !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-stepper[data-vtco-control="people-stepper"] .vtco-stepper-btn,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-stepper[data-vtco-control="people-stepper"] .vtco-btn-square {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-stepper[data-vtco-control="people-stepper"] strong {
          height: 36px !important;
          min-height: 36px !important;
          font-size: .92rem !important;
          white-space: nowrap !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-chip-row {
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
          animation: vtco-person-chip-row-in .22s ease-out both !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-chip {
          min-height: 36px !important;
          height: 36px !important;
          padding: .42rem .58rem !important;
          font-size: .88rem !important;
          line-height: 1 !important;
          animation: vtco-person-chip-in .24s ease-out both !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-chip b {
          width: 24px !important;
          height: 24px !important;
          min-width: 24px !important;
          margin-right: .36rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline + :is(.vtco-card, .vtco-list, section, button) {
          clear: both !important;
        }

        @media (max-width: 520px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline {
            grid-template-columns: 1fr !important;
          }

          html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-stepper[data-vtco-control="people-stepper"] {
            width: 190px !important;
            max-width: 190px !important;
          }
        }



        /* PMD_VELVET_V51_COMPACT_STEPPER_WIDE_CHIPS_20260618
           Make split people control the same small size as item quantity stepper.
           This gives the guest chips enough horizontal space beside it.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline {
          display: grid !important;
          grid-template-columns: 106px minmax(0, 1fr) !important;
          align-items: start !important;
          gap: .55rem .72rem !important;
          width: 100% !important;
          max-width: 100% !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-stepper[data-vtco-control="people-stepper"] {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-stepper[data-vtco-control="people-stepper"] .vtco-stepper-btn,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-stepper[data-vtco-control="people-stepper"] .vtco-btn-square {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-stepper[data-vtco-control="people-stepper"] strong {
          width: 38px !important;
          min-width: 38px !important;
          height: 34px !important;
          min-height: 34px !important;
          font-size: .95rem !important;
          font-weight: 850 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-chip-row {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-chip {
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
          animation: vtco-person-chip-in .24s ease-out both !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-chip b {
          width: 24px !important;
          height: 24px !important;
          min-width: 24px !important;
          margin-right: .26rem !important;
        }

        @media (max-width: 520px) {
          html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline {
            grid-template-columns: 106px minmax(0, 1fr) !important;
          }
        }



        /* PMD_VELVET_V52_HIDE_GUEST_INITIAL_ICONS_20260618
           Remove the ugly initial-letter boxes inside split guest chips.
           Keep chips clean: Luna / Milo / Zara without fake icons.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-chip b,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-chip-row .vtco-chip b {
          display: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-chip,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-chip-row .vtco-chip {
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

        html body .vtco-overlay[data-vtco-root="1"] .vtco-people-inline .vtco-chip:hover,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-chip-row .vtco-chip:hover {
          border-color: rgba(184, 93, 89, .38) !important;
          background: rgba(184, 93, 89, .035) !important;
          transform: translateY(-1px) !important;
        }



        /* PMD_VELVET_V54_CLOSE_ALWAYS_RIGHT_20260619
           Lock the close button to the right side on every checkout card,
           even when the title is hidden or empty.
        */

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head {
          direction: ltr !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          grid-template-areas: "title close" !important;
          align-items: start !important;
          gap: 1rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap {
          grid-area: title !important;
          grid-column: 1 !important;
          min-width: 0 !important;
          justify-self: start !important;
          text-align: left !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-close {
          grid-area: close !important;
          grid-column: 2 !important;
          justify-self: end !important;
          align-self: start !important;
          margin-left: auto !important;
          margin-right: 0 !important;
          inset-inline-start: auto !important;
          inset-inline-end: 0 !important;
          order: 99 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head > .vtco-close:first-child {
          grid-column: 2 !important;
          justify-self: end !important;
          margin-left: auto !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head > .vtco-title-wrap:empty,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2:empty {
          display: block !important;
          min-height: 1px !important;
        }


        /* PMD_VELVET_TERRACOTTA_CHECKOUT_SKIN_V2
           Isolated checkout skin for Velvet; never targets Kazen/kzco. */
        html body .vtco-overlay[data-vtco-root="1"] {
          --vtco-ink: #2a1711;
          --vtco-muted: rgba(42, 23, 17, .62);
          --vtco-panel-bg: #fff6ea;
          --vtco-panel-text: #2a1711;
          --vtco-card-bg: rgba(255, 249, 239, .82);
          --vtco-card-border: rgba(145, 82, 61, .18);
          --vtco-accent: #b86750;
          --vtco-accent-strong: #9d4f3f;
          --vtco-soft: #f3dfce;
          --vtco-radius: 24px;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-panel,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-card,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box {
          border-radius: var(--vtco-radius) !important;
          border-color: var(--vtco-card-border) !important;
          background: var(--vtco-card-bg) !important;
          box-shadow: 0 18px 50px rgba(95, 53, 38, .10) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn,
        html body .vtco-overlay[data-vtco-root="1"] button[data-vtco-button],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-field,
        html body .vtco-overlay[data-vtco-root="1"] input,
        html body .vtco-overlay[data-vtco-root="1"] textarea,
        html body .vtco-overlay[data-vtco-root="1"] select {
          border-radius: 999px !important;
          border-color: rgba(145, 82, 61, .22) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-textarea,
        html body .vtco-overlay[data-vtco-root="1"] textarea {
          border-radius: 20px !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-primary,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-submit {
          background: linear-gradient(135deg, #b86750, #8f4739) !important;
          color: #fff8ed !important;
          -webkit-text-fill-color: #fff8ed !important;
          border-color: rgba(143, 71, 57, .72) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-secondary:hover,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile:hover,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tip-preset:hover {
          border-color: rgba(184, 103, 80, .62) !important;
          background: rgba(184, 103, 80, .085) !important;
          color: #9d4f3f !important;
          -webkit-text-fill-color: #9d4f3f !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-tile[data-vtco-active="1"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tip-preset[data-vtco-active="1"],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn-segment[data-vtco-active="1"] {
          border-color: rgba(184, 103, 80, .76) !important;
          background: rgba(184, 103, 80, .12) !important;
          box-shadow: inset 0 0 0 1px rgba(184, 103, 80, .20) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] {
          --vtco-ink: #f6dfc8;
          --vtco-muted: rgba(246, 223, 200, .62);
          --vtco-panel-bg: #180d09;
          --vtco-panel-text: #f6dfc8;
          --vtco-card-bg: rgba(39, 21, 14, .82);
          --vtco-card-border: rgba(231, 162, 124, .18);
          --vtco-accent: #e08a70;
          --vtco-accent-strong: #f0a183;
          --vtco-soft: #2b1711;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-panel,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-card,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-total-box {
          background: var(--vtco-card-bg) !important;
          border-color: var(--vtco-card-border) !important;
          box-shadow: 0 22px 70px rgba(0, 0, 0, .32) !important;
        }

      `}</style>


      <style jsx global>{`
        /* PMD_VELVET_V31_CLEAN_CHECKOUT_POLISH_20260618
           Final polish after V30 clean rewrite:
           - readable disabled buttons
           - unified primary/secondary/tabs/payment buttons
           - no blue Safari focus block
           - payment form buttons included
        */

        html body .pmd-velvet-checkout-waiter,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="velvet_japanese"] {
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

        html body .pmd-velvet-checkout-waiter[data-pmd-velvet-checkout-mode="dark"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="velvet_japanese"][data-pmd-velvet-checkout-mode="dark"] {
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

        html body .pmd-velvet-checkout-waiter button,
        html body .pmd-velvet-checkout-waiter [role="button"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="velvet_japanese"] button,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="velvet_japanese"] [role="button"] {
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

        html body .pmd-velvet-checkout-waiter button:focus,
        html body .pmd-velvet-checkout-waiter button:focus-visible {
          outline: 2px solid rgba(184, 93, 89, .42) !important;
        }

        html body .pmd-velvet-checkout-waiter .pmd-velvet-action-close,
        html body .pmd-velvet-checkout-waiter .velvet-solid-close,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-checkout-close-clean {
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

        html body .pmd-velvet-checkout-waiter .pmd-velvet-action-close svg,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-action-close svg *,
        html body .pmd-velvet-checkout-waiter .velvet-solid-close svg,
        html body .pmd-velvet-checkout-waiter .velvet-solid-close svg * {
          color: var(--kz-close-text) !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        /* TYPE 1: PRIMARY RED */
        html body .pmd-velvet-checkout-waiter [data-pmd-velvet-button="primary"],
        html body .pmd-velvet-checkout-waiter .pmd-kzui-btn-primary,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-checkout-action-primary-clean,
        html body .pmd-velvet-checkout-waiter .pmd-themed-button[data-pmd-themed-button="primary"],
        html body .pmd-velvet-checkout-waiter [data-pmd-stripe-native-button="1"],
        html body .pmd-velvet-checkout-waiter button[type="submit"],
        html body .pmd-velvet-checkout-waiter button:has(.lucide-lock) {
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

        html body .pmd-velvet-checkout-waiter [data-pmd-velvet-button="primary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body .pmd-velvet-checkout-waiter .pmd-themed-button[data-pmd-themed-button="primary"]:not(:disabled):hover,
        html body .pmd-velvet-checkout-waiter [data-pmd-stripe-native-button="1"]:not(:disabled):hover {
          background: var(--kz-primary-bg-hover) !important;
          background-color: var(--kz-primary-bg-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* TYPE 2: SECONDARY + TABS */
        html body .pmd-velvet-checkout-waiter [data-pmd-velvet-button="secondary"],
        html body .pmd-velvet-checkout-waiter .pmd-kzui-btn-secondary,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-checkout-action-secondary-clean,
        html body .pmd-velvet-checkout-waiter .velvet-secondary,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-tab,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-tab-active,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-waiter-secondary,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-split-stepper-btn,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-assign-row,
        html body .pmd-velvet-checkout-waiter .pmd-payment-method-tile,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-method,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-apply {
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

        html body .pmd-velvet-checkout-waiter [data-pmd-velvet-button="secondary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-tab:not(:disabled):hover,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-split-stepper-btn:not(:disabled):hover,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-assign-row:not(:disabled):hover,
        html body .pmd-velvet-checkout-waiter .pmd-payment-method-tile:not(:disabled):hover,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-method:not(:disabled):hover {
          background: var(--kz-secondary-bg-hover) !important;
          background-color: var(--kz-secondary-bg-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* Active tabs stay type-2, only border becomes stronger */
        html body .pmd-velvet-checkout-waiter .pmd-velvet-tab-active {
          background: var(--kz-secondary-bg) !important;
          background-color: var(--kz-secondary-bg) !important;
          color: var(--kz-secondary-text) !important;
          -webkit-text-fill-color: var(--kz-secondary-text) !important;
          border: 1px solid var(--kz-primary-bg) !important;
          box-shadow: inset 0 -2px 0 var(--kz-primary-bg) !important;
        }

        /* Disabled must be readable, never white-on-white */
        html body .pmd-velvet-checkout-waiter button:disabled,
        html body .pmd-velvet-checkout-waiter button[disabled],
        html body .pmd-velvet-checkout-waiter [aria-disabled="true"],
        html body .pmd-velvet-checkout-waiter [data-pmd-velvet-button="primary"]:disabled,
        html body .pmd-velvet-checkout-waiter .pmd-themed-button:disabled,
        html body .pmd-velvet-checkout-waiter [data-pmd-stripe-native-button="1"]:disabled {
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

        html body .pmd-velvet-checkout-waiter button svg,
        html body .pmd-velvet-checkout-waiter button svg *,
        html body .pmd-velvet-checkout-waiter [role="button"] svg,
        html body .pmd-velvet-checkout-waiter [role="button"] svg * {
          color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        html body .pmd-velvet-checkout-waiter .pmd-payment-method-tile img,
        html body .pmd-velvet-checkout-waiter .pmd-velvet-method img {
          max-width: 72px !important;
          max-height: 34px !important;
          object-fit: contain !important;
        }
      `}</style>


      <style jsx global>{`
        /* PMD_VELVET_V32_REAL_VTCO_BUTTON_NORMAL_STATE_FIX_20260618
           The clean checkout rewrite uses vtco-btn / data-vtco-button.
           This is the real final contract for normal + hover + disabled states.
        */

        html body .vtco-shell,
        html body .vtco-overlay,
        html body .vtco-card,
        html body .pmd-velvet-checkout-waiter,
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="velvet_japanese"] {
          --vtco-primary-bg: #b85d59;
          --vtco-primary-hover: #c86460;
          --vtco-primary-text: #fffaf3;
          --vtco-primary-border: rgba(143, 55, 51, .58);

          --vtco-secondary-bg: rgba(255, 255, 255, .42);
          --vtco-secondary-hover: rgba(255, 255, 255, .62);
          --vtco-secondary-text: #242320;
          --vtco-secondary-border: rgba(36, 35, 32, .24);

          --vtco-close-bg: rgba(255, 255, 255, .42);
          --vtco-close-text: #242320;
          --vtco-close-border: rgba(36, 35, 32, .24);

          --vtco-disabled-bg: rgba(184, 93, 89, .14);
          --vtco-disabled-text: rgba(184, 93, 89, .82);
          --vtco-disabled-border: rgba(184, 93, 89, .48);
        }

        html body .vtco-shell[data-vtco-mode="dark"],
        html body .vtco-overlay[data-vtco-mode="dark"],
        html body .vtco-card[data-vtco-mode="dark"],
        html body .pmd-velvet-checkout-waiter[data-pmd-velvet-checkout-mode="dark"],
        html body [data-pmd-checkout-theme-root="1"][data-pmd-checkout-theme="velvet_japanese"][data-pmd-velvet-checkout-mode="dark"] {
          --vtco-primary-bg: #b85d59;
          --vtco-primary-hover: #c86460;
          --vtco-primary-text: #fffaf3;
          --vtco-primary-border: rgba(223, 104, 93, .72);

          --vtco-secondary-bg: rgba(8, 6, 4, .88);
          --vtco-secondary-hover: rgba(246, 232, 200, .08);
          --vtco-secondary-text: #f6e8c8;
          --vtco-secondary-border: rgba(198, 164, 93, .38);

          --vtco-close-bg: rgba(246, 232, 200, .055);
          --vtco-close-text: #f6e8c8;
          --vtco-close-border: rgba(198, 164, 93, .32);

          --vtco-disabled-bg: rgba(184, 93, 89, .26);
          --vtco-disabled-text: rgba(255, 250, 243, .72);
          --vtco-disabled-border: rgba(223, 104, 93, .40);
        }

        html body button.vtco-btn,
        html body .vtco-btn,
        html body button[data-vtco-button],
        html body button[data-pmd-velvet-button],
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
        html body button.vtco-btn-primary,
        html body .vtco-btn-primary,
        html body button[data-vtco-button="primary"],
        html body button[data-pmd-velvet-button="primary"],
        html body .pmd-themed-button[data-pmd-themed-button="primary"],
        html body [data-pmd-stripe-native-button="1"],
        html body button[type="submit"][data-pmd-themed-button="primary"],
        html body button:has(.lucide-lock) {
          background: var(--vtco-primary-bg) !important;
          background-color: var(--vtco-primary-bg) !important;
          color: var(--vtco-primary-text) !important;
          -webkit-text-fill-color: var(--vtco-primary-text) !important;
          border: 1px solid var(--vtco-primary-border) !important;
        }

        html body button.vtco-btn-primary:not(:disabled):not([aria-disabled="true"]):hover,
        html body button[data-vtco-button="primary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body button[data-pmd-velvet-button="primary"]:not(:disabled):not([aria-disabled="true"]):hover,
        html body .pmd-themed-button[data-pmd-themed-button="primary"]:not(:disabled):hover,
        html body [data-pmd-stripe-native-button="1"]:not(:disabled):hover {
          background: var(--vtco-primary-hover) !important;
          background-color: var(--vtco-primary-hover) !important;
          color: var(--vtco-primary-text) !important;
          -webkit-text-fill-color: var(--vtco-primary-text) !important;
          transform: translateY(-1px) !important;
        }

        /* TYPE 2: secondary + split tabs */
        html body button.vtco-btn-secondary,
        html body .vtco-btn-secondary,
        html body button[data-vtco-button="secondary"],
        html body button[data-pmd-velvet-button="secondary"],
        html body .vtco-tab,
        html body button.vtco-tab,
        html body .vtco-btn-tab,
        html body .vtco-choice,
        html body .vtco-method,
        html body .vtco-assign-row,
        html body .vtco-stepper-btn,
        html body .pmd-payment-method-tile,
        html body .pmd-velvet-method,
        html body .pmd-velvet-tab,
        html body .pmd-velvet-split-stepper-btn,
        html body .pmd-velvet-assign-row {
          background: var(--vtco-secondary-bg) !important;
          background-color: var(--vtco-secondary-bg) !important;
          color: var(--vtco-secondary-text) !important;
          -webkit-text-fill-color: var(--vtco-secondary-text) !important;
          border: 1px solid var(--vtco-secondary-border) !important;
        }

        html body button.vtco-btn-secondary:not(:disabled):hover,
        html body button[data-vtco-button="secondary"]:not(:disabled):hover,
        html body .vtco-tab:not(:disabled):hover,
        html body .vtco-method:not(:disabled):hover,
        html body .vtco-assign-row:not(:disabled):hover,
        html body .vtco-stepper-btn:not(:disabled):hover,
        html body .pmd-payment-method-tile:not(:disabled):hover {
          background: var(--vtco-secondary-hover) !important;
          background-color: var(--vtco-secondary-hover) !important;
          transform: translateY(-1px) !important;
        }

        /* Active tab is still TYPE 2, only stronger border */
        html body .vtco-tab-active,
        html body .pmd-velvet-tab-active {
          background: var(--vtco-secondary-bg) !important;
          background-color: var(--vtco-secondary-bg) !important;
          color: var(--vtco-secondary-text) !important;
          -webkit-text-fill-color: var(--vtco-secondary-text) !important;
          border: 1px solid var(--vtco-primary-bg) !important;
          box-shadow: inset 0 -2px 0 var(--vtco-primary-bg) !important;
        }

        /* Close square */
        html body .vtco-close,
        html body button.vtco-close,
        html body .vtco-btn-close,
        html body .pmd-velvet-action-close,
        html body .velvet-solid-close,
        html body .pmd-velvet-checkout-close-clean {
          width: 48px !important;
          height: 48px !important;
          min-width: 48px !important;
          min-height: 48px !important;
          max-width: 48px !important;
          max-height: 48px !important;
          padding: 0 !important;
          background: var(--vtco-close-bg) !important;
          background-color: var(--vtco-close-bg) !important;
          color: var(--vtco-close-text) !important;
          -webkit-text-fill-color: var(--vtco-close-text) !important;
          border: 1px solid var(--vtco-close-border) !important;
        }

        html body .vtco-close svg,
        html body .vtco-close svg *,
        html body .pmd-velvet-action-close svg,
        html body .pmd-velvet-action-close svg *,
        html body button.vtco-btn svg,
        html body button.vtco-btn svg *,
        html body button[data-vtco-button] svg,
        html body button[data-vtco-button] svg * {
          color: currentColor !important;
          stroke: currentColor !important;
          fill: none !important;
        }

        /* Disabled primary/secondary: readable, never white text on white background */
        html body button.vtco-btn:disabled,
        html body button[data-vtco-button]:disabled,
        html body button[data-pmd-velvet-button]:disabled,
        html body button[disabled].vtco-btn,
        html body .pmd-themed-button:disabled,
        html body [data-pmd-stripe-native-button="1"]:disabled {
          opacity: 1 !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
          transform: none !important;
          background: var(--vtco-disabled-bg) !important;
          background-color: var(--vtco-disabled-bg) !important;
          color: var(--vtco-disabled-text) !important;
          -webkit-text-fill-color: var(--vtco-disabled-text) !important;
          border: 1px solid var(--vtco-disabled-border) !important;
          filter: none !important;
        }
      `}</style>

      <style data-pmd-velvet-stripe-form-final-polish="1">{`
        /* PMD_VELVET_STRIPE_FORM_FINAL_POLISH_20260620
           This style is rendered only by the Velvet checkout shell. Keep it broad
           inside the shell so it wins over shared Stripe/ThemedInput styles. */
        html body form[data-pmd-stripe-form="1"] input.pmd-themed-input,
        html body form[data-pmd-stripe-form="1"] input[data-pmd-themed-input] {
          height: 54px !important;
          min-height: 54px !important;
          width: 100% !important;
          border-radius: 0 !important;
          background: rgba(255, 251, 243, .74) !important;
          background-color: rgba(255, 251, 243, .74) !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          box-shadow: none !important;
          outline: none !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: 1rem !important;
          font-weight: 720 !important;
          letter-spacing: -.015em !important;
          padding: 0 16px !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease !important;
        }

        html body form[data-pmd-stripe-form="1"] input.pmd-themed-input::placeholder,
        html body form[data-pmd-stripe-form="1"] input[data-pmd-themed-input]::placeholder {
          color: rgba(36, 35, 32, .52) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .52) !important;
        }

        html body form[data-pmd-stripe-form="1"] input.pmd-themed-input:focus,
        html body form[data-pmd-stripe-form="1"] input[data-pmd-themed-input]:focus {
          border-color: rgba(184, 93, 89, .72) !important;
          background: rgba(255, 250, 242, .92) !important;
          box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .72) !important;
        }

        html body form[data-pmd-stripe-form="1"] .pmd-stripe-card-frame {
          height: 54px !important;
          min-height: 54px !important;
          border-radius: 0 !important;
          background: rgba(255, 251, 243, .74) !important;
          background-color: rgba(255, 251, 243, .74) !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          box-shadow: none !important;
          padding: 0 14px !important;
          display: flex !important;
          align-items: center !important;
          transition: border-color .16s ease, background-color .16s ease, box-shadow .16s ease !important;
        }

        html body form[data-pmd-stripe-form="1"] .pmd-stripe-card-frame:focus-within {
          border-color: rgba(184, 93, 89, .72) !important;
          background: rgba(255, 250, 242, .92) !important;
          box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .72) !important;
        }

        html body form[data-pmd-stripe-form="1"] .pmd-stripe-card-frame .StripeElement,
        html body form[data-pmd-stripe-form="1"] .pmd-stripe-card-frame .__PrivateStripeElement {
          width: 100% !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
        }

        html body form[data-pmd-stripe-form="1"] button[data-pmd-stripe-native-button="1"],
        html body form[data-pmd-stripe-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"],
        html body form[data-pmd-stripe-form="1"] button[type="submit"] {
          width: 100% !important;
          height: 54px !important;
          min-height: 54px !important;
          border-radius: 0 !important;
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border: 1px solid rgba(143, 55, 51, .68) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          box-shadow: none !important;
          filter: none !important;
          opacity: 1 !important;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: .14em !important;
          line-height: 1 !important;
          text-transform: uppercase !important;
          padding: .86rem 1rem !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .55rem !important;
          transition: background-color .16s ease, border-color .16s ease, transform .16s ease !important;
        }

        html body form[data-pmd-stripe-form="1"] button[data-pmd-stripe-native-button="1"] *,
        html body form[data-pmd-stripe-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"] *,
        html body form[data-pmd-stripe-form="1"] button[type="submit"] * {
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          stroke: currentColor !important;
        }

        html body form[data-pmd-stripe-form="1"] button[data-pmd-stripe-native-button="1"]:not(:disabled):hover,
        html body form[data-pmd-stripe-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"]:not(:disabled):hover,
        html body form[data-pmd-stripe-form="1"] button[type="submit"]:not(:disabled):hover {
          background: #c86460 !important;
          background-color: #c86460 !important;
          background-image: linear-gradient(#c86460, #c86460) !important;
          border-color: rgba(143, 55, 51, .78) !important;
          transform: translateY(-1px) !important;
        }

        html body form[data-pmd-stripe-form="1"] button[data-pmd-stripe-native-button="1"]:disabled,
        html body form[data-pmd-stripe-form="1"] button.pmd-themed-button[data-pmd-themed-button="primary"]:disabled,
        html body form[data-pmd-stripe-form="1"] button[type="submit"]:disabled {
          background: #b85d59 !important;
          background-color: #b85d59 !important;
          background-image: linear-gradient(#b85d59, #b85d59) !important;
          border-color: rgba(143, 55, 51, .68) !important;
          color: #fffaf3 !important;
          -webkit-text-fill-color: #fffaf3 !important;
          opacity: .58 !important;
          cursor: not-allowed !important;
          pointer-events: none !important;
          transform: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] form[data-pmd-stripe-form="1"] input.pmd-themed-input,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] form[data-pmd-stripe-form="1"] input[data-pmd-themed-input],
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] form[data-pmd-stripe-form="1"] .pmd-stripe-card-frame {
          background: rgba(246, 232, 200, .055) !important;
          background-color: rgba(246, 232, 200, .055) !important;
          border-color: rgba(198, 164, 93, .36) !important;
          color: #f4e7c8 !important;
          -webkit-text-fill-color: #f4e7c8 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] form[data-pmd-stripe-form="1"] input.pmd-themed-input::placeholder,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] form[data-pmd-stripe-form="1"] input[data-pmd-themed-input]::placeholder {
          color: rgba(244, 231, 200, .60) !important;
          -webkit-text-fill-color: rgba(244, 231, 200, .60) !important;
        }

        /* PMD_VELVET_PAID_CONFIRMATION_CARD_V3
           Real post-payment confirmation card for Velvet checkout.
           Keeps the same sharp Japanese visual language and supports dark mode.
        */
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-title-wrap,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-title-wrap h2 {
          display: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-head {
          grid-template-columns: 1fr 48px !important;
          min-height: 4.25rem !important;
          padding-top: 1.15rem !important;
          padding-bottom: .75rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-body {
          gap: .95rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-hero {
          margin-bottom: .55rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-note {
          margin: -.35rem 0 .1rem !important;
          font-size: .92rem !important;
          line-height: 1.45 !important;
          color: rgba(36, 35, 32, .72) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .72) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paid-note {
          color: rgba(246, 232, 200, .76) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .76) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-total-box {
          margin-top: .05rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-powered-by {
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .5rem !important;
          padding-top: .2rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-powered-by span {
          font-size: .68rem !important;
          font-weight: 700 !important;
          letter-spacing: .10em !important;
          text-transform: uppercase !important;
          color: rgba(36, 35, 32, .56) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .56) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-powered-by span {
          color: rgba(246, 232, 200, .54) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .54) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-powered-by img {
          display: block !important;
          max-width: 118px !important;
          max-height: 22px !important;
          object-fit: contain !important;
          opacity: .78 !important;
        }



        /* PMD_VELVET_PAID_FEEDBACK_V4
           Paid-state feedback card aligned with the Velvet sharp premium style.
        */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-card {
          display: grid !important;
          gap: .85rem !important;
          padding: 1rem !important;
          background: rgba(255, 255, 255, .34) !important;
          border: 1px solid rgba(36, 35, 32, .14) !important;
          border-radius: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head {
          display: flex !important;
          align-items: flex-start !important;
          gap: .75rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head > span {
          width: 34px !important;
          height: 34px !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid rgba(184, 93, 89, .38) !important;
          color: #b85d59 !important;
          flex: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head h3 {
          margin: 0 !important;
          color: var(--vtco-panel-text) !important;
          font-size: .98rem !important;
          font-weight: 850 !important;
          letter-spacing: .02em !important;
          line-height: 1.1 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head p {
          margin: .2rem 0 0 !important;
          color: var(--vtco-panel-muted) !important;
          font-size: .78rem !important;
          line-height: 1.35 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stars {
          display: grid !important;
          grid-template-columns: repeat(5, minmax(0, 1fr)) !important;
          gap: .45rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stars button {
          height: 42px !important;
          border-radius: 0 !important;
          border: 1px solid rgba(36, 35, 32, .18) !important;
          background: rgba(255, 255, 255, .44) !important;
          color: rgba(36, 35, 32, .42) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          appearance: none !important;
          -webkit-appearance: none !important;
          transition: border-color .18s ease, background .18s ease, color .18s ease !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stars button[data-vtco-active="1"] {
          border-color: rgba(184, 93, 89, .50) !important;
          background: rgba(184, 93, 89, .10) !important;
          color: #b85d59 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stars button[data-vtco-active="1"] svg {
          fill: currentColor !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-textarea {
          width: 100% !important;
          min-height: 82px !important;
          resize: vertical !important;
          border-radius: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-submit {
          min-height: 44px !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-message {
          margin: 0 !important;
          font-size: .76rem !important;
          font-weight: 650 !important;
          color: #166534 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-error {
          color: #b42318 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-share {
          border: 1px solid rgba(184, 93, 89, .18) !important;
          padding: .75rem !important;
          display: grid !important;
          gap: .5rem !important;
          background: rgba(255, 255, 255, .28) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-share p {
          margin: 0 !important;
          font-size: .76rem !important;
          font-weight: 800 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-share div {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: .45rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-share a {
          display: inline-flex !important;
          align-items: center !important;
          gap: .35rem !important;
          border: 1px solid rgba(36, 35, 32, .16) !important;
          padding: .42rem .62rem !important;
          color: var(--vtco-panel-text) !important;
          text-decoration: none !important;
          font-size: .72rem !important;
          font-weight: 800 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-review-card,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-review-share {
          background: rgba(8, 6, 4, .54) !important;
          border-color: rgba(198, 164, 93, .26) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-stars button {
          background: rgba(8, 6, 4, .58) !important;
          border-color: rgba(198, 164, 93, .24) !important;
          color: rgba(246, 232, 200, .38) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-stars button[data-vtco-active="1"] {
          border-color: rgba(236, 138, 130, .56) !important;
          background: rgba(184, 93, 89, .18) !important;
          color: #ec8a82 !important;
        }



        /* PMD_VELVET_PAID_FEEDBACK_POLISH_V5
           Remove heavy frames from paid feedback and use compact icon-only public share links.
        */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-card {
          padding: .85rem 0 .1rem !important;
          background: transparent !important;
          border: 0 !important;
          box-shadow: none !important;
          gap: .78rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head {
          gap: .62rem !important;
          align-items: center !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head > span {
          width: 28px !important;
          height: 28px !important;
          border: 0 !important;
          background: transparent !important;
          color: #b85d59 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head h3 {
          font-size: .98rem !important;
          letter-spacing: .01em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head p {
          font-size: .76rem !important;
          margin-top: .15rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stars {
          display: flex !important;
          justify-content: center !important;
          gap: .36rem !important;
          padding: .1rem 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stars button {
          width: 42px !important;
          height: 42px !important;
          border: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          color: rgba(36, 35, 32, .42) !important;
          padding: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stars button svg {
          width: 24px !important;
          height: 24px !important;
          transition: transform .18s ease, color .18s ease, fill .18s ease !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stars button[data-vtco-active="1"] {
          color: #b85d59 !important;
          background: transparent !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-stars button[data-vtco-active="1"] svg {
          fill: currentColor !important;
          transform: translateY(-1px) scale(1.04) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-textarea {
          min-height: 76px !important;
          padding: .85rem .95rem !important;
          border-radius: 0 !important;
          border: 1px solid rgba(36, 35, 32, .22) !important;
          background: rgba(255, 255, 255, .28) !important;
          box-shadow: none !important;
          font-size: .9rem !important;
          line-height: 1.35 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-submit {
          min-height: 44px !important;
          margin-top: .05rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-share {
          border: 0 !important;
          background: transparent !important;
          padding: .2rem 0 0 !important;
          gap: .52rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-share p {
          text-align: center !important;
          color: var(--vtco-panel-muted) !important;
          letter-spacing: .06em !important;
          text-transform: uppercase !important;
          font-size: .64rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-share div {
          justify-content: center !important;
          gap: .5rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-share a {
          width: 42px !important;
          height: 42px !important;
          padding: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 1px solid rgba(36, 35, 32, .18) !important;
          background: rgba(255, 255, 255, .32) !important;
          color: var(--vtco-panel-text) !important;
          font-size: 0 !important;
          line-height: 0 !important;
          text-decoration: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-share a svg {
          width: 19px !important;
          height: 19px !important;
          stroke: currentColor !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-share a span {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-review-card {
          background: transparent !important;
          border: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-review-head > span,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-stars button[data-vtco-active="1"] {
          color: #ec8a82 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-stars button {
          color: rgba(246, 232, 200, .40) !important;
          background: transparent !important;
          border: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-review-textarea {
          border-color: rgba(198, 164, 93, .30) !important;
          background: rgba(8, 6, 4, .46) !important;
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-review-share a {
          border-color: rgba(198, 164, 93, .30) !important;
          background: rgba(8, 6, 4, .48) !important;
          color: #f6e8c8 !important;
        }



        /* PMD_VELVET_PAID_HEADER_TIMER_V6
           Paid card: title belongs in header; ETA timer matches the order-received timer style.
        */
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-title-wrap,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-title-wrap h2 {
          display: block !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-head {
          min-height: auto !important;
          padding: 1.35rem 1.45rem 1.15rem !important;
          align-items: flex-start !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-head h2 {
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
          font-size: clamp(2.05rem, 7.2vw, 3.15rem) !important;
          font-weight: 900 !important;
          line-height: .94 !important;
          letter-spacing: -.055em !important;
          text-transform: none !important;
          max-width: 12rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-body {
          padding-top: 1.05rem !important;
          gap: .92rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time-wrap {
          display: flex !important;
          justify-content: center !important;
          align-items: center !important;
          margin: .25rem 0 .55rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .42rem !important;
          font-style: normal !important;
          color: rgba(36, 35, 32, .86) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .86) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time svg {
          width: 1.05rem !important;
          height: 1.05rem !important;
          stroke: currentColor !important;
          opacity: .82 !important;
          flex: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time strong {
          font-size: 1.72rem !important;
          font-weight: 900 !important;
          line-height: .92 !important;
          letter-spacing: -.04em !important;
          color: #242320 !important;
          -webkit-text-fill-color: #242320 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time span {
          font-size: .82rem !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
          transform: translateY(.08rem) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-note {
          margin-top: -.15rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paid-time {
          color: rgba(246, 232, 200, .82) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .82) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paid-time strong {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paid-time span {
          color: #ec8a82 !important;
          -webkit-text-fill-color: #ec8a82 !important;
        }



        /* PMD_VELVET_PAID_COMPACT_ROBOTO_V7
           Compact paid confirmation and Roboto typography in isolated Velvet checkout.
        */
        html body .vtco-overlay[data-vtco-root="1"],
        html body .vtco-overlay[data-vtco-root="1"] *:not(svg):not(path):not(circle):not(polyline):not(line):not(rect):not(polygon) {
          font-family: "Roboto", Arial, Helvetica, sans-serif !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-note {
          display: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-head {
          padding: 1.12rem 1.35rem .95rem !important;
          min-height: auto !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-head h2 {
          font-size: clamp(1.95rem, 6.3vw, 2.72rem) !important;
          line-height: .98 !important;
          letter-spacing: -.045em !important;
          max-width: 13.8rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-body {
          padding-top: .82rem !important;
          gap: .78rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time-wrap {
          margin: .08rem 0 .32rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-total-box {
          margin-top: .05rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-card {
          padding-top: .45rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-powered-by {
          padding-top: .05rem !important;
        }


        /* PMD_VELVET_INLINE_PAYMENT_ICONS_V1
           Fast, no-network payment method marks. Replaces PNG/SVG image requests.
           Light/dark mode is handled by currentColor and theme variables.
        */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile {
          overflow: hidden !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-width: 2.75rem !important;
          height: 2rem !important;
          color: #242320 !important;
          -webkit-text-fill-color: currentColor !important;
          line-height: 1 !important;
          user-select: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark svg {
          display: block !important;
          width: 4.2rem !important;
          height: 2.55rem !important;
          fill: none !important;
          stroke: currentColor !important;
          stroke-width: 3.2 !important;
          stroke-linecap: round !important;
          stroke-linejoin: round !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-card svg {
          color: #32445f !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-apple {
          gap: .18rem !important;
          font-size: 2.05rem !important;
          font-weight: 800 !important;
          letter-spacing: -.07em !important;
          color: #050505 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-apple-symbol {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Symbol", sans-serif !important;
          font-size: 2.18rem !important;
          transform: translateY(-.02rem) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-google {
          gap: .25rem !important;
          font-size: 1.92rem !important;
          font-weight: 600 !important;
          letter-spacing: -.04em !important;
          color: #69707d !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-google-g {
          width: 1.85rem !important;
          height: 1.85rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: 999px !important;
          background:
            conic-gradient(from -35deg, #4285f4 0 25%, #34a853 0 45%, #fbbc05 0 68%, #ea4335 0 83%, #4285f4 0 100%) !important;
          color: #ffffff !important;
          font-weight: 900 !important;
          font-size: 1.32rem !important;
          letter-spacing: -.12em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-google-g i {
          font-style: normal !important;
          -webkit-text-fill-color: #fff !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-wero {
          font-size: 1.88rem !important;
          font-weight: 950 !important;
          letter-spacing: -.12em !important;
          color: #141414 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-wero b {
          font-weight: 950 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-wero b:first-child {
          color: #111111 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-wero b:last-child {
          color: #202020 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-paypal {
          gap: .35rem !important;
          color: #173a87 !important;
          font-size: 1.25rem !important;
          font-weight: 850 !important;
          letter-spacing: -.05em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-paypal span {
          width: 1.95rem !important;
          height: 1.95rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: linear-gradient(135deg, #1f4aa8, #179bd7) !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
          border-radius: .18rem !important;
          transform: skew(-7deg) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-cash svg {
          color: #1b1b1b !important;
          width: 4rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-text {
          max-width: 100% !important;
          font-size: .88rem !important;
          font-weight: 900 !important;
          letter-spacing: .06em !important;
          text-transform: uppercase !important;
          color: #242320 !important;
          text-align: center !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: currentColor !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-card svg,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-cash svg,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-wero,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-wero b,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-text {
          color: #f6e8c8 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-apple {
          color: #ffffff !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-google {
          color: rgba(246, 232, 200, .74) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-paypal {
          color: #8fc6ff !important;
        }



        /* PMD_VELVET_INLINE_PAYMENT_ICONS_V3
           Compact premium payment method marks. Overrides the earlier oversized v1 safely.
        */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .55rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile {
          min-height: 3.25rem !important;
          height: 3.25rem !important;
          padding: .35rem .45rem !important;
          overflow: hidden !important;
          background: rgba(255, 255, 255, .38) !important;
          border-color: rgba(36, 35, 32, .20) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile[data-vtco-active="1"] {
          border-color: rgba(184, 93, 89, .78) !important;
          background: rgba(184, 93, 89, .065) !important;
          box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .70) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile .vtco-paymark {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          height: auto !important;
          min-height: 1.45rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .34rem !important;
          color: #242320 !important;
          -webkit-text-fill-color: currentColor !important;
          line-height: 1 !important;
          transform: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile .vtco-paymark svg {
          width: 1.34rem !important;
          height: 1.34rem !important;
          display: block !important;
          fill: none !important;
          stroke: currentColor !important;
          stroke-width: 1.75 !important;
          stroke-linecap: round !important;
          stroke-linejoin: round !important;
          flex: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile .vtco-paymark-label {
          display: inline-block !important;
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          font-size: .82rem !important;
          font-weight: 850 !important;
          letter-spacing: -.025em !important;
          text-transform: none !important;
          white-space: nowrap !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-symbol {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Symbol", sans-serif !important;
          font-size: 1.06rem !important;
          font-weight: 800 !important;
          line-height: .9 !important;
          color: #050505 !important;
          -webkit-text-fill-color: #050505 !important;
          transform: translateY(-.035rem) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-apple .vtco-paymark-label {
          font-size: .96rem !important;
          font-weight: 900 !important;
          letter-spacing: -.04em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-g {
          width: 1.08rem !important;
          height: 1.08rem !important;
          border-radius: 50% !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex: none !important;
          background:
            conic-gradient(from -35deg, #4285f4 0 25%, #34a853 0 45%, #fbbc05 0 68%, #ea4335 0 83%, #4285f4 0 100%) !important;
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          font-size: .72rem !important;
          font-weight: 950 !important;
          letter-spacing: -.12em !important;
          padding-right: .05rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-google .vtco-paymark-label {
          color: #69707d !important;
          -webkit-text-fill-color: #69707d !important;
          font-size: .95rem !important;
          font-weight: 800 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-card {
          color: #2f3d52 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-wero .vtco-paymark-label {
          font-size: .98rem !important;
          font-weight: 950 !important;
          letter-spacing: -.07em !important;
          text-transform: lowercase !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-p {
          width: 1.08rem !important;
          height: 1.34rem !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-radius: .14rem !important;
          background: linear-gradient(135deg, #1f4aa8, #179bd7) !important;
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          font-weight: 950 !important;
          font-size: .82rem !important;
          transform: skew(-6deg) !important;
          flex: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-paypal .vtco-paymark-label {
          color: #173a87 !important;
          -webkit-text-fill-color: #173a87 !important;
          font-size: .82rem !important;
          font-weight: 900 !important;
          letter-spacing: -.045em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-cash {
          color: #242320 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-cash svg {
          width: 1.62rem !important;
          height: 1.62rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-text .vtco-paymark-label {
          font-size: .70rem !important;
          font-weight: 900 !important;
          letter-spacing: .05em !important;
          text-transform: uppercase !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-method-tile {
          background: rgba(8, 6, 4, .44) !important;
          border-color: rgba(198, 164, 93, .28) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-method-tile[data-vtco-active="1"] {
          border-color: rgba(236, 138, 130, .78) !important;
          background: rgba(184, 93, 89, .14) !important;
          box-shadow: inset 0 -2px 0 rgba(236, 138, 130, .72) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-method-tile .vtco-paymark,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-card,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-cash,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-wero .vtco-paymark-label,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-text .vtco-paymark-label {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-symbol,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-apple .vtco-paymark-label {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-google .vtco-paymark-label {
          color: rgba(246, 232, 200, .74) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .74) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-paypal .vtco-paymark-label {
          color: #8fc6ff !important;
          -webkit-text-fill-color: #8fc6ff !important;
        }



        /* PMD_VELVET_PAYMENT_ICONS_PREMIUM_V4_FINAL
           Final compact premium payment marks. Fixes old v1 PayPal span override.
           No image requests. Works in light and dark mode.
        */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .55rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile {
          height: 3.05rem !important;
          min-height: 3.05rem !important;
          padding: .25rem .4rem !important;
          background: rgba(255, 255, 255, .34) !important;
          border: 1px solid rgba(36, 35, 32, .18) !important;
          box-shadow: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile[data-vtco-active="1"] {
          border-color: rgba(184, 93, 89, .82) !important;
          background: rgba(184, 93, 89, .055) !important;
          box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .78) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile .vtco-paymark {
          width: 100% !important;
          height: 100% !important;
          min-width: 0 !important;
          min-height: 0 !important;
          max-width: 100% !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .32rem !important;
          color: #252321 !important;
          -webkit-text-fill-color: currentColor !important;
          line-height: 1 !important;
          transform: none !important;
          overflow: hidden !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile .vtco-paymark svg {
          width: 1.18rem !important;
          height: 1.18rem !important;
          min-width: 1.18rem !important;
          display: block !important;
          fill: none !important;
          stroke: currentColor !important;
          stroke-width: 1.75 !important;
          stroke-linecap: round !important;
          stroke-linejoin: round !important;
          flex: 0 0 auto !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile .vtco-paymark-label {
          display: inline !important;
          width: auto !important;
          height: auto !important;
          min-width: 0 !important;
          max-width: calc(100% - 1.45rem) !important;
          padding: 0 !important;
          margin: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          transform: none !important;
          color: currentColor !important;
          -webkit-text-fill-color: currentColor !important;
          font-size: .78rem !important;
          font-weight: 850 !important;
          letter-spacing: -.025em !important;
          text-transform: none !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          line-height: 1 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-symbol {
          width: auto !important;
          height: auto !important;
          background: transparent !important;
          border-radius: 0 !important;
          transform: translateY(-.03rem) !important;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI Symbol", sans-serif !important;
          font-size: 1.05rem !important;
          font-weight: 800 !important;
          color: #050505 !important;
          -webkit-text-fill-color: #050505 !important;
          line-height: 1 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-apple .vtco-paymark-label {
          font-size: .88rem !important;
          font-weight: 900 !important;
          letter-spacing: -.04em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-g {
          width: 1.02rem !important;
          height: 1.02rem !important;
          min-width: 1.02rem !important;
          padding: 0 !important;
          border-radius: 50% !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex: 0 0 auto !important;
          background:
            conic-gradient(from -35deg, #4285f4 0 25%, #34a853 0 45%, #fbbc05 0 68%, #ea4335 0 83%, #4285f4 0 100%) !important;
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
          font-size: .68rem !important;
          font-weight: 950 !important;
          letter-spacing: -.12em !important;
          line-height: 1 !important;
          transform: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-google .vtco-paymark-label {
          color: #69707d !important;
          -webkit-text-fill-color: #69707d !important;
          font-size: .86rem !important;
          font-weight: 800 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-card {
          color: #2f3d52 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-card .vtco-paymark-label {
          font-size: .78rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-wero .vtco-paymark-label {
          max-width: 100% !important;
          font-size: .9rem !important;
          font-weight: 950 !important;
          letter-spacing: -.065em !important;
          text-transform: lowercase !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile .vtco-paymark-paypal {
          gap: .28rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile .vtco-paymark-paypal .vtco-paymark-p {
          width: 1.02rem !important;
          height: 1.25rem !important;
          min-width: 1.02rem !important;
          padding: 0 !important;
          margin: 0 !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border: 0 !important;
          border-radius: .13rem !important;
          background: linear-gradient(135deg, #1f4aa8, #179bd7) !important;
          box-shadow: none !important;
          color: #ffffff !important;
          -webkit-text-fill-color: #ffffff !important;
          font-weight: 950 !important;
          font-size: .78rem !important;
          line-height: 1 !important;
          letter-spacing: -.05em !important;
          transform: skew(-6deg) !important;
          flex: 0 0 auto !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-method-tile .vtco-paymark-paypal .vtco-paymark-label {
          width: auto !important;
          height: auto !important;
          min-width: 0 !important;
          max-width: 3.2rem !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          box-shadow: none !important;
          transform: none !important;
          color: #173a87 !important;
          -webkit-text-fill-color: #173a87 !important;
          font-size: .78rem !important;
          font-weight: 900 !important;
          letter-spacing: -.045em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-cash {
          color: #242320 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-cash svg {
          width: 1.35rem !important;
          height: 1.35rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-text .vtco-paymark-label {
          max-width: 100% !important;
          font-size: .66rem !important;
          font-weight: 900 !important;
          letter-spacing: .045em !important;
          text-transform: uppercase !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-method-tile {
          background: rgba(8, 6, 4, .44) !important;
          border-color: rgba(198, 164, 93, .28) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-method-tile[data-vtco-active="1"] {
          border-color: rgba(236, 138, 130, .78) !important;
          background: rgba(184, 93, 89, .14) !important;
          box-shadow: inset 0 -2px 0 rgba(236, 138, 130, .72) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-method-tile .vtco-paymark,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-card,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-cash,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-wero .vtco-paymark-label,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-text .vtco-paymark-label {
          color: #f6e8c8 !important;
          -webkit-text-fill-color: #f6e8c8 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-symbol,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-apple .vtco-paymark-label {
          color: #fff !important;
          -webkit-text-fill-color: #fff !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-google .vtco-paymark-label {
          color: rgba(246, 232, 200, .74) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .74) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-paymark-paypal .vtco-paymark-label {
          color: #8fc6ff !important;
          -webkit-text-fill-color: #8fc6ff !important;
        }



        /* PMD_VELVET_CHECKOUT_TYPOGRAPHY_SYSTEM_V1
           Checkout typography scale. Keeps every checkout card consistent.
           Main modal title = large; section titles/buttons = uppercase;
           labels/body/details = readable; numbers/prices = tabular.
        */
        html body .vtco-overlay[data-vtco-root="1"],
        html body .vtco-overlay[data-vtco-root="1"] * {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head h2 {
          font-size: var(--pmd-text-modal-title, clamp(2rem, 6.6vw, 3rem)) !important;
          line-height: .96 !important;
          font-weight: 900 !important;
          letter-spacing: -.055em !important;
          text-transform: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-eyebrow,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-pill,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-chip,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-meta {
          font-size: var(--pmd-text-caption, .76rem) !important;
          line-height: 1.1 !important;
          font-weight: 800 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-section-title,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-summary h3,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-methods h3,
        html body .vtco-overlay[data-vtco-root="1"] h3.vtco-section-title {
          font-size: var(--pmd-text-section-title, .94rem) !important;
          line-height: 1.12 !important;
          font-weight: 900 !important;
          letter-spacing: .035em !important;
          text-transform: uppercase !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-line span,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box span,
        html body .vtco-overlay[data-vtco-root="1"] label,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-label {
          font-size: var(--pmd-text-label, .88rem) !important;
          line-height: 1.25 !important;
          font-weight: 800 !important;
          letter-spacing: -.012em !important;
          text-transform: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-line strong,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box strong,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-item-price,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-price,
        html body .vtco-overlay[data-vtco-root="1"] [data-vtco-money] {
          font-size: var(--pmd-text-price, 1rem) !important;
          line-height: 1.1 !important;
          font-weight: 850 !important;
          letter-spacing: -.02em !important;
          font-variant-numeric: tabular-nums !important;
          font-feature-settings: "tnum" 1, "kern" 1 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-item-name,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head h3,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-copy-hero p {
          font-size: var(--pmd-text-card-title, 1rem) !important;
          line-height: 1.18 !important;
          font-weight: 850 !important;
          letter-spacing: -.018em !important;
          text-transform: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] p,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-muted,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-copy,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head p,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-note {
          font-size: var(--pmd-text-body, .94rem) !important;
          line-height: 1.46 !important;
          font-weight: 450 !important;
          letter-spacing: -.01em !important;
          text-transform: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn,
        html body .vtco-overlay[data-vtco-root="1"] button[data-vtco-button],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-apply,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-submit {
          font-size: var(--pmd-text-button, .80rem) !important;
          line-height: 1.12 !important;
          font-weight: 850 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-field,
        html body .vtco-overlay[data-vtco-root="1"] input,
        html body .vtco-overlay[data-vtco-root="1"] textarea,
        html body .vtco-overlay[data-vtco-root="1"] select {
          font-size: .94rem !important;
          line-height: 1.35 !important;
          font-weight: 550 !important;
          letter-spacing: -.012em !important;
          text-transform: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time {
          font-variant-numeric: tabular-nums !important;
          font-feature-settings: "tnum" 1, "kern" 1 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time strong,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time strong {
          font-size: 1.72rem !important;
          line-height: .92 !important;
          font-weight: 900 !important;
          letter-spacing: -.04em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time span,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time span {
          font-size: .82rem !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-label {
          font-size: .78rem !important;
          font-weight: 850 !important;
          letter-spacing: -.025em !important;
          text-transform: none !important;
        }


        /* PMD_VELVET_CHECKOUT_TITLE_SYSTEM_V2
           Final checkout title hierarchy across every Velvet checkout step.

           Rules:
           1. Modal/card header titles are the only BIG typography.
              They are uppercase, same weight, same tracking, same scale.
           2. Section titles are uppercase but small and consistent.
           3. Body labels are sentence case and readable.
           4. Prices/order numbers use tabular numbers and the same size.
           5. Buttons are uppercase with the same letter spacing everywhere.
        */

        html body .vtco-overlay[data-vtco-root="1"] {
          --vtco-title-size: clamp(2.05rem, 6.2vw, 2.72rem);
          --vtco-section-size: .94rem;
          --vtco-card-title-size: 1rem;
          --vtco-body-size: .92rem;
          --vtco-label-size: .88rem;
          --vtco-button-size: .80rem;
          --vtco-number-size: 1rem;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head {
          min-height: auto !important;
          align-items: flex-start !important;
          padding-top: 1.28rem !important;
          padding-bottom: 1.02rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap {
          display: block !important;
          min-width: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head h2,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2 {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--vtco-title-size) !important;
          line-height: .94 !important;
          font-weight: 900 !important;
          letter-spacing: -.055em !important;
          text-transform: uppercase !important;
          max-width: 15.5rem !important;
          margin: 0 !important;
          color: var(--vtco-panel-text) !important;
          -webkit-text-fill-color: var(--vtco-panel-text) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-eyebrow {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: .70rem !important;
          line-height: 1 !important;
          font-weight: 850 !important;
          letter-spacing: .16em !important;
          text-transform: uppercase !important;
          margin: 0 0 .34rem !important;
          color: #b85d59 !important;
          -webkit-text-fill-color: #b85d59 !important;
        }

        /* Submitted card intentionally uses its body success layout, so keep its header minimal. */
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-title-wrap,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-title-wrap h2 {
          display: none !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-head {
          grid-template-columns: 1fr 48px !important;
          min-height: 4.25rem !important;
          padding-top: 1.15rem !important;
          padding-bottom: .75rem !important;
        }

        /* Paid card keeps the same header title scale, but a little wider for two words. */
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-head h2 {
          max-width: 17rem !important;
        }

        /* Section titles: every mini-heading across review/payment/split/feedback. */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-section-title,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-summary h3,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-methods h3,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-card h3,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head h3,
        html body .vtco-overlay[data-vtco-root="1"] h3 {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--vtco-section-size) !important;
          line-height: 1.12 !important;
          font-weight: 900 !important;
          letter-spacing: .035em !important;
          text-transform: uppercase !important;
          margin-top: 0 !important;
          color: var(--vtco-panel-text) !important;
          -webkit-text-fill-color: var(--vtco-panel-text) !important;
        }

        /* Review/feedback question is a card title, not a section label. */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head h3 {
          font-size: var(--vtco-card-title-size) !important;
          line-height: 1.15 !important;
          letter-spacing: -.018em !important;
          text-transform: none !important;
        }

        /* Food/item names and status titles. */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-item-name,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-copy-hero p,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-text-block p {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--vtco-card-title-size) !important;
          line-height: 1.16 !important;
          font-weight: 850 !important;
          letter-spacing: -.018em !important;
          text-transform: none !important;
          color: var(--vtco-panel-text) !important;
          -webkit-text-fill-color: var(--vtco-panel-text) !important;
        }

        /* Normal copy/details: never uppercase. */
        html body .vtco-overlay[data-vtco-root="1"] p,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-muted,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-copy,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head p,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-note,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-helper,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-note {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--vtco-body-size) !important;
          line-height: 1.44 !important;
          font-weight: 450 !important;
          letter-spacing: -.01em !important;
          text-transform: none !important;
        }

        /* Row labels, totals labels, form labels. */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-line span,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box span,
        html body .vtco-overlay[data-vtco-root="1"] label,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-label {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--vtco-label-size) !important;
          line-height: 1.18 !important;
          font-weight: 800 !important;
          letter-spacing: -.012em !important;
          text-transform: none !important;
          color: var(--vtco-panel-text) !important;
          -webkit-text-fill-color: var(--vtco-panel-text) !important;
        }

        /* Numbers/prices/order IDs. */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-line strong,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box strong,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-item-price,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-price,
        html body .vtco-overlay[data-vtco-root="1"] [data-vtco-money] {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--vtco-number-size) !important;
          line-height: 1.1 !important;
          font-weight: 850 !important;
          letter-spacing: -.02em !important;
          font-variant-numeric: tabular-nums !important;
          font-feature-settings: "tnum" 1, "kern" 1 !important;
          color: var(--vtco-panel-text) !important;
          -webkit-text-fill-color: var(--vtco-panel-text) !important;
        }

        /* Buttons/tabs/chips: always uppercase and same visual rhythm. */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn,
        html body .vtco-overlay[data-vtco-root="1"] button[data-vtco-button],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-apply,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-submit,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tab,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-chip {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: var(--vtco-button-size) !important;
          line-height: 1.08 !important;
          font-weight: 850 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
        }

        /* Inputs stay readable, never uppercase. */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-field,
        html body .vtco-overlay[data-vtco-root="1"] input,
        html body .vtco-overlay[data-vtco-root="1"] textarea,
        html body .vtco-overlay[data-vtco-root="1"] select {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          font-size: .94rem !important;
          line-height: 1.35 !important;
          font-weight: 550 !important;
          letter-spacing: -.012em !important;
          text-transform: none !important;
        }

        /* ETA timer is special and must match every state that uses it. */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time {
          font-family: var(--pmd-font-sans, "Roboto", Inter, ui-sans-serif, system-ui, sans-serif) !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: .42rem !important;
          font-style: normal !important;
          font-variant-numeric: tabular-nums !important;
          font-feature-settings: "tnum" 1, "kern" 1 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time strong,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time strong {
          font-size: 1.72rem !important;
          line-height: .92 !important;
          font-weight: 900 !important;
          letter-spacing: -.04em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time span,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time span {
          font-size: .82rem !important;
          font-weight: 900 !important;
          line-height: 1 !important;
          letter-spacing: .13em !important;
          text-transform: uppercase !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-paymark-label {
          font-size: .78rem !important;
          font-weight: 850 !important;
          letter-spacing: -.025em !important;
          text-transform: none !important;
        }

        /* Mobile tightening: prevent huge header titles from feeling different per card. */
        @media (max-width: 390px) {
          html body .vtco-overlay[data-vtco-root="1"] {
            --vtco-title-size: clamp(1.92rem, 7.4vw, 2.35rem);
            --vtco-section-size: .90rem;
            --vtco-card-title-size: .96rem;
            --vtco-body-size: .88rem;
            --vtco-label-size: .84rem;
            --vtco-button-size: .76rem;
          }

          html body .vtco-overlay[data-vtco-root="1"] .vtco-head h2,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2 {
            max-width: 13.7rem !important;
          }

          html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-head h2 {
            max-width: 14.8rem !important;
          }
        }


        /* PMD_VELVET_CHECKOUT_TYPOGRAPHY_DOWNSCALE_V3
           Downscale Velvet checkout typography after v2.
           Goal: same hierarchy, less oversized on waiter/note/checkout/payment/split cards.
        */
        html body .vtco-overlay[data-vtco-root="1"] {
          --vtco-title-size: clamp(1.68rem, 5.15vw, 2.22rem);
          --vtco-section-size: .88rem;
          --vtco-card-title-size: .94rem;
          --vtco-body-size: .88rem;
          --vtco-label-size: .84rem;
          --vtco-button-size: .75rem;
          --vtco-number-size: .94rem;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head {
          padding-top: 1.12rem !important;
          padding-bottom: .88rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-head h2,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2 {
          font-size: var(--vtco-title-size) !important;
          line-height: .96 !important;
          letter-spacing: -.045em !important;
          max-width: 14.2rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="paid"] .vtco-head h2 {
          max-width: 15.1rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-eyebrow {
          font-size: .66rem !important;
          letter-spacing: .15em !important;
          margin-bottom: .28rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-section-title,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-summary h3,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-payment-methods h3,
        html body .vtco-overlay[data-vtco-root="1"] h3 {
          font-size: var(--vtco-section-size) !important;
          line-height: 1.12 !important;
          letter-spacing: .032em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head h3,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-item-name,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-copy-hero p,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-text-block p {
          font-size: var(--vtco-card-title-size) !important;
          line-height: 1.16 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] p,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-muted,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-copy,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-head p,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-helper,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-note {
          font-size: var(--vtco-body-size) !important;
          line-height: 1.42 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-line span,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box span,
        html body .vtco-overlay[data-vtco-root="1"] label,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-label {
          font-size: var(--vtco-label-size) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-line strong,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-total-box strong,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-item-price,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-price,
        html body .vtco-overlay[data-vtco-root="1"] [data-vtco-money] {
          font-size: var(--vtco-number-size) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-btn,
        html body .vtco-overlay[data-vtco-root="1"] button[data-vtco-button],
        html body .vtco-overlay[data-vtco-root="1"] .vtco-apply,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-review-submit,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tab,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-chip {
          font-size: var(--vtco-button-size) !important;
          letter-spacing: .12em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-field,
        html body .vtco-overlay[data-vtco-root="1"] input,
        html body .vtco-overlay[data-vtco-root="1"] textarea,
        html body .vtco-overlay[data-vtco-root="1"] select {
          font-size: .88rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time strong,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time strong {
          font-size: 1.48rem !important;
          letter-spacing: -.035em !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-status-time span,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-paid-time span {
          font-size: .74rem !important;
          letter-spacing: .12em !important;
        }

        @media (max-width: 390px) {
          html body .vtco-overlay[data-vtco-root="1"] {
            --vtco-title-size: clamp(1.58rem, 6.25vw, 2rem);
            --vtco-section-size: .84rem;
            --vtco-card-title-size: .90rem;
            --vtco-body-size: .84rem;
            --vtco-label-size: .80rem;
            --vtco-button-size: .72rem;
            --vtco-number-size: .90rem;
          }

          html body .vtco-overlay[data-vtco-root="1"] .vtco-head h2,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-title-wrap h2 {
            max-width: 12.7rem !important;
          }
        }


        /* PMD_VELVET_SUBMITTED_TITLE_VISIBLE_V4
           Fix submitted/order-received card title being hidden by previous title-system CSS.
           Header should show: "We received your order." and timer stays below the divider.
        */
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-title-wrap,
        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-title-wrap h2,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-panel:has(main[data-vtco-step="submitted"]) .vtco-title-wrap,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-panel:has(main[data-vtco-step="submitted"]) .vtco-title-wrap h2,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-content:has(main[data-vtco-step="submitted"]) .vtco-title-wrap,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-content:has(main[data-vtco-step="submitted"]) .vtco-title-wrap h2 {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-head,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-panel:has(main[data-vtco-step="submitted"]) .vtco-head,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-content:has(main[data-vtco-step="submitted"]) .vtco-head {
          min-height: auto !important;
          grid-template-columns: minmax(0, 1fr) 48px !important;
          align-items: flex-start !important;
          padding: 1.12rem 1.32rem .92rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-head h2,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-panel:has(main[data-vtco-step="submitted"]) .vtco-head h2,
        html body .vtco-overlay[data-vtco-root="1"] .vtco-content:has(main[data-vtco-step="submitted"]) .vtco-head h2 {
          font-size: clamp(1.62rem, 5vw, 2.08rem) !important;
          line-height: .98 !important;
          font-weight: 900 !important;
          letter-spacing: -.045em !important;
          text-transform: none !important;
          max-width: 13.4rem !important;
          margin: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] main[data-vtco-step="submitted"].vtco-body {
          padding-top: 1.18rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] main[data-vtco-step="submitted"] .vtco-status-copy-hero {
          margin-top: .15rem !important;
          margin-bottom: 1.05rem !important;
        }

        @media (max-width: 390px) {
          html body .vtco-overlay[data-vtco-root="1"][data-vtco-step="submitted"] .vtco-head h2,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-panel:has(main[data-vtco-step="submitted"]) .vtco-head h2,
          html body .vtco-overlay[data-vtco-root="1"] .vtco-content:has(main[data-vtco-step="submitted"]) .vtco-head h2 {
            font-size: clamp(1.48rem, 6vw, 1.9rem) !important;
            max-width: 12rem !important;
          }
        }


        /* PMD_VELVET_TIP_BUTTONS_EURO_V2
           Tip buttons must always be visible: 0%, 5%, 10%.
           Clicking a preset writes the calculated EUR amount into the custom field.
        */
        html body .vtco-overlay[data-vtco-root="1"] .vtco-tip-grid {
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: .55rem !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-tip-grid .vtco-tip-preset {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          min-height: 3rem !important;
          height: 3rem !important;
          width: 100% !important;
          opacity: 1 !important;
          visibility: visible !important;
          pointer-events: auto !important;
          color: var(--vtco-panel-text) !important;
          -webkit-text-fill-color: var(--vtco-panel-text) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-tip-grid .vtco-tip-preset[data-vtco-active="1"] {
          border-color: rgba(184, 93, 89, .84) !important;
          background: rgba(184, 93, 89, .075) !important;
          box-shadow: inset 0 -2px 0 rgba(184, 93, 89, .76) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-tip-custom-wrap {
          grid-column: 1 / -1 !important;
          display: grid !important;
          grid-template-columns: 2.35rem minmax(0, 1fr) !important;
          align-items: stretch !important;
          min-height: 3rem !important;
          border: 1px solid rgba(36, 35, 32, .20) !important;
          background: rgba(255, 255, 255, .30) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-tip-custom-wrap > span {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          border-right: 1px solid rgba(36, 35, 32, .16) !important;
          color: rgba(36, 35, 32, .58) !important;
          -webkit-text-fill-color: rgba(36, 35, 32, .58) !important;
          font-weight: 850 !important;
          font-size: .88rem !important;
          font-variant-numeric: tabular-nums !important;
        }

        html body .vtco-overlay[data-vtco-root="1"] .vtco-tip-custom-wrap input.vtco-field {
          border: 0 !important;
          height: 100% !important;
          min-height: 3rem !important;
          padding-left: .85rem !important;
          background: transparent !important;
          border-radius: 0 !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-tip-custom-wrap {
          border-color: rgba(198, 164, 93, .28) !important;
          background: rgba(8, 6, 4, .38) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-tip-custom-wrap > span {
          border-right-color: rgba(198, 164, 93, .22) !important;
          color: rgba(246, 232, 200, .64) !important;
          -webkit-text-fill-color: rgba(246, 232, 200, .64) !important;
        }

        html body .vtco-overlay[data-vtco-root="1"][data-vtco-mode="dark"] .vtco-tip-grid .vtco-tip-preset[data-vtco-active="1"] {
          border-color: rgba(236, 138, 130, .78) !important;
          background: rgba(184, 93, 89, .16) !important;
          box-shadow: inset 0 -2px 0 rgba(236, 138, 130, .72) !important;
        }

      `}</style>


    </div>
  )
}

// PMD_VELVET_V46D_REPAIR_PAYMENT_GUARD_SYNTAX_20260618
