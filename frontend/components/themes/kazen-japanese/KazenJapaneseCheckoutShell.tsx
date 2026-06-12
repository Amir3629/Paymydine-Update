"use client"

import React from "react"
import { CheckCircle, CreditCard, Link2, Minus, Plus, QrCode } from "lucide-react"

import { formatCurrency } from "@/lib/currency"
import { iconForPayment } from "@/lib/payment-icons"
import { canRenderPaymentMethodDetail } from "@/features/checkout/payment-method-utils"

type DisplayItem = {
  item?: { name?: string; nameKey?: string; price?: number }
  name?: string
  quantity?: number
  price?: number
  amount?: number
  total?: number
  subtotal?: number
  __pmdDisplayName?: string
  __pmdDisplaySubtotal?: number
}

type KazenJapaneseCheckoutShellProps = any

const INK = "#242320"
const MUTED = "#77716a"
const PAPER = "#f7f3ec"
const PAPER_DEEP = "#f1ece2"
const LINE = "rgba(35, 34, 31, .18)"
const RED = "#b85d59"
const RED_SOFT = "rgba(184, 93, 89, .42)"

const getItemName = (item: any, fallback = "Item") =>
  String(item?.__pmdDisplayName || item?.name || item?.item?.name || item?.menu_name || item?.item_name || fallback)

const getQuantity = (item: any) => Math.max(1, Number(item?.quantity || item?.qty || 1))

const getAmount = (item: any) => {
  const quantity = getQuantity(item)
  const explicitTotal = Number(item?.__pmdDisplaySubtotal ?? item?.subtotal ?? item?.total ?? item?.amount)
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal
  const unit = Number(item?.price ?? item?.unit_price ?? item?.item?.price ?? 0)
  return Number.isFinite(unit) ? unit * quantity : 0
}

const methodIconSize = (code: string) => ({
  width: code === "wero" || code === "apple_pay" || code === "google_pay" ? 50 : code === "cod" || code === "paypal" ? 30 : 42,
  height: code === "wero" ? 29 : code === "apple_pay" || code === "google_pay" ? 28 : 24,
})

function money(value: number) {
  return formatCurrency(Number.isFinite(value) ? value : 0)
}

function PrimaryButton({ className = "", style, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      data-pmd-kazen-button="primary"
      data-pmd-no-observer-action="kazen-primary"
      data-pmd-render-safe-action="kazen-primary"
      style={{
        minHeight: "3.7rem",
        width: "100%",
        borderRadius: 0,
        border: `1px solid ${RED_SOFT}`,
        background: "transparent",
        color: RED,
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "0.84rem",
        fontWeight: 700,
        letterSpacing: "0.34em",
        textTransform: "uppercase",
        boxShadow: "none",
        ...style,
      }}
      className={`flex items-center justify-center px-5 py-3 transition hover:bg-[#fff8f2] disabled:opacity-50 ${className}`}
    >
      <span style={{ color: RED, WebkitTextFillColor: RED, opacity: 1 }}>{children}</span>
    </button>
  )
}

function SecondaryButton({ className = "", style, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      data-pmd-kazen-button="secondary"
      data-pmd-no-observer-action="kazen-secondary"
      data-pmd-render-safe-action="kazen-secondary"
      style={{
        minHeight: "3.35rem",
        width: "100%",
        borderRadius: 0,
        border: `1px solid ${LINE}`,
        background: "rgba(255,255,255,.18)",
        color: INK,
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "0.78rem",
        fontWeight: 650,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        boxShadow: "none",
        ...style,
      }}
      className={`flex items-center justify-center px-5 py-3 transition hover:bg-white/45 disabled:opacity-50 ${className}`}
    >
      <span style={{ color: INK, WebkitTextFillColor: INK, opacity: 1 }}>{children}</span>
    </button>
  )
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      data-pmd-kazen-card="1"
      className={`border p-5 backdrop-blur-xl ${className}`}
      style={{
        background: "linear-gradient(180deg, rgba(247,243,236,.97), rgba(242,237,228,.97))",
        borderColor: "rgba(35,34,31,.16)",
        color: INK,
        borderRadius: "1.7rem",
        boxShadow: "0 24px 70px rgba(36, 30, 24, .16), inset 0 1px 0 rgba(255,255,255,.72)",
      }}
    >
      {children}
    </section>
  )
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        color: INK,
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "1.55rem",
        fontWeight: 500,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
      }}
    >
      {children}
    </h2>
  )
}

