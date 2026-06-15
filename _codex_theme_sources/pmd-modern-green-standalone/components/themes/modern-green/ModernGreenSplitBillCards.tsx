"use client"

/**
 * Modern Green theme — split bill & review split cards.
 *
 * 3D. ModernGreenSplitBillCard — choose split method, guest count, item
 *     assignments, shares, and see per-person amounts.
 * 3E. ModernGreenReviewSplitCard — confirm a chosen split for the active payer
 *     and pick a payment method.
 *
 * UI ONLY. Per-person amounts, item assignment, rounding, and totals are
 * supplied by the host/demo props — this theme does no split math itself.
 */

import { cn } from "@/lib/utils"
import { Info, ReceiptText, Users } from "lucide-react"
import Image from "next/image"
import {
  ThemeActionButton,
  ThemeDivider,
  ThemeStepper,
  ThemeSummaryRow,
} from "./primitives"
import { ThemePaymentMethodGrid } from "./ModernGreenPaymentCards"
import type {
  CartLine,
  FormatPrice,
  OrderTotals,
  PaymentMethodOption,
  SplitGuest,
  SplitMethod,
} from "./types"

const splitMethods: { id: SplitMethod; label: string; hint: string }[] = [
  { id: "equally", label: "Split equally", hint: "Divide evenly" },
  { id: "by-items", label: "By order items", hint: "Pay for your dishes" },
  { id: "by-shares", label: "By shares", hint: "Assign portions" },
]

function GuestChip({ guest, active }: { guest: SplitGuest; active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active
          ? "border-[var(--mg-green-ring)] bg-[var(--mg-green-soft)] text-[var(--mg-green)]"
          : "border-[var(--mg-border)] bg-[var(--mg-hover)] text-[var(--mg-text-soft)]",
      )}
    >
      <span className="flex size-5 items-center justify-center rounded-full bg-[var(--mg-green-soft)] text-[10px] font-bold text-[var(--mg-green)]">
        {guest.label.match(/\d+/)?.[0] ?? guest.label.charAt(0)}
      </span>
      {guest.label}
    </span>
  )
}

