"use client"

import { useEffect, useLayoutEffect } from "react"
import { createSubmittedTableOrderSnapshot } from "@/features/table-order/table-order-utils"
import {
  getCheckoutStepAfterDraftSubmit,
  getCheckoutStepOnOpen,
  shouldForcePersonalReview,
} from "@/features/checkout/checkout-state-utils"

export function useCheckoutModalLifecycleEffects({
  isOpen,
  merchantSettings,
  setIsDarkTheme,
  paymentLoadVATSettings,
  initialCheckoutStep,
  existingOrderId,
  hasPersonalItems,
  preferPersonalReview,
  setCheckoutStep,
  initialSubmittedOrder,
  tableDraft,
  setSubmittedSnapshot,
  checkoutStep,
  checkoutListViewKey,
  isSubmittedTableDraftForStatus,
  tableInfo,
  taxSettings,
}: any) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      ;(window as any).__CMS_STORE__ = { merchantSettings }
    }
  }, [merchantSettings])

  useEffect(() => {
    const detectDarkTheme = () => {
      const themeName = document.documentElement.getAttribute("data-theme") || "clean-light"
      setIsDarkTheme(themeName === "modern-dark")
    }

    detectDarkTheme()

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "data-theme") {
          detectDarkTheme()
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    return () => observer.disconnect()
  }, [setIsDarkTheme])

  useEffect(() => {
    if (!isOpen) return

    setCheckoutStep((current: any) =>
      getCheckoutStepOnOpen({
        initialCheckoutStep,
        existingOrderId,
        hasPersonalItems,
        preferPersonalReview,
        currentStep: current,
      })
    )
  }, [isOpen, existingOrderId, initialCheckoutStep, hasPersonalItems, preferPersonalReview, setCheckoutStep])

  useEffect(() => {
    if (!initialSubmittedOrder) return
    if ((tableDraft as any)?.draft_id && !(tableDraft as any)?.order_id && !(tableDraft as any)?.orderId) return

    const tableDraftOrderId = Number((tableDraft as any)?.order_id || (tableDraft as any)?.orderId || 0)
    const initialOrderId = Number((initialSubmittedOrder as any)?.orderId || (initialSubmittedOrder as any)?.order_id || 0)

    if (tableDraftOrderId > 0 && initialOrderId > 0 && tableDraftOrderId !== initialOrderId) return

    setSubmittedSnapshot((prev: any) => {
      const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
      if (prevOrderId > 0 && tableDraftOrderId > 0 && prevOrderId === tableDraftOrderId && initialOrderId !== tableDraftOrderId) return prev
      return initialSubmittedOrder
    })
  }, [initialSubmittedOrder, (tableDraft as any)?.draft_id, (tableDraft as any)?.order_id, (tableDraft as any)?.orderId, setSubmittedSnapshot])

  useEffect(() => {
    if (!(tableDraft as any)?.draft_id) return
    if ((tableDraft as any)?.order_id || (tableDraft as any)?.orderId) return

    setSubmittedSnapshot(null)
  }, [(tableDraft as any)?.draft_id, (tableDraft as any)?.order_id, (tableDraft as any)?.orderId, setSubmittedSnapshot])

  useEffect(() => {
    paymentLoadVATSettings()
  }, [paymentLoadVATSettings])

  useEffect(() => {
    if (!isOpen) return

    if (shouldForcePersonalReview({ hasPersonalItems, initialCheckoutStep, currentStep: checkoutStep })) {
      setCheckoutStep("review")
    }
  }, [isOpen, hasPersonalItems, initialCheckoutStep, checkoutStep, setCheckoutStep])

  useLayoutEffect(() => {
    if (!isOpen || typeof document === "undefined") return

    let cleanupTimer: number | undefined
    let retryTimer: number | undefined

    const applyFreeze = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return false

      root.setAttribute("data-pmd-step-freeze", "1")

      cleanupTimer = window.setTimeout(() => {
        root.setAttribute("data-pmd-step-freeze", "0")
        root.removeAttribute("data-pmd-step-freeze")
      }, 850)

      return true
    }

    if (!applyFreeze()) {
      retryTimer = window.setTimeout(applyFreeze, 16)
    }

    return () => {
      if (cleanupTimer) window.clearTimeout(cleanupTimer)
      if (retryTimer) window.clearTimeout(retryTimer)
    }
  }, [isOpen, checkoutStep])

  useLayoutEffect(() => {
    if (!isOpen || typeof window === "undefined" || typeof document === "undefined") return

    const resetCheckoutScrollPositions = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (root) root.scrollTop = 0

      document.querySelectorAll<HTMLElement>(".pmd-checkout-list-scroll").forEach((list) => {
        list.scrollTop = 0
      })
    }

    resetCheckoutScrollPositions()
    const raf = window.requestAnimationFrame(resetCheckoutScrollPositions)

    return () => window.cancelAnimationFrame(raf)
  }, [isOpen, checkoutListViewKey])

  useEffect(() => {
    if (!isOpen) return
    if (checkoutStep !== "review") return
    if (hasPersonalItems || preferPersonalReview) return
    if (!isSubmittedTableDraftForStatus) return

    if (tableDraft) {
      const normalizedTableDraftSnapshot = createSubmittedTableOrderSnapshot(
        tableDraft,
        tableInfo,
        taxSettings?.percentage || 0
      )

      setSubmittedSnapshot((prev: any) => {
        const prevOrderId = Number(prev?.orderId || prev?.order_id || 0)
        const nextOrderId = Number(normalizedTableDraftSnapshot.orderId || 0)

        return !prev || prevOrderId !== nextOrderId
          ? normalizedTableDraftSnapshot
          : { ...prev, ...normalizedTableDraftSnapshot }
      })
    }

    setCheckoutStep(getCheckoutStepAfterDraftSubmit())
  }, [
    isOpen,
    checkoutStep,
    hasPersonalItems,
    preferPersonalReview,
    isSubmittedTableDraftForStatus,
    tableDraft,
    tableInfo?.table_no,
    tableInfo?.table_id,
    taxSettings?.percentage,
    setCheckoutStep,
    setSubmittedSnapshot,
  ])
}
