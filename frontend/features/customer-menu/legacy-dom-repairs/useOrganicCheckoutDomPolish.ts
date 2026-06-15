import { useLayoutEffect } from "react"
import { hasCheckoutThemeRoot } from "@/features/customer-menu/theme/OrganicExactV0Frame"

/** Legacy Organic checkout modal DOM polish isolated from CustomerMenuPage. */
export function useOrganicCheckoutDomPolish(isOrganicBotanicalTheme: boolean) {
  // PMD_ORGANIC_SCOPED_BODY_MARKER_20260609
  useLayoutEffect(() => {
    if (typeof document === "undefined") return

    if (!isOrganicBotanicalTheme) {
      document.body.removeAttribute("data-pmd-organic-botanical-active")
      document.documentElement.removeAttribute("data-pmd-organic-botanical-active")
      return
    }

    document.body.setAttribute("data-pmd-organic-botanical-active", "1")
    document.documentElement.setAttribute("data-pmd-organic-botanical-active", "1")

    return () => {
      document.body.removeAttribute("data-pmd-organic-botanical-active")
      document.documentElement.removeAttribute("data-pmd-organic-botanical-active")
    }
  }, [isOrganicBotanicalTheme])

  // PMD_ORGANIC_CHECKOUT_DOM_POLISH_20260609
  useLayoutEffect(() => {
    if (typeof document === "undefined") return
    if (!isOrganicBotanicalTheme) return
    if (hasCheckoutThemeRoot()) return

    document.documentElement.setAttribute("data-pmd-organic-botanical-active", "1")
    document.body.setAttribute("data-pmd-organic-botanical-active", "1")

    const setImp = (el: Element, prop: string, value: string) => {
      const htmlEl = el as HTMLElement
      htmlEl.style.setProperty(prop, value, "important")
    }

    const paintOrganicPanel = (el: Element) => {
      el.setAttribute("data-pmd-organic-checkout-polished", "1")
      setImp(el, "background-color", "#f5fff8af0")
      setImp(
        el,
        "background-image",
        "linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0)"
      )
      setImp(el, "background-size", "100% 100%, 16px 16px")
      setImp(el, "background-repeat", "no-repeat, repeat")
      setImp(el, "border-color", "#ded2ba")
      setImp(el, "color", "#343529")
      setImp(el, "-webkit-text-fill-color", "#343529")
      setImp(el, "box-shadow", "0 24px 70px -20px rgba(60,53,41,.52), inset 0 1px 0 rgba(255,255,255,.72)")
      setImp(el, "backdrop-filter", "none")
      setImp(el, "-webkit-backdrop-filter", "none")
    }

    const paintPrimary = (btn: Element) => {
      setImp(btn, "background", "#747d55")
      setImp(btn, "background-color", "#747d55")
      setImp(btn, "border-color", "#747d55")
      setImp(btn, "color", "#f5fff8af0")
      setImp(btn, "-webkit-text-fill-color", "#f5fff8af0")
      setImp(btn, "box-shadow", "0 12px 24px -14px rgba(60,53,41,.72)")
      btn.querySelectorAll("svg, svg *, span").forEach((child) => {
        setImp(child, "color", "#f5fff8af0")
        setImp(child, "-webkit-text-fill-color", "#f5fff8af0")
        setImp(child, "stroke", "#f5fff8af0")
      })
    }

    const paintSecondary = (btn: Element) => {
      setImp(btn, "background", "#f5fff8af0")
      setImp(btn, "background-color", "#f5fff8af0")
      setImp(btn, "border-color", "#ded2ba")
      setImp(btn, "color", "#343529")
      setImp(btn, "-webkit-text-fill-color", "#343529")
      setImp(btn, "box-shadow", "inset 0 1px 0 rgba(255,255,255,.72)")
    }

    const applyOrganicCheckoutPolish = () => {
      const roots = Array.from(
        document.querySelectorAll(
          [
            '[data-pmd-checkout-design-system="1"].pmd-checkout-modal',
            '.pmd-checkout-modal[data-pmd-checkout-design-system="1"]',
            '[data-pmd-payment-real-panel]',
            '[data-pmd-split-method-real-panel]',
            '[data-pmd-order-status-modal]',
            '[data-pmd-table-draft-modal]',
          ].join(",")
        )
      )

      roots.forEach((root) => {
        paintOrganicPanel(root)

        root
          .querySelectorAll(".pmd-checkout-body, [data-pmd-checkout-scroll='1']")
          .forEach((el) => {
            setImp(el, "background-color", "#f6efe2")
            setImp(el, "background-image", "radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0)")
            setImp(el, "background-size", "16px 16px")
            setImp(el, "color", "#343529")
            setImp(el, "-webkit-text-fill-color", "#343529")
          })

        root
          .querySelectorAll(
            ".surface-sub, .pmd-checkout-flat-section, .pmd-checkout-item-card, .pmd-checkout-total-card, .pmd-checkout-payment-card, .pmd-checkout-meta-row, .pmd-checkout-item-row"
          )
          .forEach((el) => {
            setImp(el, "background-color", "#f5fff8af0")
            setImp(el, "background-image", "radial-gradient(circle at 1px 1px, rgba(116,125,85,.055) 1px, transparent 0)")
            setImp(el, "background-size", "16px 16px")
            setImp(el, "border-color", "#ded2ba")
            setImp(el, "color", "#343529")
            setImp(el, "-webkit-text-fill-color", "#343529")
          })

        root.querySelectorAll("button").forEach((btn) => {
          const label = `${btn.textContent || ""} ${btn.getAttribute("aria-label") || ""}`.toLowerCase()
          const isCircle =
            btn.matches(".pmd-v2-action-circle, .quantity-btn, [data-pmd-order-status-back='1']")
          const isSecondary = /continue ordering|cancel/.test(label)
          const isPrimary = /confirm|send to kitchen|pay|pay in full|review split|view order|yes|apply/.test(label)

          if (isCircle || isPrimary) paintPrimary(btn)
          if (isSecondary) paintSecondary(btn)
        })
      })

      document
        .querySelectorAll('button[data-pmd-organic-action="primary"]')
        .forEach(paintPrimary)

      document
        .querySelectorAll('button[data-pmd-organic-action="secondary"]')
        .forEach(paintSecondary)
    }

    let scheduled = false
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(() => {
        scheduled = false
        applyOrganicCheckoutPolish()
      })
    }

    applyOrganicCheckoutPolish()

    const fastTimers = [0, 16, 40, 90, 180, 360, 720, 1200].map((ms) =>
      window.setTimeout(applyOrganicCheckoutPolish, ms)
    )

    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-pmd-checkout-design-system"],
    })

    return () => {
      fastTimers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
    }
  }, [isOrganicBotanicalTheme])

  // PMD_ORGANIC_CHECKOUT_TOTAL_DISPLAY_REPAIR_20260609
  useLayoutEffect(() => {
    if (typeof document === "undefined") return
    if (!isOrganicBotanicalTheme) return
    if (hasCheckoutThemeRoot()) return

    const parseMoney = (text: string | null | undefined) => {
      const raw = String(text || "").replace(/[^\d,.-]/g, "").replace(",", ".")
      const num = Number.parseFloat(raw)
      return Number.isFinite(num) ? num : 0
    }

    const formatMoney = (amount: number) => `€${amount.toFixed(2)}`

    const setRowAmount = (root: Element, label: string, amount: number) => {
      const nodes = Array.from(root.querySelectorAll("span, div"))
      const labelNode = nodes.find((node) => (node.textContent || "").trim().toLowerCase() === label.toLowerCase())
      const parent = labelNode?.parentElement
      if (!parent) return

      const valueNodes = Array.from(parent.querySelectorAll("span, div"))
        .filter((node) => node !== labelNode)
        .filter((node) => /€\s*[\d,.]+/.test(node.textContent || ""))

      const target = valueNodes[valueNodes.length - 1]
      if (target) {
        target.textContent = formatMoney(amount)
      }
    }

    const repairTotals = () => {
      const roots = Array.from(
        document.querySelectorAll('[data-pmd-checkout-design-system="1"].pmd-checkout-modal')
      )

      roots.forEach((root) => {
        const itemPrices = Array.from(root.querySelectorAll(".pmd-checkout-item-price"))
          .map((el) => parseMoney(el.textContent))
          .filter((value) => value > 0)

        const subtotal = itemPrices.reduce((sum, value) => sum + value, 0)
        if (subtotal <= 0) return

        const fullText = root.textContent || ""
        const hasWrongZero =
          /subtotal\s*€0\.00/i.test(fullText) ||
          /total\s*€0\.00/i.test(fullText)

        if (!hasWrongZero) return

        root.setAttribute("data-pmd-organic-total-repaired", "1")
        setRowAmount(root, "Subtotal", subtotal)
        setRowAmount(root, "Total", subtotal)
      })
    }

    repairTotals()

    const timers = [0, 16, 40, 90, 180, 360, 720, 1200, 1800].map((ms) =>
      window.setTimeout(repairTotals, ms)
    )

    const observer = new MutationObserver(repairTotals)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
    }
  }, [isOrganicBotanicalTheme])

  // PMD_ORGANIC_BUTTON_ICON_FINAL_POLISH_20260609
  useLayoutEffect(() => {
    if (typeof document === "undefined") return
    if (!isOrganicBotanicalTheme) return
    if (hasCheckoutThemeRoot()) return

    const GREEN = "#747d55"
    const GREEN_DARK = "#5f6746"
    const PAPER = "#f5fff8af0"
    const PAPER_SOFT = "#f6efe2"
    const LINE = "#ded2ba"
    const INK = "#343529"
    const MUTED = "#746f61"

    const setImp = (el: Element, prop: string, value: string) => {
      ;(el as HTMLElement).style.setProperty(prop, value, "important")
    }

    const paintPrimary = (el: Element) => {
      setImp(el, "background", GREEN)
      setImp(el, "background-color", GREEN)
      setImp(el, "border-color", GREEN)
      setImp(el, "outline-color", GREEN)
      setImp(el, "color", PAPER)
      setImp(el, "-webkit-text-fill-color", PAPER)
      setImp(el, "box-shadow", "0 12px 24px -14px rgba(60,53,41,.72)")
      el.querySelectorAll("svg, svg *, span").forEach((child) => {
        setImp(child, "color", PAPER)
        setImp(child, "-webkit-text-fill-color", PAPER)
        setImp(child, "stroke", PAPER)
      })
    }

    const paintSecondary = (el: Element) => {
      setImp(el, "background", PAPER)
      setImp(el, "background-color", PAPER)
      setImp(el, "border-color", LINE)
      setImp(el, "outline-color", LINE)
      setImp(el, "color", INK)
      setImp(el, "-webkit-text-fill-color", INK)
      setImp(el, "box-shadow", "inset 0 1px 0 rgba(255,255,255,.72)")
      el.querySelectorAll("svg, svg *, span").forEach((child) => {
        setImp(child, "color", INK)
        setImp(child, "-webkit-text-fill-color", INK)
        setImp(child, "stroke", INK)
      })
    }

    const paintIconBadge = (el: Element) => {
      setImp(el, "background", PAPER)
      setImp(el, "background-color", PAPER)
      setImp(el, "border-color", LINE)
      setImp(el, "color", GREEN)
      setImp(el, "-webkit-text-fill-color", GREEN)
      setImp(el, "box-shadow", "inset 0 1px 0 rgba(255,255,255,.72), 0 12px 28px -18px rgba(60,53,41,.72)")
      el.querySelectorAll("svg, svg *").forEach((child) => {
        setImp(child, "color", GREEN)
        setImp(child, "stroke", GREEN)
        setImp(child, "-webkit-text-fill-color", GREEN)
      })
    }

    const paintText = (root: Element) => {
      root.querySelectorAll("h1, h2, h3, h4, strong").forEach((el) => {
        setImp(el, "color", INK)
        setImp(el, "-webkit-text-fill-color", INK)
      })
      root.querySelectorAll("p, span, label, div").forEach((el) => {
        const txt = (el.textContent || "").trim()
        if (!txt) return
        const isPrice = /€|\$|\d+[,.]\d{2}/.test(txt)
        setImp(el, "color", isPrice ? INK : MUTED)
        setImp(el, "-webkit-text-fill-color", isPrice ? INK : MUTED)
      })
    }

    const paintOrganicWaiterNote = () => {
      document.querySelectorAll(".pmd-organic-modal-card").forEach((card) => {
        card.setAttribute("data-pmd-organic-button-polished", "1")
        paintText(card)

        card.querySelectorAll('[data-pmd-organic-action="primary"]').forEach(paintPrimary)
        card.querySelectorAll('[data-pmd-organic-action="secondary"]').forEach(paintSecondary)

        card.querySelectorAll(".mx-auto.mb-5.flex.h-16.w-16, .mx-auto.mb-5").forEach((el) => {
          if (el.querySelector("svg")) paintIconBadge(el)
        })

        card.querySelectorAll("svg").forEach((svg) => {
          const insideButton = svg.closest("button")
          const insideBadge = svg.closest(".mx-auto")
          if (!insideButton && !insideBadge) {
            setImp(svg, "color", GREEN)
            setImp(svg, "stroke", GREEN)
          }
        })
      })
    }

    const paintCheckout = () => {
      const roots = Array.from(
        document.querySelectorAll(
          '[data-pmd-checkout-design-system="1"].pmd-checkout-modal, .pmd-checkout-modal[data-pmd-checkout-design-system="1"]'
        )
      )

      roots.forEach((root) => {
        root.setAttribute("data-pmd-organic-buttons-polished", "1")

        setImp(root, "background-color", PAPER)
        setImp(root, "background-image", "linear-gradient(180deg, rgba(255,255,255,.42), rgba(255,255,255,0)), radial-gradient(circle at 1px 1px, rgba(116,125,85,.085) 1px, transparent 0)")
        setImp(root, "background-size", "100% 100%, 16px 16px")
        setImp(root, "background-repeat", "no-repeat, repeat")
        setImp(root, "border-color", LINE)
        setImp(root, "color", INK)
        setImp(root, "-webkit-text-fill-color", INK)

        root.querySelectorAll(".pmd-checkout-body, [data-pmd-checkout-scroll='1']").forEach((el) => {
          setImp(el, "background-color", PAPER_SOFT)
          setImp(el, "background-image", "radial-gradient(circle at 1px 1px, rgba(116,125,85,.075) 1px, transparent 0)")
          setImp(el, "background-size", "16px 16px")
          setImp(el, "color", INK)
          setImp(el, "-webkit-text-fill-color", INK)
        })

        root
          .querySelectorAll(".surface-sub, .pmd-checkout-flat-section, .pmd-checkout-item-card, .pmd-checkout-item-row, .pmd-checkout-meta-row")
          .forEach((el) => {
            setImp(el, "background-color", PAPER)
            setImp(el, "background-image", "radial-gradient(circle at 1px 1px, rgba(116,125,85,.055) 1px, transparent 0)")
            setImp(el, "background-size", "16px 16px")
            setImp(el, "border-color", LINE)
            setImp(el, "color", INK)
            setImp(el, "-webkit-text-fill-color", INK)
          })

        paintText(root)

        root.querySelectorAll("button").forEach((btn) => {
          const label = `${btn.textContent || ""} ${btn.getAttribute("aria-label") || ""}`.trim().toLowerCase()

          const isCircle =
            btn.matches(".pmd-v2-action-circle, .quantity-btn, [data-pmd-order-status-back='1']")

          const isPrimary =
            /^(confirm|send to kitchen|pay|pay in full|review split|view order|apply|yes)$/.test(label)

          const isSecondary =
            /^(continue ordering|cancel|no|split bill|back)$/.test(label)

          if (isCircle || isPrimary) paintPrimary(btn)
          else if (isSecondary) paintSecondary(btn)
          else {
            setImp(btn, "border-color", LINE)
          }
        })

        root.querySelectorAll("[data-pmd-force-qty-symbol]").forEach((el) => {
          setImp(el, "color", PAPER)
          setImp(el, "-webkit-text-fill-color", PAPER)
        })
      })
    }

    const run = () => {
      paintOrganicWaiterNote()
      paintCheckout()
    }

    let scheduled = false
    const schedule = () => {
      if (scheduled) return
      scheduled = true
      window.requestAnimationFrame(() => {
        scheduled = false
        run()
      })
    }

    run()

    const timers = [0, 16, 40, 90, 180, 360, 720, 1200, 1800].map((ms) =>
      window.setTimeout(run, ms)
    )

    const observer = new MutationObserver(schedule)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "data-pmd-checkout-design-system"],
    })

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer))
      observer.disconnect()
    }
  }, [isOrganicBotanicalTheme])


}
