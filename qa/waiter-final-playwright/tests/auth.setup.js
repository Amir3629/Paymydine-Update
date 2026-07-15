import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test as setup, expect } from '@playwright/test';
import { login } from '../src/auth.js';

const authFile = 'test-results/.auth/admin.json';

setup('authenticate admin waiter QA session', async ({ page }) => {
  mkdirSync(dirname(authFile), { recursive: true });
  await login(page);
  await expect(page.locator('[data-pmd-waiter-final-root]')).toBeVisible();
  await page.context().storageState({ path: authFile });
});
