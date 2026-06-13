"use client"

// PMD_MENU_FOOTER_LOGO_RUNTIME_FINAL_20260611
export function pmdInstallMenuPayMyDineFooterLogo() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {}

  const lightLogo = "/assets/media/uploads/PMD.png?v=1780008763"
  const darkLogo = "/assets/media/uploads/PMDD.png?v=1780008763"
  const footerSelector = '[data-pmd-menu-footer-logo="1"], .pmd-menu-theme-footer-logo, .pmd-shared-paymydine-footer-logo, [data-pmd-shared-footer-logo="1"]'

  const readThemeText = () => {
    const chunks: string[] = []

    try {
      chunks.push(document.documentElement.getAttribute("data-theme") || "")
      chunks.push(document.body.getAttribute("data-theme") || "")
      chunks.push(document.documentElement.className || "")
      chunks.push(document.body.className || "")

      for (const storage of [window.localStorage, window.sessionStorage]) {
        for (let i = 0; i < storage.length; i += 1) {
          const key = storage.key(i) || ""
          if (!/theme|paymydine/i.test(key)) continue
          chunks.push(key)
          chunks.push(storage.getItem(key) || "")
        }
      }
    } catch {}

    return chunks.join(" ").toLowerCase()
  }

  const isKazen = () => {
    const text = readThemeText()
    return (
      text.includes("kazen") ||
      Boolean(document.querySelector("#pmd-kazen-japanese-frame, .kazen-page"))
    )
  }

  const isModernOrOrganic = () => {
    const text = readThemeText()

    if (
      text.includes("modern_green") ||
      text.includes("modern-green") ||
      text.includes("organic_botanical_paper") ||
      text.includes("organic-botanical") ||
      text.includes("botanical")
    ) {
      return true
    }

    return Boolean(
      document.querySelector(
        '[class*="modern-green"], [class*="modernGreen"], [data-pmd-mg-button-v2], [data-pmd-modern], [class*="organic"], [class*="botanical"], [data-pmd-organic]'
      )
    )
  }

  const isDarkMode = () => {
    try {
      if (
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark") ||
        document.documentElement.getAttribute("data-mode") === "dark" ||
        document.body.getAttribute("data-mode") === "dark" ||
        document.documentElement.getAttribute("data-color-mode") === "dark" ||
        document.body.getAttribute("data-color-mode") === "dark"
      ) {
        return true
      }

      const bg =
        window.getComputedStyle(document.body).backgroundColor ||
        window.getComputedStyle(document.documentElement).backgroundColor ||
        ""

      const nums = bg.match(/\d+(\.\d+)?/g)?.slice(0, 3).map(Number) || []
      if (nums.length >= 3) {
        const brightness = (nums[0] * 299 + nums[1] * 587 + nums[2] * 114) / 1000
        return brightness < 92
      }
    } catch {}

    return false
  }

  const ensureStyle = () => {
    if (document.getElementById("pmd-menu-footer-logo-style")) return

    const style = document.createElement("style")
    style.id = "pmd-menu-footer-logo-style"
    style.textContent = `
      .pmd-menu-theme-footer-logo {
        width: 100% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        margin: 72px auto 132px !important;
        padding: 0 16px !important;
        opacity: 1 !important;
        filter: none !important;
        pointer-events: none !important;
        position: relative !important;
        z-index: 1 !important;
      }

      .pmd-menu-theme-footer-logo img {
        display: block !important;
        width: 82px !important;
        max-width: 82px !important;
        min-width: 82px !important;
        height: auto !important;
        object-fit: contain !important;
        opacity: 1 !important;
        filter: none !important;
        mix-blend-mode: normal !important;
      }

      @media (max-width: 640px) {
        .pmd-menu-theme-footer-logo {
          margin-top: 64px !important;
          margin-bottom: 126px !important;
        }

        .pmd-menu-theme-footer-logo img {
          width: 74px !important;
          max-width: 74px !important;
          min-width: 74px !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  const getTarget = () => {
    return (
      document.querySelector<HTMLElement>('main') ||
      document.querySelector<HTMLElement>('#__next') ||
      document.body
    )
  }

  let running = false

  const ensure = () => {
    if (running) return

    running = true
    window.requestAnimationFrame(() => {
      running = false

      ensureStyle()

      const target = getTarget()
      if (!target) return

      const shouldShow = !isKazen() && isModernOrOrganic()

      if (!shouldShow) {
        document.querySelectorAll(footerSelector).forEach((el) => el.remove())
        return
      }

      const desiredSrc = isDarkMode() ? darkLogo : lightLogo

      let footer = target.querySelector<HTMLElement>('[data-pmd-menu-footer-logo="1"]')

      document.querySelectorAll(footerSelector).forEach((el) => {
        if (el !== footer) el.remove()
      })

      if (!footer) {
        footer = document.createElement("div")
        footer.className = "pmd-menu-theme-footer-logo"
        footer.setAttribute("data-pmd-menu-footer-logo", "1")

        const img = document.createElement("img")
        img.alt = "PayMyDine"
        img.src = desiredSrc
        footer.appendChild(img)

        target.appendChild(footer)
        return
      }

      const img = footer.querySelector("img") || document.createElement("img")
      img.alt = "PayMyDine"
      if (!img.parentElement) footer.appendChild(img)

      if (!img.getAttribute("src")?.includes(desiredSrc)) {
        img.setAttribute("src", desiredSrc)
      }

      if (target.lastElementChild !== footer) {
        target.appendChild(footer)
      }
    })
  }

  ensure()

  const timers = [
    window.setTimeout(ensure, 250),
    window.setTimeout(ensure, 900),
    window.setTimeout(ensure, 1800),
    window.setTimeout(ensure, 3200),
  ]

  const observer = new MutationObserver(ensure)
  observer.observe(document.body, { childList: true, subtree: true })

  window.addEventListener("storage", ensure)
  window.addEventListener("resize", ensure)

  return () => {
    timers.forEach((timer) => window.clearTimeout(timer))
    observer.disconnect()
    window.removeEventListener("storage", ensure)
    window.removeEventListener("resize", ensure)
  }
}
