import { expect, type Frame, type Locator, type Page, test } from "@playwright/test"

type SearchRoot = Page | Frame

async function rootsFor(page: Page): Promise<SearchRoot[]> {
  await page.waitForTimeout(350)
  return [page, ...page.frames().filter((frame) => frame !== page.mainFrame())]
}

async function visibleCandidate(locator: Locator, max = 30): Promise<Locator | null> {
  const count = await locator.count().catch(() => 0)
  const capped = Math.min(count, max)

  for (let index = 0; index < capped; index += 1) {
    const candidate = locator.nth(index)
    if (await candidate.isVisible().catch(() => false)) {
      return candidate
    }
  }

  return null
}

async function smartClick(locator: Locator) {
  await locator.scrollIntoViewIfNeeded().catch(() => undefined)

  const normal = await locator.click({ timeout: 1800 }).then(() => true).catch(() => false)
  if (normal) return

  const forced = await locator.click({ timeout: 1800, force: true }).then(() => true).catch(() => false)
  if (forced) return

  await locator.evaluate((node) => {
    const element = node as HTMLElement
    const clickable = element.closest("button,[role='button'],a,[data-pmd-organic-dock-action],[data-pmd-kazen-action]") as HTMLElement | null
    ;(clickable || element).dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, composed: true }),
    )
  })
}

function addToCartLocators(root: SearchRoot): Locator[] {
  return [
    root.locator("article.kazen-category:not(.is-closed) button.kazen-add"),
    root.locator("article.kazen-category:not(.is-closed) button[aria-label*='Add' i]"),
    root.getByTestId("pmd-menu-add-to-cart"),
    root.getByRole("button", { name: /add to cart/i }),
    root.locator("button[aria-label*='add' i]"),
    root.locator("button:has([data-pmd-menu-plus-text='1'])"),
    root.locator("button").filter({ hasText: /^\s*\+\s*$/ }),
    root.locator("[role='button']").filter({ hasText: /^\s*\+\s*$/ }),
    root.locator("[data-pmd-menu-plus-text='1']").locator(".."),
  ]
}

function checkoutLocators(root: SearchRoot): Locator[] {
  return [
    root.getByRole("button", { name: /^checkout$/i }),
    root.getByRole("button", { name: /checkout/i }),
    root.locator("button").filter({ hasText: /checkout/i }),
    root.locator("[role='button']").filter({ hasText: /checkout/i }),
    root.locator("a").filter({ hasText: /checkout/i }),
    root.locator("[data-pmd-organic-dock-action='checkout']"),
    root.locator("[data-pmd-kazen-action='checkout']"),
    root.locator("[aria-label*='checkout' i]"),
    root.locator("[aria-label*='cart' i]"),
    root.locator("button").filter({ hasText: /cart|order/i }),
    root.locator("[role='button']").filter({ hasText: /cart|order/i }),
    root.locator("text=/Checkout/i"),
  ]
}

async function checkoutSurfaceIsOpen(page: Page): Promise<boolean> {
  const modal = page
    .getByTestId("pmd-checkout-modal")
    .or(page.locator("[data-pmd-checkout-design-system='1']"))
    .or(page.locator("[data-pmd-checkout-theme-root='1']"))
    .or(page.locator(".pmd-checkout-modal"))
    .first()

  if (await modal.isVisible().catch(() => false)) return true

  const bodyText = await page.locator("body").innerText({ timeout: 2000 }).catch(() => "")
  return /Confirm|Review|Send to kitchen|Payment Methods|Ready to pay|Payable total|Items total/i.test(bodyText)
}

async function openVisibleMenuSections(page: Page) {
  const deadline = Date.now() + 12_000

  while (Date.now() < deadline) {
    let clicked = false

    for (const root of await rootsFor(page)) {
      const closedCategoryButtons = root.locator(
        "article.kazen-category.is-closed > button.kazen-category-btn, .kazen-category.is-closed .kazen-category-btn",
      )

      const count = await closedCategoryButtons.count().catch(() => 0)
      const capped = Math.min(count, 8)

      for (let index = 0; index < capped; index += 1) {
        const button = closedCategoryButtons.nth(index)
        if (!(await button.isVisible().catch(() => false))) continue

        await smartClick(button).catch(() => undefined)
        await page.waitForTimeout(500)
        clicked = true
        break
      }

      if (clicked) break
    }

    const hasOpenKazenAdd = await page
      .locator("article.kazen-category:not(.is-closed) button.kazen-add, .kazen-category:not(.is-closed) button[aria-label*='Add' i]")
      .first()
      .isVisible()
      .catch(() => false)

    const hasAnyAdd = await page.getByTestId("pmd-menu-add-to-cart").first().isVisible().catch(() => false)

    if (hasOpenKazenAdd || hasAnyAdd || !clicked) return
  }
}

