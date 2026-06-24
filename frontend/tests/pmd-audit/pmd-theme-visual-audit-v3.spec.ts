import { test, Page, Frame } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

const BASE_URL = process.env.BASE_URL || "https://mimoza.paymydine.com"
const FAIL_ON_ERROR = process.env.FAIL_ON_ERROR === "1"
const outDir = path.join(process.cwd(), "test-results", "pmd-theme-audit-v3")
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
  await page.waitForTimeout(2200)
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {})
}

async function bestContext(page: Page): Promise<Ctx> {
  let best: Ctx = page
  let bestScore = -1

  for (const frame of page.frames()) {
    const score = await frame.evaluate(() => {
      const text = document.body?.innerText || ""
      let s = 0
      if (document.querySelector(".kazen-page")) s += 50
      if (/PAYMYDINE|PayMyDine/i.test(text)) s += 20
      if (/Purity|Season|Intention/i.test(text)) s += 20
      if (/Waiter/i.test(text)) s += 10
      if (/Checkout/i.test(text)) s += 10
      if (/Avocado|Croissant|Pancakes|Gyoza|Buddha|Sabzi/i.test(text)) s += 50
      if (/No visible items in this category/i.test(text)) s -= 25
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
      return r.width > 10 && r.height > 10 && cs.display !== "none" && cs.visibility !== "hidden" && Number(cs.opacity || "1") > 0.05
    }

    const rect = (el: Element | null) => {
      if (!el) return null
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      return {
        tag: el.tagName.toLowerCase(),
        className: String((el as HTMLElement).className || "").slice(0, 160),
        text: (el.textContent || "").trim().slice(0, 100),
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

    const bodyText = document.body?.innerText || ""

    const textEls = (pattern: RegExp) =>
      [...document.querySelectorAll("body *")].filter((el) => visible(el) && pattern.test((el.textContent || "").trim()))

    const hero =
      [...document.querySelectorAll(".kazen-hero, [class*='hero'], [style*='background-image']")].filter(visible)[0] ||
      textEls(/Purity|Season|Intention/i).sort((a, b) => {
        const ar = a.getBoundingClientRect()
        const br = b.getBoundingClientRect()
        return br.width * br.height - ar.width * ar.height
      })[0] ||
      null

    const headerButtons = [...document.querySelectorAll(
      '[data-pmd-kazen-clean-header-actions="1"] button, .kazen-clean-header-button, button[aria-label], a[aria-label], header button, header a'
    )].filter((el) => {
      const r = el.getBoundingClientRect()
      return visible(el) && r.y < 280 && r.width >= 24 && r.height >= 24
    })

    const tabs = [...document.querySelectorAll("button, [role='tab'], .kazen-tab, a")]
      .filter((el) => {
        const label = (el.textContent || "").trim()
        const r = el.getBoundingClientRect()
        return visible(el) && r.y > 250 && r.y < 850 && /all|appetizer|breakfast|brunch|main|drink|dessert|test|special|starter/i.test(label)
      })

    const itemNames = textEls(/Avocado Toast|Butter Croissant|Fluffy Pancakes|Gyoza|Buddha Bowl|Ghormeh Sabzi|Edamame|Beet Hummus|Mast-o Khiar|Kashke Bademjan/i)
      .filter((el) => el.getBoundingClientRect().y > 300)

    const prices = textEls(/[€$]\s?\d/i)

    function findCard(el: Element) {
      let cur: Element | null = el
      let best: Element | null = null

      for (let i = 0; i < 8 && cur; i++) {
        const r = cur.getBoundingClientRect()
        const cs = getComputedStyle(cur)
        const area = r.width * r.height
        const hasBorder = cs.borderStyle !== "none" && parseFloat(cs.borderWidth || "0") > 0
        const hasBg = cs.backgroundColor && cs.backgroundColor !== "rgba(0, 0, 0, 0)"

        if (r.width >= 260 && r.width <= 620 && r.height >= 80 && r.height <= 240 && (hasBorder || hasBg)) {
          best = cur
          break
        }

        if (!best && r.width >= 260 && r.width <= 700 && r.height >= 80 && r.height <= 280) best = cur
        cur = cur.parentElement
      }

      return best || el
    }

    const cards = itemNames.slice(0, 8).map(findCard)
    const uniqueCards = [...new Set(cards)]

    const addButtons = [...document.querySelectorAll("button, [role='button']")]
      .filter((el) => {
        if (!visible(el)) return false
        const r = el.getBoundingClientRect()
        const label = `${el.getAttribute("aria-label") || ""} ${el.textContent || ""}`.trim()
        const nearItemArea = itemNames.some((nameEl) => {
          const nr = nameEl.getBoundingClientRect()
          return Math.abs(r.y - nr.y) < 150 && r.x > nr.x + 120
        })
        const iconLike = r.width >= 32 && r.width <= 74 && r.height >= 32 && r.height <= 74 && el.querySelector("svg")
        return /add|\+/i.test(label) || nearItemArea || !!iconLike
      })

    const dock = [...document.querySelectorAll("body *")]
      .filter((el) => {
        const t = el.textContent || ""
        const r = el.getBoundingClientRect()
        return visible(el) && /waiter/i.test(t) && /checkout/i.test(t) && r.y > window.innerHeight * 0.55
      })
      .sort((a, b) => {
        const ar = a.getBoundingClientRect()
        const br = b.getBoundingClientRect()
        return br.width * br.height - ar.width * ar.height
      })[0] || null

    const itemMetrics = itemNames.slice(0, 10).map(rect)
    const cardMetrics = uniqueCards.slice(0, 8).map(rect)
    const addMetrics = addButtons.slice(0, 10).map(rect)
    const tabMetrics = tabs.slice(0, 12).map(rect)
    const headerMetrics = headerButtons.slice(0, 8).map(rect)

    const xList = cardMetrics.map((m: any) => m?.x).filter((x: any) => Number.isFinite(x))
    const uniqueColumns = [...new Set(xList.map((x: number) => Math.round(x / 70) * 70))].length

    return {
      url: location.href,
      skin: document.documentElement.getAttribute("data-pmd-kazen-skin"),
      hasNextError: /This page couldn.t load|This page couldn't load/i.test(bodyText),
      hasKazenRoot: !!document.querySelector(".kazen-page"),
      noVisibleItems: /No visible items in this category/i.test(bodyText),
      hasPayMyDine: /PAYMYDINE|PayMyDine/i.test(bodyText),
      hero: rect(hero),
      headerCount: headerButtons.length,
      tabCount: tabs.length,
      itemNameCount: itemNames.length,
      priceCount: prices.length,
      addButtonCount: addButtons.length,
      dock: rect(dock),
      uniqueColumns,
      itemMetrics,
      cardMetrics,
      addMetrics,
      tabMetrics,
      headerMetrics,
      bodyTextSample: bodyText.slice(0, 900),
    }
  })

  if (data.hasNextError) addIssue(theme, viewport, "error", "runtime", "Next error screen is visible")
  if (!data.hasKazenRoot) addIssue(theme, viewport, "error", "root", "Kazen root missing; old engine may be rendering", data)

  if (!data.hero || data.hero.w < 260 || data.hero.h < 130) {
    addIssue(theme, viewport, "error", "hero", "Hero/image block missing or too small", data.hero)
  }

  if (data.headerCount < 5) {
    addIssue(theme, viewport, "error", "header", "Expected 5 header buttons: language, mode, valet, website, social/review", data.headerMetrics)
  }

  if (data.tabCount < 3) {
    addIssue(theme, viewport, "error", "categories", "Category tabs/buttons missing", data.tabMetrics)
  }

  if (data.noVisibleItems) {
    addIssue(theme, viewport, "error", "data", "Menu is empty in this context: No visible items in this category", data.bodyTextSample)
  }

  if (data.itemNameCount < 3 || data.priceCount < 3) {
    addIssue(theme, viewport, "error", "cards", "Food item names/prices missing", {
      itemNameCount: data.itemNameCount,
      priceCount: data.priceCount,
      bodyTextSample: data.bodyTextSample,
    })
  }

  if (data.addButtonCount < 2) {
    addIssue(theme, viewport, "error", "add-buttons", "Add buttons missing or not detectable", data.addMetrics)
  }

  if (viewport === "desktop" && data.uniqueColumns > 2) {
    addIssue(theme, viewport, "error", "cards-layout", "Food cards appear multi-column; expected Kazen-style centered list", {
      uniqueColumns: data.uniqueColumns,
      cardMetrics: data.cardMetrics,
    })
  }

  for (const [i, c] of data.cardMetrics.entries()) {
    if (c && c.radius < 10) {
      addIssue(theme, viewport, "warn", "cards-radius", `Food card ${i + 1} radius too square`, c)
    }
  }

  if (!data.dock || data.dock.w < 160 || data.dock.h < 40) {
    addIssue(theme, viewport, "error", "dock", "Bottom dock missing or too small", data.dock)
  } else if (data.dock.radius < 12) {
    addIssue(theme, viewport, "warn", "dock-radius", "Dock corners too square", data.dock)
  }

  return data
}

const skins = ["kazen-japanese", "modern-green", "organic-botanical-paper", "gold-luxury"]

const viewports = [
  { name: "desktop", width: 1440, height: 1100 },
  { name: "mobile", width: 390, height: 844 },
]

test.describe("PMD real menu visual audit v3", () => {
  for (const vp of viewports) {
    test(`public-current-${vp.name}`, async ({ page }) => {
      test.setTimeout(70000)
      await page.setViewportSize({ width: vp.width, height: vp.height })

      const errors: string[] = []
      page.on("console", (msg) => {
        const t = msg.text()
        if (/ReferenceError|TypeError: W is not a function|This page couldn|falling back to gold|Theme .* not found/i.test(t)) errors.push(t)
      })
      page.on("pageerror", (err) => errors.push(String(err?.message || err)))

      await reset(page)
      await page.goto(`${BASE_URL}/?auditTs=${Date.now()}`, { waitUntil: "domcontentloaded" })
      await waitReady(page)

      const ctx = await bestContext(page)
      const result = await audit(ctx, "public-current", vp.name)

      await page.screenshot({ path: path.join(outDir, `public-current-${vp.name}.png`), fullPage: true })
      fs.writeFileSync(path.join(outDir, `public-current-${vp.name}.json`), JSON.stringify(result, null, 2))

      for (const e of errors) addIssue("public-current", vp.name, "error", "console", e)
    })
  }

  for (const skin of skins) {
    for (const vp of viewports) {
      test(`public-with-${skin}-${vp.name}`, async ({ page }) => {
        test.setTimeout(70000)
        await page.setViewportSize({ width: vp.width, height: vp.height })

        const errors: string[] = []
        page.on("console", (msg) => {
          const t = msg.text()
          if (/ReferenceError|TypeError: W is not a function|This page couldn|falling back to gold|Theme .* not found/i.test(t)) errors.push(t)
        })
        page.on("pageerror", (err) => errors.push(String(err?.message || err)))

        await reset(page)
        await page.goto(`${BASE_URL}/?auditSkin=${skin}&auditTs=${Date.now()}`, { waitUntil: "domcontentloaded" })
        await waitReady(page)

        const ctx = await bestContext(page)
        await applySkin(ctx, skin)
        await page.waitForTimeout(400)

        const result = await audit(ctx, skin, vp.name)

        await page.screenshot({ path: path.join(outDir, `${skin}-${vp.name}.png`), fullPage: true })
        fs.writeFileSync(path.join(outDir, `${skin}-${vp.name}.json`), JSON.stringify(result, null, 2))

        for (const e of errors) addIssue(skin, vp.name, "error", "console", e)
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
    "# PMD Theme Audit v3",
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
    throw new Error(`PMD audit v3 failed with ${summary.errors} errors. See ${outDir}/audit-summary.md`)
  }
})
