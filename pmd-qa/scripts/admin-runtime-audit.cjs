#!/usr/bin/env node
'use strict';

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const QA_ROOT = path.resolve(__dirname, '..');
const OUT_ROOT = path.join(QA_ROOT, 'pmd-qa-results', 'admin-runtime-stabilization');
const DEFAULT_BASE_URL = 'https://mimoza.paymydine.com';

const TARGET_ROUTES = [
  '/admin/reservations',
  '/admin/orders',
  '/admin/coupons',
  '/admin/locations',
  '/admin/menus',
  '/admin/mealtimes',
  '/admin/tables',
  '/admin/themes',
  '/admin/settings',
  '/admin/dashboard2',
  '/admin/dashboard',
  '/admin/dashboardwaiternew'
];

const VIEWPORTS = [
  { label: '1920x1080', width: 1920, height: 1080 },
  { label: '1536x960', width: 1536, height: 960 },
  { label: '1366x768', width: 1366, height: 768 },
  { label: '1024x768', width: 1024, height: 768 },
  { label: '834x1194', width: 834, height: 1194 },
  { label: '768x1024', width: 768, height: 1024 },
  { label: '430x932', width: 430, height: 932 },
  { label: '390x844', width: 390, height: 844 },
  { label: '360x800', width: 360, height: 800 }
];

const SCENARIOS = [
  'cold',
  'reload',
  'fresh-context',
  'sidebar-expanded',
  'sidebar-collapsed',
  'persisted-sidebar',
  'back-forward',
  'fresh-storage',
  'persisted-storage',
  'slow',
  'cpu'
];

const SAMPLE_MS = [0, 50, 100, 250, 500, 1000, 2000];
const HIGH_FREQUENCY_MS = 50;
const HIGH_FREQUENCY_WINDOW_MS = 3000;

const destructiveText = /delete|remove|save|submit|create|payment|pay|refund|void|confirm|approve|cancel|send to kitchen|edit|حذف|ذخیره|پرداخت|تایید|ارسال|ویرایش|ثبت/i;
const safeToggleText = /toggle|filter|search|collapse|expand|menu|sidebar|drawer|close|open|جستجو|فیلتر|باز|بستن/i;

function parseList(value, allowed, mapper = (item) => item) {
  if (!value) return allowed;
  const wanted = value.split(',').map((item) => item.trim()).filter(Boolean);
  return allowed.filter((item) => wanted.includes(mapper(item)) || wanted.includes(item.label));
}

function config() {
  const routeArg = process.argv.find((arg) => arg.startsWith('--route='))?.split('=')[1];
  const routesFromEnv = parseList(process.env.PMD_AUDIT_ROUTES || routeArg, TARGET_ROUTES, (route) => route);
  const maxRoutes = Number(process.env.PMD_AUDIT_MAX_ROUTES || 0);

  return {
    baseURL: process.env.PMD_BASE_URL || DEFAULT_BASE_URL,
    username: process.env.PMD_USERNAME || '',
    password: process.env.PMD_PASSWORD || '',
    headed: process.argv.includes('--headed'),
    routes: maxRoutes ? routesFromEnv.slice(0, maxRoutes) : routesFromEnv,
    viewports: parseList(process.env.PMD_AUDIT_VIEWPORTS, VIEWPORTS, (viewport) => viewport.label),
    scenarios: parseList(process.env.PMD_AUDIT_SCENARIOS, SCENARIOS, (scenario) => scenario),
    concurrency: Math.max(1, Number(process.env.PMD_AUDIT_CONCURRENCY || 1)),
    executablePath: process.env.PMD_CHROMIUM_EXECUTABLE_PATH || findSystemChromium()
  };
}

function findSystemChromium() {
  for (const bin of ['chromium', 'chromium-browser', 'google-chrome', 'google-chrome-stable']) {
    try {
      return execFileSync('which', [bin], { encoding: 'utf8' }).trim() || undefined;
    } catch (_) {
      // keep looking
    }
  }
  return undefined;
}

