import { test as setup, expect } from '@playwright/test';
import { login } from '../src/auth.js';

const authFile = 'test-results/.auth/admin.json';

setup('authenticate admin waiter QA session', async ({ page }) => {
  await login(page);
  await expect(page.locator('[data-pmd-waiter-final-root]')).toBeVisible();
  await page.context().storageState({ path: authFile });
});
