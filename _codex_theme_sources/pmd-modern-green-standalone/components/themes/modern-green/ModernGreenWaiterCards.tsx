"use client"

/**
 * Modern Green theme — Waiter call card (3F).
 *
 * Renders the body content for a "Call waiter" modal. The host controls
 * open/close (via ThemeModal) and supplies onCallWaiter / onCancel.
 * No requests are sent from here.
 */

import { BellRing } from "lucide-react"
import { ThemeActionButton } from "./primitives"

export function ModernGreenWaiterCard({
  tableLabel,
  description = "A team member will be notified and come to your table shortly.",
  onCallWaiter,
  onCancel,
}: {
  tableLabel?: string
  description?: string
  onCallWaiter?: () => void
  onCancel?: () => void
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 pt-1 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-[var(--mg-green-soft)] text-[var(--mg-green)]">
          <BellRing className="size-6" />
        </span>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[var(--mg-text)]">
            Call a waiter
          </h3>
          <p className="text-sm leading-relaxed text-[var(--mg-text-soft)] text-pretty">
            {description}
          </p>
        </div>
        {tableLabel && (
          <span className="mg-glass rounded-full px-3 py-1.5 text-xs font-medium text-[var(--mg-text-soft)]">
            {tableLabel}
          </span>
        )}
      </div>

      <div className="space-y-2">
        <ThemeActionButton
          fullWidth
          size="lg"
          leadingIcon={<BellRing className="size-4" />}
          onClick={onCallWaiter}
        >
          Call waiter
        </ThemeActionButton>
        <ThemeActionButton variant="ghost" fullWidth onClick={onCancel}>
          Cancel
        </ThemeActionButton>
      </div>
    </div>
  )
}
