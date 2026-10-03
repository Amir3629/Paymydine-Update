import { test, Page, Frame } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const BASE_URL = process.env.BASE_URL || "https://mimoza.paymydine.com"
const FAIL_ON_ERROR = process.env.FAIL_ON_ERROR === "1"
const outDir = path.join(process.cwd(), "test-results", "pmd-theme-audit-v2")
fs.mkdirSync(outDir, { recursive: true })

type Ctx = Page | Frame
type Issue = {
  theme: string
  viewport: string
  severity: "error" | "warn"
  area: string
  message: string
  details?: any
}

const issues: Issue[] = []

function addIssue(theme: string, viewport: string, severity: "error" | "warn", area: string, message: string, details?: any) {
  issues.push({ theme, viewport, severity, area, message, details })
}

async function reset(page: Page) {
  await page.goto(`${BASE_URL}/?reset=${Date.now()}`, { waitUntil: "domcontentloaded" })
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  }).catch(() => {})
}

async function waitReady(page: Page) {
  await page.waitForLoadState("domcontentloaded")
  await page.waitForTimeout(1600)
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
}

async function bestContext(page: Page): Promise<Ctx> {
  let best: Ctx = page
  let bestScore = -1

  for (const frame of page.frames()) {
    const score = await frame.evaluate(() => {
      const text = document.body?.innerText || ""
      let s = 0
      if (/PAYMYDINE|PayMyDine/i.test(text)) s += 20
      if (/Purity|Season|Intention/i.test(text)) s += 20
      if (/Waiter/i.test(text)) s += 10
      if (/Checkout/i.test(text)) s += 10
      if (/Avocado|Croissant|Pancakes|Gyoza|Buddha|Sabzi/i.test(text)) s += 20
      if (document.querySelector(".kazen-page")) s += 30
      if (document.querySelector("iframe")) s -= 5
      return s
    }).catch(() => -1)

    if (score > bestScore) {
      bestScore = score
      best = frame
    }
  }

  return best
}

async function applySkin(ctx: Ctx, skin: string) {
  await ctx.evaluate((skinName) => {
    document.documentElement.setAttribute("data-pmd-kazen-skin", skinName)
    document.body.setAttribute("data-pmd-kazen-skin", skinName)
  }, skin).catch(() => {})
}

