const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const base = process.env.PMD_BASE_URL || 'https://mimoza.paymydine.com';
const user = process.env.PMD_ADMIN_USER || '';
const pass = process.env.PMD_ADMIN_PASS || '';

const pages = [
  ['kds-reference', '/admin/kds_stations'],
  ['kds-create-reference', '/admin/kds_stations/create'],
  ['orders', '/admin/orders'],
  ['reservations', '/admin/reservations'],
  ['locations', '/admin/locations'],
  ['categories', '/admin/categories'],
  ['mealtimes', '/admin/mealtimes'],
  ['tables', '/admin/tables'],
  ['themes', '/admin/themes'],
  ['staffs', '/admin/staffs'],
  ['statuses', '/admin/statuses'],
  ['payments-methods', '/admin/payments?mode=methods'],
  ['coupons', '/admin/coupons'],
  ['pos-configs', '/admin/pos_configs'],
  ['coupons-create', '/admin/coupons/create'],
  ['categories-create', '/admin/categories/create'],
  ['locations-create', '/admin/locations/create'],
  ['mealtimes-create', '/admin/mealtimes/create'],
  ['tables-create', '/admin/tables/create']
];

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const loc = page.locator(selector).first();
    if (await loc.isVisible().catch(() => false)) return loc;
  }
  return null;
}

async function loginIfNeeded(page) {
  await page.goto(new URL('/admin', base).toString(), { waitUntil: 'domcontentloaded' });
  const password = await firstVisible(page, ['input[name="password"]', 'input[type="password"]']);
  if (!password) return;

  const username = await firstVisible(page, [
    'input[name="username"]',
    'input[name="email"]',
    'input[type="email"]',
    'input[type="text"]'
  ]);

  if (!username) throw new Error('Username input not found');
  await username.fill(user);
  await password.fill(pass);

  const submit = await firstVisible(page, ['button[type="submit"]', 'input[type="submit"]']);
  if (!submit) throw new Error('Submit not found');

  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => undefined),
    submit.click()
  ]);
}

function safe(s) {
  return s.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

(async () => {
  const outDir = path.resolve(__dirname, '../pmd-qa-results/admin-pages-baseline');
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();

  await loginIfNeeded(page);

  const report = ['# PMD Admin Pages Baseline', ''];

  for (const [name, route] of pages) {
    const url = new URL(route, base).toString();
    const errors = [];
    const failures = [];

    page.removeAllListeners('console');
    page.removeAllListeners('requestfailed');

    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('requestfailed', req => {
      failures.push(`${req.method()} ${req.url()} ${req.failure()?.errorText || ''}`);
    });

    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    const data = await page.evaluate(() => {
      const blocks = Array.from(document.querySelectorAll(
        '.pmd962-shell,.pmd962-stats,.pmd962-card,.pmd-menu-v160,.card,.panel,.box,form,.page-wrapper,[class*="hero"],[class*="stats"],[class*="card"]'
      )).map((el) => {
        const r = el.getBoundingClientRect();
        return {
          tag: el.tagName,
          className: String(el.className || '').slice(0, 180),
          text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 120),
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), right: Math.round(r.right) }
        };
      }).filter(x => x.rect.w > 100 && x.rect.h > 30).slice(0, 40);

      return {
        title: document.title,
        url: location.href,
        blocks
      };
    });

    await page.screenshot({ path: path.join(outDir, `${safe(name)}.png`), fullPage: true });
    fs.writeFileSync(path.join(outDir, `${safe(name)}.json`), JSON.stringify(data, null, 2));

    report.push(`## ${name}`);
    report.push(`URL: ${url}`);
    report.push(`Console errors: ${errors.length ? errors.join(' | ') : 'None'}`);
    report.push(`Network failures: ${failures.length ? failures.slice(0, 5).join(' | ') : 'None'}`);
    report.push('');
    report.push('First blocks:');
    data.blocks.slice(0, 8).forEach(b => {
      report.push(`- ${b.className || b.tag} | x:${b.rect.x} y:${b.rect.y} w:${b.rect.w} h:${b.rect.h} | ${b.text}`);
    });
    report.push('');
  }

  await browser.close();
  fs.writeFileSync(path.join(outDir, 'admin-pages-baseline.md'), report.join('\n'));
  console.log(`Report: ${path.join(outDir, 'admin-pages-baseline.md')}`);
})();
