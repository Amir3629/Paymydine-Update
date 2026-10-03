import { test, expect } from '../src/fixtures.js';
import { qaConfig } from '../src/config.js';
import {
  openFinal,
  openTable,
  chooseProduct,
  closeTable,
  posDebug,
  csrfToken,
  setLauncherFilter,
} from '../src/waiter.js';

async function operationsUrl(page, orderId, suffix = '') {
  return page.locator('[data-pmd-waiter-final-root]').evaluate((root, values) => {
    const template = root.getAttribute('data-operations-url') || '/admin/pmd-waiter-pos-v22/operations/{order}';
    return template.replace('{order}', encodeURIComponent(String(values.orderId))) + values.suffix;
  }, { orderId, suffix });
}

async function openDedicatedTestTable(page) {
  await setLauncherFilter(page, 'free');
  for (const number of qaConfig.testTables) {
    const card = page.locator('[data-final-open-table]').filter({ hasText: new RegExp(`TABLE\\s*${number}(?:\\D|$)`, 'i') }).first();
    if (await card.count() && await card.isVisible()) return openTable(page, { tableNumber: number });
  }
  throw new Error(`None of the dedicated free test tables are available: ${qaConfig.testTables.join(', ')}`);
}

async function voidOrder(page, orderId) {
  const url = await operationsUrl(page, orderId, '/void-order');
  const token = await csrfToken(page);
  return page.evaluate(async ({ url, token }) => {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': token || '',
      },
      body: JSON.stringify({ reason: 'Automated Playwright QA cleanup' }),
    });
    const payload = await response.json().catch(() => ({}));
    return { status: response.status, ok: response.ok, payload };
  }, { url, token });
}


test('V2.2 table-operations backend returns JSON for a real active order', async ({ page, telemetry }) => {
  await openFinal(page);
  await openTable(page, { state: 'payment', filter: 'all' });

  const debug = await posDebug(page);
  expect(debug.activeOrderId).toBeTruthy();

  const url = await operationsUrl(page, debug.activeOrderId);
  const response = await page.request.get(url, {
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
  });

  const body = await response.text();
  expect(response.status(), `${url}\n${body}`).toBeLessThan(500);
  expect(response.ok(), `${url}\n${body}`).toBeTruthy();
  expect(response.headers()['content-type'] || '').toContain('json');

  const payload = JSON.parse(body);
  expect(payload).toBeTruthy();
  await closeTable(page);
  await telemetry.assertHealthy({ maxLongTasks: 24 });
});


test('@mutation create a real dedicated-table order and optionally clean it up', async ({ page, telemetry }, testInfo) => {
  test.skip(!qaConfig.allowMutations, 'Set PMD_ALLOW_MUTATIONS=1 to enable real order mutations.');
  test.skip(!qaConfig.testTables.length, 'PMD_TEST_TABLES must list dedicated QA tables.');

  await openFinal(page);
  const table = await openDedicatedTestTable(page);
  const productName = await chooseProduct(page);
  await page.locator('[data-pos-table-note]').fill(`${qaConfig.testNote} · ${new Date().toISOString()}`);

  const submit = page.locator(qaConfig.mutationMode === 'send' ? '[data-pos-send]' : '[data-pos-hold]');
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect.poll(async () => (await posDebug(page)).activeOrderId, { timeout: 30_000 }).toBeTruthy();
  const debug = await posDebug(page);
  expect(debug.cartLines).toBe(0);

  await testInfo.attach('created-order.json', {
    body: Buffer.from(JSON.stringify({ table, orderId: debug.activeOrderId, productName, mode: qaConfig.mutationMode }, null, 2)),
    contentType: 'application/json',
  });

  if (qaConfig.cleanupVoid) {
    const cleanup = await voidOrder(page, debug.activeOrderId);
    expect(cleanup.ok, JSON.stringify(cleanup.payload)).toBeTruthy();
  } else {
    testInfo.annotations.push({
      type: 'cleanup-required',
      description: `Order ${debug.activeOrderId} on table ${table.tableNumber} was intentionally left for manual review.`,
    });
  }

  await closeTable(page);
  await telemetry.assertHealthy({ maxLongTasks: 32 });
});


test('@mutation record a real cash payment only with the second payment safety switch', async ({ page, telemetry }, testInfo) => {
  test.skip(!qaConfig.allowMutations || !qaConfig.allowPaymentMutations, 'Requires PMD_ALLOW_MUTATIONS=1 and PMD_ALLOW_PAYMENT_MUTATIONS=1.');
  test.skip(!qaConfig.testTables.length, 'PMD_TEST_TABLES must list dedicated QA tables.');

  await openFinal(page);
  const table = await openDedicatedTestTable(page);
  await chooseProduct(page);
  await page.locator('[data-pos-table-note]').fill(`${qaConfig.testNote} PAYMENT · ${new Date().toISOString()}`);
  await page.locator('[data-pos-hold]').click();
  await expect.poll(async () => (await posDebug(page)).activeOrderId, { timeout: 30_000 }).toBeTruthy();

  const orderId = (await posDebug(page)).activeOrderId;
  await expect(page.locator('[data-pos-payment]')).toBeEnabled();
  await page.locator('[data-pos-payment]').click();
  await expect(page.locator('[data-pos-payment-balance] .pmd-pos-balance-card')).toHaveCount(3, { timeout: 30_000 });

  await page.locator('[data-payment-method="cash"]').click();
  const cashInput = page.locator('[data-pos-cash-received]');
  await expect(cashInput).not.toHaveValue('');
  await expect(page.locator('[data-pos-pay-button]')).toBeEnabled();
  await page.locator('[data-pos-pay-button]').click();

  await expect.poll(async () => {
    const debug = await posDebug(page);
    return debug.paymentRemaining;
  }, { timeout: 30_000 }).toBe(0);

  await testInfo.attach('cash-payment.json', {
    body: Buffer.from(JSON.stringify({ table, orderId, result: 'paid' }, null, 2)),
    contentType: 'application/json',
  });

  await telemetry.assertHealthy({ maxLongTasks: 36 });
});
