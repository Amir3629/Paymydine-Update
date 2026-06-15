"use client"

/**
 * Modern Green theme — shared presentational primitives.
 *
 * These are the low-level, reusable building blocks every theme-specific
 * card/modal is composed from. They contain NO business logic: layout,
 * styling, and prop-driven rendering only.
 */

import { cn } from "@/lib/utils"
import { Moon, Sun, X } from "lucide-react"
import type { ButtonHTMLAttributes, ReactNode } from "react"
import { useEffect } from "react"
import type { ThemeMode } from "./types"

/* ----------------------------------------------------------------
 * ThemeCardFrame — the glassy surface used by cards and panels.
 * ---------------------------------------------------------------- */
export function ThemeCardFrame({
  children,
  className,
  strong,
}: {
  children: ReactNode
  className?: string
  /** use the stronger glass surface for elevated/foreground cards */
  strong?: boolean
}) {
  return (
    <div
      className={cn(
        strong ? "mg-glass-strong" : "mg-glass",
        "rounded-3xl shadow-[var(--mg-card-shadow)]",
        className,
      )}
    >
      {children}
    </div>
  )
}

/* ----------------------------------------------------------------
 * ThemeActionButton — the canonical themed button.
 * All real behaviour comes from the `onClick` callback supplied by the host.
 * ---------------------------------------------------------------- */
type ActionVariant = "primary" | "secondary" | "ghost" | "outline"

export interface ThemeActionButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ActionVariant
  size?: "sm" | "md" | "lg"
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  fullWidth?: boolean
}

const actionVariantClasses: Record<ActionVariant, string> = {
  primary:
    "bg-[var(--mg-green)] text-[var(--mg-on-green)] hover:bg-[var(--mg-green-strong)] font-semibold shadow-[0_10px_30px_-12px_var(--mg-green-ring)]",
  secondary:
    "mg-glass-strong text-[var(--mg-text)] hover:bg-[var(--mg-hover)]",
  ghost:
    "bg-transparent text-[var(--mg-text-soft)] hover:bg-[var(--mg-hover)] hover:text-[var(--mg-text)]",
  outline:
    "bg-transparent text-[var(--mg-text)] border border-[var(--mg-border-strong)] hover:bg-[var(--mg-hover)]",
}

const actionSizeClasses = {
  sm: "h-9 px-3.5 text-xs rounded-xl gap-1.5",
  md: "h-11 px-4 text-sm rounded-2xl gap-2",
  lg: "h-13 px-5 text-base rounded-2xl gap-2",
}

export function ThemeActionButton({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  fullWidth,
  className,
  children,
  type = "button",
  ...props
}: ThemeActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium outline-none transition-all",
        "focus-visible:ring-2 focus-visible:ring-[var(--mg-green-ring)] active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        actionVariantClasses[variant],
        actionSizeClasses[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  )
}

/* ----------------------------------------------------------------
 * ThemeActionSlot — a named placeholder where the host injects an action.
 * Lets integration code swap in real wired buttons while preserving layout.
 * ---------------------------------------------------------------- */
export function ThemeActionSlot({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <div className={cn("contents", className)}>{children}</div>
}

/* ----------------------------------------------------------------
 * ThemeIconButton — compact circular action used in the top bar.
 * ---------------------------------------------------------------- */
export function ThemeIconButton({
  children,
  onClick,
  className,
  label,
}: {
  children: ReactNode
  onClick?: () => void
  className?: string
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "mg-glass inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--mg-text-soft)] transition-all hover:bg-[var(--mg-hover)] hover:text-[var(--mg-text)] active:translate-y-px",
        className,
      )}
    >
      {children}
    </button>
  )
}

/* ----------------------------------------------------------------
 * ThemePill — small rounded pill used for tables, languages, badges.
 * ---------------------------------------------------------------- */
export function ThemePill({
  children,
  active,
  onClick,
  className,
  leadingIcon,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
  leadingIcon?: ReactNode
}) {
  const Comp = onClick ? "button" : "div"
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition-all",
        active
          ? "bg-[var(--mg-green)] text-[var(--mg-on-green)] shadow-[0_8px_24px_-12px_var(--mg-green-ring)]"
          : "mg-glass text-[var(--mg-text-soft)] hover:text-[var(--mg-text)]",
        onClick && "active:translate-y-px",
        className,
      )}
    >
      {leadingIcon}
      {children}
    </Comp>
  )
}

/* ----------------------------------------------------------------
 * ThemeBadgeChip — small label badge for menu items.
 * ---------------------------------------------------------------- */
export function ThemeBadgeChip({
  label,
  tone = "accent",
}: {
  label: string
  tone?: "accent" | "neutral"
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
        tone === "accent"
          ? "bg-[var(--mg-green-soft)] text-[var(--mg-green)]"
          : "bg-[var(--mg-hover)] text-[var(--mg-text-soft)]",
      )}
    >
      {label}
    </span>
  )
}

/* ----------------------------------------------------------------
 * ThemeModal — bottom-sheet on mobile, centered dialog on larger screens.
 * Open/close is fully controlled by the host via `open` + `onClose`.
 * ---------------------------------------------------------------- */
