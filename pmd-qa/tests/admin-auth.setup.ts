import { Page, expect } from '@playwright/test';

const firstVisible = async (page: Page, selectors: string[]) => {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
};

export async function loginIfNeeded(page: Page) {
  const base = process.env.PMD_BASE_URL || 'http://localhost';
  await page.goto(new URL('/admin', base).toString(), { waitUntil: 'domcontentloaded' });

  const password = await firstVisible(page, ['input[name="password"]', 'input[type="password"]']);
  if (!password) return;

  const user = process.env.PMD_ADMIN_USER || '';
  const pass = process.env.PMD_ADMIN_PASS || '';
  if (!user || !pass) throw new Error('Login form detected, but PMD_ADMIN_USER or PMD_ADMIN_PASS is missing.');

  const username = await firstVisible(page, [
    'input[name="username"]',
    'input[name="email"]',
    'input[type="email"]',
    'input[type="text"]'
  ]);
  if (!username) throw new Error('Login form detected, but no username/email field was found.');

  await username.fill(user);
  await password.fill(pass);

  const submit = await firstVisible(page, [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'button:has-text("ورود")'
  ]);
  if (!submit) throw new Error('Login form detected, but no submit button was found.');

  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => undefined),
    submit.click()
  ]);
  await expect(page.locator('input[type="password"]')).toHaveCount(0, { timeout: 15_000 });
}
