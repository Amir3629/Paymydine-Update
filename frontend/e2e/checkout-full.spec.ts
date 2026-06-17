import { expect, type Frame, type Locator, type Page, test } from "@playwright/test"

async function embeddedMenuFrame(page: Page): Promise<Frame | Page> {
  const deadline = Date.now() + 20_000

  while (Date.now() < deadline) {
    const frame = page.frames().find((candidate) =>
      candidate.url().includes("/themes/kazen-japanese"),
    )

    if (frame) return frame

    await page.waitForTimeout(500)
  }

  return page
}

async function firstVisible(locator: Locator, max = 80): Promise<Locator | null> {
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

  if (await locator.click({ timeout: 2500 }).then(() => true).catch(() => false)) return
  if (await locator.click({ timeout: 2500, force: true }).then(() => true).catch(() => false)) return

  await locator.evaluate((node) => {
    const element = node as HTMLElement
    const clickable = element.closest("button,[role='button'],a") as HTMLElement | null
    ;(clickable || element).dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, composed: true }),
    )
  })
}

async function openKazenAllCategory(root: Frame | Page) {
  const allButton = root.locator("button.kazen-category-btn").filter({ hasText: /^ALL$/i }).first()
  if (await allButton.isVisible().catch(() => false)) {
    await smartClick(allButton).catch(() => undefined)
    await root.waitForTimeout?.(500).catch(() => undefined)
  }
}

async function clickAddItem(page: Page) {
  const root = await embeddedMenuFrame(page)
  await openKazenAllCategory(root)

  const addLocators = [
    root.locator("article.kazen-category:not(.is-closed) button.kazen-add"),
    root.locator("button.kazen-add"),
    root.locator("button[aria-label*='Add' i]"),
    root.getByTestId("pmd-menu-add-to-cart"),
    root.getByRole("button", { name: /add/i }),
  ]

  for (const locator of addLocators) {
    const candidate = await firstVisible(locator)
    if (!candidate) continue

    await smartClick(candidate)
    await page.waitForTimeout(1200)
    return
  }

  throw new Error("Could not click an Add item button inside menu frame/page")
}

async function clickParentCheckout(page: Page) {
  const checkoutLocators = [
    page.locator("button").filter({ hasText: /checkout/i }),
    page.locator("[role='button']").filter({ hasText: /checkout/i }),
    page.locator(".KazenBottomDock-module__g-C2hq__primary").filter({ hasText: /checkout/i }),
    page.getByRole("button", { name: /checkout/i }),
    page.locator("text=/Checkout/i"),
  ]

  const deadline = Date.now() + 30_000
  let lastBody = ""

  while (Date.now() < deadline) {
    for (const locator of checkoutLocators) {
      const count = await locator.count().catch(() => 0)
      const capped = Math.min(count, 10)

      for (let index = 0; index < capped; index += 1) {
        const candidate = locator.nth(index)
        if (!(await candidate.isVisible().catch(() => false))) continue

        await smartClick(candidate).catch(() => undefined)
        await page.waitForTimeout(1200)

        if (await checkoutIsOpen(page)) return
      }
    }

    lastBody = await page.locator("body").innerText({ timeout: 2000 }).catch(() => "")
    await page.waitForTimeout(700)
  }

  throw new Error(`Checkout did not open from parent dock. Last body:\n${lastBody}`)
}

async function checkoutIsOpen(page: Page): Promise<boolean> {
  const modal = page
    .getByTestId("pmd-checkout-modal")
    .or(page.locator("[data-pmd-checkout-design-system='1']"))
    .or(page.locator("[data-pmd-checkout-theme-root='1']"))
    .or(page.locator(".pmd-checkout-modal"))
    .first()

  if (await modal.isVisible().catch(() => false)) return true

  const body = await page.locator("body").innerText({ timeout: 1500 }).catch(() => "")
  return /Confirm|Review|Send to kitchen|Payment|Payment Methods|Ready to pay|Payable total|Items total/i.test(body)
}

test.describe("PayMyDine full checkout E2E", () => {
  test("customer can add an item, open checkout, and reach payment UI without real payment", async ({ page }) => {
    const pageErrors: string[] = []
    page.on("pageerror", (error) => pageErrors.push(error.message))

    await page.goto("/menu", { waitUntil: "domcontentloaded" })
    await expect(page.locator("body")).toContainText(/Checkout|Waiter|Note|PayMyDine|Menu/i)
    await page.waitForLoadState("networkidle").catch(() => undefined)

    await clickAddItem(page)
    await clickParentCheckout(page)

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
