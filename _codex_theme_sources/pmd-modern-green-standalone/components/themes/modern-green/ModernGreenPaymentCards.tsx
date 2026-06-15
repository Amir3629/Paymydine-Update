"use client"

/**
 * Modern Green theme — payment step UI.
 *
 * 3C. ModernGreenPaymentCard — payment summary, tip selector, coupon,
 *     payment method grid, and a selected-method form (card example).
 *
 * UI ONLY. No payment is processed. Selection state, coupon value, tip
 * choice, and submission all flow through host-provided props/callbacks.
 */

import { cn } from "@/lib/utils"
import {
  Banknote,
  CreditCard,
  Smartphone,
  Wallet,
} from "lucide-react"
import type { ReactNode } from "react"
import {
  ThemeActionButton,
  ThemeDivider,
  ThemeInput,
  ThemeSummaryRow,
} from "./primitives"
import type {
  FormatPrice,
  OrderTotals,
  PaymentMethodOption,
  TipOption,
} from "./types"

/* Presentational icon mapping for payment methods. */
function PaymentIcon({ icon }: { icon: PaymentMethodOption["icon"] }): ReactNode {
  const map: Record<PaymentMethodOption["icon"], ReactNode> = {
    card: <CreditCard className="size-5" />,
    apple: <Smartphone className="size-5" />,
    google: <Smartphone className="size-5" />,
    wero: <Wallet className="size-5" />,
    paypal: <Wallet className="size-5" />,
    cash: <Banknote className="size-5" />,
  }
  return map[icon]
}

/* ----------------------------------------------------------------
 * Tip selector — controlled by host.
 * ---------------------------------------------------------------- */
export function ThemeTipSelector({
  options,
  selectedId,
  customValue,
  onSelect,
  onCustomChange,
}: {
  options: TipOption[]
  selectedId?: string
  customValue?: string
  onSelect?: (id: string) => void
  onCustomChange?: (value: string) => void
}) {
  const customSelected =
    options.find((o) => o.id === selectedId)?.percent === null

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mg-text-dim)]">
        Add a tip
      </p>
      <div className="grid grid-cols-4 gap-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onSelect?.(opt.id)}
            className={cn(
              "h-11 rounded-2xl text-sm font-semibold transition-all",
              opt.id === selectedId
                ? "bg-[var(--mg-green)] text-[var(--mg-on-green)]"
                : "mg-glass text-[var(--mg-text-soft)] hover:text-[var(--mg-text)]",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {customSelected && (
        <ThemeInput
          inputMode="decimal"
          placeholder="Custom tip amount"
          value={customValue}
          onChange={(e) => onCustomChange?.(e.target.value)}
        />
      )}
    </div>
  )
}

/* ----------------------------------------------------------------
 * Coupon field — controlled by host.
 * ---------------------------------------------------------------- */
export function ThemeCouponField({
  value,
  onChange,
  onApply,
}: {
  value?: string
  onChange?: (value: string) => void
  onApply?: () => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mg-text-dim)]">
        Coupon code
      </p>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder="Enter code"
          aria-label="Coupon code"
          className="mg-glass h-11 flex-1 rounded-2xl px-4 text-sm text-[var(--mg-text)] placeholder:text-[var(--mg-text-dim)] outline-none transition-all focus:ring-2 focus:ring-[var(--mg-green-ring)]"
        />
        <ThemeActionButton variant="secondary" onClick={onApply}>
          Apply
        </ThemeActionButton>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
 * Payment method grid — controlled selection via host.
 * ---------------------------------------------------------------- */
