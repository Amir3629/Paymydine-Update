import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '../src/fixtures.js';
import {
  openFinal,
  openTable,
  chooseProduct,
  clearLocalCart,
  closeTable,
  attachScreenshot,
  assertNoHorizontalOverflow,
} from '../src/waiter.js';


test('launcher is usable in light and dark mode without horizontal overflow', async ({ page, telemetry }, testInfo) => {
  await openFinal(page);

  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => window.PMDWaiterFinalV1.setTheme(value), theme);
    await expect(page.locator('[data-pmd-waiter-final-root]')).toHaveAttribute('data-theme', theme);
    await assertNoHorizontalOverflow(page);
    await attachScreenshot(page, testInfo, `${testInfo.project.name}-launcher-${theme}`);

    const colors = await page.locator('[data-pmd-waiter-final-root]').evaluate((root) => {
      const style = getComputedStyle(root);
      const card = root.querySelector('[data-final-open-table]');
      const cardStyle = card ? getComputedStyle(card) : null;
      return {
        background: style.backgroundColor,
        color: style.color,
        cardBackground: cardStyle?.backgroundColor || '',
        cardColor: cardStyle?.color || '',
      };
    });
    expect(colors.background).not.toBe(colors.color);
    expect(colors.cardBackground).not.toBe(colors.cardColor);
  }

  const accessibility = await new AxeBuilder({ page })
    .include('[data-pmd-waiter-final-root]')
    .analyze();
  const serious = accessibility.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact));
  expect(serious, 'Critical/serious launcher accessibility violations').toEqual([]);

  await telemetry.assertHealthy({ maxLongTasks: 24 });
});


test('ordering remains usable on tablet and phone with a reachable cart', async ({ page, telemetry }, testInfo) => {
  await openFinal(page);
  await openTable(page, { filter: 'free' });
  await assertNoHorizontalOverflow(page, '[data-pmd-pos-root]');

  await chooseProduct(page);

  if (testInfo.project.name === 'phone') {
    const mobileBar = page.locator('[data-pos-mobile-cart]');
    await expect(mobileBar).toBeVisible();
    await mobileBar.click();
    await expect(page.locator('[data-pos-cart]')).toHaveClass(/is-mobile-open/);
    await expect(page.locator('[data-pos-close-cart]')).toBeVisible();
  } else {
    await expect(page.locator('[data-pos-cart]')).toBeVisible();
  }

  const actionable = page.locator('[data-pmd-pos-root] button:visible');
  const undersized = await actionable.evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { text: button.textContent?.trim(), width: rect.width, height: rect.height };
  }).filter((row) => row.width < 32 || row.height < 32));
  expect(undersized, 'Visible POS controls smaller than 32×32').toEqual([]);

  await attachScreenshot(page, testInfo, `${testInfo.project.name}-ordering`);
  await clearLocalCart(page);
  await closeTable(page);
  await telemetry.assertHealthy({ maxLongTasks: 28 });
});
