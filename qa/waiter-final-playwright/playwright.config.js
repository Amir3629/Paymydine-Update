import 'dotenv/config';
import { defineConfig, devices } from '@playwright/test';
import { qaConfig } from './src/config.js';

const authFile = 'test-results/.auth/admin.json';

export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/artifacts',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: qaConfig.workers,
  timeout: 75_000,
  expect: { timeout: qaConfig.expectTimeout },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  use: {
    baseURL: qaConfig.baseURL,
    headless: qaConfig.headless,
    launchOptions: { slowMo: qaConfig.slowMo },
    ignoreHTTPSErrors: true,
    actionTimeout: qaConfig.actionTimeout,
    navigationTimeout: qaConfig.navigationTimeout,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'en-US',
    timezoneId: 'Europe/Berlin',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.js/,
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        browserName: 'chromium',
        viewport: { width: 1536, height: 960 },
        storageState: authFile,
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.js/,
    },
    {
      name: 'tablet',
      use: {
        ...devices['iPad Pro 11'],
        browserName: 'chromium',
        storageState: authFile,
      },
      dependencies: ['setup'],
      testMatch: /visual-responsive\.spec\.js/,
    },
    {
      name: 'phone',
      use: {
        ...devices['iPhone 14'],
        browserName: 'chromium',
        storageState: authFile,
      },
      dependencies: ['setup'],
      testMatch: /visual-responsive\.spec\.js/,
    },
  ],
});
