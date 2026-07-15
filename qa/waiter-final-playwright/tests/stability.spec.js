import { test, expect } from '../src/fixtures.js';
import {
  openFinal,
  finalDebug,
  openTable,
  closeTable,
  openPaymentForExistingOrder,
  closePayment,
} from '../src/waiter.js';

async function visibleTableGeometry(page) {
  return page.locator('[data-final-open-table]').evaluateAll((cards) => Object.fromEntries(cards.map((card) => {
    const number = card.querySelector('.pmd-final-table-number')?.textContent?.trim() || card.getAttribute('data-final-open-table');
    const rect = card.getBoundingClientRect();
    return [number, { x: rect.x, y: rect.y, width: rect.width, height: rect.height }];
  })));
}


test('three complete reloads preserve a working launcher and one final authority', async ({ page, telemetry }) => {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await openFinal(page);
    const debug = await finalDebug(page);
    expect(debug.active).toBe(true);
    expect(debug.tables).toBeGreaterThan(0);
    expect(debug.mutationObservers).toBe(0);
    expect(debug.themeDecoratorLoaded).toBe(false);
    expect(await page.locator('[data-pmd-waiter-final-root]').count()).toBe(1);
    expect(await page.locator('script[src*="pmd-waiter-final-v1.js"]').count()).toBe(1);
    if (attempt < 2) await page.reload({ waitUntil: 'domcontentloaded' });
  }

  await telemetry.assertHealthy({ maxLongTasks: 30 });
});


test('the 15-second live poll does not move visible table cards', async ({ page, telemetry }) => {
  await openFinal(page);
  const beforeDebug = await finalDebug(page);
  const before = await visibleTableGeometry(page);

  await expect.poll(async () => (await finalDebug(page)).refreshCount, { timeout: 22_000 })
    .toBeGreaterThan(beforeDebug.refreshCount);

  const after = await visibleTableGeometry(page);
  const common = Object.keys(before).filter((key) => after[key]);
  expect(common.length).toBeGreaterThan(0);

  const deltas = common.map((key) => ({
    table: key,
    dx: Math.abs(before[key].x - after[key].x),
    dy: Math.abs(before[key].y - after[key].y),
    dw: Math.abs(before[key].width - after[key].width),
    dh: Math.abs(before[key].height - after[key].height),
  }));

  expect(deltas.filter((row) => row.dx > 1 || row.dy > 1 || row.dw > 1 || row.dh > 1), 'Table geometry changed after polling').toEqual([]);
  await telemetry.assertHealthy({ maxLongTasks: 30 });
});


test('repeated table open and close leaves no orphan POS roots or frozen overlay', async ({ page, telemetry }) => {
  await openFinal(page);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await openTable(page, { filter: 'free' });
    await expect(page.locator('[data-pmd-pos-root]')).toHaveCount(1);
    await expect(page.locator('[data-final-pos-layer]')).toBeVisible();
    await closeTable(page);
    expect((await finalDebug(page)).posOpen).toBe(false);
    await expect(page.locator('[data-pmd-pos-root]')).toHaveCount(0);
  }

  await telemetry.assertHealthy({ maxLongTasks: 32 });
});


test('payment center survives repeated open refresh and close cycles', async ({ page, telemetry }) => {
  await openFinal(page);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt === 0) {
      await openPaymentForExistingOrder(page);
    } else {
      await page.locator('[data-pos-payment]').click();
      await expect(page.locator('[data-pos-payment-modal]')).toHaveClass(/is-show/);
      await expect(page.locator('[data-pos-payment-balance] .pmd-pos-balance-card')).toHaveCount(3, { timeout: 30_000 });
    }

    await page.locator('[data-pos-refresh-payment]').click();
    await page.waitForTimeout(750);
    await expect(page.locator('[data-pos-payment-modal]')).toHaveClass(/is-show/);
    await closePayment(page);
  }

  await closeTable(page);
  await telemetry.assertHealthy({ maxLongTasks: 36 });
});


test('offline state is visible and the launcher recovers after connectivity returns', async ({ page, context, telemetry }) => {
  await openFinal(page);

  await context.setOffline(true);
  await page.locator('[data-final-refresh]').click();
  await expect(page.locator('[data-final-sync]')).toContainText(/OFFLINE|DATA ERROR/i, { timeout: 15_000 });

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.locator('[data-final-sync]')).toContainText(/LIVE/i, { timeout: 25_000 });
  expect((await finalDebug(page)).tables).toBeGreaterThan(0);

  telemetry.report.failedRequests = [];
  telemetry.report.badResponses = [];
  await telemetry.assertHealthy({ maxLongTasks: 30 });
});
