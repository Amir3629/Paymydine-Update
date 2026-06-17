import { test, type Frame, type Page } from "@playwright/test"
import fs from "node:fs"
import path from "node:path"

type UiIssue = {
  page: string
  selector: string
  type: string
  severity: "info" | "warning" | "error"
  message: string
  details?: Record<string, unknown>
}

const outputDir = path.join(process.cwd(), "test-results", "theme-ui-audit-deep")

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true })
}

async function waitForKazen(page: Page) {
  await page.waitForTimeout(1200)
}

function getKazenFrame(page: Page): Frame | Page {
  return page.frames().find((frame) => frame.url().includes("/themes/kazen-japanese")) || page
}

async function clickFirstVisible(target: Page | Frame, selectors: string[], label: string) {
  for (const selector of selectors) {
    const locator = target.locator(selector).first()
    const count = await locator.count().catch(() => 0)
    if (!count) continue

    const visible = await locator.isVisible().catch(() => false)
    if (!visible) continue

    await locator.click({ timeout: 2000, force: true }).catch(() => undefined)
    await target.waitForTimeout(550).catch(() => undefined)
    return { clicked: true, selector, label }
  }

  return { clicked: false, selector: "", label }
}

async function screenshot(page: Page, name: string) {
  await page.screenshot({
    path: path.join(outputDir, `${name}.png`),
    fullPage: true,
  })
}

