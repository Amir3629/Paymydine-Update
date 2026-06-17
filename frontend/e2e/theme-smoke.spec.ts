import { expect, test } from "@playwright/test"

test.describe("PayMyDine theme smoke coverage", () => {
  test("live customer menu loads current admin-selected theme shell", async ({ page }) => {
    await page.goto("/menu", { waitUntil: "domcontentloaded" })
    await expect(page.locator("body")).toContainText(/Checkout|Waiter|Note|PayMyDine|Menu/i)

    const body = await page.locator("body").innerText()
    expect(body).not.toMatch(/Application error|Unhandled Runtime Error|Internal Server Error/i)
  })

  test("Kazen standalone embedded theme route loads menu controls", async ({ page }) => {
    await page.goto("/themes/kazen-japanese?embedded=1&from=pmd", { waitUntil: "domcontentloaded" })

    await expect(page.locator("body")).toContainText(/Avocado|Add|ALL|Toast|Menu/i)
    await expect(page.locator("body")).not.toContainText(/Application error|Unhandled Runtime Error|Internal Server Error/i)
  })
})