function SplitItemAssignmentPreview({
  lines,
  guests,
  formatPrice,
}: {
  lines: CartLine[]
  guests: SplitGuest[]
  formatPrice: FormatPrice
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mg-text-dim)]">
          Assign items
        </p>
        <span className="text-[11px] text-[var(--mg-text-dim)]">
          Demo distribution
        </span>
      </div>
      <div className="mg-thin-scrollbar max-h-64 space-y-3 overflow-y-auto pr-1">
        {lines.map((line, lineIndex) => {
          const assignedGuest = guests[lineIndex % Math.max(guests.length, 1)]
          return (
            <div key={line.id} className="mg-glass rounded-2xl p-3">
              <div className="flex gap-3">
                {line.imageUrl && (
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[var(--mg-hover)]">
                    <Image
                      src={line.imageUrl}
                      alt={line.name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="truncate text-sm font-semibold text-[var(--mg-text)]">
                        {line.quantity}× {line.name}
                      </p>
                      {line.note && (
                        <p className="truncate text-xs text-[var(--mg-text-dim)]">
                          {line.note}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-[var(--mg-text)]">
                      {formatPrice(line.unitPrice * line.quantity)}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {guests.map((guest) => (
                      <GuestChip
                        key={`${line.id}-${guest.id}`}
                        guest={guest}
                        active={guest.id === assignedGuest?.id}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ShareDistributionPreview({
  guests,
  formatPrice,
  onAdjustShares,
}: {
  guests: SplitGuest[]
  formatPrice: FormatPrice
  onAdjustShares?: (guestId: string, delta: number) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mg-text-dim)]">
          Share distribution
        </p>
        <span className="text-[11px] text-[var(--mg-text-dim)]">
          Scroll if needed
        </span>
      </div>
      <div className="mg-thin-scrollbar max-h-64 space-y-2 overflow-y-auto pr-1">
        {guests.map((guest) => (
          <div
            key={guest.id}
            className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--mg-hover)] px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--mg-text)]">
                {guest.label}
              </p>
              <p className="text-xs text-[var(--mg-text-dim)]">
                {guest.shares ?? 1} share{(guest.shares ?? 1) === 1 ? "" : "s"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThemeStepper
                value={guest.shares ?? 1}
                min={0}
                ariaLabel={`Shares for ${guest.label}`}
                onIncrement={() => onAdjustShares?.(guest.id, 1)}
                onDecrement={() => onAdjustShares?.(guest.id, -1)}
              />
              <span className="min-w-16 text-right text-sm font-bold text-[var(--mg-text)]">
                {formatPrice(guest.amount)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
 * 3D. Split bill card
 * ---------------------------------------------------------------- */
export function ModernGreenSplitBillCard({
  total,
  lines = [],
  formatPrice,
  selectedMethod,
  guestCount,
  guests,
  oddCentsNote,
  onSelectMethod,
  onIncrementGuests,
  onDecrementGuests,
  onAdjustShares,
  onReviewSplit,
}: {
  total: number
  /** cart/order lines for item-assignment preview */
  lines?: CartLine[]
  formatPrice: FormatPrice
  selectedMethod: SplitMethod
  guestCount: number
  guests: SplitGuest[]
  oddCentsNote?: string
  onSelectMethod?: (method: SplitMethod) => void
  onIncrementGuests?: () => void
  onDecrementGuests?: () => void
  onAdjustShares?: (guestId: string, delta: number) => void
  onReviewSplit?: () => void
}) {
  return (
    <div className="space-y-5">
      {/* Shared table summary */}
      <div className="mg-glass flex items-center justify-between rounded-2xl px-4 py-3">
        <span className="inline-flex items-center gap-2 text-xs text-[var(--mg-text-soft)]">
          <Users className="size-4 text-[var(--mg-green)]" />
          Shared table order
        </span>
        <span className="text-sm font-bold text-[var(--mg-text)]">
          {formatPrice(total)}
        </span>
      </div>

      {/* Split method */}
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mg-text-dim)]">
          Split method
        </p>
        <div className="grid gap-2">
          {splitMethods.map((method) => (
            <button
              key={method.id}
              type="button"
              onClick={() => onSelectMethod?.(method.id)}
              className={cn(
                "flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-all",
                method.id === selectedMethod
                  ? "bg-[var(--mg-green-soft)] ring-1 ring-[var(--mg-green-ring)]"
                  : "mg-glass",
              )}
            >
              <span>
                <span
                  className={cn(
                    "block text-sm font-semibold",
                    method.id === selectedMethod
                      ? "text-[var(--mg-green)]"
                      : "text-[var(--mg-text)]",
                  )}
                >
                  {method.label}
                </span>
                <span className="block text-xs text-[var(--mg-text-dim)]">
                  {method.hint}
                </span>
              </span>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full border",
                  method.id === selectedMethod
                    ? "border-[var(--mg-green)] bg-[var(--mg-green)]"
                    : "border-[var(--mg-border-strong)]",
                )}
              >
                {method.id === selectedMethod && (
                  <span className="size-2 rounded-full bg-[var(--mg-on-green)]" />
                )}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Guest count */}
      <div className="mg-glass flex items-center justify-between rounded-2xl px-4 py-3">
        <span className="text-sm font-medium text-[var(--mg-text)]">
          People
        </span>
        <ThemeStepper
          value={guestCount}
          min={1}
          ariaLabel="Number of people"
          onIncrement={() => onIncrementGuests?.()}
          onDecrement={() => onDecrementGuests?.()}
        />
      </div>

      {/* Guest chips */}
      <div className="mg-thin-scrollbar flex gap-2 overflow-x-auto pb-1">
        {guests.map((guest) => (
          <GuestChip key={guest.id} guest={guest} />
        ))}
      </div>

      <ThemeDivider />

      {selectedMethod === "by-items" && lines.length > 0 ? (
        <SplitItemAssignmentPreview
          lines={lines}
          guests={guests}
          formatPrice={formatPrice}
        />
      ) : selectedMethod === "by-shares" ? (
        <ShareDistributionPreview
          guests={guests}
          formatPrice={formatPrice}
          onAdjustShares={onAdjustShares}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--mg-text-dim)]">
            Equal split preview
          </p>
          <div className="space-y-3">
            {guests.map((guest) => (
              <div key={guest.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-[var(--mg-text)]">{guest.label}</span>
                <span className="min-w-16 text-right text-sm font-semibold text-[var(--mg-text)]">
                  {formatPrice(guest.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {oddCentsNote && (
        <p className="inline-flex items-start gap-2 rounded-2xl bg-[var(--mg-hover)] px-4 py-3 text-xs leading-relaxed text-[var(--mg-text-dim)]">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          {oddCentsNote}
        </p>
      )}

      <ThemeActionButton fullWidth size="lg" onClick={onReviewSplit}>
        Review split
      </ThemeActionButton>
    </div>
  )
}

/* ----------------------------------------------------------------
 * 3E. Review split / split payment card
 * ---------------------------------------------------------------- */
export function ModernGreenReviewSplitCard({
  methodLabel,
  activePayer,
  subtotal,
  totals,
  formatPrice,
  paymentMethods,
  selectedPaymentMethodId,
  onSelectPaymentMethod,
  onConfirm,
}: {
  methodLabel: string
  activePayer: SplitGuest
  subtotal: number
  totals: OrderTotals
  formatPrice: FormatPrice
  paymentMethods: PaymentMethodOption[]
  selectedPaymentMethodId?: string
  onSelectPaymentMethod?: (id: string) => void
  onConfirm?: () => void
}) {
  return (
    <div className="space-y-5">
      {/* Chosen split summary */}
      <div className="mg-glass space-y-1 rounded-2xl px-4 py-3">
        <p className="text-xs uppercase tracking-wide text-[var(--mg-text-dim)]">
          Chosen split
        </p>
        <p className="text-sm font-semibold text-[var(--mg-text)]">
          {methodLabel}
        </p>
      </div>

      {/* Active payer */}
      <div className="flex items-center gap-3 rounded-2xl bg-[var(--mg-green-soft)] px-4 py-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-[var(--mg-green)] text-sm font-bold text-[var(--mg-on-green)]">
          {activePayer.label.match(/\d+/)?.[0] ?? activePayer.label.charAt(0)}
        </span>
        <div>
          <p className="text-xs text-[var(--mg-green)]">Paying now</p>
          <p className="text-sm font-semibold text-[var(--mg-text)]">
            {activePayer.label}
          </p>
        </div>
      </div>

      {/* Amounts */}
      <div className="mg-glass space-y-2.5 rounded-2xl p-4">
        <ThemeSummaryRow label="Split subtotal" value={formatPrice(subtotal)} />
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

      <ThemePaymentMethodGrid
        methods={paymentMethods}
        selectedId={selectedPaymentMethodId}
        onSelect={onSelectPaymentMethod}
      />

      <ThemeActionButton
        fullWidth
        size="lg"
        onClick={onConfirm}
        disabled={!selectedPaymentMethodId}
        leadingIcon={<ReceiptText className="size-5" />}
      >
        Pay {formatPrice(totals.total)}
      </ThemeActionButton>
    </div>
  )
}