function mkdirp(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function writeJson(file, data) {
  mkdirp(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function routeSlug(route) {
  return route.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9_.-]+/gi, '-') || 'root';
}

function relativeArtifact(file) {
  return path.relative(OUT_ROOT, file).split(path.sep).join('/');
}

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.isVisible().catch(() => false)) return locator;
  }
  return null;
}

async function loginIfNeeded(page, cfg) {
  await page.goto(new URL('/admin', cfg.baseURL).toString(), { waitUntil: 'domcontentloaded' });
  const passwordField = await firstVisible(page, ['input[name="password"]', 'input[type="password"]']);
  if (!passwordField) return { authenticated: true, loginRequired: false };
  if (!cfg.username || !cfg.password) {
    throw new Error('Login form detected. Set PMD_USERNAME and PMD_PASSWORD; credentials must not be hardcoded.');
  }

  const usernameField = await firstVisible(page, [
    'input[name="username"]',
    'input[name="email"]',
    'input[type="email"]',
    'input[type="text"]'
  ]);
  if (!usernameField) throw new Error('Login form detected, but username input was not found.');

  await usernameField.fill(cfg.username);
  await passwordField.fill(cfg.password);

  const submit = await firstVisible(page, [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Login")',
    'button:has-text("Sign in")',
    'button:has-text("ورود")'
  ]);
  if (!submit) throw new Error('Login form detected, but submit button was not found.');

  await Promise.all([
    page.waitForLoadState('networkidle').catch(() => undefined),
    submit.click()
  ]);
  return { authenticated: true, loginRequired: true };
}

function attachCollectors(page, audit) {
  page.on('console', (message) => {
    const item = { type: message.type(), text: message.text(), location: message.location() };
    if (message.type() === 'error') audit.consoleErrors.push(item);
    if (['warning', 'warn'].includes(message.type())) audit.consoleWarnings.push(item);
  });
  page.on('pageerror', (error) => audit.pageErrors.push(error.message));
  page.on('request', (request) => audit.requests.push({ at: Date.now(), url: request.url(), method: request.method(), resourceType: request.resourceType() }));
  page.on('requestfailed', (request) => audit.failedRequests.push({ at: Date.now(), url: request.url(), method: request.method(), failure: request.failure()?.errorText || '' }));
  page.on('response', (response) => audit.responses.push({ at: Date.now(), url: response.url(), status: response.status(), resourceType: response.request().resourceType() }));
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) audit.navigationRedirects.push({ at: Date.now(), url: frame.url() });
  });
}

async function startObservers(page) {
  await page.addInitScript(() => {
    window.__pmdRuntimeAudit = { classChanges: [], mutations: [], longTasks: [], layoutShifts: [] };
    const audit = window.__pmdRuntimeAudit;
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) audit.longTasks.push({ name: entry.name, startTime: entry.startTime, duration: entry.duration });
      }).observe({ entryTypes: ['longtask'] });
    } catch (_) {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) audit.layoutShifts.push({ startTime: entry.startTime, value: entry.value, hadRecentInput: entry.hadRecentInput });
      }).observe({ type: 'layout-shift', buffered: true });
    } catch (_) {}
    addEventListener('DOMContentLoaded', () => {
      for (const node of [document.documentElement, document.body]) {
        let previousClass = node.className;
        new MutationObserver(() => {
          if (node.className !== previousClass) {
            audit.classChanges.push({ target: node.tagName, from: previousClass, to: node.className, at: performance.now() });
            previousClass = node.className;
          }
        }).observe(node, { attributes: true, attributeFilter: ['class'] });
      }
      const observer = new MutationObserver((mutations) => {
        audit.mutations.push(...mutations.slice(0, 100).map((mutation) => ({
          at: performance.now(),
          type: mutation.type,
          target: mutation.target.nodeName,
          added: mutation.addedNodes.length,
          removed: mutation.removedNodes.length,
          attributeName: mutation.attributeName || null
        })));
      });
      observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      setTimeout(() => observer.disconnect(), 5000);
    });
  });
}

