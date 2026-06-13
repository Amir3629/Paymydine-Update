import { useEffect } from "react"

/** Legacy Kazen visibility repairs isolated from CustomerMenuPage. */
export function useKazenMenuDomRepairs(isKazenJapaneseTheme: boolean) {
  // PMD_FIX_KAZEN_REMOVE_BAD_HEADER_MARKER_FROM_ITEMS_20260612
  useEffect(() => {
    if (!isKazenJapaneseTheme || typeof document === "undefined" || typeof window === "undefined") return

    const cleanupKazenItemMarkers = () => {
      document.querySelectorAll<HTMLElement>('.kazen-item [data-pmd-kazen-old-header-control="1"]').forEach((el) => {
        el.removeAttribute("data-pmd-kazen-old-header-control")
        el.style.setProperty("opacity", "1", "important")
        el.style.setProperty("visibility", "visible", "important")
      })

      document.querySelectorAll<HTMLElement>(".kazen-items, .kazen-menu-list, .kazen-category-content, .kazen-category-items, .kazen-section-content").forEach((el) => {
        el.style.setProperty("overflow", "visible", "important")
        el.style.setProperty("max-height", "none", "important")
        el.style.setProperty("height", "auto", "important")
      })
    }

    cleanupKazenItemMarkers()

    const events = ["scroll", "click", "resize", "touchend"]
    const scheduleCleanup = () => window.setTimeout(cleanupKazenItemMarkers, 0)

    events.forEach((eventName) => {
      window.addEventListener(eventName, scheduleCleanup, { passive: true })
    })

    const timer = window.setInterval(cleanupKazenItemMarkers, 900)

    return () => {
      window.clearInterval(timer)
      events.forEach((eventName) => {
        window.removeEventListener(eventName, scheduleCleanup)
      })
    }
  }, [isKazenJapaneseTheme])

  // PMD_FIX_KAZEN_EXPAND_VISIBLE_ITEM_ANCESTORS_20260612
  useEffect(() => {
    if (!isKazenJapaneseTheme || typeof document === "undefined" || typeof window === "undefined") return

    const expandVisibleKazenItemAncestors = () => {
      document.querySelectorAll<HTMLElement>(".kazen-item").forEach((item) => {
        const rect = item.getBoundingClientRect()
        if (!(rect.width > 0 && rect.height > 0)) return

        item.style.setProperty("overflow", "visible", "important")
        item.style.setProperty("max-height", "none", "important")
        item.style.setProperty("height", "auto", "important")
        item.style.setProperty("contain", "none", "important")

        let el = item.parentElement
        let depth = 0

        while (el && depth < 8) {
          if (
            el.matches("[data-pmd-checkout-theme-root='1']") ||
            el.classList.contains("kazen-modal") ||
            el.classList.contains("kazen-solid-modal-overlay") ||
            el.classList.contains("kazen-solid-modal-panel") ||
            el.classList.contains("pmd-checkout-modal")
          ) {
            break
          }

          const className = String(el.className || "")

          if (
            className.includes("kazen") ||
            className.includes("overflow-hidden") ||
            el.style.maxHeight ||
            el.style.height ||
            el.style.overflow
          ) {
            el.style.setProperty("overflow", "visible", "important")
            el.style.setProperty("max-height", "none", "important")
            el.style.setProperty("height", "auto", "important")
            el.style.setProperty("contain", "none", "important")
          }

          el = el.parentElement
          depth += 1
        }
      })
    }

    expandVisibleKazenItemAncestors()

    const schedule = () => window.setTimeout(expandVisibleKazenItemAncestors, 0)
    const events = ["load", "scroll", "click", "resize", "touchend"]

    events.forEach((eventName) => {
      window.addEventListener(eventName, schedule, { passive: true })
    })

    const timer = window.setInterval(expandVisibleKazenItemAncestors, 700)

    return () => {
      window.clearInterval(timer)
      events.forEach((eventName) => {
        window.removeEventListener(eventName, schedule)
      })
    }
  }, [isKazenJapaneseTheme])


}
