"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

const PAGE_BG = "#fdf7f4"
const ROSE = "#f0c6b1"
const ROSE_EDGE = "#c7a798"
const BLACK = "#111827"
const GUARD_ATTR = "data-pmd-clean-light-guard"

const CLEANED_STYLE_PROPS = [
  "background",
  "background-color",
  "border",
  "border-color",
  "border-radius",
  "box-shadow",
  "color",
  "-webkit-text-fill-color",
  "-webkit-text-stroke",
  "filter",
  "font-size",
  "gap",
  "height",
  "line-height",
  "margin",
  "min-height",
  "min-width",
  "padding",
  "stroke",
  "text-shadow",
  "width",
]

function isCustomerPath(pathname: string | null) {
  const path = pathname || "/"
  return (
    path === "/" ||
    path === "/menu" ||
    path.startsWith("/menu/") ||
    path === "/valet" ||
    path.startsWith("/table/")
  )
}

function isCleanLightTheme() {
  if (typeof window === "undefined") return false

  const htmlTheme = document.documentElement.getAttribute("data-theme")
  const bodyTheme = document.body?.getAttribute("data-theme")
  const stored =
    localStorage.getItem("paymydine-theme") ||
    localStorage.getItem("mimoza:paymydine-theme") ||
    localStorage.getItem("default:paymydine-theme")

  const values = [htmlTheme, bodyTheme, stored]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())

  return values.includes("clean-light")
}

function markGuarded(el: Element | null | undefined) {
  if (!el) return
  el.setAttribute(GUARD_ATTR, "1")
}

function setImportant(el: HTMLElement | null | undefined, prop: string, value: string) {
  if (!el) return
  markGuarded(el)
  el.style.setProperty(prop, value, "important")
}

function setSvgImportant(el: SVGElement | null | undefined, prop: string, value: string) {
  if (!el) return
  markGuarded(el)
  el.style.setProperty(prop, value, "important")
}

function cleanupGuardedStyles() {
  if (typeof document === "undefined") return

  document.querySelectorAll<HTMLElement | SVGElement>(`[${GUARD_ATTR}="1"]`).forEach((el) => {
    CLEANED_STYLE_PROPS.forEach((prop) => el.style.removeProperty(prop))
    el.removeAttribute(GUARD_ATTR)
  })
}

function roseEdgeFilter() {
  return [
    `drop-shadow(0.35px 0 0 ${ROSE_EDGE})`,
    `drop-shadow(-0.35px 0 0 ${ROSE_EDGE})`,
    `drop-shadow(0 0.35px 0 ${ROSE_EDGE})`,
    `drop-shadow(0 -0.35px 0 ${ROSE_EDGE})`,
  ].join(" ")
}

function applyBaseBackground(pathname: string | null) {
  if (!isCustomerPath(pathname)) return

  const root = document.documentElement
  const body = document.body

  root.style.setProperty("--theme-background", PAGE_BG, "important")
  root.style.setProperty("--pmd-rose-fill", ROSE, "important")
  root.style.setProperty("--pmd-rose-edge", ROSE_EDGE, "important")

  const targets: Array<HTMLElement | null | undefined> = [
    root,
    body,
    document.querySelector("body > div") as HTMLElement | null,
    document.querySelector("body > div > div") as HTMLElement | null,
    document.querySelector("main") as HTMLElement | null,
    document.querySelector(".bg-theme-background") as HTMLElement | null,
    document.querySelector(".min-h-screen") as HTMLElement | null,
    document.querySelector(".page--home") as HTMLElement | null,
    document.querySelector(".page--menu") as HTMLElement | null,
    document.querySelector(".page--valet") as HTMLElement | null,
  ]

  for (const el of targets) {
    setImportant(el, "background", PAGE_BG)
    setImportant(el, "background-color", PAGE_BG)
  }
}

