"use client"

import React from "react"
import type { MenuItem } from "@/lib/data"
import type { CheckoutStep } from "@/features/checkout/types"
import { useOrganicCheckoutDomPolish } from "@/features/customer-menu/legacy-dom-repairs/useOrganicCheckoutDomPolish"

type OrganicMessageData = { type?: string; item?: MenuItem; quantity?: number }
type OrganicToastOptions = { title?: string; description?: string; variant?: "default" | "destructive" | null }
type OrganicSharedOrder = { status?: string } | null

type UseOrganicThemeEffectsProps = {
  enabled: boolean
  tableIdString: string
  shouldShowTableOrderAction: boolean
  sharedTableOrder: OrganicSharedOrder
  handleWaiterClick: () => void
  handleNoteClick: () => void
  handleCartClick: () => void
  setPaymentModalInitialStep: (step: CheckoutStep) => void
  setPaymentModalOpen: (open: boolean) => void
  addToCart: (item: MenuItem) => void
  handleFirstAdd: (item: MenuItem) => void
  toast: (options: OrganicToastOptions) => void
}

export function useOrganicThemeEffects(props: UseOrganicThemeEffectsProps) {
  const {
    enabled,
    tableIdString,
    shouldShowTableOrderAction,
    sharedTableOrder,
    handleWaiterClick,
    handleNoteClick,
    handleCartClick,
    setPaymentModalInitialStep,
    setPaymentModalOpen,
    addToCart,
    handleFirstAdd,
    toast,
  } = props

  useOrganicCheckoutDomPolish(enabled)

  // PMD_ORGANIC_V0_PARENT_MESSAGE_BRIDGE_FINAL_20260607
  React.useEffect(() => {
    if (!enabled || typeof window === "undefined") return

    function handleBotanicalV0Message(event: MessageEvent) {
      if (event.origin !== window.location.origin) return

      const data = (event.data || {}) as OrganicMessageData
      const type = String(data.type || "")

      if (type === "pmd:call-waiter") {
        handleWaiterClick()
        return
      }

      if (type === "pmd:add-note") {
        handleNoteClick()
        return
      }

      if (type === "pmd:checkout") {
        handleCartClick()
        return
      }

      if (type === "pmd:table-order") {
        if (!shouldShowTableOrderAction) return

        setPaymentModalInitialStep(
          sharedTableOrder?.status === "draft"
            ? "review"
            : sharedTableOrder?.status === "paid"
              ? "paid"
              : "submitted"
        )

        setPaymentModalOpen(true)
        return
      }

      if (type === "pmd:add-item" && data.item) {
        const itemToAdd = data.item as MenuItem
        const quantity = Math.max(1, Number(data.quantity || 1))

        for (let i = 0; i < quantity; i++) {
          addToCart(itemToAdd)
        }

        handleFirstAdd(itemToAdd)
        toast({
          title: "Added to order",
          description: String(itemToAdd.name || "Item added"),
        })
        return
      }

      if (type === "pmd:open-valet") {
        const currentSearch = window.location.search || ""

        if (tableIdString) {
          window.location.href = `/table/${tableIdString}/valet${currentSearch}`
        } else {
          window.location.href = `/valet${currentSearch}`
        }
      }
    }

    window.addEventListener("message", handleBotanicalV0Message)
    return () => window.removeEventListener("message", handleBotanicalV0Message)
  }, [
    enabled,
    tableIdString,
    shouldShowTableOrderAction,
    sharedTableOrder?.status,
    handleWaiterClick,
    handleNoteClick,
    handleCartClick,
    setPaymentModalInitialStep,
    setPaymentModalOpen,
    addToCart,
    handleFirstAdd,
    toast,
  ])

  // PMD_ORGANIC_DOCK_DELEGATED_ACTIONS_20260608
  React.useEffect(() => {
    if (!enabled || typeof document === "undefined") return

    let lastActionAt = 0

    function runOrganicDockAction(action: string) {
      if (action === "waiter") {
        handleWaiterClick()
        return
      }

      if (action === "note") {
        handleNoteClick()
        return
      }

      if (action === "checkout") {
        handleCartClick()
        return
      }

      if (action === "table-order") {
        if (!shouldShowTableOrderAction) return

        setPaymentModalInitialStep(
          sharedTableOrder?.status === "draft"
            ? "review"
            : sharedTableOrder?.status === "paid"
              ? "paid"
              : "submitted"
        )

        setPaymentModalOpen(true)
      }
    }

    function onOrganicDockPress(event: Event) {
      const target = event.target as HTMLElement | null
      const button = target?.closest?.("[data-pmd-organic-dock-action]") as HTMLElement | null
      if (!button) return

      const now = Date.now()
      if (now - lastActionAt < 350) return
      lastActionAt = now

      event.preventDefault()
      event.stopPropagation()
      ;(event as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.()

      const action = String(button.getAttribute("data-pmd-organic-dock-action") || "")
      console.info("PMD_ORGANIC_DOCK_CLICK", action)
      runOrganicDockAction(action)
    }

    document.addEventListener("pointerdown", onOrganicDockPress, true)
    document.addEventListener("click", onOrganicDockPress, true)

    return () => {
      document.removeEventListener("pointerdown", onOrganicDockPress, true)
      document.removeEventListener("click", onOrganicDockPress, true)
    }
  }, [
    enabled,
    shouldShowTableOrderAction,
    sharedTableOrder?.status,
    handleWaiterClick,
    handleNoteClick,
    handleCartClick,
    setPaymentModalInitialStep,
    setPaymentModalOpen,
  ])

  // PMD_ORGANIC_BODY_MODAL_STYLE_MARKER_20260608
  React.useEffect(() => {
    if (typeof document === "undefined") return

    if (enabled) {
      document.body.setAttribute("data-pmd-organic-botanical-active", "1")
      document.documentElement.setAttribute("data-pmd-organic-botanical-active", "1")
    } else {
      document.body.removeAttribute("data-pmd-organic-botanical-active")
      document.documentElement.removeAttribute("data-pmd-organic-botanical-active")
    }

    return () => {
      document.body.removeAttribute("data-pmd-organic-botanical-active")
      document.documentElement.removeAttribute("data-pmd-organic-botanical-active")
    }
  }, [enabled])
}
