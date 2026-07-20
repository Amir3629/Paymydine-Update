const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const base = process.env.PMD_BASE_URL || 'https://mimoza.paymydine.com';
const user = process.env.PMD_ADMIN_USER || '';
const pass = process.env.PMD_ADMIN_PASS || '';

const pages = [
  ['menu-create', process.env.PMD_MENU_CREATE_PATH || '/admin/menus/create'],
  ['menu-edit', process.env.PMD_MENU_EDIT_PATH || '/admin/menus/edit/167'],
  ['settings', process.env.PMD_SETTINGS_PATH || '/admin/settings']
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

function safeName(v) {
  return v.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
}

(async () => {
  const outRoot = path.resolve(__dirname, '../pmd-qa-results/mobile-layout-diagnostic');
  fs.mkdirSync(outRoot, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

  await loginIfNeeded(page);

  for (const [name, pagePath] of pages) {
    const url = new URL(pagePath, base).toString();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => undefined);
    await page.waitForTimeout(6000);

    const data = await page.evaluate(() => {
      const pickSelectors = [
        'html',
        'body',
        '#layout-wrapper',
        '#page-wrapper',
        '.page-wrapper',
        '.main-wrapper',
        '.content-wrapper',
        '.content',
        '.container-fluid',
        '.navbar',
        '.navbar *',
        'header',
        '.sidebar',
        '#sidebar',
        '.side-nav',
        '.nav-sidebar',
        '.pmd-sidebar',
        '.pmd-admin-header-actions',
        '.pmd-admin-header-actions *',
        '.pmd-menu-clean-header',
        '.pmd-menu-form-shell',
        '.pmd-menu-form-actions',
        '.pmd-menu-form-actions *',
        'form',
        '.card',
        '.btn',
        'button',
        '[type="submit"]'
      ];

      const describe = (el, selector, index) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          selector,
          index,
          tag: el.tagName,
          id: el.id || '',
          className: String(el.className || '').slice(0, 220),
          text: String(el.innerText || '').replace(/\s+/g, ' ').slice(0, 160),
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
            overflow: cs.overflow,
            overflowX: cs.overflowX,
            width: cs.width,
            maxWidth: cs.maxWidth,
            marginLeft: cs.marginLeft,
            marginRight: cs.marginRight,
            paddingLeft: cs.paddingLeft,
            paddingRight: cs.paddingRight,
            zIndex: cs.zIndex,
            backgroundColor: cs.backgroundColor,
            borderRadius: cs.borderRadius
          }
        };
      };

      const selected = [];
      for (const selector of pickSelectors) {
        document.querySelectorAll(selector).forEach((el, index) => {
          if (index < 8) selected.push(describe(el, selector, index));
        });
      }

      const problemElements = Array.from(document.querySelectorAll('body *'))
        .map((el) => describe(el, 'AUTO_PROBLEM_SCAN', 0))
        .filter((x) => {
          const r = x.rect;
          return (
            r.width > 0 &&
            r.height > 0 &&
            (
              r.x < -2 ||
              r.right > window.innerWidth + 2 ||
              (r.y < 90 && r.right > window.innerWidth - 40) ||
              (r.y < 90 && r.x < 0)
            )
          );
        })
        .slice(0, 120);

      return {
        url: location.href,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth
        },
        hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
        selected,
        problemElements
      };
    });

    const jsonPath = path.join(outRoot, `${safeName(name)}-390x900.json`);
    const shotPath = path.join(outRoot, `${safeName(name)}-390x900.png`);

    fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2));
    await page.screenshot({ path: shotPath, fullPage: true });

    console.log(`Wrote ${jsonPath}`);
    console.log(`Wrote ${shotPath}`);
  }

  await browser.close();
})();