function Rows({ items }: { items: DisplayItem[] }) {
  return (
    <div className="space-y-2">
      {(items || []).map((item, index) => (
        <div
          key={`${getItemName(item)}-${index}`}
          className="flex items-center justify-between gap-3 border px-4 py-3"
          style={{ borderColor: LINE, background: "rgba(255,255,255,.26)", color: INK }}
        >
          <span className="min-w-0 truncate" style={{ color: INK, fontWeight: 650 }}>{getQuantity(item)}x {getItemName(item, `Item ${index + 1}`)}</span>
          <span className="shrink-0" style={{ color: INK, fontWeight: 800 }}>{money(getAmount(item))}</span>
        </div>
      ))}
    </div>
  )
}

function SplitMethodTabs({ splitMethod, chooseSplitMethod }: any) {
  const methods = [["equal", "Split equally"], ["items", "By order items"], ["shares", "By shares"]]
  return (
    <div className="grid grid-cols-3 gap-2">
      {methods.map(([method, label]) => (
        <button
          key={method}
          type="button"
          onClick={() => chooseSplitMethod(method)}
          className="border px-2 py-3 text-center text-[11px] font-bold uppercase tracking-[0.12em]"
          style={{ borderColor: splitMethod === method ? RED_SOFT : LINE, color: splitMethod === method ? RED : INK, background: splitMethod === method ? "rgba(184,93,89,.08)" : "transparent" }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PeopleStepper({ splitGuestCount, addSplitGuest, removeSplitGuest }: any) {
  return (
    <div className="flex items-center justify-between border px-4 py-3" style={{ borderColor: LINE, background: "rgba(255,255,255,.24)" }}>
      <span style={{ color: INK, fontFamily: "Georgia, serif", letterSpacing: ".12em", textTransform: "uppercase" }}>People</span>
      <div className="flex items-center gap-4">
        <button type="button" aria-label="Remove guest" disabled={splitGuestCount <= 2} onClick={removeSplitGuest} className="flex h-9 w-9 items-center justify-center border" style={{ borderColor: LINE, color: INK }}><Minus className="h-4 w-4" /></button>
        <span className="min-w-6 text-center text-lg font-bold" style={{ color: INK }}>{splitGuestCount}</span>
        <button type="button" aria-label="Add guest" disabled={splitGuestCount >= 10} onClick={addSplitGuest} className="flex h-9 w-9 items-center justify-center border" style={{ borderColor: LINE, color: INK }}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  )
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
    splitGuestCount,
    addSplitGuest,
    removeSplitGuest,
    splitMethod,
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
    canConfirmSplitMethod,
    splitGrandTotal = 0,
    updatePaymentTipPercentage,
    updatePaymentCustomTip,
    onPaymentLinks,
    onQrShare,
    isDarkTheme,
  } = props

  const orderTotal = Number(submittedSnapshot?.remainingAmount ?? submittedSnapshot?.orderTotal ?? submittedSnapshot?.total ?? tableDraftTotal ?? finalTotal ?? 0)
  const safeEqualSplitPeople = Array.isArray(equalSplitPeople) ? equalSplitPeople : []

  const paymentHeader = selectedSplitPerson ? `${selectedSplitPerson.name}'s share` : "Order total"

  let content: React.ReactNode = null

  if (checkoutStep === "review" && hasPersonalItems) {
    content = (
      <Card className="space-y-5">
        <Title>My Order</Title>
        <Rows items={personalItems} />
        <div className="space-y-3 border-t pt-4" style={{ borderColor: LINE }}>
          <div className="flex justify-between" style={{ color: MUTED }}><span>Subtotal</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between text-lg font-bold" style={{ color: INK }}><span>Total</span><span>{money(finalTotal)}</span></div>
        </div>
        <div className="space-y-3">
          <PrimaryButton onClick={handleConfirmMyItems}>Call to order</PrimaryButton>
          <SecondaryButton onClick={onClose}>Continue ordering</SecondaryButton>
        </div>
      </Card>
    )
  } else if (checkoutStep === "review" && tableDraft) {
    content = (
      <Card className="space-y-5">
        <Title>Table Order</Title>
        <Rows items={tableDraftItems} />
        <div className="flex justify-between border-t pt-4 text-lg font-bold" style={{ borderColor: LINE, color: INK }}><span>Order Total</span><span>{money(tableDraftTotal)}</span></div>
        <div className="space-y-3">
          <PrimaryButton onClick={handleSubmitTableDraft}>Send to kitchen</PrimaryButton>
          <SecondaryButton onClick={onClose}>Continue ordering</SecondaryButton>
        </div>
      </Card>
    )
  } else if (checkoutStep === "submitted") {
    content = (
      <Card className="space-y-5 text-center">
        <div className="mx-auto flex h-20 w-20 flex-col items-center justify-center rounded-full border" style={{ borderColor: LINE, color: INK }}>
          <span className="text-2xl font-bold">{estimatedMinutes}</span>
          <span className="text-[10px] uppercase tracking-[0.22em]">min</span>
        </div>
        <div>
          <CheckCircle className="mx-auto mb-3 h-7 w-7" style={{ color: RED }} />
          <Title>Order Received</Title>
        </div>
        <div className="flex justify-between border px-4 py-3 text-lg font-bold" style={{ borderColor: LINE, color: INK }}><span>Total</span><span>{money(orderTotal)}</span></div>
        <Rows items={submittedItems} />
        <div className="space-y-3">
          <PrimaryButton onClick={() => setCheckoutStep("payment")}>Pay in full</PrimaryButton>
          <SecondaryButton onClick={() => startSplitFlow("equal")}>Split bill</SecondaryButton>
          <SecondaryButton onClick={onClose}>Continue ordering</SecondaryButton>
        </div>
      </Card>
    )
  } else if (checkoutStep === "payment") {
    content = (
      <div className="space-y-4">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border" style={{ borderColor: RED_SOFT, color: RED }}><CreditCard className="h-5 w-5" /></div>
            <div><Title>Payment</Title><p style={{ color: MUTED }}>Ready to pay?</p></div>
          </div>
          <div className="flex justify-between border px-4 py-3 text-lg font-bold" style={{ borderColor: LINE, color: INK }}><span>{paymentHeader}</span><span>{money(paymentPayableTotal)}</span></div>
          <div className="space-y-2 border p-4" style={{ borderColor: LINE }}>
            <div className="flex justify-between" style={{ color: MUTED }}><span>{selectedSplitPerson ? "Share amount" : "Items total"}</span><span>{money(paymentBaseAmount)}</span></div>
            {paymentTipAmount > 0 && <div className="flex justify-between" style={{ color: MUTED }}><span>Tip</span><span>{money(paymentTipAmount)}</span></div>}
            {paymentCouponDiscount > 0 && <div className="flex justify-between" style={{ color: RED }}><span>Coupon</span><span>-{money(paymentCouponDiscount)}</span></div>}
            <div className="flex justify-between border-t pt-3 text-lg font-bold" style={{ borderColor: LINE, color: INK }}><span>Payable total</span><span>{money(paymentPayableTotal)}</span></div>
          </div>
          {tipEnabled && (
            <div className="space-y-2">
              <div className="text-sm font-bold" style={{ color: INK }}>{selectedSplitPerson ? `${selectedSplitPerson.name}'s tip` : "Add tip"}</div>
              <div className="flex flex-wrap gap-2">
                {[0, ...tipPercentages.filter((p: number) => p !== 0)].map((percentage: number) => (
                  <button key={percentage} type="button" onClick={() => updatePaymentTipPercentage(percentage)} className="border px-4 py-2 text-sm font-bold" style={{ borderColor: paymentTipPercentage === percentage && !paymentCustomTip ? RED_SOFT : LINE, color: paymentTipPercentage === percentage && !paymentCustomTip ? RED : INK }}>{percentage}%</button>
                ))}
                <input type="number" min="0" step="0.01" value={paymentCustomTip} onChange={(event) => updatePaymentCustomTip(event.target.value)} placeholder="Custom" className="min-w-[110px] flex-1 border px-4 py-2 outline-none" style={{ borderColor: LINE, background: "rgba(255,255,255,.26)", color: INK }} />
              </div>
            </div>
          )}
          <div className="space-y-2">
            {!appliedCoupon || selectedSplitPerson ? (
              <div className="flex gap-2">
                <input type="text" value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="Coupon code" disabled={couponLoading} className="min-w-0 flex-1 border px-4 py-2 outline-none" style={{ borderColor: LINE, background: "rgba(255,255,255,.26)", color: INK }} />
                <button type="button" disabled={couponLoading || !String(couponCode || "").trim()} onClick={onApplyCoupon} className="border px-4 text-sm font-bold uppercase tracking-[0.12em]" style={{ borderColor: RED_SOFT, color: RED }}>{couponLoading ? "Checking" : "Apply"}</button>
              </div>
            ) : (
              <div className="flex items-center justify-between border px-4 py-2 text-sm" style={{ borderColor: LINE, color: INK }}>
                <span>{appliedCoupon.name || "Coupon"} {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
                <button type="button" onClick={onRemoveCoupon} style={{ color: RED }}>Remove</button>
              </div>
            )}
            {couponError && <p className="text-xs" style={{ color: RED }}>{couponError}</p>}
          </div>
        </Card>
        <Card className="space-y-4">
          <h3 className="text-center font-serif text-lg uppercase tracking-[0.28em]" style={{ color: INK }}>Payment methods</h3>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {loadingPayments ? <p style={{ color: MUTED }}>Loading payment methods...</p> : visiblePaymentMethods.length === 0 ? <p style={{ color: MUTED }}>No payment methods available</p> : visiblePaymentMethods.map((method: any) => {
              const size = methodIconSize(method.code)
              return (
                <button key={method.code} type="button" onClick={() => onPaymentMethodSelect(method.code)} className="flex h-16 w-24 items-center justify-center border" style={{ borderColor: selectedPaymentMethod === method.code ? RED_SOFT : LINE, background: selectedPaymentMethod === method.code ? "rgba(184,93,89,.08)" : "rgba(255,255,255,.22)" }}>
                  <img src={method.code === "card" ? (isDarkTheme ? "/images/payments/card-dark.svg" : "/images/payments/card-light.svg") : method.code === "paypal" ? "/images/payments/paypal.png" : method.code === "google_pay" ? "/images/payments/google_pay.png" : iconForPayment(method.code)} alt={method.name} width={size.width} height={size.height} className="object-contain" />
                </button>
              )
            })}
          </div>
          {canRenderPaymentMethodDetail(selectedPaymentMethod) && <div className="pt-2">{renderPaymentForm?.()}</div>}
          {renderPaymentButton?.()}
        </Card>
      </div>
    )
  } else if (checkoutStep === "split" || checkoutStep === "split-items" || checkoutStep === "split-shares") {
    content = (
      <Card className="space-y-5">
        <div><Title>{checkoutStep === "split-items" ? "Assign Items" : checkoutStep === "split-shares" ? "Set Shares" : "Split Bill"}</Title><p style={{ color: MUTED }}>Share {money(splitGrandTotal)} your way.</p></div>
        <SplitMethodTabs splitMethod={splitMethod} chooseSplitMethod={chooseSplitMethod} />
        <PeopleStepper splitGuestCount={splitGuestCount} addSplitGuest={addSplitGuest} removeSplitGuest={removeSplitGuest} />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {splitGuestProfiles.map((guest: any, index: number) => <span key={`${guest.name}-${index}`} className="inline-flex shrink-0 items-center gap-2 border px-3 py-1 text-sm" style={{ borderColor: LINE, color: INK }}>{guest.avatar} {guest.name}</span>)}
        </div>
        {splitMethod === "equal" && <div className="grid gap-2">{safeEqualSplitPeople.map((person: any) => <div key={person.id} className="flex justify-between border px-4 py-3 font-bold" style={{ borderColor: LINE, color: INK }}><span>{person.name}</span><span>{money(person.total)}</span></div>)}</div>}
        <PrimaryButton disabled={!canConfirmSplitMethod} onClick={goToSplitReview}>Review split</PrimaryButton>
      </Card>
    )
  } else if (checkoutStep === "split-review") {
    content = (
      <Card className="space-y-5">
        <div><Title>Review Split</Title><p style={{ color: MUTED }}>Choose a payer and continue to payment.</p></div>
        {activeSplitPeople.map((person: any) => (
          <div key={person.id} className="space-y-3 border p-4" style={{ borderColor: selectedSplitPersonId === person.id ? RED_SOFT : LINE, background: selectedSplitPersonId === person.id ? "rgba(184,93,89,.06)" : "transparent" }}>
            <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full border" style={{ borderColor: LINE }}>{person.avatar}</span><span className="font-bold" style={{ color: INK }}>{person.name}</span></div><span className="text-xs uppercase tracking-[0.12em]" style={{ color: MUTED }}>{person.status}</span></div>
            <div className="flex justify-between border-t pt-3 text-lg font-bold" style={{ borderColor: LINE, color: INK }}><span>Total</span><span>{money(person.total)}</span></div>
            {selectedSplitPersonId === person.id ? <PrimaryButton onClick={() => setCheckoutStep("payment")}>Pay my share</PrimaryButton> : <SecondaryButton onClick={() => setSelectedSplitPersonId(person.id)}>Select payer</SecondaryButton>}
          </div>
        ))}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SecondaryButton onClick={onPaymentLinks} className="gap-2"><Link2 className="h-4 w-4" /> Send payment link</SecondaryButton>
          <SecondaryButton onClick={onQrShare} className="gap-2"><QrCode className="h-4 w-4" /> Show QR/share link</SecondaryButton>
        </div>
      </Card>
    )
  }

  return (
    <div
      data-pmd-kazen-checkout-shell="1"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ background: "rgba(35, 31, 27, .22)" }}
    >
      <style>{`
        [data-pmd-kazen-checkout-shell="1"],
        [data-pmd-kazen-checkout-shell="1"] * { text-shadow: none !important; }
        [data-pmd-kazen-checkout-shell="1"] input::placeholder { color: rgba(36,35,32,.48) !important; opacity: 1 !important; }
        [data-pmd-kazen-checkout-shell="1"] button:disabled { opacity: .48 !important; }
      `}</style>
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-20 border px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]"
          style={{ borderColor: LINE, background: "rgba(247,243,236,.9)", color: INK }}
        >
          Close
        </button>
        {content}
      </div>
    </div>
  )
}
