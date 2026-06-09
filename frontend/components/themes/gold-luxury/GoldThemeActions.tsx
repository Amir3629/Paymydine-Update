"use client"

import type { ReactNode } from "react"
import type { ThemeMenuActions } from "@/components/themes/types"
import { ThemeActionButton } from "@/components/themes/shared/ThemeActionButton"

type GoldThemeActionButtonProps = {
  actions: ThemeMenuActions
  children?: ReactNode
  className?: string
  "aria-label"?: string
  disabled?: boolean
}

export function GoldValetButton({ actions, children, className, "aria-label": ariaLabel = "Open valet", disabled }: GoldThemeActionButtonProps) {
  return (
    <ThemeActionButton className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onOpenValet()}>
      {children ?? "Valet"}
    </ThemeActionButton>
  )
}

export function GoldWaiterButton({ actions, children, className, "aria-label": ariaLabel = "Call waiter", disabled }: GoldThemeActionButtonProps) {
  return (
    <ThemeActionButton className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onCallWaiter()}>
      {children ?? "Waiter"}
    </ThemeActionButton>
  )
}

export function GoldNoteButton({ actions, children, className, "aria-label": ariaLabel = "Open note", disabled }: GoldThemeActionButtonProps) {
  return (
    <ThemeActionButton className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onOpenNote()}>
      {children ?? "Note"}
    </ThemeActionButton>
  )
}

export function GoldCheckoutButton({ actions, children, className, "aria-label": ariaLabel = "Open checkout", disabled }: GoldThemeActionButtonProps) {
  return (
    <ThemeActionButton className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onOpenCheckout()}>
      {children ?? "Checkout"}
    </ThemeActionButton>
  )
}