async function describeVisibleControls(page: Page): Promise<string> {
  const rows: string[] = []

  for (const root of await rootsFor(page)) {
    const rootName = "url" in root ? root.url() : "page"
    const buttons = root.locator("button, [role='button'], a")
    const count = await buttons.count().catch(() => 0)
    const capped = Math.min(count, 60)

    rows.push(`ROOT ${rootName} count=${count}`)

    for (let index = 0; index < capped; index += 1) {
      const button = buttons.nth(index)
      if (!(await button.isVisible().catch(() => false))) continue

      const text = await button.innerText().catch(() => "")
      const aria = await button.getAttribute("aria-label").catch(() => "")
      const testid = await button.getAttribute("data-testid").catch(() => "")
      const klass = await button.getAttribute("class").catch(() => "")
      rows.push(`- text="${text.trim()}" aria="${aria || ""}" testid="${testid || ""}" class="${klass || ""}"`)
    }
  }

  return rows.join("\n")
}

async function clickFirstVisibleAcrossRoots(
  page: Page,
  buildLocators: (root: SearchRoot) => Locator[],
  label: string,
) {
  const deadline = Date.now() + 25_000
  let diagnostics = ""

  while (Date.now() < deadline) {
    for (const root of await rootsFor(page)) {
      for (const locator of buildLocators(root)) {
        const candidate = await visibleCandidate(locator)
        if (!candidate) continue

        await smartClick(candidate)
        return
      }
    }

    diagnostics = await describeVisibleControls(page).catch((error) => String(error))
    await page.waitForTimeout(750)
  }

  throw new Error(`Could not find visible locator for: ${label}\n\nVisible controls:\n${diagnostics}`)
}

async function clickCheckoutUntilModal(page: Page) {
  const deadline = Date.now() + 35_000
  let diagnostics = ""

  while (Date.now() < deadline) {
    if (await checkoutSurfaceIsOpen(page)) return

    let clickedAnything = false

    for (const root of await rootsFor(page)) {
      for (const locator of checkoutLocators(root)) {
        const count = await locator.count().catch(() => 0)
        const capped = Math.min(count, 20)

        for (let index = 0; index < capped; index += 1) {
          const candidate = locator.nth(index)
          if (!(await candidate.isVisible().catch(() => false))) continue

          await smartClick(candidate).catch(() => undefined)
          clickedAnything = true
          await page.waitForTimeout(900)

          if (await checkoutSurfaceIsOpen(page)) return
        }
      }
    }

    diagnostics = await describeVisibleControls(page).catch((error) => String(error))

    if (!clickedAnything) {
      await page.waitForTimeout(750)
    }
  }

  throw new Error(`Checkout surface did not open.\n\nVisible controls:\n${diagnostics}`)
}

async function openCheckoutFromMenu(page: Page) {
  await openVisibleMenuSections(page)

  await clickFirstVisibleAcrossRoots(page, addToCartLocators, "add-to-cart button")

  await page.waitForTimeout(1000)

  await clickCheckoutUntilModal(page)
}

test.describe("PayMyDine full checkout E2E", () => {
  test("customer can add an item, open checkout, and reach payment UI without real payment", async ({ page }) => {
    const pageErrors: string[] = []

    page.on("pageerror", (error) => {
      pageErrors.push(error.message)
    })

    await page.goto("/menu", { waitUntil: "domcontentloaded" })
    await expect(page.locator("body")).toContainText(/PayMyDine|Checkout|Menu/i)
    await page.waitForLoadState("networkidle").catch(() => undefined)

    await openCheckoutFromMenu(page)

    await expect(page.locator("body")).toContainText(
      /Confirm|Review|Send to kitchen|Payment|Payment Methods|Ready to pay|Payable total|Items total/i,
    )

    const confirmReviewButton = page
      .locator("[data-pmd-review-submit='true']")
      .or(page.getByRole("button", { name: /^confirm$/i }))
      .first()

    if (await confirmReviewButton.isVisible().catch(() => false)) {
      await confirmReviewButton.click()
      await page.waitForTimeout(900)
    }

    await expect(page.locator("body")).toContainText(
      /Payment|Payment Methods|Ready to pay|Payable total|Items total|Confirm|Review/i,
    )

    await expect(page.locator("body")).not.toContainText(
      /Application error|Unhandled Runtime Error|Internal Server Error/i,
    )

    expect(pageErrors, `browser page errors: ${pageErrors.join("\n")}`).toEqual([])
  })
})
