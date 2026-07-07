"use client"

import "./kazen-standalone.css"
import React, { useEffect, useMemo, useState } from "react"
import {Bell, Car, ClipboardList, Languages, Menu, MessageSquare, Minus, Plus, ShoppingBag, ExternalLink, Share2} from "lucide-react"
import { ModalCard } from "./KazenStandaloneModalCard"
import { KazenItemDetailModal } from "./KazenItemDetailModal"
import { pmdInstallKazenCleanHeaderButtons, pmdInstallKazenFinalDarkMode, pmdInstallKazenPremiumMotion } from "./kazenStandaloneDomRepairs"
import { ALL_CATEGORY, defaultState, itemImage, kazenCategoryIcon, money, normalizeCategories, pmdKazenStableCategoryKey, post, resolveMediaUrl, type KazenItem, type KazenState } from "./kazenStandaloneData"

function normalizeKazenStandaloneMenuLayout(value: unknown): "accordion" | "tabs" {
  const raw = String(value || "").trim().toLowerCase().replace(/[_\s-]+/g, "-")

  if ([
    "tabs",
    "tab",
    "tabbed",
    "classic",
    "normal",
    "list",
    "flat",
    "category-tabs",
    "categories-top",
    "top-categories",
    "category-tabs-full-item-list",
  ].includes(raw)) {
    return "tabs"
  }

  return "accordion"
}


type KazenHeaderLinksV1 = {
  website: { enabled: boolean; url: string }
  social: { enabled: boolean; platform: string; url: string }
}

const PMD_KAZEN_HEADER_LINKS_DEFAULT_V1: KazenHeaderLinksV1 = {
  website: { enabled: false, url: "" },
  social: { enabled: false, platform: "instagram", url: "" },
}


// PMD_AUDIT_PHASE4_V2_WAITER_COOLDOWN
const PMD_KAZEN_WAITER_COOLDOWN_MS = 3 * 60 * 1000

function pmdKazenWaiterCooldownKey(tableLabel: unknown): string {
  const normalized = String(tableLabel || "table").trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "table"
  return `pmd-kazen-waiter-cooldown:${normalized}`
}

