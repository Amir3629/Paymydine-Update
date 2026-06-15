"use client"

/**
 * Modern Green theme — bottom action toolbar & reusable themed actions.
 *
 * These actions are intentionally "dumb": every button forwards to a
 * callback supplied by the host (onCallWaiter, onOpenNote, onCheckout, …).
 * The host wires them to shared app logic later.
 */

import { cn } from "@/lib/utils"
import { BellRing, NotebookPen, ShoppingBag } from "lucide-react"
import type { FormatPrice } from "./types"

export interface ModernGreenThemeActionsProps {
  /** total displayed on the checkout button */
  cartTotal: number
  /** item count badge on the checkout button */
  cartCount: number
  formatPrice: FormatPrice
  onCallWaiter?: () => void
  onOpenNote?: () => void
  onCheckout?: () => void
  className?: string
}

export function ModernGreenThemeActions({
  cartTotal,
  cartCount,
  formatPrice,
  onCallWaiter,
  onOpenNote,
  onCheckout,
  className,
}: ModernGreenThemeActionsProps) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-4 pb-4",
        className,
      )}
    >
      <div className="mg-glass-strong pointer-events-auto flex w-full max-w-md items-center gap-2 rounded-3xl p-2 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
        <button
          type="button"
          onClick={onCallWaiter}
          className="flex h-13 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[var(--mg-text-soft)] transition-colors hover:bg-[var(--mg-hover)] hover:text-[var(--mg-text)]"
        >
          <BellRing className="size-4.5" />
          <span className="text-[10px] font-medium">Waiter</span>
        </button>
        <button
          type="button"
          onClick={onOpenNote}
          className="flex h-13 flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[var(--mg-text-soft)] transition-colors hover:bg-[var(--mg-hover)] hover:text-[var(--mg-text)]"
        >
          <NotebookPen className="size-4.5" />
          <span className="text-[10px] font-medium">Note</span>
        </button>
        <button
          type="button"
          onClick={onCheckout}
          className="relative flex h-13 flex-[2] items-center justify-center gap-2 rounded-2xl bg-[var(--mg-green)] px-4 font-semibold text-[var(--mg-on-green)] shadow-[0_10px_30px_-12px_var(--mg-green-ring)] transition-all hover:bg-[var(--mg-green-strong)] active:translate-y-px"
        >
          <span className="relative">
            <ShoppingBag className="size-5" />
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex size-4 items-center justify-center rounded-full bg-[var(--mg-on-green)] text-[9px] font-bold text-[var(--mg-green)]">
                {cartCount}
              </span>
            )}
          </span>
          <span className="text-sm">{formatPrice(cartTotal)}</span>
        </button>
      </div>
    </div>
  )
}
