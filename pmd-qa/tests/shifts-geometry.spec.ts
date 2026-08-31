import {expect, test} from '@playwright/test';

type Rect = {x: number; y: number; width: number; height: number} | null;
type Sample = {phase: string; classes: string[]; rects: Record<string, Rect>};

const selectors: Record<string, string> = {
  menu: '#pmd-side-menu2',
  wrapper: '.page-wrapper',
  content: '.page-content',
  shifts: '#pmd-shifts, .pmd-shifts',
  header: '.pmd-shifts__header, .pmd-shifts-final-toolbar',
  row: '.pmd-shifts-final-row',
};

test.describe('Shifts first-paint geometry', () => {
  test.skip(!process.env.PMD_BASE_URL, 'PMD_BASE_URL is required for authenticated visual QA.');

  test('collapsed shell remains stable through load', async ({page}) => {
    await page.addInitScript(({selectors}) => {
      const samples: Sample[] = [];
      const capture = (phase: string) => {
        const rects: Record<string, Rect> = {};
        for (const [name, selector] of Object.entries(selectors)) {
          const node = document.querySelector(selector);
          if (!node) {
            rects[name] = null;
            continue;
          }
          const rect = node.getBoundingClientRect();
          rects[name] = {x: rect.x, y: rect.y, width: rect.width, height: rect.height};
        }
        samples.push({phase, classes: [...document.documentElement.classList], rects});
      };
      Object.defineProperty(window, '__pmdShiftsGeometry', {value: samples});
      document.addEventListener('DOMContentLoaded', () => {
        capture('DOMContentLoaded');
        requestAnimationFrame(() => {
          capture('raf1');
          requestAnimationFrame(() => capture('raf2'));
        });
      }, {once: true});
      window.addEventListener('load', () => {
        capture('load');
        setTimeout(() => capture('load+250'), 250);
        setTimeout(() => capture('load+1000'), 1000);
      }, {once: true});
    }, {selectors});

    await page.goto('/admin/login');
    if (page.url().includes('/admin/login')) {
      await page.locator('input[name="username"]').fill(process.env.PMD_TEST_USERNAME || '');
      await page.locator('input[name="password"]').fill(process.env.PMD_TEST_PASSWORD || '');
      await page.locator('form').filter({has: page.locator('input[name="password"]')}).locator('button[type="submit"]').click();
    }

    const security = page.locator('#pmd-security-form, #pmd-workplace-form');
    if (await security.isVisible().catch(() => false)) {
      const value = process.env.PMD_TEST_SECOND_FACTOR;
      test.skip(!value, 'PMD_TEST_SECOND_FACTOR is required for this test account.');
      await security.locator('input[name="code"], input[name="recovery_code"]').fill(value!);
      await security.locator('button[type="submit"]').click();
    }

    await page.goto('/admin/shifts');
    await page.evaluate(() => localStorage.setItem('pmd.sideMenu2.state', 'collapsed'));
    await page.reload({waitUntil: 'load'});
    await page.waitForTimeout(1100);

    const samples = await page.evaluate(() => (window as any).__pmdShiftsGeometry as Sample[]);
    const visible = samples.filter(sample => sample.rects.wrapper && sample.rects.shifts && sample.rects.row);
    expect(visible.length).toBeGreaterThanOrEqual(4);

    for (const sample of visible) {
      expect(sample.classes).toContain('pmd-sm2-collapsed');
      expect(sample.classes).not.toContain('pmd-sm2-expanded');
    }

    const baseline = visible[0];
    const tolerance = 1;
    for (const sample of visible.slice(1)) {
      for (const name of Object.keys(selectors)) {
        const before = baseline.rects[name];
        const after = sample.rects[name];
        if (!before || !after) continue;
        for (const key of ['x', 'y', 'width', 'height'] as const) {
          expect(Math.abs(after[key] - before[key]), `${name}.${key}: ${baseline.phase} -> ${sample.phase}`).toBeLessThanOrEqual(tolerance);
        }
      }
    }

    await expect(page.locator('.page-content > #pmd-shifts, .page-content > .pmd-shifts')).toHaveCSS('animation-name', 'none');
    await expect(page.locator('#pmd-shifts, .pmd-shifts').first()).toHaveCSS('transform', 'none');
  });
});