async function collectDomSignature(page) {
  return page.evaluate(() => {
    const selectors = {
      page: 'main,#page-wrapper,.page-wrapper,.content-wrapper,.container-fluid,[class*="workspace"],[class*="content"]',
      sidebar: 'aside,#sidebar,.sidebar,.side-nav,.nav-sidebar,[class*="sidebar"],[class*="sidenav"]',
      floor: '[id*="floor"],[class*="floor"],[id*="reservation"],[class*="reservation"]',
      modalToastWorkspace: '.modal,.toast,[role="dialog"],[class*="modal"],[class*="toast"],[class*="workspace"]'
    };

    const rectOf = (element) => {
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        area: Math.round(Math.max(0, rect.width) * Math.max(0, rect.height))
      };
    };

    const describe = (element, selector) => {
      const style = getComputedStyle(element);
      const rect = rectOf(element);
      return {
        selector,
        tag: element.tagName,
        id: element.id || '',
        classes: String(element.className || '').slice(0, 240),
        text: String(element.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 180),
        rect,
        zIndex: style.zIndex,
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        position: style.position,
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0
      };
    };

    const groups = Object.fromEntries(Object.entries(selectors).map(([name, selector]) => {
      const roots = Array.from(document.querySelectorAll(selector)).map((element) => describe(element, selector)).filter((item) => item.visible);
      roots.sort((a, b) => b.rect.area - a.rect.area);
      return [name, roots];
    }));

    const ids = {};
    for (const element of Array.from(document.querySelectorAll('[id]'))) ids[element.id] = (ids[element.id] || 0) + 1;
    const duplicateIds = Object.entries(ids).filter(([, count]) => count > 1).map(([id, count]) => ({ id, count }));

    const scripts = Array.from(document.querySelectorAll('script[src]')).map((element) => element.src);
    const stylesheets = Array.from(document.querySelectorAll('link[rel~="stylesheet"][href]')).map((element) => element.href);
    const assetDuplicates = (urls) => Object.entries(urls.reduce((acc, url) => {
      acc[url] = (acc[url] || 0) + 1;
      return acc;
    }, {})).filter(([, count]) => count > 1).map(([url, count]) => ({ url, count }));
    const normalizeAsset = (url) => url.replace(/[?&](v|ver|version|_v|cache|t|m)=[^&]+/ig, '').replace(/([.-])\d{6,}(?=\.)/g, '$1VERSION');
    const variants = Object.values([...scripts, ...stylesheets].reduce((acc, url) => {
      const key = normalizeAsset(url);
      acc[key] = acc[key] || [];
      acc[key].push(url);
      return acc;
    }, {})).filter((items) => new Set(items).size > 1);

    const sidebarRoot = groups.sidebar[0] || null;
    const pageRoot = groups.page[0] || null;
    const floorRoot = groups.floor[0] || null;

    return {
      at: performance.now(),
      url: location.href,
      title: document.title,
      htmlClass: document.documentElement.className,
      bodyClass: document.body.className,
      widths: {
        inner: window.innerWidth,
        document: document.documentElement.scrollWidth,
        body: document.body.scrollWidth
      },
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 2,
      loadedScripts: scripts,
      loadedStylesheets: stylesheets,
      duplicateAssetUrls: [...assetDuplicates(scripts), ...assetDuplicates(stylesheets)],
      cacheVersionVariants: variants,
      inlineScriptCount: document.querySelectorAll('script:not([src])').length,
      iframes: Array.from(document.querySelectorAll('iframe')).map((element) => ({ src: element.src, id: element.id, classes: String(element.className || ''), rect: rectOf(element) })),
      duplicateIds,
      roots: groups,
      largestVisible: { page: pageRoot, sidebar: sidebarRoot, floor: floorRoot },
      metrics: {
        sidebarWidth: sidebarRoot?.rect.width || 0,
        pageLeftOffset: pageRoot?.rect.x || 0,
        floorArea: floorRoot?.rect.area || 0
      },
      storage: {
        localStorageKeys: Object.keys(localStorage).filter((key) => /sidebar|collapse|menu|nav|pmd|admin/i.test(key)),
        sessionStorageKeys: Object.keys(sessionStorage).filter((key) => /sidebar|collapse|menu|nav|pmd|admin/i.test(key))
      },
      runtime: window.__pmdRuntimeAudit || null
    };
  });
}

