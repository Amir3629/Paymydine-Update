// PMD_KAZEN_DARK_MODE_FINAL_CLEAN_20260611
export function pmdInstallKazenFinalDarkMode() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {}

  const storageKey = "pmd-kazen-japanese-mode"
  const styleId = "pmd-kazen-final-dark-style"

  const installStyle = () => {
    if (document.getElementById(styleId)) return

    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      html[data-pmd-kazen-mode="dark"],
      html[data-pmd-kazen-mode="dark"] body {
        background:
          radial-gradient(circle at 80% 0%, rgba(111, 34, 26, .28), transparent 26%),
          linear-gradient(180deg, #0c0907 0%, #050403 52%, #020202 100%) !important;
        color: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page {
        --kazen-paper: #080705;
        --kazen-paper-soft: #0f0c09;
        --kazen-paper-deep: #15110d;
        --kazen-ink: #f6e8c8;
        --kazen-muted: #d7c298;
        --kazen-line: rgba(198, 164, 93, .26);
        --kazen-line-strong: rgba(198, 164, 93, .46);
        --kazen-red: #df685d;
        background:
          radial-gradient(circle at 82% 1%, rgba(118, 38, 29, .20), transparent 28%),
          linear-gradient(180deg, #090806 0%, #050403 100%) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: initial !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-brand,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-brand * {
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        opacity: 1 !important;
        filter: none !important;
        text-shadow: 0 2px 18px rgba(0,0,0,.78) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-subtitle,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-subtitle * {
        color: #d7c298 !important;
        -webkit-text-fill-color: #d7c298 !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-hero {
        background-image:
          linear-gradient(90deg, rgba(5, 5, 6, .60), rgba(5, 5, 6, .07)),
          url("/themes/kazen-japanese/TokyoNight.png") !important;
        background-size: cover !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        border-top: 1px solid rgba(198, 164, 93, .28) !important;
        border-bottom: 1px solid rgba(198, 164, 93, .28) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-motto,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-motto * {
        color: #fff0cc !important;
        -webkit-text-fill-color: #fff0cc !important;
        opacity: 1 !important;
        background: transparent !important;
        text-shadow: 0 2px 18px rgba(0,0,0,.96) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-call {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
        background: rgba(7, 6, 5, .52) !important;
        border-color: rgba(223, 104, 93, .58) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category:last-child {
        border-color: rgba(198, 164, 93, .25) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn * {
        color: #e9d8ae !important;
        -webkit-text-fill-color: #e9d8ae !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-title,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-title * {
        color: #e9d8ae !important;
        -webkit-text-fill-color: #e9d8ae !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-category-btn line {
        color: #e9d8ae !important;
        stroke: #e9d8ae !important;
        -webkit-text-fill-color: #e9d8ae !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item {
        background: rgba(15, 12, 9, .82) !important;
        border-color: rgba(198, 164, 93, .31) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-name,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-name * {
        color: #f5e7c5 !important;
        -webkit-text-fill-color: #f5e7c5 !important;
        opacity: 1 !important;
        filter: none !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-description,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-description * {
        color: #d9c79d !important;
        -webkit-text-fill-color: #d9c79d !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-price,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-item-price * {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add {
        background: rgba(246, 232, 200, .95) !important;
        color: #080705 !important;
        -webkit-text-fill-color: #080705 !important;
        border-color: rgba(198, 164, 93, .48) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-add line {
        color: #080705 !important;
        stroke: #080705 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill {
        background: rgba(8, 7, 5, .76) !important;
        border-color: rgba(198, 164, 93, .39) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-icon-button line,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-pill line {
        color: #f6e8c8 !important;
        stroke: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock {
        background: rgba(7, 6, 5, .94) !important;
        border-color: rgba(198, 164, 93, .32) !important;
        box-shadow: 0 18px 48px rgba(0,0,0,.52) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button * {
        background: rgba(11, 9, 7, .84) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        border-color: rgba(198, 164, 93, .36) !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"],
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"] * {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
        border-color: rgba(223, 104, 93, .58) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-paymydine-footer-logo-text {
        display: none !important;
      }



      /* PMD_FIX_KAZEN_WAITER_NOTE_CHECKOUT_DARK_CARDS_20260612
         Force waiter, note and checkout action cards/modals to follow Kazen dark mode. */

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock {
        background:
          linear-gradient(180deg, rgba(13, 10, 7, .98), rgba(4, 3, 2, .98)) !important;
        border-color: rgba(198, 164, 93, .42) !important;
        box-shadow:
          0 -18px 54px rgba(0, 0, 0, .72),
          inset 0 1px 0 rgba(255, 240, 204, .08) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button {
        background:
          linear-gradient(180deg, rgba(22, 17, 11, .96), rgba(8, 6, 4, .96)) !important;
        border: 1px solid rgba(198, 164, 93, .38) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        box-shadow:
          inset 0 1px 0 rgba(255, 240, 204, .08),
          0 10px 26px rgba(0,0,0,.34) !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button *,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button path,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button line,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button rect,
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button circle {
        color: #f6e8c8 !important;
        stroke: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"],
      html[data-pmd-kazen-mode="dark"] body .kazen-page .kazen-dock button[data-primary="true"] * {
        background:
          linear-gradient(180deg, rgba(223, 104, 93, .16), rgba(72, 23, 18, .24)) !important;
        border-color: rgba(223, 104, 93, .64) !important;
        color: #df685d !important;
        stroke: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-overlay {
        background: rgba(2, 2, 2, .76) !important;
        backdrop-filter: blur(10px) !important;
        -webkit-backdrop-filter: blur(10px) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-panel,
      html[data-pmd-kazen-mode="dark"] body [data-kazen-solid-panel="1"] {
        background:
          radial-gradient(circle at 85% 0%, rgba(111, 34, 26, .20), transparent 28%),
          linear-gradient(180deg, #14100b 0%, #090705 100%) !important;
        background-color: #090705 !important;
        border: 1px solid rgba(198, 164, 93, .42) !important;
        color: #f6e8c8 !important;
        box-shadow:
          0 32px 90px rgba(0,0,0,.78),
          inset 0 1px 0 rgba(255, 240, 204, .08) !important;
        opacity: 1 !important;
        filter: none !important;
        mix-blend-mode: normal !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-sheet {
        background:
          linear-gradient(180deg, rgba(255, 240, 204, .05), rgba(198, 164, 93, .03)) !important;
        border-color: rgba(198, 164, 93, .24) !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-head {
        color: #f6e8c8 !important;
        -webkit-text-fill-color: initial !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-head h2,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-head h3,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content label,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content p,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content span {
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        opacity: 1 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-eyebrow {
        color: #df685d !important;
        -webkit-text-fill-color: #df685d !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button,
      html[data-pmd-kazen-mode="dark"] body .kazen-primary,
      html[data-pmd-kazen-mode="dark"] body .kazen-secondary {
        background: rgba(12, 9, 6, .92) !important;
        border: 1px solid rgba(198, 164, 93, .40) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close path,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-close line,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button svg,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button path,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content button line {
        color: #f6e8c8 !important;
        stroke: #f6e8c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content input,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content textarea,
      html[data-pmd-kazen-mode="dark"] body .kazen-field {
        background: rgba(5, 4, 3, .88) !important;
        border: 1px solid rgba(198, 164, 93, .34) !important;
        color: #f6e8c8 !important;
        -webkit-text-fill-color: #f6e8c8 !important;
        caret-color: #df685d !important;
      }

      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content input::placeholder,
      html[data-pmd-kazen-mode="dark"] body .kazen-solid-modal-content textarea::placeholder {
        color: rgba(246, 232, 200, .56) !important;
        -webkit-text-fill-color: rgba(246, 232, 200, .56) !important;
      }

      [data-pmd-kazen-dark-toggle] {
        position: fixed !important;
        top: 24px !important;
        right: max(18px, calc(50vw - 315px)) !important;
        z-index: 999999 !important;
        border: 1px solid rgba(198, 164, 93, .68) !important;
        background: rgba(8, 7, 5, .92) !important;
        color: #f4d58d !important;
        -webkit-text-fill-color: #f4d58d !important;
        padding: 10px 14px !important;
        font-size: 11px !important;
        letter-spacing: .18em !important;
        font-family: Georgia, "Times New Roman", serif !important;
        cursor: pointer !important;
      }
    `

    // Append after the React-rendered <style> block, otherwise original Kazen !important rules can win.
    document.body.appendChild(style)
  }

  const setMode = (mode: "light" | "dark") => {
    document.documentElement.setAttribute("data-pmd-kazen-mode", mode)
    document.body?.setAttribute("data-pmd-kazen-mode", mode)
    try { window.localStorage.setItem(storageKey, mode) } catch {}

    const button = document.querySelector("[data-pmd-kazen-dark-toggle]") as HTMLButtonElement | null
    if (button) {
      button.textContent = mode === "dark" ? "☀ LIGHT" : "☾ DARK"
    }
  }

  const ensureToggle = () => {
    let button = document.querySelector("[data-pmd-kazen-dark-toggle]") as HTMLButtonElement | null
    if (!button) {
      button = document.createElement("button")
      button.type = "button"
      button.setAttribute("data-pmd-kazen-dark-toggle", "1")
      button.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-pmd-kazen-mode") === "dark" ? "dark" : "light"
        setMode(current === "dark" ? "light" : "dark")
      })
      document.body.appendChild(button)
    }
  }

  installStyle()
  ensureToggle()

  let saved = "light"
  try { saved = window.localStorage.getItem(storageKey) || "light" } catch {}

  const urlMode = new URLSearchParams(window.location.search).get("mode")
  setMode(urlMode === "dark" || saved === "dark" ? "dark" : "light")

  return () => {}
}



// PMD_KAZEN_CLEAN_HEADER_BUTTONS_20260611
export function pmdInstallKazenCleanHeaderButtons() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {}

  const storageKey = "pmd-kazen-japanese-mode"
  const styleId = "pmd-kazen-clean-header-buttons-style"

  if (!document.getElementById(styleId)) {
    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      .kazen-shell {
        position: relative !important;
      }

      [data-pmd-kazen-old-header-control="1"],
      [data-pmd-kazen-dark-toggle]:not([data-pmd-kazen-clean-mode-proxy="1"]) {
        display: none !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }

      [data-pmd-kazen-clean-header-actions="1"] {
        position: absolute !important;
        top: 2.05rem !important;
        right: 1.35rem !important;
        z-index: 80 !important;
        display: grid !important;
        grid-template-columns: repeat(3, 2.62rem) !important;
        gap: .48rem !important;
        align-items: center !important;
        justify-content: end !important;
      }

      .kazen-clean-header-button {
        width: 2.62rem !important;
        height: 2.62rem !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border: 1px solid rgba(35,34,31,.22) !important;
        background: rgba(255,255,255,.26) !important;
        color: var(--kazen-ink, #242320) !important;
        padding: 0 !important;
        margin: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        cursor: pointer !important;
        font-family: Georgia, "Times New Roman", serif !important;
        font-size: .82rem !important;
        line-height: 1 !important;
      }

      .kazen-clean-header-button svg,
      .kazen-clean-header-button path,
      .kazen-clean-header-button line,
      .kazen-clean-header-button circle,
      .kazen-clean-header-button polyline {
        stroke: currentColor !important;
        color: currentColor !important;
        fill: none !important;
      }

      .kazen-clean-header-button:hover {
        border-color: rgba(184,93,89,.48) !important;
        color: var(--kazen-red, #b85d59) !important;
      }

      html[data-pmd-kazen-mode="dark"] .kazen-clean-header-button {
        background: rgba(8,7,5,.62) !important;
        border-color: rgba(198,164,93,.52) !important;
        color: #f4e7c8 !important;
      }

      html[data-pmd-kazen-mode="dark"] .kazen-clean-header-button:hover {
        border-color: rgba(223,104,93,.65) !important;
        color: #df685d !important;
      }

      @media (max-width: 520px) {
        [data-pmd-kazen-clean-header-actions="1"] {
          top: 1.55rem !important;
          right: 1rem !important;
          grid-template-columns: repeat(3, 2.42rem) !important;
          gap: .38rem !important;
        }

        .kazen-clean-header-button {
          width: 2.42rem !important;
          height: 2.42rem !important;
        }
      }
    `
    document.head.appendChild(style)
  }

  const normalize = (value: string) => value.replace(/\s+/g, " ").trim().toUpperCase()

  const findOldButton = (pattern: RegExp) => {
    const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[]
    return buttons.find((button) => {
      if (button.closest('[data-pmd-kazen-clean-header-actions="1"]')) return false
      const text = normalize(button.textContent || "")
      return pattern.test(text)
    }) || null
  }

  const markOldHeaderControls = () => {
    const buttons = Array.from(document.querySelectorAll("button")) as HTMLButtonElement[]

    buttons.forEach((button) => {
      if (button.closest('[data-pmd-kazen-clean-header-actions="1"]')) return
      if (button.hasAttribute("data-pmd-kazen-dark-toggle")) return

      const rect = button.getBoundingClientRect()
      const text = normalize(button.textContent || "")
      const cls = String(button.className || "")

      const isTopHeader =
        rect.top >= -20 &&
        rect.top < 290 &&
        (
          /TABLE|VALET|EN|DE|FA|AR|LANG/.test(text) ||
          cls.includes("kazen-icon-button") ||
          cls.includes("kazen-pill")
        )

      if (isTopHeader) {
        button.setAttribute("data-pmd-kazen-old-header-control", "1")
      }
    })
  }

  const currentMode = () =>
    document.documentElement.getAttribute("data-pmd-kazen-mode") === "dark" ? "dark" : "light"

  const setMode = (mode: "light" | "dark") => {
    document.documentElement.setAttribute("data-pmd-kazen-mode", mode)
    document.body?.setAttribute("data-pmd-kazen-mode", mode)
    try { window.localStorage.setItem(storageKey, mode) } catch {}

    const originalToggle = document.querySelector("[data-pmd-kazen-dark-toggle]") as HTMLButtonElement | null
    if (originalToggle) {
      originalToggle.textContent = mode === "dark" ? "☀ LIGHT" : "☾ DARK"
    }

    const proxy = document.querySelector('[data-pmd-kazen-clean-action="mode"]') as HTMLButtonElement | null
    if (proxy) {
      proxy.innerHTML = mode === "dark"
        ? `<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.5 6.5 0 0 0 21 12.8Z"/></svg>`
    }
  }

  const createButton = (action: string, title: string, html: string, onClick: () => void) => {
    const button = document.createElement("button")
    button.type = "button"
    button.className = "kazen-clean-header-button"
    button.setAttribute("data-pmd-kazen-clean-action", action)
    button.setAttribute("aria-label", title)
    button.title = title
    button.innerHTML = html
    button.addEventListener("click", onClick)
    return button
  }

  const ensureActions = () => {
    const shell = document.querySelector(".kazen-shell") as HTMLElement | null
    const mount = shell || document.body

    let box = document.querySelector('[data-pmd-kazen-clean-header-actions="1"]') as HTMLElement | null
    if (!box) {
      box = document.createElement("div")
      box.setAttribute("data-pmd-kazen-clean-header-actions", "1")

      const languageButton = createButton(
        "language",
        "Language",
        `<svg width="19" height="19" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h9M9 3v2M6 9c1.1 2.4 3.1 4.5 6 6M12 9c-.9 2.3-2.8 4.5-6 6"/><path d="M14 20l4-9 4 9M15.3 17h5.4"/></svg>`,
        () => {
          const old = findOldButton(/EN|DE|FA|AR|LANG/)
          if (old) old.click()
        }
      )

      const modeButton = createButton(
        "mode",
        "Mode",
        "",
        () => setMode(currentMode() === "dark" ? "light" : "dark")
      )

      const valetButton = createButton(
        "valet",
        "Valet",
        `<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h14l-1.4-5.1A3 3 0 0 0 14.7 9H9.3a3 3 0 0 0-2.9 1.9L5 16Z"/><path d="M7 16v2M17 16v2M8 13h.01M16 13h.01"/></svg>`,
        () => {
          const old = findOldButton(/VALET/)
          if (old) old.click()
        }
      )

      box.appendChild(languageButton)
      box.appendChild(modeButton)
      box.appendChild(valetButton)
      mount.appendChild(box)
    }

    setMode(currentMode())
  }

  markOldHeaderControls()
  ensureActions()

  const interval = window.setInterval(() => {
    markOldHeaderControls()
    ensureActions()
  }, 500)

  return () => window.clearInterval(interval)
}



// PMD_KAZEN_PREMIUM_MOTION_20260611
export function pmdInstallKazenPremiumMotion() {
  if (typeof window === "undefined" || typeof document === "undefined") return () => {}

  const styleId = "pmd-kazen-premium-motion-style"
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style")
    style.id = styleId
    style.textContent = `
      :root {
        --pmd-kazen-ease-out: cubic-bezier(.16, 1, .3, 1);
        --pmd-kazen-ease-soft: cubic-bezier(.22, .68, 0, 1);
        --pmd-kazen-ease-inout: cubic-bezier(.65, 0, .35, 1);
      }

      @keyframes pmdKazenFadeUp {
        from { opacity: 0; transform: translate3d(0, 14px, 0) scale(.985); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }

      @keyframes pmdKazenModalIn {
        from { opacity: 0; transform: translate3d(0, 18px, 0) scale(.965); }
        to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
      }

      @keyframes pmdKazenOverlayIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes pmdKazenCartPulse {
        0% { transform: translateX(-50%) scale(1); }
        35% { transform: translateX(-50%) scale(1.025); }
        100% { transform: translateX(-50%) scale(1); }
      }

      @keyframes pmdKazenAddPop {
        0% { transform: scale(1); }
        42% { transform: scale(.88); }
        72% { transform: scale(1.08); }
        100% { transform: scale(1); }
      }

      .kazen-page {
        scroll-behavior: smooth;
      }

      .kazen-page * {
        -webkit-tap-highlight-color: transparent;
      }

      .kazen-shell,
      .kazen-hero,
      .kazen-call,
      .kazen-category,
      .kazen-category-btn,
      .kazen-category-label,
      .kazen-category-icon,
      .kazen-category-icon-shell,
      .kazen-category-title,
      .kazen-item,
      .kazen-item-image,
      .kazen-item-image-empty,
      .kazen-item-name,
      .kazen-item-description,
      .kazen-item-price,
      .kazen-add,
      .kazen-dock,
      .kazen-dock button,
      .kazen-clean-header-button,
      .kazen-primary,
      .kazen-secondary,
      .kazen-field,
      .kazen-qty button,
      .kazen-solid-close {
        transition-property: transform, opacity, color, background-color, border-color, box-shadow, filter, max-height, padding, margin;
        transition-duration: 260ms;
        transition-timing-function: var(--pmd-kazen-ease-out);
      }

      .kazen-shell {
        animation: pmdKazenFadeUp 520ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-hero {
        transition-duration: 420ms;
      }

      .kazen-hero:hover {
        filter: brightness(1.035) saturate(1.03);
      }

      .kazen-call,
      .kazen-category-btn,
      .kazen-add,
      .kazen-dock button,
      .kazen-clean-header-button,
      .kazen-primary,
      .kazen-secondary,
      .kazen-qty button,
      .kazen-solid-close {
        will-change: transform;
      }

      .kazen-call:hover,
      .kazen-category-btn:hover,
      .kazen-dock button:hover,
      .kazen-clean-header-button:hover,
      .kazen-primary:hover,
      .kazen-secondary:hover,
      .kazen-solid-close:hover {
        transform: translate3d(0, -2px, 0);
        box-shadow: 0 14px 34px rgba(0,0,0,.10);
      }

      .kazen-call:active,
      .kazen-category-btn:active,
      .kazen-add:active,
      .kazen-dock button:active,
      .kazen-clean-header-button:active,
      .kazen-primary:active,
      .kazen-secondary:active,
      .kazen-qty button:active,
      .kazen-solid-close:active,
      .pmd-kazen-tap-active {
        transform: scale(.965) !important;
      }

      .kazen-category {
        overflow: visible;
      }

      .kazen-category.is-open {
        background: linear-gradient(180deg, rgba(255,255,255,.025), transparent);
      }

      .kazen-category.is-open .kazen-category-icon-shell,
      .kazen-category-btn:hover .kazen-category-icon-shell {
        transform: translate3d(2px, 0, 0) scale(1.06);
      }

      .kazen-category.is-open .kazen-category-title {
        letter-spacing: .50em;
      }

      .kazen-category.is-open .kazen-category-btn svg {
        transform: rotate(180deg) scale(.92);
      }

      .kazen-category-btn svg {
        transition: transform 300ms var(--pmd-kazen-ease-out), color 260ms var(--pmd-kazen-ease-out), stroke 260ms var(--pmd-kazen-ease-out);
        transform-origin: 50% 50%;
      }

      .kazen-accordion {
        overflow: hidden;
        max-height: 0;
        opacity: 0;
        transform: translate3d(0, -8px, 0);
        transition:
          max-height 520ms var(--pmd-kazen-ease-soft),
          opacity 280ms ease,
          transform 420ms var(--pmd-kazen-ease-out),
          padding 420ms var(--pmd-kazen-ease-out);
        will-change: max-height, opacity, transform;
        pointer-events: none;
      }

      .kazen-accordion.is-open {
        /* PMD_FIX_KAZEN_IFRAME_ACCORDION_ALL_ITEMS_20260612 */
        max-height: none !important;
        height: auto !important;
        overflow: visible !important;
        opacity: 1;
        transform: translate3d(0, 0, 0);
        pointer-events: auto;
      }

      .kazen-accordion.is-closed .kazen-items {
        transform: translate3d(0, -10px, 0);
      }

      .kazen-accordion.is-open .kazen-items {
        animation: pmdKazenFadeUp 380ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-accordion.is-open .kazen-item {
        animation: pmdKazenFadeUp 420ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-accordion.is-open .kazen-item:nth-child(1) { animation-delay: 25ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(2) { animation-delay: 55ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(3) { animation-delay: 85ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(4) { animation-delay: 115ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(5) { animation-delay: 145ms; }
      .kazen-accordion.is-open .kazen-item:nth-child(n+6) { animation-delay: 175ms; }

      .kazen-item:hover {
        transform: translate3d(0, -3px, 0);
        box-shadow: 0 18px 42px rgba(0,0,0,.16) !important;
      }

      .kazen-item:hover .kazen-item-image,
      .kazen-item:hover .kazen-item-image-empty {
        transform: scale(1.035);
      }

      .kazen-add:hover {
        transform: scale(1.06) rotate(3deg);
        box-shadow: 0 12px 26px rgba(0,0,0,.14) !important;
      }

      .kazen-add.pmd-kazen-added {
        animation: pmdKazenAddPop 420ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-dock {
        transition-duration: 320ms;
      }

      .kazen-dock:hover {
        transform: translateX(-50%) translateY(-2px);
        box-shadow: 0 24px 58px rgba(0,0,0,.22) !important;
      }

      .kazen-dock.pmd-kazen-cart-pulse {
        animation: pmdKazenCartPulse 450ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-solid-modal-overlay {
        animation: pmdKazenOverlayIn 220ms ease both;
      }

      html body .kazen-solid-modal-panel {
        animation: pmdKazenModalIn 380ms var(--pmd-kazen-ease-out) both;
        transform-origin: 50% 54% !important;
      }

      html body .kazen-solid-modal-panel .kazen-modal-image {
        animation: pmdKazenFadeUp 420ms var(--pmd-kazen-ease-out) both;
      }

      .kazen-field:focus {
        border-color: rgba(184,93,89,.58) !important;
        box-shadow: 0 0 0 3px rgba(184,93,89,.10) !important;
      }

      html[data-pmd-kazen-mode="dark"] .kazen-call:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-category-btn:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-dock button:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-clean-header-button:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-primary:hover,
      html[data-pmd-kazen-mode="dark"] .kazen-secondary:hover {
        box-shadow: 0 14px 34px rgba(0,0,0,.32) !important;
      }

      @media (prefers-reduced-motion: reduce) {
        .kazen-page *,
        .kazen-page *::before,
        .kazen-page *::after {
          animation: none !important;
          transition-duration: 1ms !important;
          scroll-behavior: auto !important;
        }
      }
    `
    document.body.appendChild(style)
  }

  const pulse = (el: Element | null, className: string, ms = 430) => {
    if (!(el instanceof HTMLElement)) return
    el.classList.remove(className)
    void el.offsetWidth
    el.classList.add(className)
    window.setTimeout(() => el.classList.remove(className), ms)
  }

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest?.("button, .kazen-item, .kazen-clean-header-button") as HTMLElement | null
    if (!button) return
    button.classList.add("pmd-kazen-tap-active")
    window.setTimeout(() => button.classList.remove("pmd-kazen-tap-active"), 180)
  }

  const onClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const addButton = target?.closest?.(".kazen-add") as HTMLElement | null
    if (addButton) {
      pulse(addButton, "pmd-kazen-added", 440)
      pulse(document.querySelector(".kazen-dock"), "pmd-kazen-cart-pulse", 470)
    }
  }

  document.addEventListener("pointerdown", onPointerDown, true)
  document.addEventListener("click", onClick, true)

  return () => {
    document.removeEventListener("pointerdown", onPointerDown, true)
    document.removeEventListener("click", onClick, true)
  }
}



// PMD_KAZEN_DISABLE_DIRECT_CHECKOUT_20260612: checkout buttons post to parent shared PaymentModal; local Kazen bill card disabled.
