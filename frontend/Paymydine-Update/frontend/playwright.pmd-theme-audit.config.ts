import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/pmd-audit",
  timeout: 60_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "test-results/pmd-theme-audit-html", open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "https://mimoza.paymydine.com",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ignoreHTTPSErrors: true,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
})
