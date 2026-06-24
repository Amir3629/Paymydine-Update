import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/pmd-audit",
  testMatch: /pmd-theme-visual-audit-v2\.spec\.ts/,
  timeout: 70_000,
  fullyParallel: false,
  retries: 0,
  workers: 1,
  outputDir: "test-results/pmd-theme-audit-v2-artifacts",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report-pmd-theme-audit-v2", open: "never" }],
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
