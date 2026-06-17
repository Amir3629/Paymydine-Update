import { useEffect, useLayoutEffect } from "react"
import { hasCheckoutThemeRoot } from "@/features/customer-menu/theme/OrganicExactV0Frame"

type UsePaymentModalDomRepairsArgs = {
  isOpen: boolean
  checkoutStep: any
  selectedPaymentMethod: string | null
  couponDiscount: number
  tipPercentage: number
  customTip: string
  appliedCouponCode?: string | null
  isSplitting: boolean
  selectedSplitPersonId: string | null
  splitMethod: any
  splitGuestCount: number
  submittedSnapshotOrderId?: string | number | null
}

/**
 * Legacy checkout DOM repair effects isolated away from PaymentModal.
 * These are visual compatibility guards for old checkout markup and should be
 * replaced by proper component/CSS ownership during a future checkout rewrite.
 */
export function usePaymentModalDomRepairs({
  isOpen,
  checkoutStep,
  selectedPaymentMethod,
  couponDiscount,
  tipPercentage,
  customTip,
  appliedCouponCode,
  isSplitting,
  selectedSplitPersonId,
  splitMethod,
  splitGuestCount,
  submittedSnapshotOrderId,
}: UsePaymentModalDomRepairsArgs) {
  const appliedCoupon = { code: appliedCouponCode ?? null }
  const submittedSnapshot = { orderId: submittedSnapshotOrderId ?? null }

  // PMD_ORDER_STATUS_PARENT_JUMP_LOCK_20260603_SAFE
  // Diagnostic showed orderStatusCard + ETA circle jump together by ~239px.
  // Their own size/top stayed stable, so the parent scroll/layout wrapper is moving.
  // useLayoutEffect runs before paint and locks the checkout scroll parent immediately.
  useLayoutEffect(() => {
    if (!isOpen || checkoutStep !== "submitted") return;

    const lockOrderStatusParent = () => {
      const scrollRoots = document.querySelectorAll<HTMLElement>('[data-pmd-checkout-scroll="1"]');

      scrollRoots.forEach((root) => {
        root.dataset.pmdOrderStatusStable = "1";
        root.style.scrollBehavior = "auto";
        root.style.overflowAnchor = "none";
        root.style.alignItems = "stretch";
        root.style.justifyContent = "flex-start";

        if (root.scrollTop !== 0) {
          root.scrollTop = 0;
        }
      });

      const card = document.querySelector<HTMLElement>('[data-pmd-order-status-card="1"]');
      if (card) {
        card.dataset.pmdOrderStatusStableCard = "1";
      }

      const eta = document.querySelector<HTMLElement>('[data-pmd-floating-eta-circle="1"]');
      if (eta) {
        eta.dataset.pmdEtaStable = "1";
      }
    };

    lockOrderStatusParent();
  }, [isOpen, checkoutStep]);


  // PMD_PAYMENT_METHOD_SMOOTH_SCROLL_EFFECT
  useEffect(() => {
    if (checkoutStep !== "payment" || !selectedPaymentMethod) return

    const container = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    const detail = document.querySelector('[data-pmd-payment-selected-detail="1"]') as HTMLElement | null
    if (!container) return

    let raf = 0
    let cancelled = false

    const easeInOutCubic = (t: number) => (
      t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2
    )

    const animateTo = (targetTop: number, duration = 760) => {
      const startTop = container.scrollTop
      const maxTop = Math.max(0, container.scrollHeight - container.clientHeight)
      const finalTop = Math.max(0, Math.min(targetTop, maxTop))
      const delta = finalTop - startTop
      const startTime = performance.now()

      const step = (now: number) => {
        if (cancelled) return
        const progress = Math.min(1, (now - startTime) / duration)
        container.scrollTop = startTop + (delta * easeInOutCubic(progress))
        if (progress < 1) {
          raf = window.requestAnimationFrame(step)
        }
      }

      raf = window.requestAnimationFrame(step)
    }

    const runSmoothScroll = () => {
      if (detail) {
        const buffer = 28
        const targetTop = detail.offsetTop + detail.offsetHeight - container.clientHeight + buffer
        animateTo(targetTop, 820)
      } else {
        animateTo(container.scrollHeight - container.clientHeight, 820)
      }
    }

    const t1 = window.setTimeout(runSmoothScroll, 50)
    const t2 = window.setTimeout(runSmoothScroll, 240)
    const t3 = window.setTimeout(runSmoothScroll, 520)

    return () => {
      cancelled = true
      window.cancelAnimationFrame(raf)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [checkoutStep, selectedPaymentMethod])

  // PMD_MARK_REAL_PAYMENT_PANELS_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return
    if (checkoutStep !== "payment") return

    const markRealPaymentPanels = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const candidates = Array.from(root.querySelectorAll("div")) as HTMLElement[]

      const normalizedText = (el: HTMLElement) =>
        (el.textContent || "").replace(/\s+/g, " ").trim()

      const scoreCandidate = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect()
        const text = normalizedText(el)
        return {
          el,
          text,
          area: rect.width * rect.height,
          length: text.length,
        }
      }

      const findSmallestPanel = (required: string[], forbidden: string[] = []) => {
        return candidates
          .map(scoreCandidate)
          .filter((row) => {
            if (row.area < 8000) return false
            if (row.length < 5) return false
            if (!required.every((word) => row.text.includes(word))) return false
            if (forbidden.some((word) => row.text.includes(word))) return false
            return true
          })
          .sort((a, b) => a.length - b.length || a.area - b.area)[0]?.el || null
      }

      const summaryPanel = findSmallestPanel(["Ready to pay?", "Base amount", "Payable total"], ["Payment Methods"])
      const tipCouponPanel = findSmallestPanel(["Add tip", "0%", "5%", "10%"], ["Payment Methods", "Card Information"])

      if (summaryPanel) {
        summaryPanel.setAttribute("data-pmd-payment-real-panel", "summary")
      }

      if (tipCouponPanel) {
        tipCouponPanel.setAttribute("data-pmd-payment-real-panel", "tip-coupon")
      }

      ;[summaryPanel, tipCouponPanel].filter(Boolean).forEach((panel) => {
        const el = panel as HTMLElement
        el.style.setProperty("background", "transparent", "important")
        el.style.setProperty("background-color", "transparent", "important")
        el.style.setProperty("border-color", "transparent", "important")
        el.style.setProperty("box-shadow", "none", "important")

        Array.from(el.querySelectorAll("div")).forEach((child) => {
          const childEl = child as HTMLElement
          childEl.style.setProperty("background-color", "transparent", "important")
          childEl.style.setProperty("background", "transparent", "important")
          childEl.style.setProperty("box-shadow", "none", "important")
        })
      })
    }

    markRealPaymentPanels()

    const t1 = window.setTimeout(markRealPaymentPanels, 60)
    const t2 = window.setTimeout(markRealPaymentPanels, 220)
    const t3 = window.setTimeout(markRealPaymentPanels, 700)

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(markRealPaymentPanels)
    })

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]')
    if (root) {
      void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze
    }

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, selectedPaymentMethod])


  // PMD_MARK_REAL_PAYMENT_PANELS_BG_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return
    if (checkoutStep !== "payment") return

    const markPanels = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const allDivs = Array.from(root.querySelectorAll("div")) as HTMLElement[]

      const normalize = (el: HTMLElement) =>
        (el.textContent || "").replace(/\s+/g, " ").trim()

      const scored = allDivs.map((el) => {
        const rect = el.getBoundingClientRect()
        return {
          el,
          txt: normalize(el),
          area: rect.width * rect.height,
          len: normalize(el).length,
        }
      })

      const pick = (required: string[], forbidden: string[] = []) => {
        return scored
          .filter((row) => row.area > 9000)
          .filter((row) => required.every((needle) => row.txt.includes(needle)))
          .filter((row) => !forbidden.some((needle) => row.txt.includes(needle)))
          .sort((a, b) => a.len - b.len || a.area - b.area)[0]?.el || null
      }

      const summary = pick(["Ready to pay?", "Base amount", "Payable total"], ["Card Information", "Payment Methods"])
      const tipCoupon = pick(["Add tip", "0%", "5%", "10%"], ["Card Information", "Payment Methods"])

      if (summary) summary.setAttribute("data-pmd-payment-real-panel", "summary")
      if (tipCoupon) tipCoupon.setAttribute("data-pmd-payment-real-panel", "tip-coupon")

      const wrapper = pick(["Ready to pay?", "Add tip"], ["Card Information", "Payment Methods"])
      if (wrapper) wrapper.setAttribute("data-pmd-payment-adjustment-card", "1")
    }

    markPanels()

    const t1 = window.setTimeout(markPanels, 50)
    const t2 = window.setTimeout(markPanels, 220)
    const t3 = window.setTimeout(markPanels, 800)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]')
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(markPanels)
    })

    if (root) {
      void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze
    }

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, selectedPaymentMethod])

  // PMD_COMPACT_ACTIONS_REAL_PAYMENT_BG_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const softCream = "#FAF9F3"

    const normalize = (value: string | null | undefined) =>
      String(value || "").replace(/\s+/g, " ").trim()

    const setSoftCream = (el: HTMLElement | null) => {
      if (!el) return
      el.style.setProperty("background", softCream, "important")
      el.style.setProperty("background-color", softCream, "important")
      el.style.setProperty("background-image", "none", "important")
      el.style.setProperty("box-shadow", "none", "important")
    }

    const markTableOrderActions = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = normalize(btn.textContent)

        if (txt.includes("Send order to kitchen")) {
          btn.setAttribute("data-pmd-send-kitchen-btn", "1")

          const spans = btn.querySelectorAll("span")
          if (spans[0]) spans[0].setAttribute("data-pmd-send-kitchen-label", "1")
          if (spans[1]) spans[1].setAttribute("data-pmd-send-kitchen-arrow-wrap", "1")

          const svg = btn.querySelector("svg")
          if (svg) svg.setAttribute("data-pmd-send-kitchen-arrow", "1")

          let parent = btn.parentElement as HTMLElement | null
          for (let i = 0; i < 6 && parent; i += 1) {
            const parentText = normalize(parent.textContent)
            const buttonCount = parent.querySelectorAll("button").length

            if (parentText.includes("Send order to kitchen") && parentText.includes("Continue ordering") && buttonCount >= 2) {
              parent.setAttribute("data-pmd-table-order-actions-row", "1")

              Array.from(parent.querySelectorAll("button")).forEach((rowButton) => {
                const rowBtn = rowButton as HTMLElement
                const rowText = normalize(rowBtn.textContent)

                if (rowText.includes("Continue ordering")) {
                  rowBtn.setAttribute("data-pmd-table-order-continue-btn", "1")
                }
              })

              break
            }

            parent = parent.parentElement as HTMLElement | null
          }
        }
      })
    }

    const markPaymentPanels = () => {
      if (checkoutStep !== "payment") return

      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const divs = Array.from(root.querySelectorAll("div")) as HTMLElement[]

      const score = (el: HTMLElement) => {
        const rect = el.getBoundingClientRect()
        const txt = normalize(el.textContent)
        return {
          el,
          txt,
          area: rect.width * rect.height,
          len: txt.length,
        }
      }

      const rows = divs.map(score)

      const pickSmallest = (required: string[], forbidden: string[] = []) => {
        return rows
          .filter((row) => row.area > 4000)
          .filter((row) => required.every((word) => row.txt.includes(word)))
          .filter((row) => !forbidden.some((word) => row.txt.includes(word)))
          .sort((a, b) => a.len - b.len || a.area - b.area)[0]?.el || null
      }

      const paymentHeader = root.querySelector('[data-pmd-payment-header-copy-row="1"]') as HTMLElement | null
      const summaryOnly = pickSmallest(["Base amount", "Payable total"], ["Card Information", "Payment Methods"])
      const tipOnly = pickSmallest(["Add tip", "0%", "5%", "10%"], ["Card Information", "Payment Methods"])
      const fullAdjustment = pickSmallest(["Base amount", "Payable total", "Add tip"], ["Card Information", "Payment Methods"])

      if (paymentHeader) {
        paymentHeader.setAttribute("data-pmd-payment-soft-bg", "header")
        setSoftCream(paymentHeader)
      }

      if (summaryOnly) {
        summaryOnly.setAttribute("data-pmd-payment-real-panel", "summary")
        setSoftCream(summaryOnly)
      }

      if (tipOnly) {
        tipOnly.setAttribute("data-pmd-payment-real-panel", "tip-coupon")
        // PMD_REAL_TIP_COUPON_WRITER_NO_BLINK_20260605
        // Do NOT paint the Add tip / coupon panel cream.
        // It must be transparent from the same writer that marks it,
        // otherwise another hook has to correct it after paint and the UI blinks.
        tipOnly.style.setProperty("background", "transparent", "important")
        tipOnly.style.setProperty("background-color", "transparent", "important")
        tipOnly.style.setProperty("background-image", "none", "important")
        tipOnly.style.setProperty("border-color", "transparent", "important")
        tipOnly.style.setProperty("box-shadow", "none", "important")
      }

      if (fullAdjustment) {
        fullAdjustment.setAttribute("data-pmd-payment-adjustment-shell", "1")
        fullAdjustment.setAttribute("data-pmd-payment-soft-bg", "shell")
        setSoftCream(fullAdjustment)

        Array.from(fullAdjustment.querySelectorAll("div")).forEach((child) => {
          const childEl = child as HTMLElement

          // PMD_REAL_TIP_COUPON_WRITER_NO_BLINK_20260605
          // Do not repaint Add tip / coupon inner rows.
          if (childEl.closest('[data-pmd-payment-real-panel="tip-coupon"]')) return

          setSoftCream(childEl)
        })
      }

      ;[paymentHeader, summaryOnly, tipOnly, fullAdjustment].filter(Boolean).forEach((panel) => {
        const el = panel as HTMLElement
        el.querySelectorAll("input, textarea, select").forEach((input) => {
          const pmdKazenInputSkipTarget = input as HTMLElement
          if (pmdKazenInputSkipTarget.closest('[data-pmd-kazen-checkout-shell="1"] form[data-pmd-stripe-form="1"]')) return // PMD_SKIP_OLD_INPUT_STYLER_FOR_KAZEN_PAYMENT_20260612
          const inputEl = input as HTMLElement
          inputEl.style.setProperty("background", softCream, "important")
          inputEl.style.setProperty("background-color", softCream, "important")
          inputEl.style.setProperty("box-shadow", "none", "important")
        })
      })
    }

    const applyAll = () => {
      markTableOrderActions()
      markPaymentPanels()
    }

    applyAll()

    const t1 = window.setTimeout(applyAll, 40)
    const t2 = window.setTimeout(applyAll, 180)
    const t3 = window.setTimeout(applyAll, 520)
    const t4 = window.setTimeout(applyAll, 1100)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document.body
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyAll)
    })

    void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
      observer.disconnect()
    }
  }, [checkoutStep, selectedPaymentMethod, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, isSplitting, selectedSplitPersonId])

  // PMD_TABLE_ORDER_BUTTONS_LIKE_CONFIRM_EFFECT
  useEffect(() => {
    const normalize = (value: string | null | undefined) =>
      String(value || "").replace(/\s+/g, " ").trim()

    const applyTableOrderButtonLayout = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const text = normalize(btn.textContent)

        if (!text.includes("Send order to kitchen")) return

        btn.setAttribute("data-pmd-table-order-confirm-like", "primary")
        btn.setAttribute("data-pmd-send-kitchen-btn", "1")

        const spans = Array.from(btn.querySelectorAll("span")) as HTMLElement[]
        if (spans[0]) spans[0].setAttribute("data-pmd-send-kitchen-label", "1")
        if (spans[1]) spans[1].setAttribute("data-pmd-send-kitchen-arrow-wrap", "1")

        const svg = btn.querySelector("svg") as SVGElement | null
        if (svg) svg.setAttribute("data-pmd-send-kitchen-arrow", "1")

        const readyRow = btn.parentElement as HTMLElement | null
        if (readyRow && normalize(readyRow.textContent).includes("Ready to send?")) {
          readyRow.setAttribute("data-pmd-table-order-ready-row", "1")
        }

        let shell = readyRow?.parentElement as HTMLElement | null
        for (let i = 0; i < 8 && shell; i += 1) {
          const shellText = normalize(shell.textContent)
          const shellButtons = Array.from(shell.querySelectorAll("button")) as HTMLElement[]

          if (
            shellText.includes("Ready to send?") &&
            shellText.includes("Send order to kitchen") &&
            shellText.includes("Continue ordering") &&
            shellButtons.length >= 2
          ) {
            shell.setAttribute("data-pmd-table-order-actions-shell", "1")

            shellButtons.forEach((candidate) => {
              const candidateText = normalize(candidate.textContent)
              if (candidateText.includes("Continue ordering")) {
                candidate.setAttribute("data-pmd-table-order-confirm-like", "secondary")
                candidate.setAttribute("data-pmd-table-order-continue-btn", "1")
              }
            })

            break
          }

          shell = shell.parentElement as HTMLElement | null
        }
      })
    }

    applyTableOrderButtonLayout()

    const t1 = window.setTimeout(applyTableOrderButtonLayout, 40)
    const t2 = window.setTimeout(applyTableOrderButtonLayout, 180)
    const t3 = window.setTimeout(applyTableOrderButtonLayout, 650)

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document.body
    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(applyTableOrderButtonLayout)
    })

    void observer; // PMD_PERF_SAFE: observer disabled to prevent Payment freeze

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      observer.disconnect()
    }
  }, [checkoutStep, submittedSnapshot?.orderId, selectedPaymentMethod])

  // PMD_CARD_ACTION_BUTTONS_CONFIRM_SEND_CONTINUE_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const secondaryBorder = "color-mix(in srgb, #b88940 42%, var(--theme-border) 58%)"

    const forceChildrenColor = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const stylePrimary = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
      forceChildrenColor(btn, "#FFFFFF")
    }

    const styleSecondary = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${secondaryBorder}`, "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      forceChildrenColor(btn, secondaryText)
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (txt === "Confirm") {
          btn.setAttribute("data-pmd-card-confirm-btn", "1")
          stylePrimary(btn)
        }

        if (txt === "Send to kitchen" || txt === "Send order to kitchen" || txt === "Sending...") {
          btn.setAttribute("data-pmd-card-send-kitchen-btn", "1")
          stylePrimary(btn)
        }

        if (txt === "Continue ordering") {
          btn.setAttribute("data-pmd-card-continue-btn", "1")
          styleSecondary(btn)
        }
      })
    }

    apply()

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(apply)
    })
    // PMD_PERF_FIX: body MutationObserver disabled to prevent Payment/Order modal freeze.

    ;[0, 50, 150, 350, 700, 1200].forEach((delay) => {
      window.setTimeout(apply, delay)
    })

    return () => observer.disconnect()
  }, [])

  // PMD_PAY_SPLIT_REVIEW_BUTTONS_EFFECT
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const secondaryBorder = "color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)"

    const forceChildrenColor = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")

        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
          el.style.setProperty("fill", "none", "important")
        }
      })
    }

    const common = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("max-width", "none", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("letter-spacing", "-0.01em", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("transition", "transform 180ms cubic-bezier(.2,0,0,1), box-shadow 180ms ease, background-color 180ms ease, border-color 180ms ease", "important")
    }

    const stylePrimary = (btn: HTMLElement) => {
      common(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      btn.style.setProperty("opacity", "1", "important")
      forceChildrenColor(btn, "#FFFFFF")
    }

    const styleSecondary = (btn: HTMLElement) => {
      common(btn)
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${secondaryBorder}`, "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      forceChildrenColor(btn, secondaryText)
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (txt.includes("Pay in full")) {
          btn.setAttribute("data-pmd-card-pay-full-btn", "1")
          stylePrimary(btn)
        }

        if (txt.includes("Split bill")) {
          btn.setAttribute("data-pmd-card-split-bill-btn", "1")
          styleSecondary(btn)
        }

        if (txt === "Review split" || txt.includes("Review split")) {
          btn.setAttribute("data-pmd-card-review-split-btn", "1")
          stylePrimary(btn)
        }
      })
    }

    apply()

    const observer = new MutationObserver(() => {
      window.requestAnimationFrame(apply)
    })
    // PMD_PERF_FIX: body MutationObserver disabled to prevent Payment/Order modal freeze.

    ;[0, 50, 150, 350, 700, 1200].forEach((delay) => {
      window.setTimeout(apply, delay)
    })

    return () => observer.disconnect()
  }, [])

  // PMD_NO_OBSERVER_BUTTON_STYLE_FINAL
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const secondaryBorder = "color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)"

    const forceChildren = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const common = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("max-width", "none", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("letter-spacing", "-0.01em", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const primary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-no-observer-action", "primary")
      common(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      forceChildren(btn, "#FFFFFF")
    }

    const secondary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-no-observer-action", "secondary")
      common(btn)
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${secondaryBorder}`, "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      forceChildren(btn, secondaryText)
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (
          txt === "Confirm" ||
          txt.includes("Send to kitchen") ||
          txt.includes("Send order to kitchen") ||
          txt.includes("Sending") ||
          txt.includes("Pay in full") ||
          txt.includes("Review split")
        ) {
          primary(btn)
          return
        }

        if (
          txt === "Continue ordering" ||
          txt.includes("Split bill")
        ) {
          secondary(btn)
          return
        }
      })
    }

    apply()
    const timers = [0, 80, 200, 500, 900, 1400].map((delay) => window.setTimeout(apply, delay))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [checkoutStep])

  // PMD_RENDER_SAFE_PLUS_CONFIRM_SEND_SPLIT_FIX
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const secondaryText = "#0D1B1E"
    const softBg = "#FAF9F3"

    const forceChildren = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const commonButton = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("max-width", "none", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("letter-spacing", "-0.01em", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const primary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-action", "primary")
      commonButton(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      forceChildren(btn, "#FFFFFF")
    }

    const secondary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-action", "secondary")
      commonButton(btn)
      btn.style.setProperty("background", "transparent", "important")
      btn.style.setProperty("background-color", "transparent", "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", "1.5px solid color-mix(in srgb, #b88940 48%, var(--theme-border) 52%)", "important")
      btn.style.setProperty("color", secondaryText, "important")
      btn.style.setProperty("-webkit-text-fill-color", secondaryText, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(17, 24, 39, 0.04)", "important")
      forceChildren(btn, secondaryText)
    }

    const splitChoice = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-split-method", "1")
      commonButton(btn)
      btn.style.setProperty("background", softBg, "important")
      btn.style.setProperty("background-color", softBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", primaryBg, "important")
      btn.style.setProperty("-webkit-text-fill-color", primaryBg, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(6, 47, 42, 0.06)", "important")
      forceChildren(btn, primaryBg)
    }

    const plusButton = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-render-safe-plus", "1")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("font-weight", "900", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()
        const aria = btn.getAttribute("aria-label") || ""

        if (aria === "Increase quantity" && txt.includes("+")) {
          plusButton(btn)
          return
        }

        if (
          txt === "Confirm" ||
          txt.includes("Send to kitchen") ||
          txt.includes("Send order to kitchen") ||
          txt.includes("Sending") ||
          txt.includes("Pay in full") ||
          txt.includes("Review split")
        ) {
          primary(btn)
          return
        }

        if (
          txt === "Continue ordering" ||
          txt.includes("Split bill")
        ) {
          secondary(btn)
          return
        }

        if (
          false /* PMD_DISABLE_OLD_SPLIT_RUNTIME_WRITER: Split equally */ ||
          false /* PMD_DISABLE_OLD_SPLIT_RUNTIME_WRITER: By order items */ ||
          false /* PMD_DISABLE_OLD_SPLIT_RUNTIME_WRITER: By shares */
        ) {
          splitChoice(btn)
          return
        }
      })
    }

    const w = window as any
    w.__pmdRenderSafeButtonSeq = (w.__pmdRenderSafeButtonSeq || 0) + 1
    const seq = w.__pmdRenderSafeButtonSeq

    const timers = [0, 40, 120, 260, 520, 900, 1400].map((delay) =>
      window.setTimeout(() => {
        if ((window as any).__pmdRenderSafeButtonSeq === seq) apply()
      }, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  })

  // PMD_PLUS_WHITE_AND_SHARE_LINK_BUTTONS_FIX
  useEffect(() => {
    const primaryBg = "#062F2A"
    const primaryHover = "#021F1C"
    const softBg = "#FAF9F3"

    const forceChildren = (btn: HTMLElement, color: string) => {
      btn.querySelectorAll("*").forEach((node) => {
        const el = node as HTMLElement
        el.style.setProperty("color", color, "important")
        el.style.setProperty("-webkit-text-fill-color", color, "important")
        el.style.setProperty("text-shadow", "none", "important")
        if (el.tagName.toLowerCase() === "svg" || el.closest("svg")) {
          el.style.setProperty("stroke", color, "important")
        }
      })
    }

    const commonButton = (btn: HTMLElement) => {
      btn.style.setProperty("min-height", "3.5rem", "important")
      btn.style.setProperty("height", "3.5rem", "important")
      btn.style.setProperty("width", "100%", "important")
      btn.style.setProperty("border-radius", "9999px", "important")
      btn.style.setProperty("display", "flex", "important")
      btn.style.setProperty("align-items", "center", "important")
      btn.style.setProperty("justify-content", "center", "important")
      btn.style.setProperty("gap", "0.55rem", "important")
      btn.style.setProperty("padding", "0 1.25rem", "important")
      btn.style.setProperty("font-weight", "700", "important")
      btn.style.setProperty("font-size", "1rem", "important")
      btn.style.setProperty("line-height", "1.1", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const primary = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-share-extra-action", "primary")
      commonButton(btn)
      btn.style.setProperty("background", primaryBg, "important")
      btn.style.setProperty("background-color", primaryBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("box-shadow", "0 10px 22px rgba(0, 0, 0, 0.24)", "important")
      forceChildren(btn, "#FFFFFF")
    }

    const secondaryGreenFrame = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-share-extra-action", "secondary")
      commonButton(btn)
      btn.style.setProperty("background", softBg, "important")
      btn.style.setProperty("background-color", softBg, "important")
      btn.style.setProperty("background-image", "none", "important")
      btn.style.setProperty("border", `1.5px solid ${primaryBg}`, "important")
      btn.style.setProperty("color", primaryBg, "important")
      btn.style.setProperty("-webkit-text-fill-color", primaryBg, "important")
      btn.style.setProperty("box-shadow", "0 8px 18px rgba(6, 47, 42, 0.06)", "important")
      forceChildren(btn, primaryBg)
    }

    const plusWhite = (btn: HTMLElement) => {
      btn.setAttribute("data-pmd-plus-force-white", "1")
      btn.style.setProperty("color", "#FFFFFF", "important")
      btn.style.setProperty("-webkit-text-fill-color", "#FFFFFF", "important")
      btn.style.setProperty("text-shadow", "none", "important")
      btn.style.setProperty("font-weight", "900", "important")
      btn.style.setProperty("opacity", "1", "important")
    }

    const apply = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()
        const aria = btn.getAttribute("aria-label") || ""

        if (aria === "Increase quantity" && txt.includes("+")) {
          plusWhite(btn)
          return
        }

        if (txt.includes("Pay my share")) {
          primary(btn)
          return
        }

        if (
          txt.includes("Send payment link to others") ||
          txt.includes("Show QR/share link")
        ) {
          secondaryGreenFrame(btn)
          return
        }
      })
    }

    const timers = [0, 30, 80, 180, 350, 700, 1200, 1800].map((delay) =>
      window.setTimeout(apply, delay)
    )

    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [checkoutStep])


// PMD_SELECT_PAYER_BUTTON_FRAME_FIX
  useEffect(() => {
    if (hasCheckoutThemeRoot()) return

    const applySelectPayerStyle = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') || document
      const buttons = Array.from(root.querySelectorAll("button")) as HTMLElement[]

      buttons.forEach((btn) => {
        if (btn.closest('[data-pmd-kazen-checkout-shell="1"]')) {
          return // PMD_SKIP_OLD_BUTTON_EFFECTS_FOR_KAZEN_SHELL_20260612 + PMD_KAZEN_SAFE_STRIPE_PAY_CLEAN_20260612
        }
        const txt = (btn.textContent || "").replace(/\s+/g, " ").trim()

        if (txt === "Select payer") {
          btn.setAttribute("data-pmd-select-payer-btn", "1")
          btn.style.setProperty("min-height", "3.5rem", "important")
          btn.style.setProperty("height", "3.5rem", "important")
          btn.style.setProperty("width", "100%", "important")
          btn.style.setProperty("border-radius", "9999px", "important")
          btn.style.setProperty("display", "flex", "important")
          btn.style.setProperty("align-items", "center", "important")
          btn.style.setProperty("justify-content", "center", "important")
          btn.style.setProperty("padding", "0 1.25rem", "important")
          btn.style.setProperty("background", "#FAF9F3", "important")
          btn.style.setProperty("background-color", "#FAF9F3", "important")
          btn.style.setProperty("background-image", "none", "important")
          btn.style.setProperty("border", "1.5px solid #062F2A", "important")
          btn.style.setProperty("color", "#062F2A", "important")
          btn.style.setProperty("-webkit-text-fill-color", "#062F2A", "important")
          btn.style.setProperty("font-weight", "750", "important")
          btn.style.setProperty("font-size", "1rem", "important")
          btn.style.setProperty("box-shadow", "0 8px 18px rgba(6, 47, 42, 0.06)", "important")
          btn.style.setProperty("text-shadow", "none", "important")
        }
      })
    }

    const timers = [0, 60, 160, 350, 700].map((delay) => window.setTimeout(applySelectPayerStyle, delay))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [checkoutStep, selectedSplitPersonId, splitMethod])


  // PMD_TIP_COUPON_PANEL_INLINE_BG_FINAL_20260605
  // VISUAL ONLY: override only the inline background of Add tip / coupon panel.
  // No payment logic, no coupon logic, no cart logic, no plus/minus logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const clearTipCouponPanelBackground = () => {
      if (checkoutStep !== "payment") return

      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      const panel = root.querySelector('[data-pmd-payment-real-panel="tip-coupon"]') as HTMLElement | null
      if (!panel) return

      const makeTransparent = (el: HTMLElement | null | undefined) => {
        if (!el) return
        el.style.setProperty("background", "transparent", "important")
        el.style.setProperty("background-color", "transparent", "important")
        el.style.setProperty("background-image", "none", "important")
        el.style.setProperty("border-color", "transparent", "important")
        el.style.setProperty("box-shadow", "none", "important")
      }

      makeTransparent(panel)

      Array.from(panel.children).forEach((child) => {
        const childEl = child as HTMLElement
        makeTransparent(childEl)

        Array.from(childEl.children).forEach((grandChild) => {
          makeTransparent(grandChild as HTMLElement)
        })
      })
    }

    clearTipCouponPanelBackground()

    const t1 = window.setTimeout(clearTipCouponPanelBackground, 60)
    const t2 = window.setTimeout(clearTipCouponPanelBackground, 220)
    const t3 = window.setTimeout(clearTipCouponPanelBackground, 700)
    const t4 = window.setTimeout(clearTipCouponPanelBackground, 1400)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
      window.clearTimeout(t4)
    }
  }, [checkoutStep, couponDiscount, tipPercentage, customTip, appliedCoupon?.code, selectedPaymentMethod])


  // PMD_FLATTEN_EXACT_CHECKOUT_FRAMES_SAFE_20260606
  // VISUAL ONLY: flatten only the exact checkout div frames found by audit.
  // Does NOT touch buttons, inputs, Pay, Send to kitchen, Split bill, quantity controls, or payment/order logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    if (!root) return

    const flattenDiv = (el: HTMLElement | null | undefined) => {
      if (!el) return

      // Never touch controls or payment form internals.
      if (el.matches("button,input,textarea,select")) return
      if (el.closest('form[data-pmd-stripe-form="1"]')) return
      if (el.closest('[data-pmd-payment-selected-detail="1"]')) return

      el.style.setProperty("background", "transparent", "important")
      el.style.setProperty("background-color", "transparent", "important")
      el.style.setProperty("background-image", "none", "important")
      el.style.setProperty("border-color", "transparent", "important")
      el.style.setProperty("box-shadow", "none", "important")
    }

    const exactSelectors = [
      '[data-pmd-payment-header-copy-row="1"]',
      '[data-pmd-split-guest-stepper="1"]',
      '.pmd-checkout-meta-row',
      '.pmd-checkout-total-card',
      '.pmd-checkout-flat-section',
      '.pmd-checkout-list-scroll',
      '.pmd-checkout-item-card',
      '.surface-sub.rounded-2xl.p-4.space-y-4',
      '.surface-sub.rounded-2xl.p-3.space-y-1',
      '.surface-sub.rounded-2xl.p-3.space-y-2',
      '.surface-sub.rounded-2xl.p-3.space-y-3',
      '.surface-sub.rounded-3xl.p-3.space-y-3',
      '.rounded-2xl.p-3.shadow-sm',
      '.rounded-2xl.border.p-3',
      '.flex.items-center.justify-between.rounded-2xl.border.p-3'
    ]

    for (const selector of exactSelectors) {
      root.querySelectorAll(selector).forEach((node) => {
        flattenDiv(node as HTMLElement)
      })
    }
  }, [checkoutStep, selectedPaymentMethod, splitMethod, splitGuestCount, couponDiscount, tipPercentage, customTip, appliedCoupon?.code])


  // PMD_HIDE_ORDER_TYPE_TABLE_NUMBER_20260606
  // VISUAL ONLY: hide Order type / Table number / Order Number rows inside checkout cards.
  // Does NOT touch buttons, inputs, payment logic, split logic, quantity controls, or order submit logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return

    const hideOrderMetaRows = () => {
      const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
      if (!root) return

      // Main known row used for "Order type Delivery" / table context.
      root.querySelectorAll(".pmd-checkout-meta-row").forEach((node) => {
        const el = node as HTMLElement
        el.setAttribute("data-pmd-order-meta-hidden", "1")
        el.style.setProperty("display", "none", "important")
      })

      // Catch small direct rows such as "Order Number: 1606" or "Table number: 4"
      // without hiding large cards that contain totals.
      root.querySelectorAll("div").forEach((node) => {
        const el = node as HTMLElement

        if (el.matches("button,input,textarea,select")) return
        if (el.closest('form[data-pmd-stripe-form="1"]')) return
        if (el.closest('[data-pmd-payment-selected-detail="1"]')) return

        const rect = el.getBoundingClientRect()
        if (rect.width < 80 || rect.height < 10 || rect.height > 80) return

        const text = (el.innerText || "").trim().replace(/\s+/g, " ")
        if (!text) return

        const firstChildText = ((el.children?.[0] as HTMLElement | undefined)?.innerText || "")
          .trim()
          .replace(/\s+/g, " ")

        const isMetaLabel =
          /^(Order\s*type|Order\s*Number|Table\s*Number|Table)\s*:?\s*$/i.test(firstChildText)

        const isMetaRow =
          /^(Order\s*type|Order\s*Number|Table\s*Number|Table)\s*:?/i.test(text)

        if (isMetaLabel || isMetaRow) {
          el.setAttribute("data-pmd-order-meta-hidden", "1")
          el.style.setProperty("display", "none", "important")
        }
      })
    }

    hideOrderMetaRows()

    const root = document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null
    if (!root) return

    const observer = new MutationObserver(() => hideOrderMetaRows())
    observer.observe(root, { childList: true, subtree: true })

    const t1 = window.setTimeout(hideOrderMetaRows, 50)
    const t2 = window.setTimeout(hideOrderMetaRows, 250)

    return () => {
      observer.disconnect()
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [checkoutStep])











  // PMD_PERMANENT_CONSOLE_TIP_COUPON_FIX_20260605
  // Narrow runtime visual fix for tip custom field + coupon/apply only.
  // This intentionally does NOT touch plus/minus buttons, cart buttons, Pay in full, Split bill, or payment logic.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return
    if (hasCheckoutThemeRoot()) return

    const forceStyle = (el: HTMLElement | null | undefined, styles: Record<string, string>) => {
      if (!el) return
      Object.entries(styles).forEach(([key, value]) => {
        el.style.setProperty(key, value, "important")
      })
    }

    const applyTipCouponVisualFix = () => {
      const root =
        (document.querySelector('[data-pmd-checkout-scroll="1"]') as HTMLElement | null) ||
        (document.querySelector('[data-pmd-checkout-design-system="1"]') as HTMLElement | null)

      if (!root) return

      const custom = root.querySelector(
        'input[data-pmd-custom-tip-shows-selected-amount="1"]'
      ) as HTMLElement | null

      const customWrap = custom?.closest("div") as HTMLElement | null
      const euro = customWrap?.querySelector("span") as HTMLElement | null

      const coupon = root.querySelector('input[placeholder="Coupon code"]') as HTMLElement | null
      const applyButton = coupon?.parentElement?.querySelector("button") as HTMLElement | null

      forceStyle(customWrap, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
      })

      forceStyle(euro, {
        left: "20px",
        top: "50%",
        height: "46px",
        "line-height": "46px",
        display: "flex",
        "align-items": "center",
        transform: "translateY(-50%)",
        "font-size": "14px",
        "font-weight": "750",
        "z-index": "2",
        "pointer-events": "none",
      })

      forceStyle(custom, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
        "line-height": "46px",
        "box-sizing": "border-box",
        "padding-left": "54px",
        "padding-right": "14px",
        "font-size": "14.72px",
        "font-weight": "650",
        "border-radius": "9999px",
      })

      forceStyle(coupon, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
        "line-height": "46px",
        "box-sizing": "border-box",
        "padding-left": "16px",
        "padding-right": "16px",
        "font-size": "14.72px",
        "font-weight": "650",
        "border-radius": "9999px",
      })

      forceStyle(applyButton, {
        height: "46px",
        "min-height": "46px",
        "max-height": "46px",
        "line-height": "1",
        "box-sizing": "border-box",
        "font-size": "14.72px",
        "font-weight": "750",
        "border-radius": "9999px",
      })
    }

    let rafId: number | null = null

    const scheduleFix = () => {
      if (rafId !== null) return
      rafId = window.requestAnimationFrame(() => {
        rafId = null
        applyTipCouponVisualFix()
      })
    }

    applyTipCouponVisualFix()

    const observer = new MutationObserver(scheduleFix)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "disabled"],
    })

    const intervalId = window.setInterval(applyTipCouponVisualFix, 700)

    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      observer.disconnect()
      window.clearInterval(intervalId)
    }
  }, [])


}