function pmdKazenFormatRemaining(ms: number): string {
  const totalSeconds = Math.max(1, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = String(totalSeconds % 60).padStart(2, "0")
  return `${minutes}:${seconds}`
}

function pmdKazenBoolV1(value: unknown): boolean {
  if (typeof value === "boolean") return value
  return ["1", "true", "yes", "on", "enabled"].includes(String(value || "").trim().toLowerCase())
}

function pmdKazenUrlV1(value: unknown): string {
  const raw = String(value || "").trim()
  if (!raw) return ""
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw.replace(/^\/+/, "")}`
}

function pmdKazenReadHeaderLinksV1(payload: any): KazenHeaderLinksV1 {
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {}
  const links = payload?.kazen_header_links || payload?.headerLinks || data?.kazen_header_links || data?.headerLinks || {}

  const websiteUrl = pmdKazenUrlV1(
    links?.website?.url ||
    payload?.pmd_kazen_website_url ||
    data?.pmd_kazen_website_url ||
    payload?.website_url ||
    data?.website_url
  )

  const socialUrl = pmdKazenUrlV1(
    links?.social?.url ||
    payload?.pmd_kazen_social_url ||
    data?.pmd_kazen_social_url ||
    payload?.pmd_social_url ||
    data?.pmd_social_url
  )

  const socialPlatform = String(
    links?.social?.platform ||
    payload?.pmd_kazen_social_platform ||
    data?.pmd_kazen_social_platform ||
    "instagram"
  ).trim().toLowerCase() || "instagram"

  return {
    website: {
      enabled: Boolean(websiteUrl) && pmdKazenBoolV1(
        links?.website?.enabled ??
        payload?.pmd_kazen_website_enabled ??
        data?.pmd_kazen_website_enabled
      ),
      url: websiteUrl,
    },
    social: {
      enabled: Boolean(socialUrl) && pmdKazenBoolV1(
        links?.social?.enabled ??
        payload?.pmd_kazen_social_enabled ??
        data?.pmd_kazen_social_enabled
      ),
      platform: socialPlatform,
      url: socialUrl,
    },
  }
}

function pmdKazenSocialLabelV1(platform: string): string {
  const normalized = String(platform || "").trim().toLowerCase()
  if (normalized === "facebook") return "Facebook"
  if (normalized === "trustpilot") return "Trustpilot"
  if (normalized === "reviews") return "Reviews"
  if (normalized === "website") return "Social"
  return "Instagram"
}

function kazenItemGallery(item?: KazenItem | null): string[] {
  if (!item) return []

  const rawValues: unknown[] = []
  const push = (value: unknown) => {
    if (!value) return
    if (Array.isArray(value)) {
      value.forEach(push)
      return
    }
    rawValues.push(value)
  }

  push(item.image)
  push(item.image_url)
  push(item.thumb)
  push(item.thumbnail)
  push(item.images)
  push((item as any).gallery)
  push((item as any).additional_images)
  push((item as any).additionalImages)
  push((item as any).media)

  const seen = new Set<string>()
  return rawValues
    .map((value) => resolveMediaUrl(value))
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
}

export default function KazenStandalonePage() {
  // PMD_KAZEN_PREMIUM_MOTION_CALL_20260611
  useEffect(() => pmdInstallKazenPremiumMotion(), [])

  // PMD_KAZEN_CLEAN_HEADER_BUTTONS_CALL_20260611
  useEffect(() => pmdInstallKazenCleanHeaderButtons(), [])

  // PMD_KAZEN_DARK_MODE_FINAL_CLEAN_CALL_20260611
  useEffect(() => pmdInstallKazenFinalDarkMode(), [])

  const [state, setState] = useState<KazenState>(defaultState)
  const [openCategory, setOpenCategory] = useState<string>("")
  const [selectedItem, setSelectedItem] = useState<KazenItem | null>(null)
  const [itemQty, setItemQty] = useState(1)
  const [waiterFeedback, setWaiterFeedback] = useState("Request sent")

  // PMD_KAZEN_QTY_DOM_STYLE_FINAL_20260618
  // PMD_KAZEN_QTY_TEXT_SYMBOL_FINAL_20260618
  // Final runtime override for modal quantity controls. This wins over late injected Kazen button CSS.
  useEffect(() => {
    if (!selectedItem || typeof document === "undefined") return

    let cancelled = false

    const applyQtyPolish = () => {
      if (cancelled) return

      const root = document.querySelector<HTMLElement>(
        '.kazen-solid-modal-overlay .kazen-qty[data-pmd-kazen-qty-polished="1"]'
      )
      if (!root) return

      root.style.setProperty("display", "grid", "important")
      root.style.setProperty("grid-template-columns", "58px minmax(0, 1fr) 58px", "important")
      root.style.setProperty("align-items", "stretch", "important")
      root.style.setProperty("height", "58px", "important")
      root.style.setProperty("min-height", "58px", "important")
      root.style.setProperty("margin-top", "26px", "important")
      root.style.setProperty("border", "1px solid rgba(36, 35, 32, .18)", "important")
      root.style.setProperty("background", "rgba(255, 252, 246, .64)", "important")
      root.style.setProperty("box-shadow", "inset 0 1px 0 rgba(255,255,255,.82)", "important")
      root.style.setProperty("overflow", "hidden", "important")

      const buttons = Array.from(root.querySelectorAll<HTMLElement>("button.kazen-qty-btn"))

      buttons.forEach((button, index) => {
        button.style.setProperty("all", "unset", "important")
        button.style.setProperty("box-sizing", "border-box", "important")
        button.style.setProperty("width", "58px", "important")
        button.style.setProperty("height", "58px", "important")
        button.style.setProperty("min-width", "58px", "important")
        button.style.setProperty("min-height", "58px", "important")
        button.style.setProperty("display", "flex", "important")
        button.style.setProperty("align-items", "center", "important")
        button.style.setProperty("justify-content", "center", "important")
        button.style.setProperty("cursor", "pointer", "important")
        button.style.setProperty("background", "transparent", "important")
        button.style.setProperty("background-color", "transparent", "important")
        button.style.setProperty("color", "#242320", "important")
        button.style.setProperty("border-radius", "0", "important")
        button.style.setProperty("box-shadow", "none", "important")
        button.style.setProperty("overflow", "visible", "important")
        button.style.setProperty("appearance", "none", "important")
        button.style.setProperty("-webkit-appearance", "none", "important")
        button.style.setProperty("touch-action", "manipulation", "important")

        if (index === 0) {
          button.style.setProperty("border-right", "1px solid rgba(36, 35, 32, .14)", "important")
        }

        if (index === 1) {
          button.style.setProperty("border-left", "1px solid rgba(36, 35, 32, .14)", "important")
        }

        const svg = button.querySelector<SVGElement>("svg")
        if (svg) {
          svg.style.setProperty("width", "22px", "important")
          svg.style.setProperty("height", "22px", "important")
          svg.style.setProperty("color", "currentColor", "important")
          svg.style.setProperty("stroke", "currentColor", "important")
          svg.style.setProperty("fill", "none", "important")
        }

        button.querySelectorAll<SVGElement>("svg *").forEach((part) => {
          part.style.setProperty("stroke", "currentColor", "important")
          part.style.setProperty("fill", "none", "important")
        })

        const symbol = button.querySelector<HTMLElement>(".kazen-qty-symbol")
        if (symbol) {
          symbol.style.setProperty("display", "inline-flex", "important")
          symbol.style.setProperty("align-items", "center", "important")
          symbol.style.setProperty("justify-content", "center", "important")
          symbol.style.setProperty("width", "100%", "important")
          symbol.style.setProperty("height", "100%", "important")
          symbol.style.setProperty("font-family", "Georgia, 'Times New Roman', serif", "important")
          symbol.style.setProperty("font-size", "2rem", "important")
          symbol.style.setProperty("font-weight", "600", "important")
          symbol.style.setProperty("line-height", "1", "important")
          symbol.style.setProperty("color", "#242320", "important")
          symbol.style.setProperty("transform", "translateY(-1px)", "important")
        }
      })

      const value = root.querySelector<HTMLElement>(".kazen-qty-value")
      if (value) {
        value.style.setProperty("display", "flex", "important")
        value.style.setProperty("align-items", "center", "important")
        value.style.setProperty("justify-content", "center", "important")
        value.style.setProperty("height", "58px", "important")
        value.style.setProperty("min-height", "58px", "important")
        value.style.setProperty("background", "rgba(255, 255, 255, .22)", "important")
        value.style.setProperty("color", "#242320", "important")
        value.style.setProperty("font-size", "1.25rem", "important")
        value.style.setProperty("font-weight", "700", "important")
        value.style.setProperty("letter-spacing", ".08em", "important")
      }
    }

    applyQtyPolish()
    const raf = window.requestAnimationFrame(applyQtyPolish)
    const timers = [
      window.setTimeout(applyQtyPolish, 50),
      window.setTimeout(applyQtyPolish, 250),
      window.setTimeout(applyQtyPolish, 700),
    ]

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      timers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [selectedItem, itemQty])

  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [waiterOpen, setWaiterOpen] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [valetOpen, setValetOpen] = useState(false)
  const [valetConfirmed, setValetConfirmed] = useState(false)
  const [kazenHeaderLinksV1, setKazenHeaderLinksV1] = useState<KazenHeaderLinksV1>(PMD_KAZEN_HEADER_LINKS_DEFAULT_V1)


  useEffect(() => {
    let cancelled = false

    const loadKazenHeaderLinks = async () => {
      try {
        const response = await fetch(`/simple-theme?ts=${Date.now()}`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
        })

        if (!response.ok) return

        const payload = await response.json()
        const nextLinks = pmdKazenReadHeaderLinksV1(payload)
        console.info("PMD_KAZEN_HEADER_LINKS_V1", nextLinks)

        if (!cancelled) setKazenHeaderLinksV1(nextLinks)
      } catch {
        // Header links are optional.
      }
    }

    void loadKazenHeaderLinks()

    return () => {
      cancelled = true
    }
  }, [])


  // PMD_KAZEN_HEADER_LINKS_NO_BLINK_V21
  // Directly creates Website/Social in the original clean header group with final thin icons.
  // This replaces the older v10/v17 post-replacement flow so old icons cannot blink first.
  useEffect(() => {
    if (typeof window === "undefined") return

    let frame = 0
    const timers: number[] = []

    const iconWebsite =
      '<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.25"></circle><path d="M3.75 12h16.5"></path><path d="M12 3.75c2 2.25 3.05 5.05 3.05 8.25S14 18 12 20.25"></path><path d="M12 3.75C10 6 8.95 8.8 8.95 12S10 18 12 20.25"></path></svg>'

    const iconInstagram =
      '<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><rect x="5.1" y="5.1" width="13.8" height="13.8" rx="3.5"></rect><circle cx="12" cy="12" r="2.95"></circle><path d="M16.45 7.65h.01"></path></svg>'

    const iconFacebook =
      '<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.35 5.2h-1.9c-2.15 0-3.45 1.35-3.45 3.7v2.15H6.8v3H9V20h3.05v-5.95h2.35l.38-3h-2.73V9.15c0-.72.28-1.08 1.08-1.08h1.22V5.2Z"></path></svg>'

    const iconTrust =
      '<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="m12 4.75 2.2 4.45 4.9.72-3.55 3.45.84 4.88L12 15.95l-4.39 2.3.84-4.88L4.9 9.92l4.9-.72L12 4.75Z"></path></svg>'

    const iconReviews =
      '<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M5.7 5.9h12.6a2 2 0 0 1 2 2v7.05a2 2 0 0 1-2 2H9.35L5 20.1v-3.15h-.6a2 2 0 0 1-2-2V7.9a2 2 0 0 1 2-2h1.3Z"></path><path d="m12 8.95.82 1.65 1.82.26-1.32 1.28.31 1.82L12 13.1l-1.63.86.31-1.82-1.32-1.28 1.82-.26L12 8.95Z"></path></svg>'

    const iconLink =
      '<svg class="pmd-kazen-header-link-svg" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M10.1 13.25a4.45 4.45 0 0 0 6.3 0l2-2a4.45 4.45 0 0 0-6.3-6.3L11 6.05"></path><path d="M13.9 10.75a4.45 4.45 0 0 0-6.3 0l-2 2a4.45 4.45 0 0 0 6.3 6.3L13 17.95"></path></svg>'

    const socialIcon = () => {
      const platform = String(kazenHeaderLinksV1.social.platform || "").trim().toLowerCase()
      if (platform === "facebook") return iconFacebook
      if (platform === "trustpilot") return iconTrust
      if (platform === "reviews") return iconReviews
      if (platform === "website") return iconLink
      return iconInstagram
    }

    const upsertHeaderLink = (
      group: HTMLElement,
      action: "website" | "social",
      enabled: boolean,
      url: string,
      label: string,
      icon: string
    ) => {
      let link = group.querySelector<HTMLAnchorElement>(`a[data-pmd-kazen-clean-action="${action}"]`)

      if (!enabled || !url) {
        link?.remove()
        return
      }

      if (!link) {
        link = document.createElement("a")
        group.appendChild(link)
      }

      link.className = "kazen-clean-header-button"
      link.setAttribute("data-pmd-kazen-clean-action", action)
      link.href = url
      link.target = "_blank"
      link.rel = "noopener noreferrer"
      link.title = label
      link.setAttribute("aria-label", action === "website" ? "Open restaurant website" : `Open ${label}`)

      if (link.innerHTML !== icon) {
        link.innerHTML = icon
      }
    }

    const syncHeaderLinks = () => {
      if (frame) window.cancelAnimationFrame(frame)

      frame = window.requestAnimationFrame(() => {
        const group = document.querySelector<HTMLElement>('[data-pmd-kazen-clean-header-actions="1"]')
        if (!group) return

        upsertHeaderLink(
          group,
          "website",
          kazenHeaderLinksV1.website.enabled,
          kazenHeaderLinksV1.website.url,
          "Website",
          iconWebsite
        )

        const socialLabel = pmdKazenSocialLabelV1(kazenHeaderLinksV1.social.platform)
        upsertHeaderLink(
          group,
          "social",
          kazenHeaderLinksV1.social.enabled,
          kazenHeaderLinksV1.social.url,
          socialLabel,
          socialIcon()
        )

        group.setAttribute("data-pmd-kazen-clean-header-links-v21", "1")
        ;(window as any).__PMD_KAZEN_HEADER_LINKS_V21 = {
          website: !!group.querySelector('[data-pmd-kazen-clean-action="website"]'),
          social: !!group.querySelector('[data-pmd-kazen-clean-action="social"]'),
          platform: kazenHeaderLinksV1.social.platform,
          childCount: group.children.length,
        }
      })
    }

    syncHeaderLinks()
    timers.push(window.setTimeout(syncHeaderLinks, 50))
    timers.push(window.setTimeout(syncHeaderLinks, 160))
    timers.push(window.setTimeout(syncHeaderLinks, 420))
    timers.push(window.setInterval(syncHeaderLinks, 2400))

    window.addEventListener("resize", syncHeaderLinks)

    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener("resize", syncHeaderLinks)
    }
  }, [
    kazenHeaderLinksV1.website.enabled,
    kazenHeaderLinksV1.website.url,
    kazenHeaderLinksV1.social.enabled,
    kazenHeaderLinksV1.social.url,
    kazenHeaderLinksV1.social.platform,
  ])

const [waiterConfirmed, setWaiterConfirmed] = useState(false)
  const [noteConfirmed, setNoteConfirmed] = useState(false)
  const [note, setNote] = useState("")
  // PMD_KAZEN_V34_TABLE_ORDER_DOCK_20260618
  const [tableOrderDock, setTableOrderDock] = useState({ showTableOrder: false, tableOrderCount: 0 })
  const [valetName, setValetName] = useState("")
  const [valetPlate, setValetPlate] = useState("")
  const [valetCar, setValetCar] = useState("")
  const [valetEnabled, setValetEnabled] = useState(true)

  useEffect(() => {
    if (typeof document === "undefined") return

    document.documentElement.setAttribute("data-pmd-kazen-active", "1")
    document.body.setAttribute("data-pmd-kazen-active", "1")

    return () => {
      document.documentElement.removeAttribute("data-pmd-kazen-active")
      document.body.removeAttribute("data-pmd-kazen-active")
    }
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return

      const msg = event.data
      if (!msg || typeof msg !== "object") return
      if (String((msg as any).type || "") !== "PMD_KAZEN_SYNC") return

      setTableOrderDock({
        showTableOrder: Boolean((msg as any).showTableOrder),
        tableOrderCount: Number((msg as any).tableOrderCount || 0),
      })
      setValetEnabled((msg as any).showValet !== false)

      const rawItems = Array.isArray((msg as any).items) ? (msg as any).items : []
      const items: KazenItem[] = rawItems.map((item: any) => ({
        ...item,
        id: String(item?.id ?? item?.menu_id ?? item?.slug ?? item?.name ?? ""),
        name: String(item?.name ?? item?.menu_name ?? "Menu item"),
        description: String(item?.description ?? item?.short_description ?? item?.menu_description ?? ""),
        price: Number(item?.price ?? item?.menu_price ?? 0),
        category: String(item?.category ?? item?.category_name ?? "Menu"),
        image: item?.image ?? item?.image_url ?? item?.imageUrl ?? item?.image_path ?? item?.imagePath ?? item?.thumb ?? item?.thumbnail ?? item?.media_url ?? item?.mediaUrl ?? item?.photo_url ?? item?.photoUrl ?? item?.photo ?? item?.primary_image ?? item?.primaryImage ?? item?.images ?? item?.additional_images ?? item?.gallery ?? "",
        images: [
          ...(Array.isArray(item?.images) ? item.images : []),
          ...(Array.isArray(item?.gallery) ? item.gallery : []),
          ...(Array.isArray(item?.additional_images) ? item.additional_images : []),
          ...(Array.isArray(item?.additionalImages) ? item.additionalImages : []),
          ...(Array.isArray(item?.media) ? item.media : []),
        ],
        gallery: Array.isArray(item?.gallery) ? item.gallery : [],
        additional_images: Array.isArray(item?.additional_images) ? item.additional_images : [],
      }))

      const categories = normalizeCategories(items, Array.isArray((msg as any).categories) ? (msg as any).categories : [])

      setState({
        restaurantName: String((msg as any).restaurantName || (msg as any).businessName || (msg as any).merchantName || (msg as any).restaurant?.name || (msg as any).merchant?.businessName || "Kazen"),
        logoUrl: resolveMediaUrl((msg as any).logoUrl || (msg as any).effectiveLogoUrl || (msg as any).restaurantLogoUrl || (msg as any).merchantLogoUrl || (msg as any).logo || (msg as any).logo_url || (msg as any).settings?.logoUrl || (msg as any).merchant?.logoUrl || "") || state.logoUrl || "",
        tableNumber: (msg as any).displayTableNumber ?? (msg as any).tableNumber ?? (msg as any).table_id ?? (msg as any).tableId ?? (msg as any).table?.number ?? null,
        menuLayout: normalizeKazenStandaloneMenuLayout((msg as any).menuLayout ?? (msg as any).kazen_menu_layout ?? (msg as any).settings?.kazen_menu_layout ?? (msg as any).data?.kazen_menu_layout),
        categories,
        items,
        cart: {
          count: Number((msg as any).cart?.count || 0),
          total: Number((msg as any).cart?.total || 0),
          lastItemName: String((msg as any).cart?.lastItemName || ""),
          lastItemPrice: Number((msg as any).cart?.lastItemPrice || 0),
          lines: Array.isArray((msg as any).cart?.lines) ? (msg as any).cart.lines : [],
        },
      })

      if (
        openCategory &&
        !categories.some((category) => pmdKazenStableCategoryKey(category) === pmdKazenStableCategoryKey(openCategory))
      ) {
        setOpenCategory("")
      }
    }

    window.addEventListener("message", handleMessage)
    post("PMD_KAZEN_READY")

    const t1 = window.setTimeout(() => post("PMD_KAZEN_READY"), 250)
    const t2 = window.setTimeout(() => post("PMD_KAZEN_READY"), 900)

    return () => {
      window.removeEventListener("message", handleMessage)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [openCategory])

  const categories = useMemo(() => normalizeCategories(state.items, state.categories), [state.items, state.categories])

  const itemsByCategory = useMemo(() => {
    const map = new Map<string, KazenItem[]>()
    categories.forEach((category) => map.set(pmdKazenStableCategoryKey(category), []))

    state.items.forEach((item) => {
      const key = pmdKazenStableCategoryKey(item.category || "Menu")
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(item)
    })

    map.set(pmdKazenStableCategoryKey(ALL_CATEGORY), state.items)
    return map
  }, [categories, state.items])

  const kazenMenuLayout = state.menuLayout === "tabs" ? "tabs" : "accordion"
  const kazenActiveCategoryKey = pmdKazenStableCategoryKey(
    kazenMenuLayout === "tabs" ? (openCategory || ALL_CATEGORY) : openCategory
  )
  const kazenActiveCategoryItems = useMemo(() => {
    if (kazenActiveCategoryKey === pmdKazenStableCategoryKey(ALL_CATEGORY)) return state.items
    return itemsByCategory.get(kazenActiveCategoryKey) || []
  }, [itemsByCategory, kazenActiveCategoryKey, state.items])

  const tableLabel = state.tableNumber && /\d/.test(String(state.tableNumber)) ? `Table ${String(state.tableNumber).match(/\d+/)?.[0]}` : "Table"
  const cartLines = Array.isArray(state.cart.lines) ? state.cart.lines : []

  // PMD_FIX_KAZEN_CATEGORY_HEADER_VISIBILITY_WATCHDOG_20260613
  // DOM/style safety only: keep category HEADER rows visible after scroll/sync.
  // It does NOT force accordion content open.
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return

    let cancelled = false
    let raf = 0

    const keepHeadersVisible = () => {
      if (cancelled) return

      document.querySelectorAll<HTMLElement>(".kazen-category").forEach((category) => {
        const button = category.querySelector<HTMLElement>(".kazen-category-btn")
        const title = category.querySelector<HTMLElement>(".kazen-category-title")
        const icon = category.querySelector<HTMLElement>(".kazen-category-icon-shell")
        const accordion = category.querySelector<HTMLElement>(".kazen-accordion")

        category.style.setProperty("display", "block", "important")
        category.style.setProperty("visibility", "visible", "important")
        category.style.setProperty("opacity", "1", "important")
        category.style.setProperty("height", "auto", "important")
        category.style.setProperty("min-height", "4.55rem", "important")
        category.style.setProperty("max-height", "none", "important")
        category.style.setProperty("overflow", "visible", "important")
        category.style.setProperty("position", "relative", "important")
        category.style.setProperty("clip", "auto", "important")
        category.style.setProperty("clip-path", "none", "important")
        category.removeAttribute("hidden")
        category.removeAttribute("aria-hidden")

        if (button) {
          button.style.setProperty("display", "grid", "important")
          button.style.setProperty("grid-template-columns", "1fr auto", "important")
          button.style.setProperty("align-items", "center", "important")
          button.style.setProperty("visibility", "visible", "important")
          button.style.setProperty("opacity", "1", "important")
          button.style.setProperty("height", "auto", "important")
          button.style.setProperty("min-height", "4.55rem", "important")
          button.style.setProperty("max-height", "none", "important")
          button.style.setProperty("overflow", "visible", "important")
          button.style.setProperty("pointer-events", "auto", "important")
          button.style.setProperty("clip", "auto", "important")
          button.style.setProperty("clip-path", "none", "important")
          button.removeAttribute("hidden")
          button.removeAttribute("aria-hidden")
        }

        if (title) {
          title.style.setProperty("display", "inline", "important")
          title.style.setProperty("visibility", "visible", "important")
          title.style.setProperty("opacity", "1", "important")
          title.style.setProperty("overflow", "visible", "important")
          title.style.setProperty("clip", "auto", "important")
          title.style.setProperty("clip-path", "none", "important")
          title.style.setProperty("white-space", "normal", "important")
          title.removeAttribute("hidden")
          title.removeAttribute("aria-hidden")
        }

        if (icon) {
          icon.style.setProperty("display", "inline-flex", "important")
          icon.style.setProperty("visibility", "visible", "important")
          icon.style.setProperty("opacity", "1", "important")
        }

        // Keep accordion behavior controlled by React class only.
        if (accordion && !category.classList.contains("is-open")) {
          accordion.style.setProperty("max-height", "0", "important")
          accordion.style.setProperty("overflow", "hidden", "important")
          accordion.style.setProperty("opacity", "0", "important")
          accordion.style.setProperty("pointer-events", "none", "important")
        }

        if (accordion && category.classList.contains("is-open")) {
          accordion.style.setProperty("max-height", "none", "important")
          accordion.style.setProperty("height", "auto", "important")
          accordion.style.setProperty("overflow", "visible", "important")
          accordion.style.setProperty("opacity", "1", "important")
          accordion.style.setProperty("pointer-events", "auto", "important")
        }
      })
    }

    const schedule = () => {
      window.cancelAnimationFrame(raf)
      raf = window.requestAnimationFrame(keepHeadersVisible)
    }

    keepHeadersVisible()

    const timers = [0, 50, 150, 350, 700, 1200, 2000].map((ms) =>
      window.setTimeout(keepHeadersVisible, ms)
    )

    window.addEventListener("scroll", schedule, true)
    window.addEventListener("resize", schedule)

    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden", "aria-expanded"],
    })

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      timers.forEach((timer) => window.clearTimeout(timer))
      window.removeEventListener("scroll", schedule, true)
      window.removeEventListener("resize", schedule)
      observer.disconnect()
    }
  }, [categories.length, openCategory])

  const openItem = (item: KazenItem) => {
    setSelectedItem(item)
    setItemQty(1)
  }

  const addItem = (item: KazenItem, quantity = 1) => {
    post("PMD_KAZEN_ADD_ITEM", { itemId: item.id, quantity })
  }

  const submitSelectedItem = () => {
    if (!selectedItem) return
    addItem(selectedItem, itemQty)
    setSelectedItem(null)
  }

  const openTableOrder = () => {
    post("PMD_KAZEN_TABLE_ORDER")
  }

  const closeWaiterCard = () => {
    setWaiterOpen(false)
    setWaiterConfirmed(false)
  }

  const openWaiterCard = () => {
    setWaiterFeedback("Request sent")
    setWaiterConfirmed(false)
    setWaiterOpen(true)
  }

  const closeNoteCard = () => {
    setNoteOpen(false)
    setNoteConfirmed(false)
  }

  const openNoteCard = () => {
    setNoteConfirmed(false)
    setNoteOpen(true)
  }

  const submitWaiter = () => {
    const cooldownKey = pmdKazenWaiterCooldownKey(state.tableNumber || tableLabel)
    const now = Date.now()

    try {
      const lastCallAt = Number(window.localStorage.getItem(cooldownKey) || 0)
      const remainingMs = PMD_KAZEN_WAITER_COOLDOWN_MS - (now - lastCallAt)

      if (lastCallAt && remainingMs > 0) {
        setWaiterFeedback(`Waiter already notified. You can call again in ${pmdKazenFormatRemaining(remainingMs)}.`)
        setWaiterConfirmed(true)
        return
      }

      window.localStorage.setItem(cooldownKey, String(now))
    } catch {
      // If storage is unavailable, still allow the single request.
    }

    setWaiterFeedback("Request sent")
    post("PMD_KAZEN_CALL_WAITER")
    setWaiterConfirmed(true)
  }

  const submitNote = () => {
    const trimmed = note.trim()
    if (!trimmed) return
    post("PMD_KAZEN_ADD_NOTE", { note: trimmed })
    setNote("")
    setNoteConfirmed(true)
  }

  useEffect(() => {
    if (!waiterOpen || !waiterConfirmed) return
    const timer = window.setTimeout(closeWaiterCard, 2200)
    return () => window.clearTimeout(timer)
  }, [waiterOpen, waiterConfirmed])

  useEffect(() => {
    if (!noteOpen || !noteConfirmed) return
    const timer = window.setTimeout(closeNoteCard, 2200)
    return () => window.clearTimeout(timer)
  }, [noteOpen, noteConfirmed])


  const closeValetCard = () => {
    setValetOpen(false)
    setValetConfirmed(false)
  }

  const openValetCard = () => {
    if (!valetEnabled) return
    setValetConfirmed(false)
    setValetOpen(true)
  }


  // PMD_KAZEN_VALET_TOAST_AUTO_CLOSE_V26
  useEffect(() => {
    if (!valetOpen || !valetConfirmed) return
    const timer = window.setTimeout(closeValetCard, 2200)
    return () => window.clearTimeout(timer)
  }, [valetOpen, valetConfirmed])

  const submitValet = () => {
    post("PMD_KAZEN_GO_VALET", {
      values: {
        name: valetName.trim() || "Guest",
        licensePlate: valetPlate.trim() || "Not provided",
        carModel: valetCar.trim() || "Not provided",
      },
    })
    setValetConfirmed(true)
  }



return (
    <main className="kazen-page">

      <div className="kazen-shell">
        <header className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-end gap-3">
              {state.logoUrl ? (
                <img src={state.logoUrl} alt={state.restaurantName} className="kazen-logo" />
              ) : null}
              <span className="kazen-stamp">風然</span>
            </div>
            <div className="kazen-brand">{state.restaurantName || "KAZEN"}</div>
            <div className="kazen-subtitle">Japanese Cuisine</div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button className="kazen-icon-button h-11 w-11" aria-label="Menu" type="button">
              <Menu className="h-7 w-7" />
            </button>
            <div className="flex gap-2">
              <button className="kazen-pill" type="button">{tableLabel}</button>
              <button className="kazen-pill" type="button" aria-label="Language">
                <Languages className="mr-1 inline h-3.5 w-3.5" /> EN
              </button>
            </div>
            {valetEnabled && (
              <button className="kazen-pill" type="button" onClick={openValetCard}>
                <Car className="mr-1 inline h-3.5 w-3.5" /> Valet
              </button>
            )}
          </div>

        </header>

        <section className="kazen-hero" aria-label="Kazen seasonal atmosphere">
          <div className="kazen-motto">
            <div>Purity.</div>
            <div>Season.</div>
            <div>Intention.</div>
            <div className="kazen-red-line" />
            <div style={{ letterSpacing: ".55em" }}>風　然</div>
          </div>
        </section>

        <button type="button" className="kazen-call" onClick={() => post("PMD_KAZEN_CHECKOUT")}>
          Call to order <span aria-hidden="true">→</span>
        </button>

        <section
          className={`mt-9 kazen-menu-layout kazen-menu-layout-${kazenMenuLayout}`}
          data-kazen-menu-layout={kazenMenuLayout}
          aria-label="Menu categories"
        >
          {kazenMenuLayout === "tabs" ? (
            <>
              <div className="kazen-category-tabs" role="tablist" aria-label="Food categories">
                {categories.map((category) => {
                  const categoryKey = pmdKazenStableCategoryKey(category)
                  const active = kazenActiveCategoryKey === categoryKey || (!openCategory && categoryKey === pmdKazenStableCategoryKey(ALL_CATEGORY))

                  return (
                    <button
                      key={categoryKey || category}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      className={`kazen-category-tab ${active ? "is-active" : ""}`}
                      onClick={() => setOpenCategory(categoryKey)}
                    >
                      {category === ALL_CATEGORY ? "All" : category}
                    </button>
                  )
                })}
              </div>

              <div
                className="kazen-flat-items"
                style={{ "--kazen-item-count": Math.min(kazenActiveCategoryItems.length || 1, 8) } as React.CSSProperties}
              >
                <div className="kazen-items kazen-items-flat">
                  {kazenActiveCategoryItems.length ? kazenActiveCategoryItems.map((item) => {
                    const image = itemImage(item)

                    return (
                      <div
                        key={item.id}
                        className="kazen-item"
                        role="button"
                        tabIndex={0}
                        onClick={() => openItem(item)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault()
                            openItem(item)
                          }
                        }}
                      >
                        <button type="button" className="kazen-item-main min-w-0 text-left" onClick={() => openItem(item)}>
                          {image ? (
                            <img src={image} alt={item.name} className="kazen-item-image" />
                          ) : (
                            <span className="kazen-item-image-empty">No image</span>
                          )}

                          <span className="min-w-0">
                            <span className="kazen-item-name block truncate">{item.name}</span>
                            <span className="kazen-item-description block line-clamp-2">{item.description || "Prepared with seasonal intention."}</span>
                            <span className="kazen-item-price block">{money(item.price)}</span>
                          </span>
                        </button>

                        <button type="button" className="kazen-add" aria-label={`Add ${item.name}`} onClick={(event) => {
                            event.stopPropagation()
                            addItem(item, 1)
                          }}>
                          <Plus className="h-5 w-5" />
                        </button>
                      </div>
                    )
                  }) : (
                    <div className="py-5 text-center text-sm" style={{ color: "var(--kazen-muted)" }}>
                      No visible items in this category.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            categories.map((category, index) => {
              const categoryKey = pmdKazenStableCategoryKey(category)
              const open = pmdKazenStableCategoryKey(openCategory) === categoryKey
              const categoryItems = categoryKey === pmdKazenStableCategoryKey(ALL_CATEGORY) ? state.items : itemsByCategory.get(categoryKey) || []

              return (
                <article key={categoryKey || category} className={`kazen-category ${open ? "is-open" : "is-closed"}`}>
                  <button type="button" className="kazen-category-btn" aria-expanded={open} onClick={() => setOpenCategory(open ? "" : categoryKey)}>
                    <span className="kazen-category-label">
                      <span className="kazen-category-icon-shell" aria-hidden="true">
                        <img src={kazenCategoryIcon(index)} alt="" className="kazen-category-icon" />
                      </span>
                      <span className="kazen-category-title">{category}</span>
                    </span>
                    {open ? (
                      <Minus className="h-7 w-7" style={{ color: "#242320", stroke: "#242320", fill: "none" }} />
                    ) : (
                      <Plus className="h-7 w-7" />
                    )}
                  </button>

                  <div
                    className={`kazen-accordion ${open ? "is-open" : "is-closed"}`}
                    aria-hidden={!open}
                    style={{ "--kazen-item-count": Math.min(categoryItems.length || 1, 8) } as React.CSSProperties}
                  >
                    <div className="kazen-items">
                      {categoryItems.length ? categoryItems.map((item) => {
                        const image = itemImage(item)

                        return (
                          <div
                            key={item.id}
                            className="kazen-item"
                            role="button"
                            tabIndex={0}
                            onClick={() => openItem(item)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault()
                                openItem(item)
                              }
                            }}
                          >
                            <button type="button" className="kazen-item-main min-w-0 text-left" onClick={() => openItem(item)}>
                              {image ? (
                                <img src={image} alt={item.name} className="kazen-item-image" />
                              ) : (
                                <span className="kazen-item-image-empty">No image</span>
                              )}

                              <span className="min-w-0">
                                <span className="kazen-item-name block truncate">{item.name}</span>
                                <span className="kazen-item-description block line-clamp-2">{item.description || "Prepared with seasonal intention."}</span>
                                <span className="kazen-item-price block">{money(item.price)}</span>
                              </span>
                            </button>

                            <button type="button" className="kazen-add" aria-label={`Add ${item.name}`} onClick={(event) => {
                                event.stopPropagation()
                                addItem(item, 1)
                              }}>
                              <Plus className="h-5 w-5" />
                            </button>
                          </div>
                        )
                      }) : (
                        <div className="py-5 text-center text-sm" style={{ color: "var(--kazen-muted)" }}>
                          No visible items in this category.
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              )
            })
          )}
        </section>
        <footer className="pb-6 pt-14 text-center">
          <div style={{ color: "var(--kazen-red)", fontSize: "1.7rem" }}>✽</div>
          <div className="mt-3 text-[.64rem] uppercase tracking-[.34em]" style={{ color: "var(--kazen-muted)" }}>Thank you for dining with us</div>
          <div className="mt-2 text-sm tracking-[.28em]" style={{ color: "var(--kazen-ink)" }}>ありがとうございます</div>
                              {/* PMD_KAZEN_FOOTER_PAYMYDINE_LOGO_SUDO_20260611 */}
          <div className="kazen-paymydine-footer-logo">
            <img
              src="/assets/media/uploads/PMD.png?v=1780008763"
              alt="PayMyDine"
              className="kazen-paymydine-footer-logo-image"
            />
          </div>
        </footer>
      </div>

      <nav
        className="kazen-dock"
        aria-label="Menu actions"
        data-kazen-table-order-active={tableOrderDock.showTableOrder ? "1" : "0"}
        data-pmd-kazen-v38-dock="1"
        style={{ gridTemplateColumns: tableOrderDock.showTableOrder ? "repeat(4, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))" }}
      >
        <button type="button" onClick={openWaiterCard}>
          <Bell className="h-5 w-5" />Waiter
        </button>
        <button type="button" onClick={openNoteCard}>
          <MessageSquare className="h-5 w-5" />Note
        </button>
        {tableOrderDock.showTableOrder && (
          <button type="button" aria-label="Table Order" onClick={openTableOrder}>
            <ClipboardList className="h-5 w-5" />Table {tableOrderDock.tableOrderCount ? `(${tableOrderDock.tableOrderCount})` : ""}
          </button>
        )}
        <button type="button" data-primary="true" onClick={() => post("PMD_KAZEN_CHECKOUT")}>
          <ShoppingBag className="h-5 w-5" />Checkout {state.cart.count ? `(${state.cart.count})` : ""}
        </button>
      </nav>

      {selectedItem && (
        <KazenItemDetailModal
          item={selectedItem}
          images={kazenItemGallery(selectedItem)}
          price={money(selectedItem.price)}
          quantity={itemQty}
          onClose={() => setSelectedItem(null)}
          onDecrease={() => setItemQty((value) => Math.max(1, value - 1))}
          onIncrease={() => setItemQty((value) => value + 1)}
          onAdd={submitSelectedItem}
        />
      )}

      {false && checkoutOpen && (
        <ModalCard title="Checkout" eyebrow="Review order" onClose={() => setCheckoutOpen(false)}>
          <div className="mt-3">
            {cartLines.length ? cartLines.map((line) => {
              const image = resolveMediaUrl(line.imageUrl)
              return (
                <div key={line.id} className="kazen-cart-line">
                  {image ? <img src={image} alt={line.name} className="kazen-cart-img" /> : <span className="kazen-cart-img" />}
                  <div>
                    <strong>{line.quantity}x {line.name}</strong>
                    <div className="text-sm" style={{ color: "var(--kazen-muted)" }}>{money(line.unitPrice)}</div>
                  </div>
                  <strong>{money(line.unitPrice * line.quantity)}</strong>
                </div>
              )
            }) : (
              <div className="py-8 text-center" style={{ color: "var(--kazen-muted)" }}>
                Your cart is empty. Add an item first.
              </div>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between border-y py-4" style={{ borderColor: "var(--kazen-line)" }}>
            <span className="uppercase tracking-[.18em]" style={{ color: "var(--kazen-muted)" }}>Total</span>
            <strong className="text-xl">{money(state.cart.total)}</strong>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" className="kazen-secondary" onClick={() => setCheckoutOpen(false)}>Continue</button>
            <button
              type="button"
              className="kazen-primary"
              onClick={() => {
                setCheckoutOpen(false)
                post("PMD_KAZEN_CHECKOUT")
              }}
            >
              Pay
            </button>
          </div>
        </ModalCard>
      )}

      {waiterOpen && waiterConfirmed ? (
        <div
          className="kazen-solid-modal-overlay pmd-kazen-action-overlay pmd-kazen-action-toast-overlay"
          role="status"
          aria-live="polite"
          aria-label="Waiter request sent"
          onClick={closeWaiterCard}
        >
          <article className="pmd-kazen-action-toast" onClick={(event) => event.stopPropagation()}>
            <span className="pmd-kazen-action-toast-mark" aria-hidden="true">✓</span>
            <span>{waiterFeedback}</span>
          </article>
        </div>
      ) : waiterOpen ? (
        <ModalCard
          title="Call waiter"
          eyebrow={tableLabel}
          onClose={closeWaiterCard}
        >
          <div className="pmd-kazen-action-form">
            <p className="mt-4 leading-7" style={{ color: "var(--kazen-muted)" }}>
              Send a quiet request to the team for this table.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" className="kazen-secondary" onClick={closeWaiterCard}>Cancel</button>
              <button type="button" className="kazen-primary" onClick={submitWaiter}>Call</button>
            </div>
          </div>
        </ModalCard>
      ) : null}

      {noteOpen && noteConfirmed ? (
        <div
          className="kazen-solid-modal-overlay pmd-kazen-action-overlay pmd-kazen-action-toast-overlay"
          role="status"
          aria-live="polite"
          aria-label="Note sent"
          onClick={closeNoteCard}
        >
          <article className="pmd-kazen-action-toast" onClick={(event) => event.stopPropagation()}>
            <span className="pmd-kazen-action-toast-mark" aria-hidden="true">✓</span>
            <span>Note sent</span>
          </article>
        </div>
      ) : noteOpen ? (
        <ModalCard
          title="Guest note"
          eyebrow={tableLabel}
          onClose={closeNoteCard}
        >
          <div className="pmd-kazen-action-form">
            <p className="mt-4 text-sm" style={{ color: "var(--kazen-muted)" }}>
              Allergy, special request, timing, or anything the team should know.
            </p>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className="kazen-field mt-5 min-h-32 resize-none"
              placeholder="Write your note..."
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" className="kazen-secondary" onClick={closeNoteCard}>Close</button>
              <button type="button" className="kazen-primary" onClick={submitNote}>Send</button>
            </div>
          </div>
        </ModalCard>
      ) : null}

      {/* PMD_KAZEN_VALET_CONFIRMATION_RENDER_V26 */}
      {valetOpen && valetConfirmed ? (
        <div
          className="kazen-solid-modal-overlay pmd-kazen-action-overlay pmd-kazen-action-toast-overlay"
          role="status"
          aria-live="polite"
          aria-label="Valet request sent"
          onClick={closeValetCard}
        >
          <article className="pmd-kazen-action-toast" onClick={(event) => event.stopPropagation()}>
            <span className="pmd-kazen-action-toast-mark" aria-hidden="true">✓</span>
            <span>Valet request sent</span>
          </article>
        </div>
      ) : valetOpen ? (
        <ModalCard title="Valet" eyebrow={tableLabel} onClose={closeValetCard}>
          <div className="mt-5 space-y-3">
            <input className="kazen-field" value={valetName} onChange={(e) => setValetName(e.target.value)} placeholder="Name" />
            <input className="kazen-field" value={valetPlate} onChange={(e) => setValetPlate(e.target.value)} placeholder="License plate" />
            <input className="kazen-field" value={valetCar} onChange={(e) => setValetCar(e.target.value)} placeholder="Car model / color" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" className="kazen-secondary" onClick={closeValetCard}>Close</button>
            <button type="button" className="kazen-primary" onClick={submitValet}>Request</button>
          </div>
        </ModalCard>
      ) : null}
    </main>
  )
}

// PMD_FIX_KAZEN_CATEGORY_NORMALIZED_KEYS_20260613

// PMD_FIX_KAZEN_CATEGORY_HEADER_VISIBILITY_WATCHDOG_20260613

// PMD_FIX_KAZEN_BACKEND_CATEGORIES_ONLY_20260613

// PMD_FIX_KAZEN_MOBILE_DOCK_SAFE_AREA_20260613

// PMD_KAZEN_V38_DOCK_FOUR_INLINE_20260618
