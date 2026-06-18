"use client"

import React from "react"
import { Check, CreditCard, Link2, Minus, Plus, QrCode, Users, X } from "lucide-react"

import { formatCurrency } from "@/lib/currency"
import { iconForPayment } from "@/lib/payment-icons"
import { canRenderPaymentMethodDetail } from "@/features/checkout/payment-method-utils"
import { PaymentMethodTile } from "@/components/theme-ui"

export type DisplayItem = {
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

export type SplitPerson = {
  id: string
  name: string
  avatar?: string
  total?: number
  status?: string
  items?: Array<{ name: string; amount: number }>
  tax?: number
}

export type KazenJapaneseCheckoutShellProps = any

export const money = (value: number | string | null | undefined) => {
  const numeric = Number(value ?? 0)
  return formatCurrency(Number.isFinite(numeric) ? numeric : 0)
}

export const getQuantity = (item: DisplayItem) => Math.max(1, Number(item?.quantity || item?.qty || 1))

export const getItemName = (item: DisplayItem, fallback = "Item") =>
  String(item?.__pmdDisplayName || item?.name || item?.item?.name || item?.menu_name || item?.item_name || fallback)

export const getAmount = (item: DisplayItem) => {
  const explicitTotal = Number(item?.__pmdDisplaySubtotal ?? item?.subtotal ?? item?.total ?? item?.amount)
  if (Number.isFinite(explicitTotal) && explicitTotal > 0) return explicitTotal

  const unit = Number(item?.price ?? item?.unit_price ?? item?.item?.price ?? 0)
  return Number.isFinite(unit) ? unit * getQuantity(item) : 0
}

export const getPaymentIconSize = (code: string) => {
  const normalized = String(code || "").toLowerCase()
  if (normalized === "wero") return { width: 58, height: 28 }
  if (normalized === "apple_pay" || normalized === "google_pay") return { width: 62, height: 32 }
  if (normalized === "paypal") return { width: 44, height: 44 }
  if (normalized === "cod") return { width: 42, height: 42 }
  return { width: 48, height: 34 }
}


// PMD_KAZEN_V7_INLINE_BUTTON_STYLES_20260618
// Inline styles are intentional here because the live checkout sits in the parent /menu page
// and old theme/global button rules were overriding the normal Kazen CSS until hover.
const kazenCheckoutBaseButtonStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "3.55rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: ".55rem",
  padding: ".9rem 1rem",
  borderRadius: 0,
  boxShadow: "none",
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: ".82rem",
  fontWeight: 850,
  letterSpacing: ".12em",
  lineHeight: 1.08,
  textTransform: "uppercase",
  textAlign: "center",
}

const kazenCheckoutPrimaryButtonStyle: React.CSSProperties = {
  ...kazenCheckoutBaseButtonStyle,
  background: "#b85d59",
  backgroundColor: "#b85d59",
  color: "#fffaf3",
  WebkitTextFillColor: "#fffaf3",
  border: "1px solid rgba(143, 55, 51, .56)",
}

const kazenCheckoutSecondaryButtonStyle: React.CSSProperties = {
  ...kazenCheckoutBaseButtonStyle,
  background: "rgba(255, 255, 255, .46)",
  backgroundColor: "rgba(255, 255, 255, .46)",
  color: "#242320",
  WebkitTextFillColor: "#242320",
  border: "1px solid rgba(36, 35, 32, .18)",
}

const kazenSplitStepperStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "3.05rem 1fr 3.05rem",
  alignItems: "center",
  width: "100%",
  minHeight: "3.05rem",
  border: "1px solid rgba(36, 35, 32, .16)",
  background: "rgba(255, 255, 255, .30)",
  borderRadius: 0,
  overflow: "hidden",
  boxShadow: "none",
}

const kazenSplitStepperButtonStyle: React.CSSProperties = {
  width: "3.05rem",
  minWidth: "3.05rem",
  height: "3.05rem",
  minHeight: "3.05rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 0,
  margin: 0,
  background: "transparent",
  backgroundColor: "transparent",
  color: "#242320",
  WebkitTextFillColor: "#242320",
  border: 0,
  borderRadius: 0,
  boxShadow: "none",
  fontFamily: 'Georgia, "Times New Roman", serif',
  fontSize: "1.45rem",
  fontWeight: 760,
  lineHeight: 1,
}

const kazenSplitStepperValueStyle: React.CSSProperties = {
  minHeight: "3.05rem",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255, 255, 255, .20)",
  color: "#242320",
  WebkitTextFillColor: "#242320",
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  fontSize: ".96rem",
  fontWeight: 780,
}

