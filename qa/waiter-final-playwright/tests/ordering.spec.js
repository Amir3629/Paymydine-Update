import { test, expect } from '../src/fixtures.js';
import { openFinal, openTable, chooseProduct, clearLocalCart, closeTable, posDebug } from '../src/waiter.js';


test('ordering workspace loads categories, valid products and current-order controls', async ({ page, telemetry }) => {
  await openFinal(page);
  await openTable(page, { filter: 'free' });

  await expect(page.locator('[data-pos-search]')).toBeVisible();
  await expect(page.locator('[data-pos-categories] [data-pos-category]')).not.toHaveCount(0);
  await expect(page.locator('[data-pos-menu] [data-pos-product]')).not.toHaveCount(0);
  await expect(page.locator('[data-pos-cart]')).toBeVisible();
  await expect(page.locator('[data-pos-guests]')).toHaveText(/^\d+$/);

  const invalidPrices = await page.locator('[data-pos-product]').evaluateAll((products) => products.filter((product) => {
    const text = product.querySelector('.pmd-pos-price')?.textContent || '';
    const numeric = Number(text.replace(/[^0-9.,-]/g, '').replace(',', '.'));
    return !Number.isFinite(numeric) || numeric <= 0;
  }).map((product) => product.textContent?.trim()));
  expect(invalidPrices, 'Visible menu keys must have a positive price').toEqual([]);

  await closeTable(page);
  await telemetry.assertHealthy();
});


test('safe local cart flow supports add, quantity, item note, table note and clear', async ({ page, telemetry }) => {
  await openFinal(page);
  await openTable(page, { filter: 'free' });

  const productName = await chooseProduct(page);
  const line = page.locator('[data-pos-line]').first();
  await expect(line).toContainText(productName);

  await line.locator('[data-pos-inc]').click();
  await expect(line.locator('.pmd-pos-qty b')).toHaveText('2');
  await line.locator('[data-pos-dec]').click();
  await expect(line.locator('.pmd-pos-qty b')).toHaveText('1');

  await line.locator('[data-pos-line-note]').fill('No onion · QA local draft');
  await page.locator('[data-pos-table-note]').fill('QA table note — do not send');

  await page.locator('[data-pos-guest-plus]').click();
  const guests = Number(await page.locator('[data-pos-guests]').textContent());
  expect(guests).toBeGreaterThanOrEqual(2);
  await page.locator('[data-pos-guest-minus]').click();

  const debug = await posDebug(page);
  expect(debug.cartLines).toBe(1);
  expect(debug.cartItems).toBe(1);
  expect(debug.newItemsTotal).toBeGreaterThan(0);
  expect(debug.submitting).toBe(false);

  await clearLocalCart(page);
  expect((await posDebug(page)).cartLines).toBe(0);

  await closeTable(page);
  await telemetry.assertHealthy({ maxLongTasks: 20 });
});


test('search, categories and grid/list controls remain functional', async ({ page, telemetry }) => {
  await openFinal(page);
  await openTable(page, { filter: 'free' });

  const firstProduct = page.locator('[data-pos-product]').first();
  const name = String(await firstProduct.locator('.pmd-pos-product-name').textContent()).trim();
  const searchTerm = name.slice(0, Math.min(5, name.length));

  await page.locator('[data-pos-search]').fill(searchTerm);
  await expect(page.locator('[data-pos-product]')).not.toHaveCount(0);
  await expect(page.locator('[data-pos-product]').first()).toContainText(new RegExp(searchTerm, 'i'));
  await page.locator('[data-pos-search]').fill('');

  const categories = page.locator('[data-pos-category]');
  if (await categories.count() > 1) {
    await categories.nth(1).click();
    await expect(categories.nth(1)).toHaveClass(/is-active/);
    await page.locator('[data-pos-category="all"]').click();
  }

  await page.locator('[data-pos-view="list"]').click();
  await expect(page.locator('[data-pos-menu]')).toHaveClass(/is-list/);
  await page.locator('[data-pos-view="grid"]').click();
  await expect(page.locator('[data-pos-menu]')).not.toHaveClass(/is-list/);

  await closeTable(page);
  await telemetry.assertHealthy();
});
