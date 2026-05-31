"use client"

import { useLayoutEffect, useRef } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { useLanguageStore } from "@/store/language-store"

function readCssVar(style: CSSStyleDeclaration, name: string, fallback = "") {
  return style.getPropertyValue(name).trim() || fallback
}

function isCheckoutLockdownNode(el: Element | null | undefined) {
  return !!el?.closest?.('[data-pmd-checkout-lockdown="1"]')
}

function setImportant(el: HTMLElement, prop: string, value: string) {
  if (!value || isCheckoutLockdownNode(el)) return

  const currentValue = el.style.getPropertyValue(prop).trim()
  const currentPriority = el.style.getPropertyPriority(prop)

  if (currentValue === value && currentPriority === "important") {
    return
  }

  el.style.setProperty(prop, value, "important")
}

function applyTextColor(el: HTMLElement, color: string) {
  setImportant(el, "color", color)
  setImportant(el, "stroke", color)
  setImportant(el, "-webkit-text-fill-color", color)
}

function isSmallIncreaseButton(el: HTMLElement) {

  return (
    el.tagName.toLowerCase() === "button" &&
    el.getAttribute("aria-label") === "Increase quantity" &&
    !el.classList.contains("quantity-btn")
  )
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguageStore()
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "de" : "en")
  }

  useLayoutEffect(() => {
    if (typeof window === "undefined") return

    let frame = 0
    let timerOne = 0
    let timerTwo = 0

    const applyThemeInlineFixes = () => {
      const rootStyle = window.getComputedStyle(document.documentElement)
      const themeId = document.documentElement.getAttribute("data-theme") || ""

      const actionBg = readCssVar(rootStyle, "--pmd-v2-action-bg", readCssVar(rootStyle, "--theme-button"))
      let actionText = readCssVar(rootStyle, "--pmd-v2-action-text", "#111827")
      const actionBorder = readCssVar(rootStyle, "--pmd-v2-action-border", actionBg)

      const badgeBg = readCssVar(rootStyle, "--pmd-v2-badge-bg", actionBg)
      let badgeText = readCssVar(rootStyle, "--pmd-v2-badge-text", actionText)
      const badgeBorder = readCssVar(rootStyle, "--pmd-v2-badge-border", actionBorder)

      let priceColor = readCssVar(rootStyle, "--pmd-v2-price", actionBg)

      const cardBg = readCssVar(rootStyle, "--pmd-v2-card-bg", "")
      const cardSubBg = readCssVar(rootStyle, "--pmd-v2-card-sub-bg", cardBg)
      const textColor = readCssVar(rootStyle, "--pmd-v2-text", "#111827")
      const mutedTextColor = readCssVar(rootStyle, "--pmd-v2-text-muted", textColor)

      if (themeId === "vibrant-colors") {
        actionText = "#111827"
        badgeText = "#111827"
        priceColor = "#111827"
      }

      const applySmallPlusAction = (el: HTMLElement) => {
        const plusText = themeId === "minimal" ? "#ffffff" : "#111827"

        setImportant(el, "top", "-0.72rem")
        setImportant(el, "right", "-0.72rem")
        setImportant(el, "width", "1.55rem")
        setImportant(el, "height", "1.55rem")
        setImportant(el, "min-width", "1.55rem")
        setImportant(el, "min-height", "1.55rem")
        setImportant(el, "display", "inline-flex")
        setImportant(el, "align-items", "center")
        setImportant(el, "justify-content", "center")
        setImportant(el, "padding", "0")
        setImportant(el, "border-radius", "9999px")
        setImportant(el, "background", actionBg)
        setImportant(el, "background-color", actionBg)
        setImportant(el, "background-image", "none")
        setImportant(el, "color", plusText)
        setImportant(el, "-webkit-text-fill-color", plusText)
        setImportant(el, "border", `1px solid ${actionBorder}`)
        setImportant(el, "border-color", actionBorder)
        setImportant(el, "outline", "0")
        setImportant(el, "outline-color", "transparent")
        setImportant(el, "box-shadow", "none")
        setImportant(el, "text-decoration", "none")
        setImportant(el, "text-shadow", "none")
        setImportant(el, "line-height", "1")
        setImportant(el, "font-weight", "800")
        setImportant(el, "font-size", "0.9rem")

        el.querySelectorAll<HTMLElement>("svg, svg *, span, div").forEach((child) => {
          applyTextColor(child, plusText)
          setImportant(child, "text-decoration", "none")
          setImportant(child, "text-shadow", "none")
        })
      }

      const applyAction = (el: HTMLElement) => {
        if (isSmallIncreaseButton(el)) {
          applySmallPlusAction(el)
          return
        }

        setImportant(el, "background", actionBg)
        setImportant(el, "background-color", actionBg)
        setImportant(el, "background-image", "none")
        setImportant(el, "color", actionText)
        setImportant(el, "-webkit-text-fill-color", actionText)
        setImportant(el, "border-color", actionBorder)
        setImportant(el, "outline-color", actionBorder)
        setImportant(el, "text-decoration", "none")

        el.querySelectorAll<HTMLElement>("svg, svg *, span, div").forEach((child) => {
          applyTextColor(child, actionText)
        })
      }

      const applyBadge = (el: HTMLElement) => {
        setImportant(el, "background", badgeBg)
        setImportant(el, "background-color", badgeBg)
        setImportant(el, "background-image", "none")
        setImportant(el, "color", badgeText)
        setImportant(el, "-webkit-text-fill-color", badgeText)
        setImportant(el, "border", `1px solid ${badgeBorder}`)
        setImportant(el, "border-color", badgeBorder)
        setImportant(el, "outline-color", badgeBorder)

        el.querySelectorAll<HTMLElement>("svg, svg *, span, div").forEach((child) => {
          applyTextColor(child, badgeText)
        })
      }

      const applyPrice = (el: HTMLElement) => {
        applyTextColor(el, priceColor)
      }

      const applyCardSurface = (el: HTMLElement, useSub = false) => {
        if (!cardBg) return
        if (themeId !== "vibrant-colors" && themeId !== "minimal") return

        const bg = useSub ? cardSubBg : cardBg

        setImportant(el, "background", bg)
        setImportant(el, "background-color", bg)
        setImportant(el, "background-image", "none")
        setImportant(el, "color", textColor)
        setImportant(el, "-webkit-text-fill-color", textColor)
        setImportant(el, "border-color", bg)

        el.querySelectorAll<HTMLElement>("h1, h2, h3, p, label, span, div, button").forEach((child) => {
          if (
            child.classList.contains("pmd-v2-action-circle") ||
            child.classList.contains("pmd-v2-action-button") ||
            child.classList.contains("pmd-v2-badge") ||
            child.classList.contains("cart-badge") ||
            child.classList.contains("quantity-btn")
          ) {
            return
          }

          applyTextColor(child, textColor)
        })

        el.querySelectorAll<HTMLElement>(".pmd-v2-text-muted").forEach((child) => {
          applyTextColor(child, mutedTextColor)
        })
      }

      const applyOverlay = (el: HTMLElement) => {
        setImportant(el, "background", "rgba(255, 255, 255, 0.015)")
        setImportant(el, "background-color", "rgba(255, 255, 255, 0.015)")
        setImportant(el, "background-image", "none")
        setImportant(el, "backdrop-filter", "blur(16px) saturate(110%)")
        setImportant(el, "-webkit-backdrop-filter", "blur(16px) saturate(110%)")
      }

      const applyToSelector = (selector: string, cb: (el: HTMLElement) => void) => {
        try {
          document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
            if (isCheckoutLockdownNode(el)) return
            cb(el)
          })
        } catch {
          // Ignore selectors unsupported by the browser, such as :has in older engines.
        }
      }

      if (buttonRef.current) {
        applyAction(buttonRef.current)
      }

      [
        ".pmd-v2-action-circle",
        ".pmd-v2-action-button",
        ".home-action-icon-wrap",
        ".quantity-btn",
        "button.quantity-btn",
        "button[aria-label='Increase quantity']",
        ".valet-request-btn",
        "button.valet-request-btn",
        "button:has(svg.lucide-arrow-left)",
        ".page--valet .rounded-full:has(svg.lucide-circle-check)"
      ].forEach((selector) => applyToSelector(selector, applyAction));
      // PMD: badge is single-owner now; do not runtime-force cart badge here.
      ;[
        ".pmd-v2-price",
        ".menu-item-price",
        "p.menu-item-price",
        "span.menu-item-price",
        ".item-price",
        ".price",
        "[class*='price']",
        "[class*='Price']",
        "[style*='--theme-price']",
        "[style*='theme-price']"
      ].forEach((selector) => applyToSelector(selector, applyPrice));

      ;[
        ".page--home .home-action-card",
        ".page--valet .pmd-v2-card",
        ".page--valet .pmd-v2-card form",
        ".page--valet .pmd-v2-card form > div",
        ".page--valet .pmd-v2-card .space-y-2",
        "[data-pmd-food-modal-overlay='true'] .pmd-v2-card",
        "[data-pmd-food-modal-overlay='true'] .overflow-y-auto",
        ".pmd-v2-card:has(.overflow-y-auto.overscroll-contain)",
        "[role='dialog']:has(.overflow-y-auto.overscroll-contain)"
      ].forEach((selector) => applyToSelector(selector, (el) => applyCardSurface(el, false)));

      ;[
        ".page--valet .pmd-v2-card-sub",
        ".page--valet .dark-surface.pmd-v2-card-sub"
      ].forEach((selector) => applyToSelector(selector, (el) => applyCardSurface(el, true)));

      ;[
        "[data-pmd-food-modal-overlay='true']",
        "[data-radix-dialog-overlay]",
        "[data-slot='dialog-overlay']"
      ].forEach((selector) => applyToSelector(selector, applyOverlay))
    }

    const scheduleApply = () => {
      if (frame) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(applyThemeInlineFixes)
    }

    applyThemeInlineFixes()
    scheduleApply()
    timerOne = window.setTimeout(applyThemeInlineFixes, 40)
    timerTwo = window.setTimeout(applyThemeInlineFixes, 160)

    const observer = new MutationObserver(scheduleApply)

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"]
    })

    window.addEventListener("pageshow", scheduleApply)
    window.addEventListener("focus", scheduleApply)
    window.addEventListener("click", scheduleApply)
    window.addEventListener("touchstart", scheduleApply)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      if (timerOne) window.clearTimeout(timerOne)
      if (timerTwo) window.clearTimeout(timerTwo)
      observer.disconnect()
      window.removeEventListener("pageshow", scheduleApply)
      window.removeEventListener("focus", scheduleApply)
      window.removeEventListener("click", scheduleApply)
      window.removeEventListener("touchstart", scheduleApply)
    }
  }, [])

  return (
    <Button
      ref={buttonRef}
      variant="ghost"
      size="icon"
      onClick={toggleLanguage}
      className="relative w-12 h-10 pmd-v2-action-circle overflow-hidden font-semibold hover:opacity-90"
      style={{
        backgroundColor: "var(--pmd-v2-action-bg)",
        color: "var(--pmd-v2-action-text)",
        borderColor: "var(--pmd-v2-action-border)"
      }}
    >
      <motion.div
        key={language}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -20, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 flex items-center justify-center"
        style={{
          color: "var(--pmd-v2-action-text)"
        }}
      >
        {language.toUpperCase()}
      </motion.div>
    </Button>
  )
}