export function ModalHead({ title, eyebrow, onBack }: { title: string; eyebrow?: string; onBack: () => void }) {
  return (
    <div className="kazen-solid-modal-head pmd-kazen-checkout-head">
      <div>
        {eyebrow ? <div className="kazen-solid-eyebrow">{eyebrow}</div> : null}
        <h2>{title}</h2>
      </div>
      <button type="button" data-pmd-kazen-back="1" className="pmd-kazen-waiter-back" onClick={onBack} aria-label="Close">
        <X className="h-5 w-5 pmd-kazen-back-icon" strokeWidth={1.9} />
      </button>
    </div>
  )
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`pmd-kazen-checkout-card ${className}`}>{children}</section>
}

export function Line({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={strong ? "pmd-kazen-line pmd-kazen-line-strong" : "pmd-kazen-line"}>
      <span>{label}</span>
      <strong>{money(value)}</strong>
    </div>
  )
}

export function ItemRows({ items }: { items: DisplayItem[] }) {
  const safeItems = Array.isArray(items) ? items : []

  if (safeItems.length === 0) {
    return (
      <div className="pmd-kazen-empty-list" data-pmd-kazen-plain-summary="1">
        <span className="pmd-kazen-muted">No items yet</span>
      </div>
    )
  }

  return (
    <section className="pmd-kazen-items-plain" data-pmd-kazen-plain-summary="1" aria-label="Order items">
      <div className="pmd-kazen-list pmd-kazen-items-list">
        {safeItems.map((item, index) => (
          <div className="pmd-kazen-cart-line" key={`${getItemName(item)}-${index}`}>
            <span>{getQuantity(item)}x {getItemName(item, `Item ${index + 1}`)}</span>
            <strong>{money(getAmount(item))}</strong>
          </div>
        ))}
      </div>
    </section>
  )
}

export function Actions({ children, two = false }: { children: React.ReactNode; two?: boolean }) {
  return <div className={two ? "pmd-kazen-actions pmd-kazen-actions-two" : "pmd-kazen-actions"}>{children}</div>
}

export function KazenButton({
  variant = "secondary",
  children,
  className = "",
  style,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  const variantStyle = variant === "primary" ? kazenCheckoutPrimaryButtonStyle : kazenCheckoutSecondaryButtonStyle

  return (
    <button
      {...props}
      data-pmd-kazen-button={variant}
      className={`pmd-kazen-waiter-btn pmd-kazen-waiter-btn-${variant} ${variant === "primary" ? "pmd-kazen-waiter-primary" : "pmd-kazen-waiter-secondary"} ${className}`.trim()}
      style={{ ...variantStyle, ...(style || {}) }}
    >
      {children}
    </button>
  )
}

export function SplitTabs({ splitMethod, chooseSplitMethod }: any) {
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

export function PeopleControls({ splitGuestCount = 2, addSplitGuest, removeSplitGuest }: any) {
  return (
    <div className="pmd-kazen-split-stepper" data-pmd-kazen-split-stepper="1" style={kazenSplitStepperStyle}>
      <button
        type="button"
        aria-label="Remove guest"
        disabled={splitGuestCount <= 2}
        onClick={removeSplitGuest}
        className="pmd-kazen-split-stepper-btn"
        style={{ ...kazenSplitStepperButtonStyle, borderRight: "1px solid rgba(36, 35, 32, .14)" }}
      >
        <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#242320", WebkitTextFillColor: "#242320" }}>−</span>
      </button>
      <strong style={kazenSplitStepperValueStyle}>{splitGuestCount} people</strong>
      <button
        type="button"
        aria-label="Add guest"
        disabled={splitGuestCount >= 10}
        onClick={addSplitGuest}
        className="pmd-kazen-split-stepper-btn"
        style={{ ...kazenSplitStepperButtonStyle, borderLeft: "1px solid rgba(36, 35, 32, .14)" }}
      >
        <span aria-hidden="true" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#242320", WebkitTextFillColor: "#242320" }}>＋</span>
      </button>
    </div>
  )
}

export function GuestChips({ guests = [] }: { guests?: SplitPerson[] }) {
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

export function PaymentMethods({ loadingPayments, visiblePaymentMethods, selectedPaymentMethod, onPaymentMethodSelect, isDarkTheme }: any) {
  const methods = Array.isArray(visiblePaymentMethods) ? visiblePaymentMethods : []

  return (
    <section className="pmd-kazen-payment-section pmd-kazen-methods-section pmd-kazen-payment-methods" data-pmd-kazen-payment-section="methods">
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
              <PaymentMethodTile
                key={code}
                label={method.name || code}
                selected={active}
                onClick={() => onPaymentMethodSelect?.(code)}
                className={active ? "pmd-kazen-method pmd-kazen-method-active" : "pmd-kazen-method"}
              >
                <img src={src} alt={method.name || code} width={size.width} height={size.height} />
              </PaymentMethodTile>
            )
          })}
        </div>
      )}
    </section>
  )
}

