"use client"

import { BellRing, NotebookPen, ShoppingBag, ClipboardList, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export type BotanicalBottomDockProps = {
  cartCount?: number
  tableOrderCount?: number
  showTableOrder?: boolean
  onCallWaiter?: () => void
  onAddNote?: () => void
  onCheckout?: () => void
  onOpenTableOrder?: () => void
}

type DockButtonProps = {
  label: string
  icon: React.ReactNode
  badge?: number
  onClick?: () => void
}

function DockButton({ label, icon, badge, onClick }: DockButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative flex flex-1 flex-col items-center gap-1 py-1 text-[var(--pmd-muted)] outline-none transition-colors hover:text-[var(--pmd-primary)]"
    >
      <span className="relative">
        {icon}
        {badge != null && badge > 0 && (
          <span className="absolute -right-2.5 -top-2 flex min-w-[18px] items-center justify-center rounded-full bg-[var(--pmd-accent)] px-1 text-[10px] font-semibold leading-[18px] text-[var(--pmd-paper-soft)]">
            {badge}
          </span>
        )}
      </span>
      <span className="text-[11px] font-medium tracking-wide">{label}</span>
    </button>
  )
}

export function BotanicalBottomDock({

  cartCount = 0,
  tableOrderCount = 0,
  showTableOrder = true,
  onCallWaiter,
  onAddNote,
  onCheckout,
  onOpenTableOrder,
}: BotanicalBottomDockProps) {
  // PMD_FORCE_HIDE_IFRAME_DOCK_20260608
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search)
    if (params.get("hideDock") === "1") return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-3">
      <div
        className={cn(
          "pointer-events-auto relative flex w-full max-w-md items-center justify-between gap-1 rounded-[1.75rem] border border-[var(--pmd-line)] px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]",
          "bg-[color-mix(in_srgb,var(--pmd-paper-soft)_88%,transparent)] shadow-[0_-2px_30px_-8px_rgba(60,53,41,0.35)] backdrop-blur-md",
        )}
      >
        <DockButton
          label="Call waiter"
          onClick={onCallWaiter}
          icon={<BellRing className="size-[22px]" />}
        />
        <DockButton
          label="Add note"
          onClick={onAddNote}
          icon={<NotebookPen className="size-[22px]" />}
        />

        {/* emphasized center action */}
        <div className="flex flex-1 justify-center">
          <button
            type="button"
            onClick={onCheckout}
            aria-label="Checkout"
            className="relative -mt-8 flex size-14 items-center justify-center rounded-full bg-[var(--pmd-primary)] text-[var(--pmd-paper-soft)] shadow-[0_12px_24px_-8px_rgba(60,53,41,0.7)] ring-4 ring-[var(--pmd-paper-soft)] transition-transform hover:scale-105 active:scale-95"
          >
            <Plus className="size-6" />
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex min-w-[20px] items-center justify-center rounded-full bg-[var(--pmd-accent)] px-1 text-[11px] font-semibold leading-5 text-[var(--pmd-paper-soft)] ring-2 ring-[var(--pmd-paper-soft)]">
                {cartCount}
              </span>
            )}
          </button>
        </div>

        <DockButton
          label="Checkout"
          onClick={onCheckout}
          badge={cartCount}
          icon={<ShoppingBag className="size-[22px]" />}
        />

        {showTableOrder && (
          <DockButton
            label="Table order"
            onClick={onOpenTableOrder}
            badge={tableOrderCount}
            icon={<ClipboardList className="size-[22px]" />}
          />
        )}
      </div>
    </div>
  )
}