async function captureTimeline(page, dir, scenario, audit) {
  const start = Date.now();
  const highFrequency = [];
  let nextScreenshotIndex = 0;

  while (Date.now() - start <= HIGH_FREQUENCY_WINDOW_MS) {
    const elapsed = Date.now() - start;
    const signature = await collectDomSignature(page).catch((error) => ({ error: error.message, at: elapsed }));
    signature.elapsedMs = elapsed;
    highFrequency.push(signature);

    if (nextScreenshotIndex < SAMPLE_MS.length && elapsed >= SAMPLE_MS[nextScreenshotIndex]) {
      const sampleMs = SAMPLE_MS[nextScreenshotIndex];
      const screenshotPath = path.join(dir, 'screenshots', `${scenario}-${sampleMs}ms.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => undefined);
      audit.screenshots.push(relativeArtifact(screenshotPath));
      nextScreenshotIndex += 1;
    }
    await page.waitForTimeout(HIGH_FREQUENCY_MS);
  }

  const timelinePath = path.join(dir, 'timeline', `${scenario}-dom-timeline.json`);
  writeJson(timelinePath, highFrequency);
  audit.timeline.push(relativeArtifact(timelinePath));
  audit.authorityTransitionTimeline = buildAuthorityTransitions(highFrequency);
  audit.metrics = calculateTimelineMetrics(highFrequency);
}

function rootKey(root) {
  if (!root) return 'none';
  return [root.tag, root.id, root.classes].filter(Boolean).join('#').slice(0, 180);
}

function buildAuthorityTransitions(samples) {
  const transitions = [];
  let previous = null;
  for (const sample of samples) {
    const authority = rootKey(sample.largestVisible?.floor || sample.largestVisible?.page);
    if (authority !== previous) {
      transitions.push({ atMs: sample.elapsedMs || 0, authority });
      previous = authority;
    }
  }
  return transitions;
}

function calculateTimelineMetrics(samples) {
  const valid = samples.filter((sample) => !sample.error);
  const firstContent = valid.find((sample) => sample.largestVisible?.page || sample.largestVisible?.floor);
  const sidebarWidths = valid.map((sample) => sample.metrics?.sidebarWidth || 0);
  const pageOffsets = valid.map((sample) => sample.metrics?.pageLeftOffset || 0);
  const shifts = valid.flatMap((sample) => sample.runtime?.layoutShifts || []).filter((shift) => !shift.hadRecentInput);
  const lastTransition = buildAuthorityTransitions(valid).at(-1);
  return {
    firstContentfulApplicationFrameMs: firstContent?.elapsedMs ?? null,
    visibleAuthorityChanges: Math.max(0, buildAuthorityTransitions(valid).length - 1),
    timeUntilVisualStabilityMs: lastTransition?.atMs ?? null,
    largestLayoutShift: shifts.reduce((max, shift) => Math.max(max, shift.value || 0), 0),
    sidebarWidthChanges: uniqueNumberChanges(sidebarWidths),
    pageContentLeftOffsetChanges: uniqueNumberChanges(pageOffsets)
  };
}

function uniqueNumberChanges(values) {
  return [...new Set(values.map((value) => Math.round(value)))].filter((value) => value > 0);
}

async function inventoryControls(page) {
  return page.evaluate((destructivePattern, togglePattern) => {
    const destructive = new RegExp(destructivePattern, 'i');
    const toggle = new RegExp(togglePattern, 'i');
    return Array.from(document.querySelectorAll('a,button,input,select,[role="button"]')).map((element, index) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const text = String(element.innerText || element.value || element.getAttribute('aria-label') || element.getAttribute('title') || '').replace(/\s+/g, ' ').trim();
      const href = element.href || element.getAttribute('href') || '';
      const label = `${text} ${href}`.trim();
      let classification = 'unknown';
      if (destructive.test(label)) classification = 'destructive';
      else if (element.tagName === 'A' && href && href.includes('/admin/') && !href.includes('/edit') && !href.includes('/create')) classification = 'safe navigation';
      else if (toggle.test(label) || element.getAttribute('aria-expanded') !== null || element.dataset.toggle || element.dataset.bsToggle) classification = 'safe toggle';
      else if (element.tagName === 'SELECT' || /filter|search|جستجو|فیلتر/i.test(label)) classification = 'safe filter';
      return {
        index,
        tag: element.tagName,
        type: element.type || '',
        text,
        href,
        classification,
        disabled: Boolean(element.disabled),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        visible: rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden'
      };
    }).filter((item) => item.visible);
  }, destructiveText.source, safeToggleText.source);
}

async function testSafeControls(page, routeUrl, audit) {
  audit.controlInventory = await inventoryControls(page);
  const safeControls = audit.controlInventory.filter((control) => ['safe navigation', 'safe toggle', 'safe filter'].includes(control.classification)).slice(0, 20);
  for (const control of safeControls) {
    const result = { control, rapidClicks: null, doubleClick: null };
    for (const mode of ['rapidClicks', 'doubleClick']) {
      await page.goto(routeUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForLoadState('networkidle').catch(() => undefined);
      const requestsBefore = audit.requests.length;
      const modalBefore = await page.locator('.modal:visible,[role="dialog"]:visible').count().catch(() => 0);
      const urlBefore = page.url();
      const locator = page.locator('a,button,input,select,[role="button"]').nth(control.index);
      if (!await locator.isVisible().catch(() => false)) continue;
      if (mode === 'rapidClicks') {
        for (let i = 0; i < 10; i += 1) await locator.click({ timeout: 1000 }).catch(() => undefined);
      } else {
        await locator.dblclick({ timeout: 1000 }).catch(() => undefined);
      }
      await page.waitForTimeout(500);
      const modalAfter = await page.locator('.modal:visible,[role="dialog"]:visible').count().catch(() => 0);
      const duplicateRequestCount = countDuplicateRequests(audit.requests.slice(requestsBefore));
      result[mode] = {
        urlBefore,
        urlAfter: page.url(),
        navigationOccurred: urlBefore !== page.url(),
        modalDelta: modalAfter - modalBefore,
        duplicateRequestCount,
        stillDisabled: await locator.evaluate((element) => Boolean(element.disabled)).catch(() => null)
      };
    }
    audit.safeInteractionResults.push(result);
  }
}

function countDuplicateRequests(requests) {
  const counts = new Map();
  for (const request of requests) {
    const key = `${request.method} ${request.url.replace(/[?&](v|ver|version|_v|cache|t|m)=[^&]+/ig, '')}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).length;
}

async function findSidebarToggle(page) {
  const selectors = [
    '[data-toggle="sidebar"]',
    '[data-bs-toggle="offcanvas"]',
    '[aria-controls*="sidebar"]',
    '[class*="sidebar"] button',
    '[class*="sidebar-toggle"]',
    '.navbar button',
    'button:has-text("☰")'
  ];
  return firstVisible(page, selectors);
}

async function sidebarState(page) {
  const signature = await collectDomSignature(page);
  return {
    sidebarWidth: signature.metrics.sidebarWidth,
    pageLeftOffset: signature.metrics.pageLeftOffset,
    sidebarRoot: signature.largestVisible.sidebar,
    storage: signature.storage,
    bodyClass: signature.bodyClass,
    htmlClass: signature.htmlClass
  };
}

async function setSidebar(page, desired) {
  const before = await sidebarState(page);
  const toggle = await findSidebarToggle(page);
  if (!toggle) return { before, after: before, changed: false, reason: 'toggle not found' };
  const isCollapsed = before.sidebarWidth > 0 && before.sidebarWidth < 90;
  const shouldClick = desired === 'collapsed' ? !isCollapsed : isCollapsed;
  if (shouldClick) await toggle.click().catch(() => undefined);
  await page.waitForTimeout(500);
  const after = await sidebarState(page);
  return { before, after, changed: before.sidebarWidth !== after.sidebarWidth || before.pageLeftOffset !== after.pageLeftOffset };
}

async function createContext(browser, cfg, viewport, options = {}) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    ignoreHTTPSErrors: true,
    recordVideo: { dir: options.videoDir }
  });
  const page = await context.newPage();
  await startObservers(page);
  if (options.cdp) {
    const cdp = await context.newCDPSession(page).catch(() => null);
    if (cdp && options.network) {
      await cdp.send('Network.enable').catch(() => undefined);
      await cdp.send('Network.emulateNetworkConditions', options.network).catch(() => undefined);
    }
    if (cdp && options.cpuRate) await cdp.send('Emulation.setCPUThrottlingRate', { rate: options.cpuRate }).catch(() => undefined);
  }
  await loginIfNeeded(page, cfg);
  return { context, page };
}

