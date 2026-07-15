import { expect } from '@playwright/test';
import { qaConfig } from './config.js';

export const finalRoot = '[data-pmd-waiter-final-root]';
export const posRoot = '[data-pmd-pos-root]';

export async function openFinal(page) {
  await page.goto(qaConfig.finalPath, { waitUntil: 'domcontentloaded' });
  await expect(page.locator(finalRoot)).toBeVisible();
  await page.waitForFunction(() => {
    const api = window.PMDWaiterFinalV1;
    const root = document.querySelector('[data-pmd-waiter-final-root]');
    if (!api || !root) return false;
    const debug = api.debug();
    return debug.active && debug.tables > 0;
  }, null, { timeout: 45_000 });
  await expect(page.locator('[data-final-loading]')).toBeHidden();
}

export async function finalDebug(page) {
  return page.evaluate(() => window.PMDWaiterFinalV1?.debug?.());
}

export async function posDebug(page) {
  return page.evaluate(() => window.PMDWaiterPOS?.debug?.());
}

export async function setLauncherFilter(page, filter) {
  const button = page.locator(`[data-final-filter="${filter}"]`);
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toHaveClass(/is-active/);
}

export async function tableCards(page) {
  return page.locator('[data-final-open-table]');
}

export async function findTableCard(page, options = {}) {
  if (options.filter) await setLauncherFilter(page, options.filter);

  if (options.tableNumber) {
    const escaped = String(options.tableNumber).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exact = page.locator('[data-final-open-table]').filter({
      has: page.locator('.pmd-final-table-number', { hasText: new RegExp(`^${escaped}$`) }),
    }).first();
    if (await exact.count()) return exact;
  }

  if (options.state) {
    const byState = page.locator(`[data-final-open-table].is-${options.state}`).first();
    if (await byState.count()) return byState;
  }

  return page.locator('[data-final-open-table]').first();
}

export async function openTable(page, options = {}) {
  const card = await findTableCard(page, options);
  await expect(card, `No table card found for ${JSON.stringify(options)}`).toBeVisible();

  const tableNumber = String(await card.locator('.pmd-final-table-number').textContent()).trim();
  const tableId = await card.getAttribute('data-final-open-table');

  await card.click();
  await expect(page.locator(posRoot)).toBeVisible({ timeout: 30_000 });
  await page.waitForFunction(() => !!window.PMDWaiterPOS?.debug?.(), null, { timeout: 30_000 });

  return { tableId, tableNumber };
}

export async function closeTable(page) {
  const close = page.locator(`${posRoot} [data-pos-close]`).first();
  if (!(await close.count())) return;

  const hasDraft = await page.locator('[data-pos-line]').count() > 0;
  if (hasDraft) page.once('dialog', async (dialog) => dialog.accept());

  await close.click();
  await expect(page.locator('[data-final-launcher]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(posRoot)).toHaveCount(0);
}

export async function chooseProduct(page, preferredName = qaConfig.testProduct) {
  let product;
  if (preferredName) {
    product = page.locator('[data-pos-product]').filter({ hasText: preferredName }).first();
  } else {
    product = page.locator('[data-pos-product]:not(.has-options)').first();
  }

  if (!(await product.count())) product = page.locator('[data-pos-product]').first();
  await expect(product).toBeVisible();

  const name = String(await product.locator('.pmd-pos-product-name').textContent()).trim();
  await product.click();

  const modifier = page.locator('[data-pos-modifier-modal].is-show');
  if (await modifier.count()) {
    const requiredGroups = modifier.locator('[data-option-group][data-required="1"]');
    for (let index = 0; index < await requiredGroups.count(); index += 1) {
      const group = requiredGroups.nth(index);
      if (!(await group.locator('input:checked').count())) await group.locator('input').first().check();
    }
    await modifier.locator('[data-pos-modal-add]').click();
  }

  await expect(page.locator('[data-pos-line]')).toHaveCount(1, { timeout: 10_000 });
  return name;
}

export async function clearLocalCart(page) {
  const clear = page.locator('[data-pos-clear]');
  const lines = page.locator('[data-pos-line]');
  if (!(await clear.count()) || await lines.count() === 0) return;

  page.once('dialog', async (dialog) => dialog.accept());
  await clear.click();
  await expect(lines).toHaveCount(0);
}

export async function openPaymentForExistingOrder(page) {
  await setLauncherFilter(page, 'all');
  const paymentCard = page.locator('[data-final-open-table].is-payment').first();
  await expect(paymentCard, 'No payment-due table is available for payment UI testing').toBeVisible();
  const table = await openTable(page, { state: 'payment' });

  const paymentButton = page.locator('[data-pos-payment]');
  await expect(paymentButton).toBeEnabled({ timeout: 20_000 });
  await paymentButton.click();

  const modal = page.locator('[data-pos-payment-modal]');
  await expect(modal).toHaveClass(/is-show/);
  await expect(page.locator('[data-pos-payment-balance] .pmd-pos-balance-card')).toHaveCount(3, { timeout: 30_000 });
  return table;
}

export async function closePayment(page) {
  const close = page.locator('[data-pos-payment-close]');
  if (await close.count()) await close.click();
  await expect(page.locator('[data-pos-payment-modal]')).not.toHaveClass(/is-show/);
}

export async function attachScreenshot(page, testInfo, name, locator = null) {
  const body = locator
    ? await locator.screenshot({ animations: 'disabled' })
    : await page.screenshot({ fullPage: true, animations: 'disabled' });
  await testInfo.attach(`${name}.png`, { body, contentType: 'image/png' });
}

export async function assertNoHorizontalOverflow(page, selector = 'body') {
  const result = await page.locator(selector).evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
  }));
  expect(result.scrollWidth, `${selector} horizontal overflow`).toBeLessThanOrEqual(result.clientWidth + 2);
}

export async function csrfToken(page) {
  return page.locator('meta[name="csrf-token"]').getAttribute('content');
}