export function ThemeModal({
  open,
  onClose,
  children,
  title,
  description,
  className,
  mode = "dark",
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
  className?: string
  mode?: ThemeMode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modern-green-theme fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      data-mode={mode}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="mg-overlay absolute inset-0 bg-transparent backdrop-blur-md"
      />
      <div
        className={cn(
          "mg-sheet relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl sm:m-4 sm:max-w-md sm:rounded-3xl",
          "mg-glass-strong",
          className,
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-3 px-5 pt-5">
            <div className="space-y-1">
              {title && (
                <h2 className="text-lg font-bold tracking-tight text-balance">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-sm leading-relaxed text-[var(--mg-text-soft)] text-pretty">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="mg-glass -mt-1 flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--mg-text-soft)] transition-colors hover:text-[var(--mg-text)]"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        <div className="mg-no-scrollbar flex-1 overflow-y-auto px-5 pb-5 pt-4">
          {children}
        </div>
      </div>
    </div>
  )
}

/* ----------------------------------------------------------------
 * ThemeSummaryRow — a label/value row used across summary cards.
 * ---------------------------------------------------------------- */
export function ThemeSummaryRow({
  label,
  value,
  emphasis,
  accent,
}: {
  label: ReactNode
  value: ReactNode
  /** larger, bolder row for totals */
  emphasis?: boolean
  /** render the value in the brand accent color */
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={cn(
          emphasis
            ? "text-sm font-semibold text-[var(--mg-text)]"
            : "text-sm text-[var(--mg-text-soft)]",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          emphasis ? "text-base font-bold" : "text-sm font-medium",
          accent ? "text-[var(--mg-green)]" : "text-[var(--mg-text)]",
        )}
      >
        {value}
      </span>
    </div>
  )
}

/* ----------------------------------------------------------------
 * ThemeDivider — subtle separator.
 * ---------------------------------------------------------------- */
export function ThemeDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn("h-px w-full bg-[var(--mg-border)]", className)}
      aria-hidden="true"
    />
  )
}


/* ----------------------------------------------------------------
 * ThemeModeToggle — demo/control switch for dark and light variants.
 * ---------------------------------------------------------------- */
export function ThemeModeToggle({
  mode,
  onChange,
  className,
  iconOnly = false,
}: {
  mode: ThemeMode
  onChange: (mode: ThemeMode) => void
  className?: string
  iconOnly?: boolean
}) {
  const nextMode: ThemeMode = mode === "dark" ? "light" : "dark"

  return (
    <button
      type="button"
      onClick={() => onChange(nextMode)}
      className={cn(
        iconOnly
          ? "mg-glass inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--mg-text-soft)] transition-all hover:bg-[var(--mg-hover)] hover:text-[var(--mg-text)] active:translate-y-px"
          : "mg-glass-strong inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold text-[var(--mg-text)] shadow-[var(--mg-card-shadow)] transition-all hover:bg-[var(--mg-hover)]",
        className,
      )}
      aria-label={`Switch to ${nextMode} mode`}
      title={`Switch to ${nextMode} mode`}
    >
      {mode === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      {!iconOnly && <span>{mode === "dark" ? "Dark" : "Light"}</span>}
    </button>
  )
}

/* ----------------------------------------------------------------
 * ThemeStepper — round +/- quantity / count control.
 * ---------------------------------------------------------------- */
export function ThemeStepper({
  value,
  onIncrement,
  onDecrement,
  min = 0,
  ariaLabel,
}: {
  value: number
  onIncrement: () => void
  onDecrement: () => void
  min?: number
  ariaLabel?: string
}) {
  return (
    <div
      className="mg-glass inline-flex items-center gap-1 rounded-full p-1"
      aria-label={ariaLabel}
    >
      <button
        type="button"
        onClick={onDecrement}
        disabled={value <= min}
        aria-label="Decrease"
        className="flex size-8 items-center justify-center rounded-full text-lg leading-none text-[var(--mg-text)] transition-colors hover:bg-[var(--mg-hover)] disabled:opacity-40"
      >
        −
      </button>
      <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={onIncrement}
        aria-label="Increase"
        className="flex size-8 items-center justify-center rounded-full bg-[var(--mg-green)] text-lg leading-none text-[var(--mg-on-green)] transition-colors hover:bg-[var(--mg-green-strong)]"
      >
        +
      </button>
    </div>
  )
}

/* ----------------------------------------------------------------
 * ThemeInput / ThemeTextarea — themed form fields (no logic attached).
 * ---------------------------------------------------------------- */
export function ThemeInput({
  label,
  id,
  className,
  ...props
}: { label?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-[var(--mg-text-soft)]"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          "mg-glass h-11 w-full rounded-2xl px-4 text-sm text-[var(--mg-text)] placeholder:text-[var(--mg-text-dim)] outline-none transition-all focus:ring-2 focus:ring-[var(--mg-green-ring)]",
          className,
        )}
        {...props}
      />
    </div>
  )
}

export function ThemeTextarea({
  label,
  id,
  className,
  ...props
}: { label?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-[var(--mg-text-soft)]"
        >
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={cn(
          "mg-glass min-h-28 w-full resize-none rounded-2xl px-4 py-3 text-sm text-[var(--mg-text)] placeholder:text-[var(--mg-text-dim)] outline-none transition-all focus:ring-2 focus:ring-[var(--mg-green-ring)]",
          className,
        )}
        {...props}
      />
    </div>
  )
}