async function runScenario(browser, cfg, route, viewport, scenario) {
  const dir = path.join(OUT_ROOT, 'routes', routeSlug(route), viewport.label);
  mkdirp(path.join(dir, 'screenshots'));
  mkdirp(path.join(dir, 'timeline'));
  mkdirp(path.join(dir, 'video'));

  const audit = {
    route,
    viewport: viewport.label,
    scenario,
    startedAt: new Date().toISOString(),
    screenshots: [],
    timeline: [],
    consoleErrors: [],
    consoleWarnings: [],
    pageErrors: [],
    failedRequests: [],
    requests: [],
    responses: [],
    navigationRedirects: [],
    controlInventory: [],
    safeInteractionResults: [],
    scenarioEvents: []
  };

  const network = scenario === 'slow' ? {
    offline: false,
    latency: 400,
    downloadThroughput: 80 * 1024,
    uploadThroughput: 40 * 1024
  } : null;
  const cpuRate = scenario === 'cpu' ? 4 : null;
  const routeUrl = new URL(route, cfg.baseURL).toString();
  let { context, page } = await createContext(browser, cfg, viewport, { videoDir: path.join(dir, 'video'), cdp: true, network, cpuRate });
  attachCollectors(page, audit);
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  if (scenario === 'fresh-storage') await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  if (scenario === 'persisted-storage') {
    await page.goto(routeUrl, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.setItem('pmdAuditPersistedStorageProbe', 'set-before-reload'));
  }

  const navigationStart = Date.now();
  const navigationPromise = page.goto(routeUrl, { waitUntil: 'domcontentloaded' });
  await captureTimeline(page, dir, scenario, audit);
  await navigationPromise.catch((error) => audit.scenarioEvents.push({ type: 'navigation-error', message: error.message }));
  await page.waitForLoadState('networkidle').catch(() => undefined);

  if (scenario === 'reload') {
    await page.reload({ waitUntil: 'domcontentloaded' });
    audit.scenarioEvents.push({ type: 'reload', afterUrl: page.url() });
  }

  if (scenario === 'fresh-context') {
    await context.tracing.stop({ path: path.join(dir, `${scenario}-preclose-trace.zip`) }).catch(() => undefined);
    await context.close();
    ({ context, page } = await createContext(browser, cfg, viewport, { videoDir: path.join(dir, 'video') }));
    attachCollectors(page, audit);
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    await page.goto(routeUrl, { waitUntil: 'domcontentloaded' });
    audit.scenarioEvents.push({ type: 'fresh-context-reload', afterUrl: page.url() });
  }

  if (scenario === 'sidebar-expanded') audit.scenarioEvents.push({ type: 'sidebar-expanded', result: await setSidebar(page, 'expanded') });
  if (scenario === 'sidebar-collapsed') audit.scenarioEvents.push({ type: 'sidebar-collapsed', result: await setSidebar(page, 'collapsed') });
  if (scenario === 'persisted-sidebar') {
    const changed = await setSidebar(page, 'collapsed');
    await page.reload({ waitUntil: 'domcontentloaded' });
    audit.scenarioEvents.push({ type: 'persisted-sidebar', changed, afterReload: await sidebarState(page) });
  }

  if (scenario === 'back-forward') {
    const otherRoute = route === '/admin/dashboard' ? '/admin/reservations' : '/admin/dashboard';
    await page.goto(new URL(otherRoute, cfg.baseURL).toString(), { waitUntil: 'domcontentloaded' });
    const afterOther = page.url();
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    const afterBack = page.url();
    await page.goForward({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
    audit.scenarioEvents.push({ type: 'back-forward', afterOther, afterBack, afterForward: page.url() });
  }

  if (scenario === 'persisted-storage') {
    await page.reload({ waitUntil: 'domcontentloaded' });
    audit.scenarioEvents.push({ type: 'persisted-storage', value: await page.evaluate(() => localStorage.getItem('pmdAuditPersistedStorageProbe')) });
  }

  await testSafeControls(page, routeUrl, audit);
  audit.final = await collectDomSignature(page);
  audit.navigationElapsedMs = Date.now() - navigationStart;
  audit.responseStatusCodes = Object.entries(audit.responses.reduce((acc, response) => {
    acc[response.status] = (acc[response.status] || 0) + 1;
    return acc;
  }, {})).map(([status, count]) => ({ status: Number(status), count }));
  audit.repeatedSamePurposeRequests = duplicateRequestDetails(audit.requests);

  const tracePath = path.join(dir, `${scenario}-trace.zip`);
  await context.tracing.stop({ path: tracePath }).catch(() => undefined);
  if (!fs.existsSync(path.join(dir, 'trace.zip')) && fs.existsSync(tracePath)) fs.copyFileSync(tracePath, path.join(dir, 'trace.zip'));
  await context.close();

  writeJson(path.join(dir, `${scenario}-audit.json`), audit);
  return audit;
}

function duplicateRequestDetails(requests) {
  const map = new Map();
  for (const request of requests) {
    const key = `${request.method} ${request.url.replace(/[?&](v|ver|version|_v|cache|t|m)=[^&]+/ig, '')}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].filter(([, count]) => count > 1).map(([request, count]) => ({ request, count }));
}

async function discoverSettingsChildren(browser, cfg) {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await loginIfNeeded(page, cfg);
  await page.goto(new URL('/admin/settings', cfg.baseURL).toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const children = await page.evaluate(() => Array.from(document.querySelectorAll('a[href]'))
    .map((anchor) => new URL(anchor.href, location.href).pathname)
    .filter((pathname) => pathname.startsWith('/admin/settings') && pathname !== '/admin/settings')
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, 100)).catch(() => []);
  await context.close();
  return children;
}

function renderHtmlReport(summary) {
  const rows = summary.runs.map((run) => {
    const problems = [];
    if (run.consoleErrors) problems.push(`${run.consoleErrors} console errors`);
    if (run.consoleWarnings) problems.push(`${run.consoleWarnings} console warnings`);
    if (run.failedRequests) problems.push(`${run.failedRequests} failed requests`);
    if (run.horizontalOverflow) problems.push('horizontal overflow');
    const thumbs = run.screenshots.slice(0, 4).map((screenshot) => `<a href="${screenshot}"><img src="${screenshot}" alt="${run.route} ${run.viewport}"></a>`).join('');
    return `<tr><td>${run.route}</td><td>${run.viewport}</td><td>${run.scenario}</td><td>${problems.join('<br>') || 'No collected problem'}</td><td>${run.authorityTransitions.map((item) => `${item.atMs}ms ${escapeHtml(item.authority)}`).join('<br>')}</td><td>${thumbs}</td></tr>`;
  }).join('\n');
  return `<!doctype html><meta charset="utf-8"><title>PMD Admin Runtime Report</title><style>body{font-family:Arial,sans-serif;margin:24px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:6px;vertical-align:top}img{max-width:180px;max-height:140px;margin:2px}.problem{color:#b00020}</style><h1>PMD Admin Runtime Stabilization Report</h1><p>Base URL: ${summary.baseURL}</p><table><thead><tr><th>Route</th><th>Viewport</th><th>Scenario</th><th>Console/network/layout</th><th>Authority transitions</th><th>Frames</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

async function runLimitedQueue(items, concurrency, worker) {
  const results = [];
  const queue = [...items];
  async function runWorker() {
    while (queue.length) {
      const item = queue.shift();
      results.push(await worker(item));
    }
  }
  await Promise.all(Array.from({ length: concurrency }, runWorker));
  return results;
}

async function main() {
  const cfg = config();
  mkdirp(OUT_ROOT);
  const browser = await chromium.launch({ headless: !cfg.headed, executablePath: cfg.executablePath });
  const settingsChildren = await discoverSettingsChildren(browser, cfg);
  cfg.routes = [...new Set([...cfg.routes, ...settingsChildren])];

  const jobs = [];
  for (const route of cfg.routes) {
    for (const viewport of cfg.viewports) {
      for (const scenario of cfg.scenarios) jobs.push({ route, viewport, scenario });
    }
  }

  const audits = await runLimitedQueue(jobs, cfg.concurrency, async ({ route, viewport, scenario }) => {
    const audit = await runScenario(browser, cfg, route, viewport, scenario);
    console.log(`${route} ${viewport.label} ${scenario}: ${audit.authorityTransitionTimeline.length} authority states`);
    return audit;
  });

  await browser.close();

  for (const route of cfg.routes) {
    for (const viewport of cfg.viewports) {
      const scenarios = audits.filter((audit) => audit.route === route && audit.viewport === viewport.label);
      writeJson(path.join(OUT_ROOT, 'routes', routeSlug(route), viewport.label, 'audit.json'), { route, viewport: viewport.label, scenarios });
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    baseURL: cfg.baseURL,
    executablePath: cfg.executablePath || 'Playwright managed Chromium',
    routes: cfg.routes,
    viewports: cfg.viewports.map((viewport) => viewport.label),
    scenarios: cfg.scenarios,
    runs: audits.map((audit) => ({
      route: audit.route,
      viewport: audit.viewport,
      scenario: audit.scenario,
      screenshots: audit.screenshots,
      timeline: audit.timeline,
      authorityTransitions: audit.authorityTransitionTimeline,
      consoleErrors: audit.consoleErrors.length,
      consoleWarnings: audit.consoleWarnings.length,
      failedRequests: audit.failedRequests.length,
      horizontalOverflow: Boolean(audit.final?.horizontalOverflow),
      metrics: audit.metrics
    }))
  };
  writeJson(path.join(OUT_ROOT, 'summary.json'), summary);
  fs.writeFileSync(path.join(OUT_ROOT, 'admin-runtime-report.html'), renderHtmlReport(summary));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
