"use client"

import { useEffect } from "react"

const hasCheckoutThemeRoot = () =>
  typeof document !== "undefined" && Boolean(document.querySelector('[data-pmd-checkout-theme-root="1"]'))

export function useCheckoutVisualRepairs() {
  // Legacy checkout visual repairs only. These do not create theme controls or bottom docks.
  useEffect(() => {
    if (typeof document === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const fixQuantityIcons = () => {
      document
        .querySelectorAll('[role="dialog"] button svg.lucide-plus, [role="dialog"] button svg.lucide-minus, [data-pmd-gold-checkout-modal] button svg.lucide-plus, [data-pmd-gold-checkout-modal] button svg.lucide-minus')
        .forEach((svg) => {
          const nodes = [svg, ...Array.from(svg.querySelectorAll("*"))]
          nodes.forEach((node) => {
            if (!(node instanceof HTMLElement) && !(node instanceof SVGElement)) return
            ;(node as HTMLElement | SVGElement).style.setProperty("color", "#FFFFFF", "important")
            ;(node as HTMLElement | SVGElement).style.setProperty("stroke", "#FFFFFF", "important")
            ;(node as HTMLElement | SVGElement).style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
          })
        })
    }

    fixQuantityIcons()
    const timer = window.setInterval(fixQuantityIcons, 250)
    const observer = new MutationObserver(fixQuantityIcons)
    if (document.body) {
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"] })
    }

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const hideBaseAmountRows = () => {
      const roots = document.querySelectorAll("[data-pmd-checkout-scroll], [role='dialog']")
      roots.forEach((root) => {
        root.querySelectorAll("span, p, div").forEach((node) => {
          const text = (node.textContent || "").trim()
          if (text !== "Base amount") return

          const row =
            node.closest("div.flex") ||
            node.closest("div[class*='justify-between']") ||
            node.parentElement

          if (row instanceof HTMLElement) {
            row.style.setProperty("display", "none", "important")
          }
        })
      })
    }

    hideBaseAmountRows()
    const timer = window.setInterval(hideBaseAmountRows, 350)
    const observer = new MutationObserver(hideBaseAmountRows)

    if (document.body) {
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["class", "style"],
      })
    }

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const applySplitMethodTextFix = () => {
      document
        .querySelectorAll('button[data-pmd-split-method-real]')
        .forEach((button) => {
          const active = button.getAttribute("data-pmd-active") === "1"
          const color = active ? "#FFFFFF" : "#10201D"
          const nodes = [button, ...Array.from(button.querySelectorAll("*"))]

          nodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return
            node.style.setProperty("color", color, "important")
            node.style.setProperty("-webkit-text-fill-color", color, "important")
            node.style.setProperty("text-decoration-color", color, "important")
          })
        })
    }

    applySplitMethodTextFix()
    const timer = window.setInterval(applySplitMethodTextFix, 150)
    const observer = new MutationObserver(applySplitMethodTextFix)
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-pmd-active", "class", "style"],
    })

    return () => {
      window.clearInterval(timer)
      observer.disconnect()
    }
  }, [])
}
