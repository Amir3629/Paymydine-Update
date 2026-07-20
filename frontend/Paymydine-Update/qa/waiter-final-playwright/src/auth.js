import { expect } from '@playwright/test';
import { qaConfig, requireCredentials } from './config.js';

const USER_SELECTORS = [
  'input[name="login"]',
  'input[name="username"]',
  'input[name="email"]',
  'input[autocomplete="username"]',
  'input[type="email"]',
  'input[type="text"]',
];

const PASSWORD_SELECTORS = [
  'input[name="password"]',
  'input[autocomplete="current-password"]',
  'input[type="password"]',
];

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count() && await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
}

export async function isLoginPage(page) {
  if (/\/admin\/(login|signin)/i.test(page.url())) return true;
  const password = await firstVisible(page, PASSWORD_SELECTORS);
  return !!password;
}

export async function login(page) {
  requireCredentials();

  await page.goto(qaConfig.finalPath, { waitUntil: 'domcontentloaded' });

  if (!(await isLoginPage(page))) {
    await expect(page.locator('[data-pmd-waiter-final-root]')).toBeVisible();
    return;
  }

  const username = await firstVisible(page, USER_SELECTORS);
  const password = await firstVisible(page, PASSWORD_SELECTORS);

  if (!username || !password) {
    throw new Error(`Login form detected but username/password fields were not found at ${page.url()}`);
  }

  await username.fill(qaConfig.username);
  await password.fill(qaConfig.password);

  const submit = page
    .locator('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Sign in")')
    .first();

  if (!(await submit.count())) throw new Error('Admin login submit button was not found.');

  await Promise.all([
    page.waitForLoadState('domcontentloaded').catch(() => {}),
    submit.click(),
  ]);

  if (await isLoginPage(page)) {
    const error = await page.locator('.alert-danger, .flash-message, [role="alert"]').first().textContent().catch(() => '');
    throw new Error(`Admin login did not complete. ${String(error || '').trim()}`);
  }

  if (!page.url().includes(qaConfig.finalPath)) {
    await page.goto(qaConfig.finalPath, { waitUntil: 'domcontentloaded' });
  }

  await expect(page.locator('[data-pmd-waiter-final-root]')).toBeVisible();
}
