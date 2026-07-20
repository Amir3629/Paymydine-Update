import { test, expect } from '../src/fixtures.js';
import { qaConfig } from '../src/config.js';
import { openFinal, openPaymentForExistingOrder, closePayment, closeTable, posDebug } from '../src/waiter.js';


test('payment center loads a real primary summary and remains open', async ({ page, telemetry }) => {
  await openFinal(page);
  await openPaymentForExistingOrder(page);

  const debug = await posDebug(page);
  expect(debug.paymentOpen).toBe(true);
  expect(debug.activeOrderId).toBeTruthy();
  expect(debug.paymentRemaining).toBeGreaterThan(0);

  await expect(page.locator('[data-pos-payment-modal]')).toHaveClass(/is-show/);
  await expect(page.locator('[data-pos-payment-subtitle]')).toContainText(/Order #/i);
  await expect(page.locator('[data-pos-payment-totals]')).toContainText(/Collect now/i);
  await expect(page.locator('[data-pos-payment-history]')).toBeVisible();

  await page.waitForTimeout(3500);
  await expect(page.locator('[data-pos-payment-modal]')).toHaveClass(/is-show/);
  expect((await posDebug(page)).paymentOpen).toBe(true);

  await closePayment(page);
  await closeTable(page);
  await telemetry.assertHealthy({ maxLongTasks: 24 });
});


test('split bill exposes full, equal, item and third customer-parity strategy', async ({ page, telemetry }) => {
  await openFinal(page);
  await openPaymentForExistingOrder(page);

  const modes = await page.locator('[data-split-mode]').evaluateAll((buttons) =>
    buttons.map((button) => button.getAttribute('data-split-mode')).filter(Boolean)
  );

  expect(modes).toContain('full');
  expect(modes).toContain('equal');
  expect(modes).toContain('items');
  expect(modes.some((mode) => ['custom', 'shares'].includes(mode))).toBe(true);

  for (const mode of modes) {
    const button = page.locator(`[data-split-mode="${mode}"]`);
    await button.click();
    await expect(button).toHaveClass(/is-active/);
    await expect(page.locator('[data-pos-split-panel]')).not.toBeEmpty();

    if (mode === 'equal') {
      const plus = page.locator('[data-equal-plus]');
      if (await plus.count()) await plus.click();
    }

    if (mode === 'items') {
      const quantity = page.locator('[data-pay-item]').first();
      if (await quantity.count()) {
        const max = Number(await quantity.getAttribute('max'));
        if (max > 0) await quantity.fill('1');
      }
    }

    if (mode === 'custom') {
      const custom = page.locator('[data-custom-payment]');
      if (await custom.count()) await custom.fill('1.00');
    }
  }

  await closePayment(page);
  await closeTable(page);
  await telemetry.assertHealthy({ maxLongTasks: 24 });
});


test('payment methods, tip, cash change and external-terminal safeguards work without collecting money', async ({ page, telemetry }) => {
  await openFinal(page);
  await openPaymentForExistingOrder(page);

  const methods = page.locator('[data-payment-method]');
  expect(await methods.count()).toBeGreaterThanOrEqual(2);

  const cash = page.locator('[data-payment-method="cash"]');
  await cash.click();
  await expect(cash).toHaveClass(/is-active/);

  const cashInput = page.locator('[data-pos-cash-received]');
  const collectText = await page.locator('[data-pos-payment-totals]').textContent();
  const collectMatch = String(collectText).match(/Collect now\s*[^0-9]*([0-9]+(?:[.,][0-9]{1,2})?)/i);
  if (collectMatch) {
    const due = Number(collectMatch[1].replace(',', '.'));
    await cashInput.fill((due + 10).toFixed(2));
    await expect(page.locator('[data-pos-change-box]')).toBeVisible();
  }

  await page.locator('[data-tip-percent="5"]').click();
  await expect(page.locator('[data-tip-percent="5"]')).toHaveClass(/is-active/);
  await page.locator('[data-tip-percent="10"]').click();
  await page.locator('[data-tip-percent="0"]').click();

  const external = page.locator('[data-payment-method="external_terminal"]');
  if (await external.count()) {
    await external.click();
    await expect(page.locator('[data-pos-reference-field]')).toBeVisible();
    await expect(page.locator('[data-pos-external-confirm-row]')).toBeVisible();
    await expect(page.locator('[data-pos-pay-button]')).toBeDisabled();
  }

  const online = methods.filter({ hasText: /Card|PayPal|Apple Pay|Google Pay|Wero/i }).first();
  if (await online.count()) {
    await online.click();
    await expect(page.locator('[data-pos-online-box]')).toBeVisible();
    await expect(page.locator('[data-pos-pay-button]')).toContainText(/secure checkout/i);
  }

  await page.locator('[data-pos-refresh-payment]').click();
  await expect(page.locator('[data-pos-payment-modal]')).toHaveClass(/is-show/);

  await closePayment(page);
  await closeTable(page);
  await telemetry.assertHealthy({ maxLongTasks: 28 });
});


test('coupon validation is available and is only executed when explicitly enabled', async ({ page, telemetry }) => {
  await openFinal(page);
  await openPaymentForExistingOrder(page);

  await expect(page.locator('[data-pos-coupon-code]')).toBeVisible();
  await expect(page.locator('[data-pos-coupon-apply]')).toBeVisible();

  if (qaConfig.allowCouponValidation && qaConfig.coupon) {
    await page.locator('[data-pos-coupon-code]').fill(qaConfig.coupon);
    await page.locator('[data-pos-coupon-apply]').click();
    await expect(page.locator('[data-pos-coupon-result]')).not.toBeEmpty({ timeout: 20_000 });
  }

  await closePayment(page);
  await closeTable(page);
  await telemetry.assertHealthy({ maxLongTasks: 24 });
});
