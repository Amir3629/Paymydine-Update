import { test, expect } from '../src/fixtures.js';
import { openFinal, finalDebug } from '../src/waiter.js';


test('@smoke final workstation boots with live data and stable contracts', async ({ page, telemetry }) => {
  await openFinal(page);

  const debug = await finalDebug(page);
  expect(debug).toMatchObject({
    version: 'pmd-waiter-final-v1',
    active: true,
    launcherVisible: true,
    posOpen: false,
    mutationObservers: 0,
    themeDecoratorLoaded: false,
  });
  expect(debug.tables).toBeGreaterThan(0);

  await expect(page.locator('[data-final-sync]')).toContainText(/LIVE/i);
  await expect(page.locator('[data-final-table-grid] [data-final-open-table]')).not.toHaveCount(0);
  await expect(page.locator('[data-final-stat-open]')).toHaveText(/^\d+$/);
  await expect(page.locator('[data-final-stat-free]')).toHaveText(/^\d+$/);
  await expect(page.locator('[data-final-stat-due]')).toContainText(/\d/);

  await telemetry.assertHealthy({ maxLongTasks: 20 });
});


test('@smoke final data and notification endpoints do not return server errors', async ({ page, telemetry }) => {
  await openFinal(page);

  const result = await page.evaluate(async () => {
    const root = document.querySelector('[data-pmd-waiter-final-root]');
    const urls = [
      root?.getAttribute('data-data-url'),
      root?.getAttribute('data-notifications-url'),
    ].filter(Boolean);

    return Promise.all(urls.map(async (url) => {
      const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}qa=${Date.now()}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        cache: 'no-store',
      });
      const contentType = response.headers.get('content-type') || '';
      return { url, status: response.status, ok: response.ok, contentType };
    }));
  });

  for (const row of result) {
    expect(row.status, row.url).toBeLessThan(500);
    expect(row.ok, row.url).toBeTruthy();
    expect(row.contentType, row.url).toContain('json');
  }

  await telemetry.assertHealthy({ maxLongTasks: 20 });
});