async function audit(ctx: Ctx, theme: string, viewport: string) {
  const data = await ctx.evaluate(() => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return r.width > 12 && r.height > 12 && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity || "1") > 0.05
    }

    const text = document.body?.innerText || ""

    const findByText = (pattern: RegExp) =>
      [...document.querySelectorAll("body *")].filter((el) => visible(el) && pattern.test((el.textContent || "").trim()))

    const rect = (el: Element | null) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        h: Math.round(r.height),
        radius: parseFloat(cs.borderRadius || "0") || 0,
        bg: cs.backgroundColor,
        color: cs.color,
        border: cs.borderColor,
        opacity: parseFloat(cs.opacity || "1") || 1,
      }
    }

    const pageRoot = document.querySelector(".kazen-page") || document.body

    const heroCandidates = [
      ...document.querySelectorAll(".kazen-hero, [class*='hero'], [style*='background-image']")
    ].filter(visible)

    const heroByText = findByText(/Purity|Season|Intention/i)
      .sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0]

    const hero = heroCandidates[0] || heroByText || null

    const headerButtons = [...document.querySelectorAll(
      '[data-pmd-kazen-clean-header-actions="1"] button, .kazen-clean-header-button, button[aria-label], a[aria-label], header button, header a'
    )].filter((el) => {
      const r = el.getBoundingClientRect()
      const label = `${el.getAttribute("aria-label") || ""} ${el.textContent || ""}`
      return visible(el) && r.y < 260 && (r.width >= 24 || /language|theme|dark|light|valet|website|social|review/i.test(label))
    })

    const tabLike = [...document.querySelectorAll("button, [role='tab'], .kazen-tab, a")]
      .filter((el) => {
        const label = (el.textContent || "").trim()
        const r = el.getBoundingClientRect()
        return visible(el) && r.y > 250 && r.y < 780 && /^(all|appetizer|breakfast|brunch|main|drink|dessert|test|special|starter|s)$/i.test(label)
      })

    const itemNameEls = findByText(/Avocado Toast|Butter Croissant|Fluffy Pancakes|Gyoza|Buddha Bowl|Ghormeh Sabzi|Edamame|Beet Hummus|Mast-o Khiar/i)
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.y > 300
      })

    const priceEls = findByText(/[€$]\s?\d|^\d+[,.]\d{2}\s?€/i)

    const addButtons = [...document.querySelectorAll("button, [role='button']")]
      .filter((el) => visible(el) && /add|\+/i.test((el.textContent || "").trim()))

    const dock = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const t = el.textContent || ""
        const r = el.getBoundingClientRect()
        return visible(el) && /waiter/i.test(t) && /checkout/i.test(t) && r.y > window.innerHeight * 0.55
      })
      .sort((a, b) => b.getBoundingClientRect().width * b.getBoundingClientRect().height - a.getBoundingClientRect().width * a.getBoundingClientRect().height)[0] || null

    const itemMetrics = itemNameEls.slice(0, 8).map((el) => rect(el))
    const xList = itemMetrics.map((m: any) => m?.x).filter((x: any) => Number.isFinite(x))
    const uniqueColumns = [...new Set(xList.map((x: number) => Math.round(x / 40) * 40))].length

    const cardAncestors = itemNameEls.slice(0, 6).map((el) => {
      let cur: Element | null = el
      for (let i = 0; i < 6 && cur?.parentElement; i++) {
        const r = cur.getBoundingClientRect()
        if (r.width > 220 && r.height > 70) return cur
        cur = cur.parentElement
      }
      return el
    })

    const cards = cardAncestors.map((el) => rect(el)).filter(Boolean)
    const headerMetrics = headerButtons.slice(0, 8).map((el) => rect(el))
    const tabMetrics = tabLike.slice(0, 12).map((el) => ({ text: (el.textContent || "").trim(), ...rect(el) }))
    const addMetrics = addButtons.slice(0, 8).map((el) => rect(el))

    const screenshotText = text.slice(0, 800)

    return {
      url: location.href,
      skin: document.documentElement.getAttribute("data-pmd-kazen-skin"),
      hasNextError: /This page couldn.t load|This page couldn't load/i.test(text),
      hasKazenRoot: !!document.querySelector(".kazen-page"),
      hasPayMyDine: /PAYMYDINE|PayMyDine/i.test(text),
      hero: rect(hero),
      heroText: hero ? (hero.textContent || "").trim().slice(0, 160) : "",
      headerCount: headerButtons.length,
      tabCount: tabLike.length,
      itemNameCount: itemNameEls.length,
      priceCount: priceEls.length,
      addButtonCount: addButtons.length,
      dock: rect(dock),
      cards,
      itemMetrics,
      headerMetrics,
      tabMetrics,
      addMetrics,
      uniqueColumns,
      bodyTextSample: screenshotText,
      bodyBg: getComputedStyle(document.body).backgroundColor,
      rootBg: getComputedStyle(pageRoot).backgroundColor,
    }
  })

  if (data.hasNextError) addIssue(theme, viewport, "error", "runtime", "Next error screen is visible")
  if (!data.hasKazenRoot) addIssue(theme, viewport, "error", "root", "Kazen root is missing; page may be using old theme engine", data)
  if (!data.hero || data.hero.w < 260 || data.hero.h < 130) addIssue(theme, viewport, "error", "hero", "Hero/image block is missing or too small", data.hero)
  if (data.headerCount < 3) addIssue(theme, viewport, "error", "header", "Header buttons missing; expected language/dark/valet plus website/social when enabled", data.headerMetrics)
  if (data.tabCount < 3) addIssue(theme, viewport, "error", "categories", "Category tabs/buttons missing", data.tabMetrics)
  if (data.itemNameCount < 3 || data.priceCount < 3) addIssue(theme, viewport, "error", "cards", "Food item names/prices missing", { itemNameCount: data.itemNameCount, priceCount: data.priceCount })
  if (data.addButtonCount < 2) addIssue(theme, viewport, "error", "add-buttons", "Add buttons missing", data.addMetrics)

  if (viewport === "desktop" && data.uniqueColumns > 2) {
    addIssue(theme, viewport, "error", "cards-layout", "Food list appears multi-column; expected Kazen-style single centered list", {
      uniqueColumns: data.uniqueColumns,
      itemMetrics: data.itemMetrics,
    })
  }

  for (const [i, c] of data.cards.entries()) {
    if (c && c.radius < 10) addIssue(theme, viewport, "warn", "cards-radius", `Card ${i + 1} radius too square`, c)
    if (c && c.opacity < 0.7) addIssue(theme, viewport, "warn", "cards-opacity", `Card ${i + 1} too transparent`, c)
  }

  if (!data.dock || data.dock.w < 160 || data.dock.h < 40) {
    addIssue(theme, viewport, "error", "dock", "Bottom dock missing or too small", data.dock)
  } else if (data.dock.radius < 12) {
    addIssue(theme, viewport, "warn", "dock-radius", "Dock corners too square", data.dock)
  }

  return data
}

const cases = [
  { name: "public-current", url: "/" },
  { name: "kazen-japanese", url: "/themes/kazen-japanese/?embedded=1&from=audit&skin=kazen-japanese" },
  { name: "modern-green", url: "/themes/kazen-japanese/?embedded=1&from=audit&skin=modern-green" },
  { name: "organic-botanical-paper", url: "/themes/kazen-japanese/?embedded=1&from=audit&skin=organic-botanical-paper" },
  { name: "gold-luxury", url: "/themes/kazen-japanese/?embedded=1&from=audit&skin=gold-luxury" },
]

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
]

test.describe("PMD real Kazen visual audit v2", () => {
  for (const c of cases) {
    for (const vp of viewports) {
      test(`${c.name}-${vp.name}`, async ({ page }) => {
        test.setTimeout(70000)
        await page.setViewportSize({ width: vp.width, height: vp.height })

        const consoleErrors: string[] = []
        page.on("console", (msg) => {
          const t = msg.text()
          if (/ReferenceError|TypeError|This page couldn|falling back to gold|not found/i.test(t)) consoleErrors.push(t)
        })
        page.on("pageerror", (err) => consoleErrors.push(String(err?.message || err)))

        await reset(page)
        await page.goto(`${BASE_URL}${c.url}${c.url.includes("?") ? "&" : "?"}auditTs=${Date.now()}`, { waitUntil: "domcontentloaded" })
        await waitReady(page)

        const ctx = await bestContext(page)
        if (c.name !== "public-current") await applySkin(ctx, c.name)

        const result = await audit(ctx, c.name, vp.name)

        await page.screenshot({
          path: path.join(outDir, `${c.name}-${vp.name}.png`),
          fullPage: true,
        })

        fs.writeFileSync(path.join(outDir, `${c.name}-${vp.name}.json`), JSON.stringify(result, null, 2))

        for (const e of consoleErrors) {
          addIssue(c.name, vp.name, "error", "console", e)
        }
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
    "# PMD Theme Audit v2",
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

  if (FAIL_ON_ERROR && summary.errors > 0) {
    throw new Error(`PMD audit failed with ${summary.errors} errors and ${summary.warnings} warnings. See ${outDir}/audit-summary.md`)
  }
})