function applyHomeStyles(pathname: string | null) {
  if (pathname !== "/") return

  document.querySelectorAll<HTMLElement>(".home-action-card").forEach((el) => {
    // Single owner for Clean Light homepage cards.
    // This prevents white/pink flicker and fixes computedBg becoming transparent.
    setImportant(el, "background", "#fbebe3")
    setImportant(el, "background-color", "#fbebe3")
    setImportant(el, "border-color", "rgba(199, 167, 152, 0.45)")
    setImportant(el, "color", "#111827")
  })

  document.querySelectorAll<HTMLElement>(".home-action-card h2, .home-action-card h2 *").forEach((el) => {
    setImportant(el, "color", BLACK)
    setImportant(el, "-webkit-text-fill-color", BLACK)
  })

  document.querySelectorAll<HTMLElement>(".home-action-icon-wrap").forEach((el) => {
    setImportant(el, "background", ROSE)
    setImportant(el, "background-color", ROSE)
    setImportant(el, "border-color", ROSE_EDGE)
    setImportant(el, "padding", "1.15rem")
    setImportant(el, "margin-bottom", "1.25rem")
  })

  document.querySelectorAll<SVGElement>(".home-action-icon-wrap svg, .home-action-icon-wrap svg *").forEach((el) => {
    setSvgImportant(el, "color", BLACK)
    setSvgImportant(el, "stroke", BLACK)
  })
}

function applyValetStyles(pathname: string | null) {
  if (pathname !== "/valet" && !String(pathname || "").startsWith("/table/")) return

  document.querySelectorAll<HTMLElement>("button.valet-request-btn, .valet-request-btn").forEach((el) => {
    setImportant(el, "background", ROSE)
    setImportant(el, "background-color", ROSE)
    setImportant(el, "color", BLACK)
    setImportant(el, "-webkit-text-fill-color", BLACK)
    setImportant(el, "border-color", ROSE_EDGE)
  })

  document.querySelectorAll<SVGElement>(
    "svg.lucide-car, svg.lucide-car-front, svg.lucide-key-round, svg.lucide-concierge-bell, svg.lucide-circle-parking, svg.lucide-parking-circle"
  ).forEach((el) => {
    setSvgImportant(el, "box-sizing", "content-box")
    setSvgImportant(el, "padding", "0.65rem")
    setSvgImportant(el, "border-radius", "9999px")
    setSvgImportant(el, "background", ROSE)
    setSvgImportant(el, "background-color", ROSE)
    setSvgImportant(el, "border", `1px solid ${ROSE_EDGE}`)
    setSvgImportant(el, "color", BLACK)
    setSvgImportant(el, "stroke", BLACK)
  })

  document.querySelectorAll<SVGElement>(
    "svg.lucide-car *, svg.lucide-car-front *, svg.lucide-key-round *, svg.lucide-concierge-bell *, svg.lucide-circle-parking *, svg.lucide-parking-circle *"
  ).forEach((el) => {
    setSvgImportant(el, "color", BLACK)
    setSvgImportant(el, "stroke", BLACK)
  })
}