export function ThemePaymentMethodGrid({
  methods,
  selectedId,
  onSelect,
}: {
  methods: PaymentMethodOption[]
  selectedId?: string
  onSelect?: (id: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mg-text-dim)]">
        Payment method
      </p>
      <div className="grid grid-cols-3 gap-2">
        {methods.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => onSelect?.(method.id)}
            className={cn(
              "flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl text-xs font-medium transition-all",
              method.id === selectedId
                ? "bg-[var(--mg-green-soft)] text-[var(--mg-green)] ring-1 ring-[var(--mg-green-ring)]"
                : "mg-glass text-[var(--mg-text-soft)] hover:text-[var(--mg-text)]",
            )}
          >
            <PaymentIcon icon={method.icon} />
            {method.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
 * Card form (shown when a card-like method is selected). UI only.
 * ---------------------------------------------------------------- */
export function ThemeCardPaymentForm({
  cardholderName,
  email,
  phone,
  onChangeField,
}: {
  cardholderName?: string
  email?: string
  phone?: string
  onChangeField?: (
    field: "cardholderName" | "email" | "phone",
    value: string,
  ) => void
}) {
  return (
    <div className="space-y-3">
      <ThemeInput
        id="cardholder"
        label="Cardholder name"
        placeholder="Jane Doe"
        value={cardholderName}
        onChange={(e) => onChangeField?.("cardholderName", e.target.value)}
      />
      <ThemeInput
        id="email"
        type="email"
        label="Email"
        placeholder="jane@email.com"
        value={email}
        onChange={(e) => onChangeField?.("email", e.target.value)}
      />
      <ThemeInput
        id="phone"
        type="tel"
        label="Phone number (optional)"
        placeholder="+1 555 000 0000"
        value={phone}
        onChange={(e) => onChangeField?.("phone", e.target.value)}
      />
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-[var(--mg-text-soft)]">
          Card information
        </label>
        <div className="mg-glass overflow-hidden rounded-2xl">
          <input
            placeholder="1234 1234 1234 1234"
            aria-label="Card number"
            className="h-11 w-full bg-transparent px-4 text-sm text-[var(--mg-text)] placeholder:text-[var(--mg-text-dim)] outline-none"
          />
          <div className="flex border-t border-[var(--mg-border)]">
            <input
              placeholder="MM / YY"
              aria-label="Expiry"
              className="h-11 w-1/2 border-r border-[var(--mg-border)] bg-transparent px-4 text-sm text-[var(--mg-text)] placeholder:text-[var(--mg-text-dim)] outline-none"
            />
            <input
              placeholder="CVC"
              aria-label="CVC"
              className="h-11 w-1/2 bg-transparent px-4 text-sm text-[var(--mg-text)] placeholder:text-[var(--mg-text-dim)] outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
 * 3C. Payment card — orchestrates the pieces above.
 * ---------------------------------------------------------------- */
export function ModernGreenPaymentCard({
  totals,
  formatPrice,
  methods,
  selectedMethodId,
  tipOptions,
  selectedTipId,
  customTip,
  couponValue,
  cardholderName,
  email,
  phone,
  onSelectMethod,
  onSelectTip,
  onCustomTipChange,
  onCouponChange,
  onApplyCoupon,
  onChangeCardField,
  onPay,
}: {
  totals: OrderTotals
  formatPrice: FormatPrice
  methods: PaymentMethodOption[]
  selectedMethodId?: string
  tipOptions: TipOption[]
  selectedTipId?: string
  customTip?: string
  couponValue?: string
  cardholderName?: string
  email?: string
  phone?: string
  onSelectMethod?: (id: string) => void
  onSelectTip?: (id: string) => void
  onCustomTipChange?: (value: string) => void
  onCouponChange?: (value: string) => void
  onApplyCoupon?: () => void
  onChangeCardField?: (
    field: "cardholderName" | "email" | "phone",
    value: string,
  ) => void
  onPay?: () => void
}) {
  // "card-like" methods reveal the form; cash/wallet methods do not.
  const showForm =
    selectedMethodId === "card" ||
    selectedMethodId === "paypal" ||
    selectedMethodId === "wero"

  return (
    <div className="space-y-5">
      {/* Payment summary */}
      <div className="mg-glass space-y-2.5 rounded-2xl p-4">
        <ThemeSummaryRow
          label="Items total"
          value={formatPrice(totals.subtotal)}
        />
        {totals.serviceCharge != null && (
          <ThemeSummaryRow
            label="Service charge"
            value={formatPrice(totals.serviceCharge)}
          />
        )}
        {totals.tip != null && (
          <ThemeSummaryRow label="Tip" value={formatPrice(totals.tip)} />
        )}
        <ThemeDivider className="my-1" />
        <ThemeSummaryRow
          label="Payable total"
          value={formatPrice(totals.total)}
          emphasis
          accent
        />
      </div>

      <ThemeTipSelector
        options={tipOptions}
        selectedId={selectedTipId}
        customValue={customTip}
        onSelect={onSelectTip}
        onCustomChange={onCustomTipChange}
      />

      <ThemeCouponField
        value={couponValue}
        onChange={onCouponChange}
        onApply={onApplyCoupon}
      />

      <ThemePaymentMethodGrid
        methods={methods}
        selectedId={selectedMethodId}
        onSelect={onSelectMethod}
      />

      {showForm && (
        <>
          <ThemeDivider />
          <ThemeCardPaymentForm
            cardholderName={cardholderName}
            email={email}
            phone={phone}
            onChangeField={onChangeCardField}
          />
        </>
      )}

      <ThemeActionButton
        fullWidth
        size="lg"
        onClick={onPay}
        disabled={!selectedMethodId}
      >
        Pay {formatPrice(totals.total)}
      </ThemeActionButton>
    </div>
  )
}
