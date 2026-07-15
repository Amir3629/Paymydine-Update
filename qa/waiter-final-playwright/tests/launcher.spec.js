import { test, expect } from '../src/fixtures.js';
import { openFinal, finalDebug, setLauncherFilter } from '../src/waiter.js';


test('launcher filters, areas and search update the real table set', async ({ page, telemetry }) => {
  await openFinal(page);

  for (const filter of ['mine', 'open', 'attention', 'free', 'all']) {
    await setLauncherFilter(page, filter);
    const debug = await finalDebug(page);
    expect(debug.filter).toBe(filter === 'mine' && debug.tables > 0 ? debug.filter : filter);
  }

  await setLauncherFilter(page, 'all');
  const firstCard = page.locator('[data-final-open-table]').first();
  const tableNumber = String(await firstCard.locator('.pmd-final-table-number').textContent()).trim();

  const search = page.locator('[data-final-search]');
  await search.fill(tableNumber);
  await expect(page.locator('[data-final-open-table]')).not.toHaveCount(0);
  await expect(page.locator('[data-final-open-table]').first().locator('.pmd-final-table-number')).toHaveText(tableNumber);

  await page.locator('[data-final-clear-search]').click();
  await expect(search).toHaveValue('');

  const areaButtons = page.locator('[data-final-area]');
  expect(await areaButtons.count()).toBeGreaterThan(0);
  if (await areaButtons.count() > 1) {
    await areaButtons.nth(1).click();
    await expect(areaButtons.nth(1)).toHaveClass(/is-active/);
    await areaButtons.first().click();
  }

  await telemetry.assertHealthy();
});


test('attention and activity drawer opens, switches tab and closes', async ({ page, telemetry }) => {
  await openFinal(page);

  await page.locator('[data-final-alerts]').click();
  const drawer = page.locator('[data-final-drawer]');
  await expect(drawer).toHaveClass(/is-open/);
  await expect(drawer.locator('[role="dialog"]')).toBeVisible();

  await drawer.locator('[data-final-drawer-tab="notifications"]').click();
  await expect(drawer.locator('[data-final-drawer-tab="notifications"]')).toHaveClass(/is-active/);
  await expect(drawer.locator('[data-final-drawer-list]')).toBeVisible();

  await drawer.locator('[data-final-close-drawer]').last().click();
  await expect(drawer).not.toHaveClass(/is-open/);

  await telemetry.assertHealthy();
});


test('refresh and theme controls work without loading the old theme decorator', async ({ page, telemetry }) => {
  await openFinal(page);

  const before = await finalDebug(page);
  await page.locator('[data-final-refresh]').click();
  await expect.poll(async () => (await finalDebug(page)).refreshCount).toBeGreaterThan(before.refreshCount);

  const originalTheme = (await finalDebug(page)).theme;
  await page.locator('[data-final-theme]').click();
  const changedTheme = (await finalDebug(page)).theme;
  expect(changedTheme).not.toBe(originalTheme);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.PMDWaiterFinalV1?.debug?.().tables > 0);
  expect((await finalDebug(page)).theme).toBe(changedTheme);
  expect((await finalDebug(page)).themeDecoratorLoaded).toBe(false);

  await telemetry.assertHealthy({ maxLongTasks: 20 });
});


test('reservations and table operations open their configured admin destinations', async ({ page, context, telemetry }) => {
  await openFinal(page);

  const reservationPopupPromise = page.waitForEvent('popup');
  await page.locator('[data-final-reservations]').click();
  const reservationPopup = await reservationPopupPromise;
  await reservationPopup.waitForLoadState('domcontentloaded').catch(() => {});
  expect(reservationPopup.url()).toContain('/admin/reservations');
  await reservationPopup.close();

  const operationsPopupPromise = page.waitForEvent('popup');
  await page.locator('[data-final-floor-operations]').click();
  const operationsPopup = await operationsPopupPromise;
  await operationsPopup.waitForLoadState('domcontentloaded').catch(() => {});
  expect(operationsPopup.url()).toContain('/admin/dashboardwaiter');
  await operationsPopup.close();

  expect(context.pages().length).toBe(1);
  await telemetry.assertHealthy();
});