async function runDomAudit(target: Page | Frame, pageName: string): Promise<UiIssue[]> {
  return await target.evaluate((pageName) => {
    type UiIssue = {
      page: string
      selector: string
      type: string
      severity: "info" | "warning" | "error"
      message: string
      details?: Record<string, unknown>
    }

    const issues: UiIssue[] = []

    function parseRgb(value: string): [number, number, number] | null {
      const match = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
      if (!match) return null
      return [Number(match[1]), Number(match[2]), Number(match[3])]
    }

    function luminance(rgb: [number, number, number]) {
      const [r, g, b] = rgb.map((v) => {
        const c = v / 255
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      })
      return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    function contrastRatio(fg: [number, number, number], bg: [number, number, number]) {
      const l1 = luminance(fg)
      const l2 = luminance(bg)
      const lighter = Math.max(l1, l2)
      const darker = Math.min(l1, l2)
      return (lighter + 0.05) / (darker + 0.05)
    }

    function readableSelector(el: Element) {
      const element = el as HTMLElement
      if (element.id) return `#${element.id}`
      const testId = element.getAttribute("data-testid")
      if (testId) return `[data-testid="${testId}"]`
      const aria = element.getAttribute("aria-label")
      if (aria) return `${element.tagName.toLowerCase()}[aria-label="${aria.slice(0, 46)}"]`
      const className = String(element.className || "")
        .split(" ")
        .filter(Boolean)
        .slice(0, 4)
        .join(".")
      return `${element.tagName.toLowerCase()}${className ? "." + className : ""}`
    }

    function nearestBackgroundColor(el: HTMLElement) {
      let current: HTMLElement | null = el
      while (current) {
        const bg = getComputedStyle(current).backgroundColor
        if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") {
          return bg
        }
        current = current.parentElement
      }
      return "rgb(255, 255, 255)"
    }

    function isVisible(el: HTMLElement) {
      const rect = el.getBoundingClientRect()
      const styles = getComputedStyle(el)
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        styles.visibility !== "hidden" &&
        styles.display !== "none" &&
        Number(styles.opacity || "1") > 0.05
      )
    }

    function addIssue(issue: UiIssue) {
      issues.push(issue)
    }

    const rootStyles = getComputedStyle(document.documentElement)
    const themeTokens = [
      "--pmd-theme-bg",
      "--pmd-theme-surface",
      "--pmd-theme-text",
      "--pmd-theme-muted",
      "--pmd-theme-border",
      "--pmd-theme-primary",
      "--pmd-theme-primary-text",
      "--pmd-theme-accent",
      "--kazen-paper",
      "--kazen-ink",
      "--kazen-red",
    ]

    const tokenSnapshot: Record<string, string> = {}
    for (const token of themeTokens) {
      const value = rootStyles.getPropertyValue(token).trim()
      if (value) tokenSnapshot[token] = value
    }

    if (Object.keys(tokenSnapshot).length < 8) {
      addIssue({
        page: pageName,
        selector: ":root",
        type: "MISSING_THEME_TOKENS",
        severity: "info",
        message: "Theme tokens are missing or incomplete.",
        details: { foundTokens: tokenSnapshot },
      })
    }

    const textElements = Array.from(
      document.querySelectorAll("button, a, p, span, h1, h2, h3, h4, label, strong, [role='button']")
    ) as HTMLElement[]

    for (const el of textElements) {
      if (!isVisible(el)) continue
      const text = (el.innerText || el.textContent || "").trim()
      if (!text || text.length < 2) continue

      const styles = getComputedStyle(el)
      const fg = parseRgb(styles.color)
      const bgColor = nearestBackgroundColor(el)
      const bg = parseRgb(bgColor)
      if (!fg || !bg) continue

      const ratio = contrastRatio(fg, bg)
      const fontSize = parseFloat(styles.fontSize || "16")
      const fontWeight = Number(styles.fontWeight || "400")
      const isLargeText = fontSize >= 18 || (fontSize >= 14 && fontWeight >= 700)
      const minRatio = isLargeText ? 3 : 4.5

      if (ratio < minRatio) {
        addIssue({
          page: pageName,
          selector: readableSelector(el),
          type: "LOW_CONTRAST",
          severity: ratio < 2.4 ? "error" : "warning",
          message: `Text may be unreadable. Contrast ${ratio.toFixed(2)} is below ${minRatio}.`,
          details: {
            text: text.slice(0, 120),
            color: styles.color,
            backgroundColor: bgColor,
            fontSize,
            fontWeight,
          },
        })
      }
    }

    const interactiveElements = Array.from(
      document.querySelectorAll("button, a, [role='button'], input, select, textarea")
    ) as HTMLElement[]

    for (const el of interactiveElements) {
      if (!isVisible(el)) continue
      const rect = el.getBoundingClientRect()
      const text = (el.innerText || el.getAttribute("aria-label") || "").trim()

      if (rect.width < 44 || rect.height < 44) {
        addIssue({
          page: pageName,
          selector: readableSelector(el),
          type: "SMALL_TAP_TARGET",
          severity: "warning",
          message: "Clickable element is smaller than recommended mobile tap size.",
          details: {
            text: text.slice(0, 120),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          },
        })
      }

      if (rect.left < -2 || rect.right > window.innerWidth + 2) {
        addIssue({
          page: pageName,
          selector: readableSelector(el),
          type: "HORIZONTAL_OVERFLOW",
          severity: "error",
          message: "Clickable element is outside the mobile viewport.",
          details: {
            text: text.slice(0, 120),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            viewportWidth: window.innerWidth,
          },
        })
      }
    }

    const blocks = Array.from(
      document.querySelectorAll("main, section, article, div, header, footer, aside, nav")
    ) as HTMLElement[]

    for (const el of blocks) {
      if (!isVisible(el)) continue
      const rect = el.getBoundingClientRect()
      const styles = getComputedStyle(el)
      if (styles.position === "fixed" || styles.position === "sticky") continue

      if (rect.right > window.innerWidth + 8) {
        addIssue({
          page: pageName,
          selector: readableSelector(el),
          type: "LAYOUT_OVERFLOW",
          severity: "error",
          message: "Block element may cause horizontal scrolling.",
          details: {
            width: Math.round(rect.width),
            right: Math.round(rect.right),
            viewportWidth: window.innerWidth,
          },
        })
      }
    }

    const images = Array.from(document.querySelectorAll("img")) as HTMLImageElement[]

    for (const img of images) {
      if (!isVisible(img)) continue
      const rect = img.getBoundingClientRect()
      const styles = getComputedStyle(img)
      if ((!styles.aspectRatio || styles.aspectRatio === "auto") && rect.width > 44 && rect.height > 44) {
        addIssue({
          page: pageName,
          selector: readableSelector(img),
          type: "IMAGE_WITHOUT_ASPECT_RATIO",
          severity: "info",
          message: "Image has no explicit aspect-ratio. This can cause layout jump while loading.",
          details: {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            src: img.currentSrc || img.src || "",
          },
        })
      }
    }

    const scrollWidth = document.documentElement.scrollWidth
    const clientWidth = document.documentElement.clientWidth

    if (scrollWidth > clientWidth + 4) {
      addIssue({
        page: pageName,
        selector: "document",
        type: "PAGE_HORIZONTAL_SCROLL",
        severity: "error",
        message: "Page has horizontal scroll on mobile.",
        details: { scrollWidth, clientWidth },
      })
    }

    return issues
  }, pageName)
}

async function auditPageAndFrame(page: Page, name: string, allIssues: UiIssue[]) {
  allIssues.push(...(await runDomAudit(page, name)))
  const frame = getKazenFrame(page)
  if (frame !== page) {
    allIssues.push(...(await runDomAudit(frame, `${name}__iframe-kazen`)))
  }
}

