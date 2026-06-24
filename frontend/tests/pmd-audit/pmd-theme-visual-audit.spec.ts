import { test, expect, Page } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const BASE_URL = process.env.BASE_URL || "https://mimoza.paymydine.com"

const outDir = path.join(process.cwd(), "test-results", "pmd-theme-audit")
fs.mkdirSync(outDir, { recursive: true })

type AuditIssue = {
  theme: string
  viewport: string
  severity: "error" | "warn"
  area: string
  message: string
  details?: any
}

const issues: AuditIssue[] = []

function addIssue(theme: string, viewport: string, severity: "error" | "warn", area: string, message: string, details?: any) {
  issues.push({ theme, viewport, severity, area, message, details })
}

async function hardReset(page: Page) {
  await page.goto(BASE_URL + "/?audit-reset=" + Date.now(), { waitUntil: "domcontentloaded" })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

async function waitForMenu(page: Page) {
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(1200)
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
}

async function collectRuntimeErrors(page: Page, theme: string, viewport: string) {
  const consoleErrors: string[] = []
  const pageErrors: string[] = []

  page.on("console", (msg) => {
    const text = msg.text()
    if (msg.type() === "error" || /ReferenceError|TypeError|not found|falling back|couldn.t load|couldn't load/i.test(text)) {
      consoleErrors.push(text)
    }
  })

  page.on("pageerror", (err) => {
    pageErrors.push(String(err?.message || err))
  })

  return {
    flush: async () => {
      await page.waitForTimeout(300)
      for (const e of consoleErrors) {
        addIssue(theme, viewport, "error", "console", e)
      }
      for (const e of pageErrors) {
        addIssue(theme, viewport, "error", "pageerror", e)
      }
    }
  }
}

async function setSkin(page: Page, skin: string) {
  await page.evaluate((skinName) => {
    document.documentElement.setAttribute("data-pmd-kazen-skin", skinName)
    document.body.setAttribute("data-pmd-kazen-skin", skinName)
  }, skin)
}

async function auditDom(page: Page, theme: string, viewport: string) {
  const result = await page.evaluate(() => {
    function cssNum(el: Element, prop: string) {
      const v = getComputedStyle(el).getPropertyValue(prop)
      const n = Number.parseFloat(v)
      return Number.isFinite(n) ? n : 0
    }

    function rgbToTuple(value: string): [number, number, number, number] | null {
      const raw = value.trim()
      const m = raw.match(/rgba?\(([^)]+)\)/i)
      if (!m) return null
      const parts = m[1].split(",").map((x) => Number.parseFloat(x.trim()))
      if (parts.length < 3) return null
      return [parts[0], parts[1], parts[2], parts.length >= 4 ? parts[3] : 1]
    }

    function luminance([r, g, b]: [number, number, number, number]) {
      const convert = (c: number) => {
        const v = c / 255
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * convert(r) + 0.7152 * convert(g) + 0.0722 * convert(b)
    }

    function contrast(fg: string, bg: string) {
      const a = rgbToTuple(fg)
      const b = rgbToTuple(bg)
      if (!a || !b || a[3] < 0.1 || b[3] < 0.1) return null
      const l1 = luminance(a)
      const l2 = luminance(b)
      const light = Math.max(l1, l2)
      const dark = Math.min(l1, l2)
      return (light + 0.05) / (dark + 0.05)
    }

    const pageRoot =
      document.querySelector(".kazen-page") ||
      document.querySelector("[data-pmd-kazen-page]") ||
      document.body

    const hero =
      document.querySelector(".kazen-hero") ||
      [...document.querySelectorAll("*")].find((el) => /Purity|Season|Intention/i.test(el.textContent || ""))

    const headerButtons = [
      ...document.querySelectorAll('[data-pmd-kazen-clean-header-actions="1"] button, .kazen-clean-header-button, .kazen-header button')
    ]

    const tabs = [
      ...document.querySelectorAll(".kazen-tab, [role='tab'], button")
    ].filter((el) => {
      const text = (el.textContent || "").trim()
      return /all|appetizer|breakfast|main|drink|dessert|test|special/i.test(text)
    })

    const cards = [
      ...document.querySelectorAll(".kazen-card, .kazen-item, [data-pmd-menu-item], article")
    ].filter((el) => {
      const text = (el.textContent || "").trim()
      return /€|\$|add|avocado|croissant|pancake|gyoza|buddha|sabzi/i.test(text)
    })

    const dock =
      document.querySelector(".kazen-dock") ||
      [...document.querySelectorAll("*")].find((el) => /waiter/i.test(el.textContent || "") && /checkout/i.test(el.textContent || ""))

    const bodyBg = getComputedStyle(document.body).backgroundColor
    const rootBg = getComputedStyle(pageRoot).backgroundColor || bodyBg

    const cardMetrics = cards.slice(0, 6).map((el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      const textEl = el.querySelector("p, h3, h4, strong, span") || el
      const textColor = getComputedStyle(textEl).color
      const bg = cs.backgroundColor
      return {
        text: (el.textContent || "").trim().slice(0, 80),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: cssNum(el, "border-radius"),
        border: cs.borderColor,
        bg,
        textColor,
        contrast: contrast(textColor, bg) ?? contrast(textColor, rootBg),
        opacity: Number.parseFloat(cs.opacity || "1"),
        visible: r.width > 30 && r.height > 30,
      }
    })

    const headerMetrics = headerButtons.slice(0, 8).map((el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        text: (el.textContent || "").trim().slice(0, 40),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: cssNum(el, "border-radius"),
        color: cs.color,
        bg: cs.backgroundColor,
        border: cs.borderColor,
        opacity: Number.parseFloat(cs.opacity || "1"),
        contrast: contrast(cs.color, cs.backgroundColor) ?? contrast(cs.color, rootBg),
        visible: r.width >= 24 && r.height >= 24,
      }
    })

    const tabMetrics = tabs.slice(0, 10).map((el) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        text: (el.textContent || "").trim().slice(0, 40),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: cssNum(el, "border-radius"),
        color: cs.color,
        bg: cs.backgroundColor,
        border: cs.borderColor,
        visible: r.width > 20 && r.height > 20,
      }
    })

    const dockMetric = dock ? (() => {
      const r = dock.getBoundingClientRect()
      const cs = getComputedStyle(dock)
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: cssNum(dock, "border-radius"),
        bg: cs.backgroundColor,
        border: cs.borderColor,
        opacity: Number.parseFloat(cs.opacity || "1"),
        visible: r.width > 120 && r.height > 40,
        bottomGap: Math.round(window.innerHeight - r.bottom),
      }
    })() : null

    const heroMetric = hero ? (() => {
      const r = hero.getBoundingClientRect()
      const cs = getComputedStyle(hero)
      const bgImg = cs.backgroundImage
      const imgs = [...hero.querySelectorAll("img")].map((img: any) => ({
        src: img.currentSrc || img.src,
        w: img.naturalWidth,
        h: img.naturalHeight,
        visible: img.getBoundingClientRect().width > 50 && img.getBoundingClientRect().height > 40,
        opacity: Number.parseFloat(getComputedStyle(img).opacity || "1"),
      }))
      return {
        text: (hero.textContent || "").trim().slice(0, 120),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: cssNum(hero, "border-radius"),
        bg: cs.backgroundColor,
        backgroundImage: bgImg && bgImg !== "none",
        imgs,
        visible: r.width > 200 && r.height > 120,
      }
    })() : null

    const xPositions = cardMetrics.filter((c) => c.visible).slice(0, 4).map((c) => c.x)
    const uniqueX = [...new Set(xPositions.filter((x) => Number.isFinite(x)))]

    return {
      url: location.href,
      skin: document.documentElement.getAttribute("data-pmd-kazen-skin"),
      viewport: { w: window.innerWidth, h: window.innerHeight },
      rootBg,
      bodyBg,
      hasCouldntLoad: /This page couldn.t load|This page couldn't load/i.test(document.body.innerText || ""),
      hero: heroMetric,
      headerCount: headerButtons.length,
      tabCount: tabs.length,
      cardCount: cards.length,
      dock: dockMetric,
      cardMetrics,
      headerMetrics,
      tabMetrics,
      cardColumnXCount: uniqueX.length,
    }
  })

  if (result.hasCouldntLoad) {
    addIssue(theme, viewport, "error", "runtime", "Next error screen is visible")
  }

  if (!result.hero?.visible) {
    addIssue(theme, viewport, "error", "hero", "Hero block/image is missing or too small", result.hero)
  }

  if ((result.headerCount || 0) < 3) {
    addIssue(theme, viewport, "error", "header", "Header buttons are missing; expected at least language/dark/valet and preferably website/social", {
      headerCount: result.headerCount,
      headerMetrics: result.headerMetrics,
    })
  }

  if ((result.tabCount || 0) < 3) {
    addIssue(theme, viewport, "error", "categories", "Category tabs are missing or not detected", {
      tabCount: result.tabCount,
      tabMetrics: result.tabMetrics,
    })
  }

  if ((result.cardCount || 0) < 3) {
    addIssue(theme, viewport, "error", "cards", "Food cards/items are missing", {
      cardCount: result.cardCount,
      cardMetrics: result.cardMetrics,
    })
  }

  if (viewport === "desktop" && result.cardColumnXCount > 2) {
    addIssue(theme, viewport, "error", "cards-layout", "Food cards look multi-column; Kazen-style list should be one central column/list", {
      cardColumnXCount: result.cardColumnXCount,
      cardMetrics: result.cardMetrics,
    })
  }

  for (const [i, c] of result.cardMetrics.entries()) {
    if (!c.visible) addIssue(theme, viewport, "error", "cards", `Card ${i + 1} not visible`, c)
    if (c.radius < 10) addIssue(theme, viewport, "warn", "cards-radius", `Card ${i + 1} radius looks too square`, c)
    if (c.opacity < 0.75) addIssue(theme, viewport, "warn", "cards-opacity", `Card ${i + 1} is too transparent`, c)
    if (c.contrast !== null && c.contrast < 3.2) addIssue(theme, viewport, "error", "cards-contrast", `Card ${i + 1} text contrast is too low`, c)
  }

  for (const [i, h] of result.headerMetrics.entries()) {
    if (!h.visible) addIssue(theme, viewport, "warn", "header", `Header button ${i + 1} not clearly visible`, h)
    if (h.contrast !== null && h.contrast < 2.4) addIssue(theme, viewport, "warn", "header-contrast", `Header button ${i + 1} contrast may be too low`, h)
  }

  if (!result.dock?.visible) {
    addIssue(theme, viewport, "error", "dock", "Bottom action dock is missing or too small", result.dock)
  } else {
    if (result.dock.radius < 14) addIssue(theme, viewport, "warn", "dock-radius", "Dock corners are too square", result.dock)
    if (viewport === "mobile" && result.dock.bottomGap < -4) {
      addIssue(theme, viewport, "error", "dock-safe-area", "Dock is clipped below viewport", result.dock)
    }
  }

  return result
}

