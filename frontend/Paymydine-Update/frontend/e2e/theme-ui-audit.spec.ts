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

const outputDir = path.join(process.cwd(), "test-results", "theme-ui-audit")

function ensureOutputDir() {
  fs.mkdirSync(outputDir, { recursive: true })
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
      if (aria) return `${element.tagName.toLowerCase()}[aria-label="${aria.slice(0, 40)}"]`

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
    ]

    const tokenSnapshot: Record<string, string> = {}
    for (const token of themeTokens) {
      const value = rootStyles.getPropertyValue(token).trim()
      if (value) tokenSnapshot[token] = value
    }

    if (Object.keys(tokenSnapshot).length < 4) {
      addIssue({
        page: pageName,
        selector: ":root",
        type: "MISSING_THEME_TOKENS",
        severity: "info",
        message:
          "Theme tokens are missing or incomplete. This makes colors harder to audit and keep consistent.",
        details: { foundTokens: tokenSnapshot },
      })
    }

    const textElements = Array.from(
      document.querySelectorAll("button, a, p, span, h1, h2, h3, h4, label, [role='button']")
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
            text: text.slice(0, 100),
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
      const styles = getComputedStyle(el)
      const text = (el.innerText || el.getAttribute("aria-label") || "").trim()

      if (rect.width < 44 || rect.height < 44) {
        addIssue({
          page: pageName,
          selector: readableSelector(el),
          type: "SMALL_TAP_TARGET",
          severity: "warning",
          message: "Clickable element is smaller than recommended mobile tap size.",
          details: {
            text: text.slice(0, 100),
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
            text: text.slice(0, 100),
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            viewportWidth: window.innerWidth,
          },
        })
      }

      if (text && !el.getAttribute("aria-label") && text.length > 30 && rect.width < 120) {
        addIssue({
          page: pageName,
          selector: readableSelector(el),
          type: "POSSIBLE_TEXT_CLIPPING",
          severity: "info",
          message: "Button/link has long text inside a narrow area.",
          details: {
            text: text.slice(0, 120),
            width: Math.round(rect.width),
          },
        })
      }

      const bg = styles.backgroundColor
      const color = styles.color
      if (
        pageName.toLowerCase().includes("kazen") &&
        readableSelector(el).toLowerCase().includes("kazen") &&
        bg === "rgba(0, 0, 0, 0)"
      ) {
        addIssue({
          page: pageName,
          selector: readableSelector(el),
          type: "TRANSPARENT_KAZEN_BUTTON",
          severity: "info",
          message:
            "Kazen interactive element has transparent background. Check if this is intentional for the theme.",
          details: {
            text: text.slice(0, 100),
            color,
            backgroundColor: bg,
          },
        })
      }
    }

    const visibleBlocks = Array.from(
      document.querySelectorAll("main, section, article, div, header, footer, aside")
    ) as HTMLElement[]

    for (const el of visibleBlocks) {
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

    const bottomFixed = Array.from(document.querySelectorAll("*")).filter((node) => {
      const el = node as HTMLElement
      if (!isVisible(el)) return false
      const styles = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      return (
        (styles.position === "fixed" || styles.position === "sticky") &&
        rect.bottom >= window.innerHeight - 4 &&
        rect.height > 40
      )
    }) as HTMLElement[]

    for (const el of bottomFixed) {
      const rect = el.getBoundingClientRect()
      if (rect.height > 160) {
        addIssue({
          page: pageName,
          selector: readableSelector(el),
          type: "BOTTOM_DOCK_TOO_TALL",
          severity: "warning",
          message: "Bottom sticky/fixed area is very tall and may cover menu content.",
          details: {
            height: Math.round(rect.height),
          },
        })
      }
    }

    const images = Array.from(document.querySelectorAll("img")) as HTMLImageElement[]

    for (const img of images) {
      if (!isVisible(img)) continue

      const rect = img.getBoundingClientRect()
      const styles = getComputedStyle(img)

      if (!styles.aspectRatio || styles.aspectRatio === "auto") {
        if (rect.width > 50 && rect.height > 50) {
          addIssue({
            page: pageName,
            selector: readableSelector(img),
            type: "IMAGE_WITHOUT_ASPECT_RATIO",
            severity: "info",
            message:
              "Image has no explicit aspect-ratio. This can cause layout jump while loading.",
            details: {
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              src: img.currentSrc || img.src || "",
            },
          })
        }
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
        details: {
          scrollWidth,
          clientWidth,
        },
      })
    }

    return issues
  }, pageName)
}

test.describe("PayMyDine visual theme UI audit", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  })

  test("audit Kazen/Japanese standalone and live menu UI", async ({ page }) => {
    ensureOutputDir()

    const pagesToAudit = [
      {
        name: "kazen-standalone-mobile",
        url: "/themes/kazen-japanese?embedded=1&from=pmd",
      },
      {
        name: "kazen-menu-mobile",
        url: "/menu",
      },
    ]

    const allIssues: UiIssue[] = []

    for (const target of pagesToAudit) {
      await page.goto(target.url, { waitUntil: "domcontentloaded" })
      await page.waitForTimeout(1400)

      await page.screenshot({
        path: path.join(outputDir, `${target.name}.png`),
        fullPage: true,
      })

      allIssues.push(...(await runDomAudit(page, target.name)))

      for (const frame of page.frames()) {
        const frameUrl = frame.url()
        if (frameUrl.includes("/themes/kazen-japanese")) {
          allIssues.push(...(await runDomAudit(frame, `${target.name}__iframe-kazen`)))
        }
      }
    }

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
      issues: allIssues,
      notes: [
        "This audit is report-only. It does not fail the build yet.",
        "Use this report with screenshots to fix theme-specific visual problems faster.",
        "Do not use this audit to automate real payment submit flows.",
      ],
    }

    fs.writeFileSync(
      path.join(outputDir, "theme-ui-report.json"),
      JSON.stringify(report, null, 2)
    )

    console.log("")
    console.log("Theme UI audit written to:")
    console.log(outputDir)
    console.log("")
    console.log(`Found ${allIssues.length} possible UI issues.`)
    console.log(JSON.stringify(grouped, null, 2))
    console.log("")
  })
})
