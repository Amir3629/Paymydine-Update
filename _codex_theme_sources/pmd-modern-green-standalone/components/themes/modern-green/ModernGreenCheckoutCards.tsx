"use client"

/**
 * Modern Green theme — checkout (order review) & order status cards.
 *
 * 3A. ModernGreenOrderReviewCard — first checkout step
 * 3B. ModernGreenOrderStatusCard — order status step
 *
 * Presentation only. All amounts come in via props; all actions forward
 * to host callbacks. No totals are computed here.
 */

import { cn } from "@/lib/utils"
import { CheckCircle2, Clock, Soup } from "lucide-react"
import Image from "next/image"
import {
  ThemeActionButton,
  ThemeDivider,
  ThemeStepper,
  ThemeSummaryRow,
} from "./primitives"
import type {
  CartLine,
  FormatPrice,
  OrderStatus,
  OrderSummary,
  OrderTotals,
} from "./types"

/* ----------------------------------------------------------------
 * ThemeCartLineRow — reusable line-item row shared across cards.
 * ---------------------------------------------------------------- */
export function ThemeCartLineRow({
  line,
  formatPrice,
  onIncrement,
  onDecrement,
  readOnly,
}: {
  line: CartLine
  formatPrice: FormatPrice
  onIncrement?: (id: string) => void
  onDecrement?: (id: string) => void
  readOnly?: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      {line.imageUrl && (
        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
          <Image
            src={line.imageUrl || "/placeholder.svg"}
            alt={line.name}
            fill
            sizes="56px"
            className="object-cover"
          />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-[var(--mg-text)]">
          {line.name}
        </p>
        {line.note && (
          <p className="truncate text-xs text-[var(--mg-text-dim)]">
            {line.note}
          </p>
        )}
        <p className="text-xs text-[var(--mg-text-soft)]">
          {formatPrice(line.unitPrice)}
        </p>
      </div>
      {readOnly ? (
        <span className="text-sm font-semibold text-[var(--mg-text)]">
          ×{line.quantity}
        </span>
      ) : (
        <ThemeStepper
          value={line.quantity}
          min={1}
          ariaLabel={`Quantity for ${line.name}`}
          onIncrement={() => onIncrement?.(line.id)}
          onDecrement={() => onDecrement?.(line.id)}
        />
      )}
    </div>
  )
}

/* ----------------------------------------------------------------
 * ThemeTotals — renders an OrderTotals breakdown.
 * ---------------------------------------------------------------- */
export function ThemeTotals({
  totals,
  formatPrice,
}: {
  totals: OrderTotals
  formatPrice: FormatPrice
}) {
  return (
    <div className="space-y-2.5">
      <ThemeSummaryRow
        label="Subtotal"
        value={formatPrice(totals.subtotal)}
      />
      {totals.serviceCharge != null && (
        <ThemeSummaryRow
          label="Service charge"
          value={formatPrice(totals.serviceCharge)}
        />
      )}
      {totals.tax != null && (
        <ThemeSummaryRow label="Tax" value={formatPrice(totals.tax)} />
      )}
      {totals.tip != null && (
        <ThemeSummaryRow label="Tip" value={formatPrice(totals.tip)} />
      )}
      {totals.discount != null && (
        <ThemeSummaryRow
          label="Discount"
          value={`−${formatPrice(totals.discount)}`}
          accent
        />
      )}
      <ThemeDivider className="my-1" />
      <ThemeSummaryRow
        label="Total"
        value={formatPrice(totals.total)}
        emphasis
        accent
      />
    </div>
  )
}

/* ----------------------------------------------------------------
 * 3A. Order Review card
 * ---------------------------------------------------------------- */
export function ModernGreenOrderReviewCard({
  lines,
  totals,
  tableLabel,
  formatPrice,
  sharedTableNote,
  onIncrement,
  onDecrement,
  onContinueOrdering,
  onSendToKitchen,
  onConfirm,
}: {
  lines: CartLine[]
  totals: OrderTotals
  tableLabel?: string
  formatPrice: FormatPrice
  /** optional note about a shared table order */
  sharedTableNote?: string
  onIncrement?: (id: string) => void
  onDecrement?: (id: string) => void
  onContinueOrdering?: () => void
  onSendToKitchen?: () => void
  onConfirm?: () => void
}) {
  return (
    <div className="space-y-5">
      {tableLabel && (
        <div className="mg-glass flex items-center justify-between rounded-2xl px-4 py-3">
          <span className="text-xs text-[var(--mg-text-soft)]">
            Ordering for
          </span>
          <span className="text-sm font-semibold text-[var(--mg-text)]">
            {tableLabel}
          </span>
        </div>
      )}

      {sharedTableNote && (
        <p className="rounded-2xl bg-[var(--mg-green-soft)] px-4 py-3 text-xs leading-relaxed text-[var(--mg-green)]">
          {sharedTableNote}
        </p>
      )}

      <div className="space-y-4">
        {lines.map((line) => (
          <ThemeCartLineRow
            key={line.id}
            line={line}
            formatPrice={formatPrice}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
          />
        ))}
      </div>

      <ThemeDivider />
      <ThemeTotals totals={totals} formatPrice={formatPrice} />

      <div className="space-y-2 pt-1">
        <ThemeActionButton fullWidth size="lg" onClick={onConfirm}>
          Confirm &amp; continue
        </ThemeActionButton>
        <div className="flex gap-2">
          <ThemeActionButton
            variant="outline"
            fullWidth
            onClick={onContinueOrdering}
          >
            Add more items
          </ThemeActionButton>
          {onSendToKitchen && (
            <ThemeActionButton
              variant="secondary"
              fullWidth
              leadingIcon={<Soup className="size-4" />}
              onClick={onSendToKitchen}
            >
              Send to kitchen
            </ThemeActionButton>
          )}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
 * 3B. Order Status card
 * ---------------------------------------------------------------- */
const statusSteps: { id: OrderStatus; label: string }[] = [
  { id: "received", label: "Received" },
  { id: "preparing", label: "Preparing" },
  { id: "ready", label: "Ready" },
  { id: "served", label: "Served" },
]

export function ModernGreenOrderStatusCard({
  order,
  formatPrice,
  onPayInFull,
  onSplitBill,
  onContinueOrdering,
}: {
  order: OrderSummary
  formatPrice: FormatPrice
  onPayInFull?: () => void
  onSplitBill?: () => void
  onContinueOrdering?: () => void
}) {
  const activeIndex = statusSteps.findIndex((s) => s.id === order.status)

  return (
    <div className="space-y-5">
      {/* Estimate + confirmation */}
      <div className="mg-glass flex flex-col items-center gap-2 rounded-3xl px-5 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-[var(--mg-green-soft)] text-[var(--mg-green)]">
          <CheckCircle2 className="size-6" />
        </span>
        <p className="text-sm font-semibold text-[var(--mg-text)]">
          Your order is confirmed
        </p>
        {order.estimate && (
          <span className="inline-flex items-center gap-1.5 text-xs text-[var(--mg-text-soft)]">
            <Clock className="size-3.5 text-[var(--mg-green)]" />
            Estimated {order.estimate}
          </span>
        )}
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between gap-1">
        {statusSteps.map((step, i) => {
          const reached = i <= activeIndex
          return (
            <div key={step.id} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex w-full items-center">
                <span
                  className={cn(
                    "size-2.5 shrink-0 rounded-full",
                    reached
                      ? "bg-[var(--mg-green)]"
                      : "bg-[var(--mg-border-strong)]",
                  )}
                />
                {i < statusSteps.length - 1 && (
                  <span
                    className={cn(
                      "h-0.5 flex-1",
                      i < activeIndex
                        ? "bg-[var(--mg-green)]"
                        : "bg-[var(--mg-border-strong)]",
                    )}
                  />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  reached
                    ? "text-[var(--mg-text)]"
                    : "text-[var(--mg-text-dim)]",
                )}
              >
                {step.label}
              </span>
            </div>
          )
        })}
      </div>

      {/* Meta */}
      <div className="mg-glass grid grid-cols-3 gap-2 rounded-2xl p-3 text-center">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--mg-text-dim)]">
            Order
          </p>
          <p className="text-sm font-semibold text-[var(--mg-text)]">
            {order.orderNumber}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--mg-text-dim)]">
            Table
          </p>
          <p className="text-sm font-semibold text-[var(--mg-text)]">
            {order.tableLabel}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-[var(--mg-text-dim)]">
            Total
          </p>
          <p className="text-sm font-semibold text-[var(--mg-green)]">
            {formatPrice(order.totals.total)}
          </p>
        </div>
      </div>

      {/* Summary */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mg-text-dim)]">
          Order summary
        </p>
        {order.lines.map((line) => (
          <ThemeCartLineRow
            key={line.id}
            line={line}
            formatPrice={formatPrice}
            readOnly
          />
        ))}
      </div>

      {/* CTAs */}
      <div className="space-y-2 pt-1">
        <ThemeActionButton fullWidth size="lg" onClick={onPayInFull}>
          Pay in full · {formatPrice(order.totals.total)}
        </ThemeActionButton>
        <div className="flex gap-2">
          <ThemeActionButton variant="outline" fullWidth onClick={onSplitBill}>
            Split bill
          </ThemeActionButton>
          <ThemeActionButton
            variant="ghost"
            fullWidth
            onClick={onContinueOrdering}
          >
            Continue ordering
          </ThemeActionButton>
        </div>
      </div>
    </div>
  )
}
