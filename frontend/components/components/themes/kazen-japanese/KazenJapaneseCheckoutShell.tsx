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
  qty?: number
  price?: number
  unit_price?: number
  amount?: number
  total?: number
  subtotal?: number
  __pmdDisplayName?: string
  __pmdDisplaySubtotal?: number
}

type KazenJapaneseCheckoutShellProps = any

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

function PrimaryButton({ className = "", children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} data-pmd-kazen-button="primary" className={`kazen-checkout-button kazen-checkout-button-primary ${className}`}>
      <span>{children}</span>
    </button>
  )
}

function SecondaryButton({ className = "", children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...props} data-pmd-kazen-button="secondary" className={`kazen-checkout-button kazen-checkout-button-secondary ${className}`}>
      <span>{children}</span>
    </button>
  )
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`kazen-checkout-card ${className}`}>{children}</section>
}

function Title({ children }: { children: React.ReactNode }) {
  return <h2 className="kazen-checkout-title">{children}</h2>
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <div className="kazen-checkout-eyebrow">{children}</div>
}

function TotalLine({ label, value, strong = false, negative = false }: { label: string; value: React.ReactNode; strong?: boolean; negative?: boolean }) {
  return (
    <div className={`kazen-checkout-total-line ${strong ? "is-strong" : ""} ${negative ? "is-negative" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Rows({ items }: { items: DisplayItem[] }) {
  const list = Array.isArray(items) ? items : []

  if (!list.length) {
    return <div className="kazen-checkout-empty">No items in this bill yet.</div>
  }

  return (
    <div className="kazen-checkout-lines">
      {list.map((item, index) => (
        <div key={`${getItemName(item)}-${index}`} className="kazen-checkout-line">
          <div className="kazen-checkout-line-count">{getQuantity(item)}×</div>
          <div className="kazen-checkout-line-main">
            <strong>{getItemName(item, `Item ${index + 1}`)}</strong>
            <span>Seasonal kitchen item</span>
          </div>
          <strong className="kazen-checkout-line-price">{money(getAmount(item))}</strong>
        </div>
      ))}
    </div>
  )
}

function StepRail({ active }: { active: "review" | "submitted" | "payment" | "split" }) {
  const steps = [
    ["review", "Review"],
    ["submitted", "Order"],
    ["payment", "Payment"],
  ] as const

  return (
    <div className="kazen-checkout-steps" aria-label="Checkout steps">
      {steps.map(([key, label], index) => (
        <React.Fragment key={key}>
          <div className={`kazen-checkout-step ${active === key || (active === "split" && key === "payment") ? "is-active" : ""}`}>
            <span>{index + 1}</span>
            <strong>{label}</strong>
          </div>
          {index < steps.length - 1 ? <i /> : null}
        </React.Fragment>
      ))}
    </div>
  )
}

function BillSummary({ subtotal, total, paymentTipAmount = 0, paymentCouponDiscount = 0 }: { subtotal: number; total: number; paymentTipAmount?: number; paymentCouponDiscount?: number }) {
  return (
    <div className="kazen-checkout-summary">
      <TotalLine label="Subtotal" value={money(subtotal)} />
      {paymentTipAmount > 0 ? <TotalLine label="Tip" value={money(paymentTipAmount)} /> : null}
      {paymentCouponDiscount > 0 ? <TotalLine label="Coupon" value={`-${money(paymentCouponDiscount)}`} negative /> : null}
      <TotalLine label="Total" value={money(total)} strong />
    </div>
  )
}

function SplitMethodTabs({ splitMethod, chooseSplitMethod }: any) {
  const methods = [["equal", "Split equally"], ["items", "By order items"], ["shares", "By shares"]]
  return (
    <div className="kazen-checkout-method-tabs">
      {methods.map(([method, label]) => (
        <button key={method} type="button" onClick={() => chooseSplitMethod?.(method)} className={splitMethod === method ? "is-active" : ""}>
          {label}
        </button>
      ))}
    </div>
  )
}

function PeopleStepper({ splitGuestCount, addSplitGuest, removeSplitGuest }: any) {
  return (
    <div className="kazen-checkout-people">
      <span>People</span>
      <div>
        <button type="button" aria-label="Remove guest" disabled={splitGuestCount <= 2} onClick={removeSplitGuest}><Minus className="h-4 w-4" /></button>
        <strong>{splitGuestCount}</strong>
        <button type="button" aria-label="Add guest" disabled={splitGuestCount >= 10} onClick={addSplitGuest}><Plus className="h-4 w-4" /></button>
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
    sharePercents = [],
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
  const paymentHeader = selectedSplitPerson ? `${selectedSplitPerson.name}'s share` : "Bill total"
  const paymentTotal = Number(paymentPayableTotal || paymentBaseAmount || finalTotal || orderTotal || 0)
  const paymentBase = Number(paymentBaseAmount || subtotal || orderTotal || 0)
  const shellMode = isDarkTheme ? "dark" : "light"

  let content: React.ReactNode = null
  let step: "review" | "submitted" | "payment" | "split" = "review"

  if (checkoutStep === "review" && hasPersonalItems) {
    step = "review"
    content = (
      <Card className="space-y-5">
        <div>
          <Eyebrow>Personal bill</Eyebrow>
          <Title>My Order</Title>
        </div>
        <Rows items={personalItems} />
        <BillSummary subtotal={Number(subtotal || finalTotal || 0)} total={Number(finalTotal || subtotal || 0)} />
        <div className="kazen-checkout-actions">
          <PrimaryButton onClick={handleConfirmMyItems}>Call to order</PrimaryButton>
          <SecondaryButton onClick={onClose}>Continue ordering</SecondaryButton>
        </div>
      </Card>
    )
  } else if (checkoutStep === "review" && tableDraft) {
    step = "review"
    content = (
      <Card className="space-y-5">
        <div>
          <Eyebrow>Table bill</Eyebrow>
          <Title>Table Order</Title>
        </div>
        <Rows items={tableDraftItems} />
        <BillSummary subtotal={Number(tableDraftTotal || 0)} total={Number(tableDraftTotal || 0)} />
        <div className="kazen-checkout-actions">
          <PrimaryButton onClick={handleSubmitTableDraft}>Send to kitchen</PrimaryButton>
          <SecondaryButton onClick={onClose}>Continue ordering</SecondaryButton>
        </div>
      </Card>
    )
  } else if (checkoutStep === "submitted") {
    step = "submitted"
    content = (
      <Card className="space-y-5 text-center">
        <div className="kazen-checkout-time-badge"><strong>{estimatedMinutes}</strong><span>min</span></div>
        <CheckCircle className="mx-auto h-7 w-7 kazen-checkout-red" />
        <div><Eyebrow>Kitchen received</Eyebrow><Title>Order Received</Title></div>
        <BillSummary subtotal={Number(orderTotal || 0)} total={Number(orderTotal || 0)} />
        <Rows items={submittedItems} />
        <div className="kazen-checkout-actions">
          <PrimaryButton onClick={() => setCheckoutStep?.("payment")}>Pay in full</PrimaryButton>
          <SecondaryButton onClick={() => startSplitFlow?.("equal")}>Split bill</SecondaryButton>
          <SecondaryButton onClick={onClose}>Continue ordering</SecondaryButton>
        </div>
      </Card>
    )
  } else if (checkoutStep === "payment") {
    step = "payment"
    content = (
      <div className="space-y-4">
        <Card className="space-y-4">
          <div className="kazen-checkout-payment-head">
            <div><CreditCard className="h-5 w-5" /></div>
            <div><Eyebrow>Secure payment</Eyebrow><Title>Payment</Title><p>{paymentHeader}</p></div>
          </div>
          <BillSummary subtotal={paymentBase} total={paymentTotal} paymentTipAmount={Number(paymentTipAmount || 0)} paymentCouponDiscount={Number(paymentCouponDiscount || 0)} />

          {tipEnabled && (
            <div className="kazen-checkout-section">
              <h3>{selectedSplitPerson ? `${selectedSplitPerson.name}'s tip` : "Add tip"}</h3>
              <div className="kazen-checkout-tip-grid">
                {[0, ...tipPercentages.filter((p: number) => p !== 0)].map((percentage: number) => (
                  <button key={percentage} type="button" onClick={() => updatePaymentTipPercentage?.(percentage)} className={paymentTipPercentage === percentage && !paymentCustomTip ? "is-active" : ""}>{percentage}%</button>
                ))}
                <input type="number" min="0" step="0.01" value={paymentCustomTip || ""} onChange={(event) => updatePaymentCustomTip?.(event.target.value)} placeholder="Custom" />
              </div>
            </div>
          )}

          <div className="kazen-checkout-section">
            {!appliedCoupon || selectedSplitPerson ? (
              <div className="kazen-checkout-coupon-row">
                <input type="text" value={couponCode || ""} onChange={(event) => setCouponCode?.(event.target.value.toUpperCase())} placeholder="Coupon code" disabled={couponLoading} />
                <button type="button" disabled={couponLoading || !String(couponCode || "").trim()} onClick={onApplyCoupon}>{couponLoading ? "Checking" : "Apply"}</button>
              </div>
            ) : (
              <div className="kazen-checkout-applied-coupon">
                <span>{appliedCoupon.name || "Coupon"} {appliedCoupon.code ? `(${appliedCoupon.code})` : ""}</span>
                <button type="button" onClick={onRemoveCoupon}>Remove</button>
              </div>
            )}
            {couponError ? <p className="kazen-checkout-error">{couponError}</p> : null}
          </div>
        </Card>

        <Card className="space-y-4">
          <div className="text-center"><Eyebrow>Choose method</Eyebrow><Title>Payment Methods</Title></div>
          <div className="kazen-checkout-method-grid">
            {loadingPayments ? <p className="kazen-checkout-muted">Loading payment methods...</p> : visiblePaymentMethods.length === 0 ? <p className="kazen-checkout-muted">No payment methods available</p> : visiblePaymentMethods.map((method: any) => {
              const code = String(method?.code || method?.id || "")
              const size = methodIconSize(code)
              return (
                <button key={code || method?.name} type="button" onClick={() => onPaymentMethodSelect?.(code)} className={selectedPaymentMethod === code ? "is-active" : ""}>
                  <img src={code === "card" ? (isDarkTheme ? "/images/payments/card-dark.svg" : "/images/payments/card-light.svg") : code === "paypal" ? "/images/payments/paypal.png" : code === "google_pay" ? "/images/payments/google_pay.png" : iconForPayment(code)} alt={method.name || code} width={size.width} height={size.height} />
                </button>
              )
            })}
          </div>
          {canRenderPaymentMethodDetail(selectedPaymentMethod) ? <div className="kazen-checkout-rendered-form">{renderPaymentForm?.()}</div> : null}
          {renderPaymentButton?.()}
        </Card>
      </div>
    )
  } else if (checkoutStep === "split" || checkoutStep === "split-items" || checkoutStep === "split-shares") {
    step = "split"
    content = (
      <Card className="space-y-5">
        <div><Eyebrow>Shared bill</Eyebrow><Title>{checkoutStep === "split-items" ? "Assign Items" : checkoutStep === "split-shares" ? "Set Shares" : "Split Bill"}</Title><p className="kazen-checkout-muted">Share {money(splitGrandTotal)} your way.</p></div>
        <SplitMethodTabs splitMethod={splitMethod} chooseSplitMethod={chooseSplitMethod} />
        <PeopleStepper splitGuestCount={splitGuestCount} addSplitGuest={addSplitGuest} removeSplitGuest={removeSplitGuest} />
        <div className="kazen-checkout-guests">{splitGuestProfiles.map((guest: any, index: number) => <span key={`${guest.name}-${index}`}>{guest.avatar} {guest.name}</span>)}</div>
        {splitMethod === "equal" ? <div className="kazen-checkout-lines">{safeEqualSplitPeople.map((person: any) => <div key={person.id} className="kazen-checkout-line"><div className="kazen-checkout-line-main"><strong>{person.name}</strong><span>Equal share</span></div><strong className="kazen-checkout-line-price">{money(person.total)}</strong></div>)}</div> : null}
        <PrimaryButton disabled={!canConfirmSplitMethod} onClick={goToSplitReview}>Review split</PrimaryButton>
      </Card>
    )
  } else if (checkoutStep === "split-review") {
    step = "split"
    content = (
      <Card className="space-y-5">
        <div><Eyebrow>Shared bill</Eyebrow><Title>Review Split</Title><p className="kazen-checkout-muted">Choose a payer and continue to payment.</p></div>
        {activeSplitPeople.map((person: any) => (
          <div key={person.id} className={`kazen-checkout-split-person ${selectedSplitPersonId === person.id ? "is-active" : ""}`}>
            <div className="kazen-checkout-split-head"><span>{person.avatar}</span><strong>{person.name}</strong><em>{person.status}</em></div>
            <BillSummary subtotal={Number(person.total || 0)} total={Number(person.total || 0)} />
            {selectedSplitPersonId === person.id ? <PrimaryButton onClick={() => setCheckoutStep?.("payment")}>Pay my share</PrimaryButton> : <SecondaryButton onClick={() => setSelectedSplitPersonId?.(person.id)}>Select payer</SecondaryButton>}
          </div>
        ))}
        <div className="kazen-checkout-actions two">
          <SecondaryButton onClick={onPaymentLinks} className="gap-2"><Link2 className="h-4 w-4" /> Send payment link</SecondaryButton>
          <SecondaryButton onClick={onQrShare} className="gap-2"><QrCode className="h-4 w-4" /> Show QR/share link</SecondaryButton>
        </div>
      </Card>
    )
  }

  return (
    <div data-pmd-kazen-checkout-shell="1" data-kazen-checkout-mode={shellMode} className="kazen-checkout-overlay">
      <style>{`
        [data-pmd-kazen-checkout-shell="1"] {
          --kc-bg: rgba(8, 7, 5, .76);
          --kc-panel: rgba(14, 12, 9, .96);
          --kc-panel-soft: rgba(22, 18, 13, .86);
          --kc-ink: #f4e7c8;
          --kc-muted: #c9b78f;
          --kc-line: rgba(198,164,93,.30);
          --kc-line-strong: rgba(198,164,93,.48);
          --kc-red: #df685d;
          --kc-shadow: rgba(0,0,0,.58);
        }

        [data-kazen-checkout-mode="light"] {
          --kc-bg: rgba(36,31,27,.28);
          --kc-panel: rgba(251,248,242,.98);
          --kc-panel-soft: rgba(247,243,236,.96);
          --kc-ink: #242320;
          --kc-muted: #77716a;
          --kc-line: rgba(35,34,31,.16);
          --kc-line-strong: rgba(35,34,31,.26);
          --kc-red: #b85d59;
          --kc-shadow: rgba(36,30,24,.18);
        }

        [data-pmd-kazen-checkout-shell="1"],
        [data-pmd-kazen-checkout-shell="1"] * { box-sizing: border-box; text-shadow: none !important; }
        .kazen-checkout-overlay { position: fixed; inset: 0; z-index: 70; display: flex; align-items: center; justify-content: center; padding: 1rem; background: var(--kc-bg); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
        .kazen-checkout-scroll { position: relative; width: min(100%, 460px); max-height: min(91dvh, 820px); overflow-y: auto; padding: 1.35rem; border: 1px solid var(--kc-line-strong); background: linear-gradient(180deg, var(--kc-panel), var(--kc-panel-soft)); box-shadow: 0 28px 80px var(--kc-shadow), inset 0 1px 0 rgba(255,255,255,.08); color: var(--kc-ink); font-family: Georgia, "Times New Roman", serif; }
        .kazen-checkout-close { position: sticky; top: 0; z-index: 4; margin-left: auto; margin-bottom: .9rem; display: flex; min-height: 2.65rem; align-items: center; justify-content: center; border: 1px solid var(--kc-line); background: var(--kc-panel-soft); color: var(--kc-ink); padding: 0 .85rem; font-size: .68rem; font-weight: 700; letter-spacing: .2em; text-transform: uppercase; }
        .kazen-checkout-steps { display: grid; grid-template-columns: auto 1fr auto 1fr auto; align-items: center; gap: .55rem; margin-bottom: 1rem; }
        .kazen-checkout-step { display: inline-flex; align-items: center; gap: .45rem; color: var(--kc-muted); font-size: .66rem; letter-spacing: .14em; text-transform: uppercase; }
        .kazen-checkout-step span { display: grid; width: 1.55rem; height: 1.55rem; place-items: center; border: 1px solid var(--kc-line); color: var(--kc-muted); }
        .kazen-checkout-step.is-active, .kazen-checkout-step.is-active span { color: var(--kc-red); border-color: rgba(223,104,93,.54); }
        .kazen-checkout-steps i { height: 1px; background: var(--kc-line); }
        .kazen-checkout-card { border: 1px solid var(--kc-line); background: linear-gradient(180deg, rgba(255,255,255,.035), rgba(255,255,255,.015)); padding: 1.1rem; color: var(--kc-ink); box-shadow: inset 0 1px 0 rgba(255,255,255,.06); }
        .kazen-checkout-eyebrow { color: var(--kc-red); font-size: .62rem; font-weight: 700; letter-spacing: .24em; text-transform: uppercase; margin-bottom: .42rem; }
        .kazen-checkout-title { color: var(--kc-ink); font-size: 1.38rem; font-weight: 500; letter-spacing: .16em; text-transform: uppercase; margin: 0; }
        .kazen-checkout-muted { color: var(--kc-muted); }
        .kazen-checkout-red { color: var(--kc-red); stroke: var(--kc-red); }
        .kazen-checkout-lines { display: grid; gap: .65rem; }
        .kazen-checkout-line { display: grid; grid-template-columns: 2.5rem minmax(0,1fr) auto; gap: .72rem; align-items: center; border: 1px solid var(--kc-line); background: rgba(255,255,255,.035); padding: .76rem; }
        .kazen-checkout-line-count { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border: 1px solid var(--kc-line); color: var(--kc-red); font-weight: 800; }
        .kazen-checkout-line-main { min-width: 0; display: grid; gap: .2rem; }
        .kazen-checkout-line-main strong { color: var(--kc-ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .kazen-checkout-line-main span { color: var(--kc-muted); font-size: .8rem; }
        .kazen-checkout-line-price { color: var(--kc-ink); white-space: nowrap; }
        .kazen-checkout-summary { border: 1px solid var(--kc-line-strong); background: rgba(255,255,255,.04); padding: .9rem; display: grid; gap: .55rem; }
        .kazen-checkout-total-line { display: flex; justify-content: space-between; gap: 1rem; color: var(--kc-muted); }
        .kazen-checkout-total-line strong { color: var(--kc-ink); }
        .kazen-checkout-total-line.is-strong { border-top: 1px solid var(--kc-line); padding-top: .72rem; color: var(--kc-ink); font-size: 1.08rem; font-weight: 800; }
        .kazen-checkout-total-line.is-strong strong, .kazen-checkout-total-line.is-negative strong { color: var(--kc-red); }
        .kazen-checkout-actions { display: grid; grid-template-columns: 1fr; gap: .7rem; }
        .kazen-checkout-actions.two { grid-template-columns: 1fr 1fr; }
        .kazen-checkout-button { min-height: 3.35rem; width: 100%; border-radius: 0; font-family: Georgia, "Times New Roman", serif; font-size: .78rem; font-weight: 800; letter-spacing: .22em; text-transform: uppercase; transition: transform 190ms ease, border-color 190ms ease, background 190ms ease; }
        .kazen-checkout-button:hover { transform: translateY(-1px); }
        .kazen-checkout-button-primary { border: 1px solid rgba(223,104,93,.54); background: rgba(223,104,93,.10); color: var(--kc-red); }
        .kazen-checkout-button-primary span { color: var(--kc-red); }
        .kazen-checkout-button-secondary { border: 1px solid var(--kc-line); background: rgba(255,255,255,.025); color: var(--kc-ink); }
        .kazen-checkout-button-secondary span { color: var(--kc-ink); }
        .kazen-checkout-time-badge { margin: 0 auto; width: 5rem; height: 5rem; border: 1px solid var(--kc-line-strong); display: grid; place-items: center; color: var(--kc-ink); }
        .kazen-checkout-time-badge strong { font-size: 1.75rem; line-height: 1; }
        .kazen-checkout-time-badge span { margin-top: -1rem; color: var(--kc-muted); font-size: .62rem; letter-spacing: .18em; text-transform: uppercase; }
        .kazen-checkout-payment-head { display: grid; grid-template-columns: 3.1rem 1fr; gap: .9rem; align-items: center; }
        .kazen-checkout-payment-head > div:first-child { display: grid; place-items: center; width: 3.1rem; height: 3.1rem; border: 1px solid rgba(223,104,93,.44); color: var(--kc-red); }
        .kazen-checkout-payment-head p { color: var(--kc-muted); margin: .25rem 0 0; }
        .kazen-checkout-section { display: grid; gap: .65rem; }
        .kazen-checkout-section h3 { color: var(--kc-ink); font-size: .82rem; letter-spacing: .16em; text-transform: uppercase; margin: 0; }
        .kazen-checkout-tip-grid { display: flex; flex-wrap: wrap; gap: .5rem; }
        .kazen-checkout-tip-grid button, .kazen-checkout-tip-grid input, .kazen-checkout-coupon-row input, .kazen-checkout-coupon-row button { border: 1px solid var(--kc-line); background: rgba(255,255,255,.035); color: var(--kc-ink); padding: .72rem .8rem; outline: none; }
        .kazen-checkout-tip-grid button.is-active, .kazen-checkout-method-tabs button.is-active, .kazen-checkout-method-grid button.is-active { border-color: rgba(223,104,93,.58); color: var(--kc-red); background: rgba(223,104,93,.08); }
        .kazen-checkout-coupon-row { display: grid; grid-template-columns: 1fr auto; gap: .55rem; }
        .kazen-checkout-applied-coupon { border: 1px solid var(--kc-line); padding: .72rem .8rem; display: flex; justify-content: space-between; gap: 1rem; color: var(--kc-ink); }
        .kazen-checkout-applied-coupon button, .kazen-checkout-error { color: var(--kc-red); }
        .kazen-checkout-method-grid { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: .62rem; }
        .kazen-checkout-method-grid button { min-height: 4.2rem; border: 1px solid var(--kc-line); background: rgba(255,255,255,.035); display: grid; place-items: center; }
        .kazen-checkout-method-grid img { object-fit: contain; max-width: 4.2rem; }
        .kazen-checkout-rendered-form { border-top: 1px solid var(--kc-line); padding-top: .8rem; }
        .kazen-checkout-empty { border: 1px dashed var(--kc-line); color: var(--kc-muted); text-align: center; padding: 2rem 1rem; }
        .kazen-checkout-method-tabs { display: grid; grid-template-columns: repeat(3, 1fr); gap: .55rem; }
        .kazen-checkout-method-tabs button { border: 1px solid var(--kc-line); background: rgba(255,255,255,.025); color: var(--kc-ink); padding: .85rem .45rem; font-size: .68rem; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
        .kazen-checkout-people { border: 1px solid var(--kc-line); background: rgba(255,255,255,.035); display: flex; align-items: center; justify-content: space-between; padding: .78rem; color: var(--kc-ink); }
        .kazen-checkout-people > span { letter-spacing: .16em; text-transform: uppercase; }
        .kazen-checkout-people div { display: flex; align-items: center; gap: .7rem; }
        .kazen-checkout-people button { width: 2.25rem; height: 2.25rem; display: grid; place-items: center; border: 1px solid var(--kc-line); color: var(--kc-ink); }
        .kazen-checkout-guests { display: flex; gap: .45rem; overflow-x: auto; padding-bottom: .25rem; }
        .kazen-checkout-guests span { flex: 0 0 auto; border: 1px solid var(--kc-line); color: var(--kc-ink); padding: .45rem .65rem; }
        .kazen-checkout-split-person { display: grid; gap: .8rem; border: 1px solid var(--kc-line); padding: .9rem; }
        .kazen-checkout-split-person.is-active { border-color: rgba(223,104,93,.58); background: rgba(223,104,93,.06); }
        .kazen-checkout-split-head { display: grid; grid-template-columns: auto 1fr auto; gap: .65rem; align-items: center; color: var(--kc-ink); }
        .kazen-checkout-split-head > span { display: grid; place-items: center; width: 2.35rem; height: 2.35rem; border: 1px solid var(--kc-line); }
        .kazen-checkout-split-head em { color: var(--kc-muted); font-style: normal; font-size: .72rem; text-transform: uppercase; letter-spacing: .12em; }
        [data-pmd-kazen-checkout-shell="1"] input::placeholder { color: var(--kc-muted); opacity: .72; }
        [data-pmd-kazen-checkout-shell="1"] button:disabled { opacity: .46; cursor: not-allowed; }
        @media (max-width: 520px) { .kazen-checkout-overlay { padding: .65rem; } .kazen-checkout-scroll { padding: .95rem; } .kazen-checkout-actions.two, .kazen-checkout-method-grid { grid-template-columns: 1fr; } }
      `}</style>
      <div className="kazen-checkout-scroll" data-pmd-checkout-scroll="1">
        <button type="button" onClick={onClose} className="kazen-checkout-close">Close</button>
        <StepRail active={step} />
        {content}
      </div>
    </div>
  )
}
