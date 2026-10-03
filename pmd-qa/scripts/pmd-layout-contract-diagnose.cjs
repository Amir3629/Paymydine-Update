const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const base = process.env.PMD_BASE_URL || 'https://mimoza.paymydine.com';
const user = process.env.PMD_ADMIN_USER || '';
const pass = process.env.PMD_ADMIN_PASS || '';

const pages = [
  ['kds-reference', process.env.PMD_KDS_CREATE_PATH || '/admin/kds_stations'],
  ['menu-create', process.env.PMD_MENU_CREATE_PATH || '/admin/menus/create'],
  ['menu-edit', process.env.PMD_MENU_EDIT_PATH || '/admin/menus/edit/167'],
  ['settings', process.env.PMD_SETTINGS_PATH || '/admin/settings']
];

const viewports = [
  [1600, 1000],
  [1440, 900],
  [1024, 900]
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

  if (!user || !pass) throw new Error('Missing PMD_ADMIN_USER or PMD_ADMIN_PASS');

  const username = await firstVisible(page, [
    'input[name="username"]',
    'input[name="email"]',
    'input[type="email"]',
    'input[type="text"]'
  ]);

  if (!username) throw new Error('Login form found, but username input not found.');

  await username.fill(user);
  await password.fill(pass);

  const submit = await firstVisible(page, [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'button:has-text("ورود")'
  ]);

  if (!submit) throw new Error('Login submit not found.');

  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => undefined),
    submit.click()
  ]);
}

function safeName(value) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
}

async function collectLayout(page) {
  return page.evaluate(() => {
    const pick = [
      'html',
      'body',
      '.navbar',
      'header',
      '.page-wrapper',
      '.container-fluid',
      '.pmd-menu-clean-header',
      '.pmd-menu-form-shell',
      '.pmd-menu-form-grid',
      '.pmd-menu-form-actions',
      '.pmd-admin-header-actions',
      '.pmd-menu-preview-card',
      '.pmd-menu-card',
      '.pmd-menu-section',
      '.card',
      '.panel',
      '.box',
      'form',
      '[class*="kds"]',
      '[class*="station"]',
      '[class*="setting"]'
    ];

    function info(el, selector, index) {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        selector,
        index,
        tag: el.tagName,
        id: el.id || '',
        className: String(el.className || '').slice(0, 220),
        text: (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 160),
        rect: {
          x: Math.round(r.x),
          y: Math.round(r.y),
          width: Math.round(r.width),
          height: Math.round(r.height),
          right: Math.round(r.right),
          bottom: Math.round(r.bottom)
        },
        style: {
          display: cs.display,
          position: cs.position,
          margin: cs.margin,
          padding: cs.padding,
          gap: cs.gap,
          borderRadius: cs.borderRadius,
          backgroundColor: cs.backgroundColor,
          boxShadow: cs.boxShadow,
          overflow: cs.overflow,
          overflowX: cs.overflowX,
          gridTemplateColumns: cs.gridTemplateColumns
        }
      };
    }

    const selected = [];
    for (const selector of pick) {
      document.querySelectorAll(selector).forEach((el, index) => {
        if (index > 8) return;
        const r = el.getBoundingClientRect();
        const visible = r.width > 0 && r.height > 0;
        if (!visible) return;
        selected.push(info(el, selector, index));
      });
    }

    const allBlocks = Array.from(document.querySelectorAll('main, section, article, form, .card, .panel, .box, .well, [class*="card"], [class*="panel"], [class*="section"], [class*="header"]'))
      .map((el, index) => info(el, 'auto-block', index))
      .filter(item => item.rect.width >= 180 && item.rect.height >= 36)
      .sort((a, b) => (a.rect.y - b.rect.y) || (a.rect.x - b.rect.x))
      .slice(0, 80);

    const pageWrapper = document.querySelector('.page-wrapper');
    const pr = pageWrapper ? pageWrapper.getBoundingClientRect() : null;
    const firstUseful = allBlocks.find(item => item.rect.y >= 60 && item.rect.width >= 300);

    return {
      url: location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        documentScrollWidth: document.documentElement.scrollWidth,
        bodyScrollWidth: document.body.scrollWidth
      },
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
      metrics: {
        pageWrapper: pr ? {
          x: Math.round(pr.x),
          y: Math.round(pr.y),
          width: Math.round(pr.width),
          height: Math.round(pr.height),
          right: Math.round(pr.right),
          bottom: Math.round(pr.bottom)
        } : null,
        firstUsefulBlock: firstUseful ? firstUseful.rect : null,
        topGapFromViewport: firstUseful ? Math.round(firstUseful.rect.y) : null,
        leftGapFromViewport: firstUseful ? Math.round(firstUseful.rect.x) : null,
        rightGapFromViewport: firstUseful ? Math.round(window.innerWidth - firstUseful.rect.right) : null
      },
      selected,
      allBlocks
    };
  });
}

(async () => {
  const outDir = path.resolve(__dirname, '../pmd-qa-results/layout-contract-diagnostic');
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  await loginIfNeeded(page);

  const results = [];

  for (const [w, h] of viewports) {
    await page.setViewportSize({ width: w, height: h });

    for (const [name, route] of pages) {
      const url = new URL(route, base).toString();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => undefined);
      await page.waitForTimeout(3000);

      const data = await collectLayout(page);
      data.name = name;
      data.viewportLabel = `${w}x${h}`;

      const stem = `${safeName(name)}-${w}x${h}`;
      const jsonPath = path.join(outDir, `${stem}.json`);
      const pngPath = path.join(outDir, `${stem}.png`);

      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
      await page.screenshot({ path: pngPath, fullPage: true });

      results.push(data);
      console.log(`Wrote ${jsonPath}`);
      console.log(`Wrote ${pngPath}`);
    }
  }

  await browser.close();

  const lines = [];
  lines.push('# PMD Layout Contract Diagnostic v1');
  lines.push('');
  for (const r of results) {
    lines.push(`## ${r.name} — ${r.viewportLabel}`);
    lines.push(`URL: ${r.url}`);
    lines.push(`Horizontal overflow: ${r.hasHorizontalOverflow}`);
    lines.push('');
    lines.push('Metrics:');
    lines.push('```json');
    lines.push(JSON.stringify(r.metrics, null, 2));
    lines.push('```');
    lines.push('');
    lines.push('First useful blocks:');
    for (const b of r.allBlocks.slice(0, 8)) {
      lines.push(`- ${b.tag}.${b.className || '(no-class)'} | x:${b.rect.x} y:${b.rect.y} w:${b.rect.width} h:${b.rect.height} | ${b.text.slice(0, 80)}`);
    }
    lines.push('');
  }

  fs.writeFileSync(path.join(outDir, 'layout-contract-v1-summary.md'), lines.join('\n'));
  console.log(`Summary: ${path.join(outDir, 'layout-contract-v1-summary.md')}`);
})();