const skins = [
  "kazen-japanese",
  "modern-green",
  "organic-botanical-paper",
  "gold-luxury",
]

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
]

test.describe("PMD Kazen theme visual audit", () => {
  for (const vp of viewports) {
    test(`public-home-current-theme-${vp.name}`, async ({ page }) => {
      test.setTimeout(60000)
      await page.setViewportSize({ width: vp.width, height: vp.height })
      const errors = await collectRuntimeErrors(page, "public-current", vp.name)
      await hardReset(page)
      await page.goto(BASE_URL + "/?audit-public=" + Date.now(), { waitUntil: "domcontentloaded" })
      await waitForMenu(page)
      const result = await auditDom(page, "public-current", vp.name)
      await page.screenshot({ path: path.join(outDir, `public-current-${vp.name}.png`), fullPage: true })
      fs.writeFileSync(path.join(outDir, `public-current-${vp.name}.json`), JSON.stringify(result, null, 2))
      await errors.flush()
    })
  }

  for (const skin of skins) {
    for (const vp of viewports) {
      test(`direct-kazen-${skin}-${vp.name}`, async ({ page }) => {
        test.setTimeout(60000)
        await page.setViewportSize({ width: vp.width, height: vp.height })
        const errors = await collectRuntimeErrors(page, skin, vp.name)
        await page.goto(BASE_URL + "/themes/kazen-japanese/?embedded=1&from=audit&skin=" + skin + "&ts=" + Date.now(), { waitUntil: "domcontentloaded" })
        await waitForMenu(page)
        await setSkin(page, skin)
        await page.waitForTimeout(500)
        const result = await auditDom(page, skin, vp.name)
        await page.screenshot({ path: path.join(outDir, `${skin}-${vp.name}.png`), fullPage: true })
        fs.writeFileSync(path.join(outDir, `${skin}-${vp.name}.json`), JSON.stringify(result, null, 2))
        await errors.flush()
      })
    }
  }
})

test.afterAll(async () => {
  const summary = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    totalIssues: issues.length,
    errors: issues.filter((i) => i.severity === "error").length,
    warnings: issues.filter((i) => i.severity === "warn").length,
    issues,
  }

  fs.writeFileSync(path.join(outDir, "audit-summary.json"), JSON.stringify(summary, null, 2))

  const md = [
    "# PMD Theme Audit",
    "",
    `Base URL: ${BASE_URL}`,
    `Generated: ${summary.generatedAt}`,
    "",
    `Errors: ${summary.errors}`,
    `Warnings: ${summary.warnings}`,
    "",
    "## Issues",
    "",
    ...issues.map((i) => `- **${i.severity.toUpperCase()}** [${i.theme}/${i.viewport}/${i.area}] ${i.message}`),
    "",
  ].join("\n")

  fs.writeFileSync(path.join(outDir, "audit-summary.md"), md)
})