test.describe("PayMyDine deep visual theme UI audit", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })

  test("deep audit Kazen light/dark/categories/cards/modals/checkout", async ({ page }) => {
    ensureOutputDir()
    const allIssues: UiIssue[] = []
    const actions: unknown[] = []

    await page.goto("/themes/kazen-japanese?embedded=1&from=pmd", { waitUntil: "domcontentloaded" })
    await waitForKazen(page)
    await screenshot(page, "01-standalone-light")
    await auditPageAndFrame(page, "01-standalone-light", allIssues)

    let target = getKazenFrame(page)

    actions.push(await clickFirstVisible(target, [
      "button[aria-label='Mode']",
      "button[aria-label='Dark mode']",
      "button:has-text('Mode')",
      "button:has-text('Dark')",
    ], "toggle dark mode standalone"))

    await screenshot(page, "02-standalone-dark")
    await auditPageAndFrame(page, "02-standalone-dark", allIssues)

    actions.push(await clickFirstVisible(target, [
      ".kazen-category-btn",
      "button[aria-expanded]",
    ], "expand first category standalone"))

    await screenshot(page, "03-standalone-expanded-category")
    await auditPageAndFrame(page, "03-standalone-expanded-category", allIssues)

    await page.goto("/menu", { waitUntil: "domcontentloaded" })
    await waitForKazen(page)
    target = getKazenFrame(page)

    await screenshot(page, "04-live-menu-light")
    await auditPageAndFrame(page, "04-live-menu-light", allIssues)

    actions.push(await clickFirstVisible(target, [
      ".kazen-category-btn",
      "button[aria-expanded]",
    ], "expand first category live"))

    await page.waitForTimeout(900)
    await screenshot(page, "05-live-expanded-foodcards")
    await auditPageAndFrame(page, "05-live-expanded-foodcards", allIssues)

    actions.push(await clickFirstVisible(target, [
      ".kazen-item",
      ".kazen-item-image",
      ".kazen-item-name",
    ], "open first food item modal"))

    await screenshot(page, "06-live-food-item-modal")
    await auditPageAndFrame(page, "06-live-food-item-modal", allIssues)

    await page.keyboard.press("Escape").catch(() => undefined)
    await page.waitForTimeout(350)

    actions.push(await clickFirstVisible(target, [
      "button[aria-label='Mode']",
      "button[aria-label='Dark mode']",
      "button:has-text('Mode')",
      "button:has-text('Dark')",
    ], "toggle dark mode live"))

    await screenshot(page, "07-live-dark")
    await auditPageAndFrame(page, "07-live-dark", allIssues)

    await page.goto("/menu", { waitUntil: "domcontentloaded" })
    await waitForKazen(page)

    actions.push(await clickFirstVisible(page, [
      "button:has-text('Checkout')",
      "button[aria-label*='Checkout']",
    ], "open checkout from parent dock"))

    await page.waitForTimeout(900)
    await screenshot(page, "08-live-checkout-modal")
    await auditPageAndFrame(page, "08-live-checkout-modal", allIssues)

    await page.keyboard.press("Escape").catch(() => undefined)
    await page.waitForTimeout(350)

    await page.goto("/menu", { waitUntil: "domcontentloaded" })
    await waitForKazen(page)

    actions.push(await clickFirstVisible(page, [
      "button:has-text('Waiter')",
      "button[aria-label*='Waiter']",
    ], "open waiter modal"))

    await screenshot(page, "09-live-waiter-modal")
    await auditPageAndFrame(page, "09-live-waiter-modal", allIssues)

    await page.keyboard.press("Escape").catch(() => undefined)
    await page.waitForTimeout(350)

    await page.goto("/menu", { waitUntil: "domcontentloaded" })
    await waitForKazen(page)

    actions.push(await clickFirstVisible(page, [
      "button:has-text('Note')",
      "button[aria-label*='Note']",
    ], "open note modal"))

    await screenshot(page, "10-live-note-modal")
    await auditPageAndFrame(page, "10-live-note-modal", allIssues)

    const grouped = allIssues.reduce<Record<string, number>>((acc, issue) => {
      acc[issue.type] = (acc[issue.type] || 0) + 1
      return acc
    }, {})

    const report = {
      generatedAt: new Date().toISOString(),
      viewport: {
        width: 390,
        height: 844,
        deviceScaleFactor: 2,
        mobile: true,
      },
      totalIssues: allIssues.length,
      grouped,
      actions,
      screenshots: [
        "01-standalone-light.png",
        "02-standalone-dark.png",
        "03-standalone-expanded-category.png",
        "04-live-menu-light.png",
        "05-live-expanded-foodcards.png",
        "06-live-food-item-modal.png",
        "07-live-dark.png",
        "08-live-checkout-modal.png",
        "09-live-waiter-modal.png",
        "10-live-note-modal.png",
      ],
      issues: allIssues,
      notes: [
        "Report-only audit. It does not submit any real payment.",
        "Checkout is opened for visual inspection only.",
        "Use screenshots and JSON to continue visual fixes safely.",
      ],
    }

    fs.writeFileSync(
      path.join(outputDir, "theme-ui-deep-report.json"),
      JSON.stringify(report, null, 2)
    )

    console.log("")
    console.log("Deep theme UI audit written to:")
    console.log(outputDir)
    console.log("")
    console.log(`Found ${allIssues.length} possible UI issues.`)
    console.log(JSON.stringify(grouped, null, 2))
    console.log("")
  })
})