function applySharedControlStyles(pathname: string | null) {
  if (!isCustomerPath(pathname)) return

  document.querySelectorAll<HTMLElement>(".quantity-btn, .quantity-btn span").forEach((el) => {
    setImportant(el, "color", BLACK)
    setImportant(el, "-webkit-text-fill-color", BLACK)
    setImportant(el, "text-shadow", "none")
  })

  document.querySelectorAll<SVGElement>("svg.lucide-minus, .quantity-btn svg.lucide-minus").forEach((el) => {
    setSvgImportant(el, "color", BLACK)
    setSvgImportant(el, "stroke", BLACK)
    setSvgImportant(el, "filter", "none")
  })

  document.querySelectorAll<SVGElement>("svg.lucide-chevron-up, svg.text-paydine-champagne").forEach((el) => {
    setSvgImportant(el, "color", ROSE)
    setSvgImportant(el, "stroke", ROSE)
    setSvgImportant(el, "filter", roseEdgeFilter())
  })

  document.querySelectorAll<HTMLButtonElement>(
    'button[aria-label="Call Waiter"], button[aria-label="Leave Note"], button[aria-label="View Cart"]'
  ).forEach((button) => {
    setImportant(button, "background", "transparent")
    setImportant(button, "background-color", "transparent")
    setImportant(button, "border", "none")
    setImportant(button, "box-shadow", "none")
    setImportant(button, "color", BLACK)
    setImportant(button, "border-radius", "0")

    button.querySelectorAll<SVGElement>("svg, svg *").forEach((el) => {
      setSvgImportant(el, "color", BLACK)
      setSvgImportant(el, "stroke", BLACK)
      setSvgImportant(el, "filter", "none")
    })
  })

  document.querySelectorAll<HTMLElement>(".cart-badge, .cart-badge *").forEach((el) => {
    setImportant(el, "color", BLACK)
    setImportant(el, "-webkit-text-fill-color", BLACK)
  })

  document.querySelectorAll<HTMLElement>(
    "#toolbar-inner-fixed .menu-item-price, #toolbar-inner-fixed .text-paydine-champagne"
  ).forEach((el) => {
    setImportant(el, "color", BLACK)
    setImportant(el, "-webkit-text-fill-color", BLACK)
    setImportant(el, "-webkit-text-stroke", "0")
    setImportant(el, "text-shadow", "none")
    setImportant(el, "filter", "none")
  })

  document.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
    const arrow = button.querySelector<SVGElement>("svg.lucide-arrow-left")
    if (!arrow) return

    setImportant(button, "width", "2.25rem")
    setImportant(button, "height", "2.25rem")
    setImportant(button, "min-width", "2.25rem")
    setImportant(button, "min-height", "2.25rem")
    setImportant(button, "padding", "0")
    setImportant(button, "gap", "0")
    setImportant(button, "border-radius", "9999px")
    setImportant(button, "border", `1px solid ${ROSE_EDGE}`)
    setImportant(button, "background", ROSE)
    setImportant(button, "background-color", ROSE)
    setImportant(button, "color", BLACK)
    setImportant(button, "font-size", "0")
    setImportant(button, "line-height", "0")
    setImportant(button, "box-shadow", "0 8px 18px rgba(17, 24, 39, 0.10), inset 0 0 0 1px rgba(255,255,255,0.32)")

    setSvgImportant(arrow, "width", "1.25rem")
    setSvgImportant(arrow, "height", "1.25rem")
    setSvgImportant(arrow, "margin", "0")
    setSvgImportant(arrow, "color", BLACK)
    setSvgImportant(arrow, "stroke", BLACK)
    setSvgImportant(arrow, "filter", "none")

    arrow.querySelectorAll<SVGElement>("*").forEach((el) => {
      setSvgImportant(el, "color", BLACK)
      setSvgImportant(el, "stroke", BLACK)
      setSvgImportant(el, "filter", "none")
    })
  })
}

function applyCleanLightCustomerUI(pathname: string | null) {
  if (!isCustomerPath(pathname)) return

  if (!isCleanLightTheme()) {
    cleanupGuardedStyles()
    return
  }

  applyBaseBackground(pathname)
  applyHomeStyles(pathname)
  applyValetStyles(pathname)
  applySharedControlStyles(pathname)
}

export default function CleanLightCustomerGuard() {
  const pathname = usePathname()

  useEffect(() => {
    if (!isCustomerPath(pathname)) return

    applyCleanLightCustomerUI(pathname)

    const timers = [80, 250, 700, 1400, 2400].map((delay) =>
      window.setTimeout(() => applyCleanLightCustomerUI(pathname), delay)
    )

    const onFocus = () => applyCleanLightCustomerUI(pathname)
    const onPageShow = () => applyCleanLightCustomerUI(pathname)
    const onInteraction = () => {
      window.requestAnimationFrame(() => applyCleanLightCustomerUI(pathname))
      window.setTimeout(() => applyCleanLightCustomerUI(pathname), 80)
      window.setTimeout(() => applyCleanLightCustomerUI(pathname), 220)
    }

    window.addEventListener("focus", onFocus)
    window.addEventListener("pageshow", onPageShow)
    document.addEventListener("click", onInteraction, true)
    document.addEventListener("touchend", onInteraction, true)

    return () => {
      timers.forEach(window.clearTimeout)
      window.removeEventListener("focus", onFocus)
      window.removeEventListener("pageshow", onPageShow)
      document.removeEventListener("click", onInteraction, true)
      document.removeEventListener("touchend", onInteraction, true)
    }
  }, [pathname])

  


  return null
}
