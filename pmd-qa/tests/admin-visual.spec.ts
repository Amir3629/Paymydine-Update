import { test, Page } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { loginIfNeeded } from './admin-auth.setup';

type Finding = {
  page: string;
  url: string;
  viewport: string;
  screenshots: string[];
  consoleErrors: string[];
  pageErrors: string[];
  networkFailures: string[];
  missingSelectors: string[];
  computedStyles: Record<string, unknown>;
};

const resultsRoot = path.resolve(__dirname, '../pmd-qa-results');
const reportPath = path.join(resultsRoot, 'pmd-admin-visual-report.md');
const selectors = ['header', '.navbar', '.page-header', '.toolbar', '.btn', 'button', 'input', 'select', 'textarea', '.card', 'form', '[type="submit"]', '.form-control', '.dropdown-menu', '[data-control]', '.media-manager', '.field-mediafinder', 'img'];
const viewports = [
  { width: 1600, height: 1000 },
  { width: 1440, height: 900 },
  { width: 1024, height: 900 },
  { width: 390, height: 900 }
];
const delays = [200, 1000, 3000, 6000];

const pageTargets = () => {
  const env = process.env;
  return [
    { name: 'admin', path: '/admin' },
    { name: 'menu-create', path: env.PMD_MENU_CREATE_PATH || '/admin/menus/create' },
    { name: 'menu-edit', path: env.PMD_MENU_EDIT_PATH || '/admin/menus/edit/167' },
    { name: 'kds-create', path: env.PMD_KDS_CREATE_PATH || '' },
    { name: 'kds-edit', path: env.PMD_KDS_EDIT_PATH || '' },
    { name: 'settings', path: env.PMD_SETTINGS_PATH || '/admin' }
  ].filter((item) => item.path);
};

async function collectComputedStyles(page: Page) {
  return page.evaluate((selList) => {
    const out: Record<string, unknown> = {};
    for (const selector of selList) {
      const el = document.querySelector(selector) as HTMLElement | null;
      if (!el) continue;
      const s = window.getComputedStyle(el);
      out[selector] = {
        display: s.display,
        position: s.position,
        width: s.width,
        height: s.height,
        padding: s.padding,
        margin: s.margin,
        border: s.border,
        borderRadius: s.borderRadius,
        backgroundColor: s.backgroundColor,
        color: s.color,
        fontSize: s.fontSize,
        lineHeight: s.lineHeight
      };
    }
    return out;
  }, selectors);
}

function safeName(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

test.describe('PMD admin visual QA foundation', () => {
  for (const target of pageTargets()) {
    for (const viewport of viewports) {
      test(`${target.name} ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
        fs.mkdirSync(resultsRoot, { recursive: true });
        const consoleErrors: string[] = [];
        const pageErrors: string[] = [];
        const networkFailures: string[] = [];
        page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
        page.on('pageerror', (err) => pageErrors.push(err.message));
        page.on('requestfailed', (request) => networkFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText || ''}`));

        await page.setViewportSize(viewport);
        await loginIfNeeded(page);
        const url = new URL(target.path, process.env.PMD_BASE_URL || 'http://localhost').toString();
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('networkidle').catch(() => undefined);

        const shotDir = path.join(resultsRoot, 'screenshots', safeName(target.name), `${viewport.width}x${viewport.height}`);
        fs.mkdirSync(shotDir, { recursive: true });
        const screenshots: string[] = [];
        for (const delay of delays) {
          await page.waitForTimeout(delay);
          const full = path.join(shotDir, `full-${delay}ms.png`);
          await page.screenshot({ path: full, fullPage: true });
          screenshots.push(path.relative(resultsRoot, full));
          const top = path.join(shotDir, `top-${delay}ms.png`);
          await page.locator('body').screenshot({ path: top }).catch(() => undefined);
          if (fs.existsSync(top)) screenshots.push(path.relative(resultsRoot, top));
          for (const selector of ['form', '.card', '.page-header', '.toolbar', 'header']) {
            const loc = page.locator(selector).first();
            if (await loc.isVisible().catch(() => false)) {
              const section = path.join(shotDir, `${safeName(selector)}-${delay}ms.png`);
              await loc.screenshot({ path: section }).catch(() => undefined);
              if (fs.existsSync(section)) screenshots.push(path.relative(resultsRoot, section));
              break;
            }
          }
        }

        const missingSelectors: string[] = [];
        for (const selector of selectors) {
          if ((await page.locator(selector).count().catch(() => 0)) === 0) missingSelectors.push(selector);
        }
        const finding: Finding = {
          page: target.name,
          url,
          viewport: `${viewport.width}x${viewport.height}`,
          screenshots,
          consoleErrors,
          pageErrors,
          networkFailures,
          missingSelectors,
          computedStyles: await collectComputedStyles(page)
        };
        await testInfo.attach('pmd-finding', { body: JSON.stringify(finding, null, 2), contentType: 'application/json' });

        const md = [`## ${finding.page} — ${finding.viewport}`, `URL: ${finding.url}`, '', 'Screenshots:', ...finding.screenshots.map((s) => `- ${s}`), '', `Console errors: ${finding.consoleErrors.length ? finding.consoleErrors.join('\n') : 'None'}`, '', `Page errors: ${finding.pageErrors.length ? finding.pageErrors.join('\n') : 'None'}`, '', `Network failures: ${finding.networkFailures.length ? finding.networkFailures.join('\n') : 'None'}`, '', `Missing selectors: ${finding.missingSelectors.join(', ') || 'None'}`, '', 'Computed style summary:', '```json', JSON.stringify(finding.computedStyles, null, 2), '```', ''].join('\n');
        fs.appendFileSync(reportPath, md);
      });
    }
  }
});
