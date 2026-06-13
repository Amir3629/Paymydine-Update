"use client"

import type { ReactNode } from "react"
import type { ThemeMenuActions } from "@/components/themes/shared/ThemeActionContract"
import { ThemeActionButton, type ThemeActionButtonProps } from "@/components/themes/shared/ThemeActionButton"

type GoldThemeActionButtonProps = {
  actions: ThemeMenuActions
  children?: ReactNode
  className?: string
  "aria-label"?: string
  disabled?: boolean
}

type GoldPassthroughActionButtonProps = GoldThemeActionButtonProps & Omit<ThemeActionButtonProps, "children" | "className" | "disabled" | "onClick" | "aria-label">

export function GoldValetButton({ actions, children, className, "aria-label": ariaLabel = "Open valet", disabled, ...buttonProps }: GoldPassthroughActionButtonProps) {
  return (
    <ThemeActionButton {...buttonProps} className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onOpenValet()}>
      {children ?? "Valet"}
    </ThemeActionButton>
  )
}

export function GoldWaiterButton({ actions, children, className, "aria-label": ariaLabel = "Call waiter", disabled, ...buttonProps }: GoldPassthroughActionButtonProps) {
  return (
    <ThemeActionButton {...buttonProps} className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onCallWaiter()}>
      {children ?? "Waiter"}
    </ThemeActionButton>
  )
}

export function GoldNoteButton({ actions, children, className, "aria-label": ariaLabel = "Open note", disabled, ...buttonProps }: GoldPassthroughActionButtonProps) {
  return (
    <ThemeActionButton {...buttonProps} className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onOpenNote()}>
      {children ?? "Note"}
    </ThemeActionButton>
  )
}

export function GoldCheckoutButton({ actions, children, className, "aria-label": ariaLabel = "Open checkout", disabled, ...buttonProps }: GoldPassthroughActionButtonProps) {
  return (
    <ThemeActionButton {...buttonProps} className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onOpenCheckout()}>
      {children ?? "Checkout"}
    </ThemeActionButton>
  )
}

export function GoldTableOrderButton({ actions, children, className, "aria-label": ariaLabel = "Table order", disabled, ...buttonProps }: GoldPassthroughActionButtonProps) {
  return (
    <ThemeActionButton {...buttonProps} className={className} aria-label={ariaLabel} disabled={disabled} onClick={() => void actions.onOpenTableOrder()}>
      {children ?? "Table order"}
    </ThemeActionButton>
  )
}
