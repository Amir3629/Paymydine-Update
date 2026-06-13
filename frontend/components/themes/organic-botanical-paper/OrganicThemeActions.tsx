"use client"

import React from "react"
import type { ReactNode } from "react"
import type { ThemeMenuActions } from "@/components/themes/shared/ThemeActionContract"
import { ThemeActionButton } from "@/components/themes/shared/ThemeActionButton"

type OrganicThemeActionButtonProps = {
  actions: ThemeMenuActions
  children?: ReactNode
  className?: string
  "aria-label"?: string
  disabled?: boolean
}

export function OrganicValetButton({ actions, children, className, "aria-label": ariaLabel = "Open valet", disabled }: OrganicThemeActionButtonProps) {
  return (
    <ThemeActionButton className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onOpenValet()}>
      {children ?? "Valet"}
    </ThemeActionButton>
  )
}

export function OrganicWaiterButton({ actions, children, className, "aria-label": ariaLabel = "Call waiter", disabled }: OrganicThemeActionButtonProps) {
  return (
    <ThemeActionButton className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onCallWaiter()}>
      {children ?? "Waiter"}
    </ThemeActionButton>
  )
}

export function OrganicNoteButton({ actions, children, className, "aria-label": ariaLabel = "Open note", disabled }: OrganicThemeActionButtonProps) {
  return (
    <ThemeActionButton className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onOpenNote()}>
      {children ?? "Note"}
    </ThemeActionButton>
  )
}

export function OrganicCheckoutButton({ actions, children, className, "aria-label": ariaLabel = "Open checkout", disabled }: OrganicThemeActionButtonProps) {
  return (
    <ThemeActionButton className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onOpenCheckout()}>
      {children ?? "Checkout"}
    </ThemeActionButton>
  )
}
