'use strict';

const { app, BrowserWindow, WebContentsView, ipcMain, shell } = require('electron');
const fs = require('fs');
const path = require('path');

const MAX_ROUTE_VIEWS = 7;
const MAX_WARM_ROUTES = 6;
const WARM_CONCURRENCY = 2;
const FRAME_TIMEOUT_MS = 220;
const RECEIPT_PATH = /^\/admin\/orders\/split-receipt\/\d+\/?$/;
const RISKY_FAST_PATH = /\/(?:login|logout|payment|terminal-payment|callback|webhook|download|export)(?:\/|$)/i;

const pools = new Map();
const poolByWebContentsId = new Map();
let installed = false;

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readTenant() {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) || {};
    let tenant = String(parsed.tenant || '').trim().toLowerCase();
    tenant = tenant.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (/^[a-z0-9][a-z0-9-]*$/.test(tenant)) tenant = `${tenant}.paymydine.com`;
    return /^[a-z0-9][a-z0-9-]*\.paymydine\.com$/.test(tenant) ? tenant : '';
  } catch (_) {
    return '';
  }
}

function parsedUrl(rawUrl) {
  try { return new URL(String(rawUrl || '')); } catch (_) { return null; }
}

function sameTenantAdmin(rawUrl, tenant) {
  const url = parsedUrl(rawUrl);
  return Boolean(url && url.protocol === 'https:' && url.hostname === tenant && /^\/admin(?:\/|$)/.test(url.pathname));
}

function isLoginLike(rawUrl, tenant) {
  const url = parsedUrl(rawUrl);
  return Boolean(url && url.protocol === 'https:' && url.hostname === tenant && /^\/admin\/(?:login|logout)(?:\/|$)/.test(url.pathname));
}

function isHttps(rawUrl) {
  const url = parsedUrl(rawUrl);
  return Boolean(url && url.protocol === 'https:');
}

function routeKey(rawUrl) {
  const url = parsedUrl(rawUrl);
  if (!url) return '';
  const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
  return `${pathname}${url.search}`;
}

function eligibleFastRoute(rawUrl, tenant) {
  if (!sameTenantAdmin(rawUrl, tenant)) return false;
  const url = parsedUrl(rawUrl);
  if (!url || RISKY_FAST_PATH.test(url.pathname) || RECEIPT_PATH.test(url.pathname)) return false;
  if (/^(?:1|true)$/i.test(url.searchParams.get('download') || '')) return false;
  return true;
}

function externalWindowOptions(parent) {
  return {
    width: 1100,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    show: false,
    parent: parent && !parent.isDestroyed() ? parent : undefined,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'external-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  };
}

function openIsolatedHttps(rawUrl, parent) {
  if (!isHttps(rawUrl)) {
    shell.openExternal(String(rawUrl || '')).catch(() => {});
    return null;
  }
  const win = new BrowserWindow(externalWindowOptions(parent));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isHttps(url)) return { action: 'allow', overrideBrowserWindowOptions: externalWindowOptions(win) };
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (isHttps(url)) return;
    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  });
  win.loadURL(rawUrl).catch(() => { if (!win.isDestroyed()) win.close(); });
  win.once('ready-to-show', () => { if (!win.isDestroyed()) win.show(); });
  return win;
}

function viewBounds(host) {
  try {
    const [width, height] = host.getContentSize();
    return { x: 0, y: 0, width: Math.max(1, Number(width) || 1), height: Math.max(1, Number(height) || 1) };
  } catch (_) {
    return { x: 0, y: 0, width: 1440, height: 900 };
  }
}

function activeContents(pool) {
  if (!pool || !pool.host || pool.host.isDestroyed()) return null;
  if (pool.activeRecord && pool.activeRecord.view && !pool.activeRecord.view.webContents.isDestroyed()) {
    return pool.activeRecord.view.webContents;
  }
  return pool.host.webContents;
}

function hideNavigationIndicator(contents) {
  if (!contents || contents.isDestroyed()) return;
  contents.executeJavaScript(`(function(){var el=document.getElementById('pmd-desktop-fast-nav-v140');if(el)el.remove();})()`, true).catch(() => {});
}

function showNavigationIndicator(contents) {
  if (!contents || contents.isDestroyed() || !/^https:\/\//i.test(String(contents.getURL() || ''))) return;
  contents.executeJavaScript(`(function(){
    if(document.getElementById('pmd-desktop-fast-nav-v140'))return;
    var el=document.createElement('div');
    el.id='pmd-desktop-fast-nav-v140';
    el.style.cssText='position:fixed;z-index:2147483647;left:0;top:0;width:100%;height:2px;background:#123b63;opacity:.55;pointer-events:none';
    (document.body||document.documentElement).appendChild(el);
  })()`, true).catch(() => {});
}

function attachRecord(pool, record) {
  if (!pool || !record || !pool.host || pool.host.isDestroyed() || record.view.webContents.isDestroyed()) return false;
  try {
    if (!record.attached) {
      pool.host.contentView.addChildView(record.view);
      record.attached = true;
    }
    record.view.setBounds(viewBounds(pool.host));
    return true;
  } catch (error) {
    console.warn('[PMD Desktop] could not attach route view:', error.message);
    return false;
  }
}

function detachRecord(pool, record) {
  if (!pool || !record || !record.attached || !pool.host || pool.host.isDestroyed()) return;
  try { pool.host.contentView.removeChildView(record.view); } catch (_) {}
  record.attached = false;
}

function cancelTransition(pool) {
  if (!pool) return;
  pool.transitionSerial += 1;
  const pending = pool.transitionRecord;
  pool.transitionRecord = null;
  if (pending && pending !== pool.activeRecord) detachRecord(pool, pending);
}

function waitForPresentedFrame(contents) {
  if (!contents || contents.isDestroyed()) return Promise.resolve();
  const rendererFrame = contents.executeJavaScript(`new Promise(function(resolve){
    var done=false;
    function finish(){if(done)return;done=true;resolve(true);}
    try{requestAnimationFrame(function(){requestAnimationFrame(finish);});}catch(e){setTimeout(finish,32);}
    setTimeout(finish,160);
  })`, true).catch(() => true);
  const timeout = new Promise((resolve) => setTimeout(resolve, FRAME_TIMEOUT_MS));
  return Promise.race([rendererFrame, timeout]);
}

function activateRoot(pool) {
  if (!pool || !pool.host || pool.host.isDestroyed()) return;
  cancelTransition(pool);
  const previous = pool.activeRecord;
  pool.activeRecord = null;
  if (previous) detachRecord(pool, previous);
  pool.rootUrl = sameTenantAdmin(pool.host.webContents.getURL(), pool.tenant) ? pool.host.webContents.getURL() : pool.rootUrl;
  hideNavigationIndicator(previous && previous.view ? previous.view.webContents : null);
  hideNavigationIndicator(pool.host.webContents);
  try { pool.host.webContents.focus(); } catch (_) {}
}

async function activateRecord(pool, record) {
  if (!pool || !record || !pool.host || pool.host.isDestroyed() || !record.view || record.view.webContents.isDestroyed()) return;
  if (pool.activeRecord === record && record.attached) {
    record.lastUsedAt = Date.now();
    hideNavigationIndicator(record.view.webContents);
    try { record.view.webContents.focus(); } catch (_) {}
    return;
  }

  cancelTransition(pool);
  const serial = ++pool.transitionSerial;
  const previous = pool.activeRecord;
  const previousContents = activeContents(pool);
  pool.transitionRecord = record;
  record.pendingActivation = false;

  if (!attachRecord(pool, record)) {
    pool.transitionRecord = null;
    return;
  }

  // Double-buffered swap: the current page stays attached underneath until the
  // incoming renderer has had real animation frames while visible. This avoids
  // the white/grey compositor flash that users saw in V1.3.
  await waitForPresentedFrame(record.view.webContents);
  if (!pool.host || pool.host.isDestroyed() || serial !== pool.transitionSerial || pool.transitionRecord !== record) {
    if (record !== pool.activeRecord) detachRecord(pool, record);
    return;
  }

  if (previous && previous !== record) detachRecord(pool, previous);
  pool.activeRecord = record;
  pool.transitionRecord = null;
  record.lastUsedAt = Date.now();
  hideNavigationIndicator(previousContents);
  hideNavigationIndicator(record.view.webContents);
  try { record.view.webContents.focus(); } catch (_) {}
  evictIfNeeded(pool);
}

function closeRecord(pool, record) {
  if (!record) return;
  detachRecord(pool, record);
  try { poolByWebContentsId.delete(record.view.webContents.id); } catch (_) {}
  try { if (!record.view.webContents.isDestroyed()) record.view.webContents.close(); } catch (_) {}
  if (pool && record.key && pool.records.get(record.key) === record) pool.records.delete(record.key);
}

function clearOtherRecords(pool, keepRecord) {
  cancelTransition(pool);
  Array.from(pool.records.values()).forEach((record) => { if (record !== keepRecord) closeRecord(pool, record); });
  pool.warmQueue = [];
  pool.warmInFlight = 0;
}

function evictIfNeeded(pool) {
  if (!pool || pool.records.size <= MAX_ROUTE_VIEWS) return;
  const removable = Array.from(pool.records.values())
    .filter((record) => record !== pool.activeRecord && record !== pool.transitionRecord && !record.pendingActivation)
    .sort((a, b) => Number(a.lastUsedAt || a.createdAt || 0) - Number(b.lastUsedAt || b.createdAt || 0));
  while (pool.records.size > MAX_ROUTE_VIEWS && removable.length) closeRecord(pool, removable.shift());
}

function settleWarm(pool, record) {
  if (!record || !record.warmInFlight) return;
  record.warmInFlight = false;
  pool.warmInFlight = Math.max(0, pool.warmInFlight - 1);
  setTimeout(() => pumpWarmQueue(pool), 60);
}

function proxyReceiptPrint(contents, url) {
  if (!contents || contents.isDestroyed()) return;
  contents.executeJavaScript(`(function(){try{if(window.PayMyDineDesktop&&window.PayMyDineDesktop.printReceiptUrl){return window.PayMyDineDesktop.printReceiptUrl(${JSON.stringify(url)});}}catch(e){}return null;})()`, true).catch(() => {});
}

function configureRouteContents(pool, record) {
  const contents = record.view.webContents;

  contents.setWindowOpenHandler(({ url }) => {
    if (sameTenantAdmin(url, pool.tenant)) {
      const parsed = parsedUrl(url);
      if (parsed && RECEIPT_PATH.test(parsed.pathname)) {
        proxyReceiptPrint(contents, url);
        return { action: 'deny' };
      }
      openIsolatedHttps(url, pool.host);
      return { action: 'deny' };
    }
    if (isHttps(url)) {
      openIsolatedHttps(url, pool.host);
      return { action: 'deny' };
    }
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  contents.on('will-navigate', (event, url) => {
    if (sameTenantAdmin(url, pool.tenant)) return;
    event.preventDefault();
    if (isHttps(url)) openIsolatedHttps(url, pool.host);
    else shell.openExternal(url).catch(() => {});
  });

  contents.on('before-input-event', (event, input) => {
    const key = String(input && input.key || '').toLowerCase();
    if (key === 'r' && (input.control || input.meta) && !input.alt) {
      event.preventDefault();
      contents.reload();
    }
  });

  contents.on('did-first-visually-non-empty-paint', () => { record.visualReady = true; });
  contents.on('did-navigate', (_event, url) => { if (sameTenantAdmin(url, pool.tenant)) record.url = url; });

  contents.on('did-fail-load', (_event, code, description, validatedUrl, isMainFrame) => {
    if (!isMainFrame || code === -3 || !sameTenantAdmin(validatedUrl, pool.tenant)) return;
    console.error('[PMD Desktop] pooled route load failed:', code, description, validatedUrl);
    record.failedUrl = validatedUrl;
    contents.loadFile(path.join(__dirname, 'offline.html')).catch(() => {});
  });

  contents.on('did-finish-load', () => {
    if (contents.isDestroyed()) return;
    const current = String(contents.getURL() || '');
    record.ready = true;
    record.loadedAt = Date.now();
    if (sameTenantAdmin(current, pool.tenant)) record.url = current;
    if (isLoginLike(current, pool.tenant)) clearOtherRecords(pool, record);
    if (record.pendingActivation) activateRecord(pool, record).catch(() => {});
    settleWarm(pool, record);
  });

  contents.on('destroyed', () => {
    poolByWebContentsId.delete(contents.id);
    if (pool.records.get(record.key) === record) pool.records.delete(record.key);
    if (pool.activeRecord === record) pool.activeRecord = null;
    if (pool.transitionRecord === record) pool.transitionRecord = null;
    settleWarm(pool, record);
  });
}

function createRouteRecord(pool, url, options) {
  const key = routeKey(url);
  if (!key) return null;
  const existing = pool.records.get(key);
  if (existing && !existing.view.webContents.isDestroyed()) return existing;

  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  });
  // Transparent compositor background lets the previous live page remain
  // visible under the incoming view until its first real frames are ready.
  try { view.setBackgroundColor('#00000000'); } catch (_) {}
  try { view.setBounds(viewBounds(pool.host)); } catch (_) {}

  const record = {
    key,
    url,
    view,
    ready: false,
    visualReady: false,
    attached: false,
    pendingActivation: Boolean(options && options.activate),
    createdAt: Date.now(),
    loadedAt: 0,
    lastUsedAt: 0,
    warmInFlight: Boolean(options && options.warm),
    failedUrl: '',
  };

  pool.records.set(key, record);
  poolByWebContentsId.set(view.webContents.id, pool);
  configureRouteContents(pool, record);
  if (record.warmInFlight) pool.warmInFlight += 1;
  view.webContents.loadURL(url).catch(() => {});
  evictIfNeeded(pool);
  return record;
}

function installHostHooks(pool) {
  const host = pool.host;
  host.on('resize', () => {
    [pool.activeRecord, pool.transitionRecord].filter(Boolean).forEach((record) => {
      if (!record.view.webContents.isDestroyed() && record.attached) {
        try { record.view.setBounds(viewBounds(host)); } catch (_) {}
      }
    });
  });

  host.webContents.on('did-start-navigation', (_event, url, _isInPlace, isMainFrame) => {
    if (!isMainFrame || !sameTenantAdmin(url, pool.tenant)) return;
    if (pool.activeRecord || pool.transitionRecord) activateRoot(pool);
  });

  host.webContents.on('did-finish-load', () => {
    const current = String(host.webContents.getURL() || '');
    if (sameTenantAdmin(current, pool.tenant)) pool.rootUrl = current;
    if (isLoginLike(current, pool.tenant)) {
      clearOtherRecords(pool, null);
      activateRoot(pool);
    }
  });

  host.on('closed', () => {
    cancelTransition(pool);
    Array.from(pool.records.values()).forEach((record) => closeRecord(pool, record));
    pools.delete(host.id);
  });
}

function poolForSender(sender) {
  if (!sender || sender.isDestroyed()) return null;
  const mapped = poolByWebContentsId.get(sender.id);
  if (mapped && mapped.host && !mapped.host.isDestroyed()) return mapped;

  const host = BrowserWindow.fromWebContents(sender);
  if (!host || host.isDestroyed()) return null;
  const tenant = readTenant();
  if (!tenant || !sameTenantAdmin(sender.getURL(), tenant)) return null;

  let pool = pools.get(host.id);
  if (!pool) {
    pool = {
      host,
      tenant,
      rootUrl: sender.getURL(),
      records: new Map(),
      activeRecord: null,
      transitionRecord: null,
      transitionSerial: 0,
      warmQueue: [],
      warmInFlight: 0,
    };
    pools.set(host.id, pool);
    installHostHooks(pool);
  }
  return pool;
}

function navigate(pool, rawUrl) {
  if (!pool || !pool.host || pool.host.isDestroyed()) return false;
  const url = parsedUrl(rawUrl);
  if (!url || !sameTenantAdmin(url.href, pool.tenant)) return false;

  if (!eligibleFastRoute(url.href, pool.tenant)) {
    const contents = activeContents(pool);
    if (contents && !contents.isDestroyed()) contents.loadURL(url.href).catch(() => {});
    return true;
  }

  const targetKey = routeKey(url.href);
  const rootKey = routeKey(pool.rootUrl);
  if (targetKey && rootKey && targetKey === rootKey) {
    activateRoot(pool);
    return true;
  }

  let record = pool.records.get(targetKey);
  if (record && record.view.webContents.isDestroyed()) {
    pool.records.delete(targetKey);
    record = null;
  }

  if (!record) {
    showNavigationIndicator(activeContents(pool));
    record = createRouteRecord(pool, url.href, { activate: true, warm: false });
    return Boolean(record);
  }

  record.lastUsedAt = Date.now();
  if (record.ready) activateRecord(pool, record).catch(() => {});
  else {
    record.pendingActivation = true;
    showNavigationIndicator(activeContents(pool));
  }
  return true;
}

function queueWarmRoutes(pool, urls) {
  if (!pool || !Array.isArray(urls)) return;
  const rootKey = routeKey(pool.rootUrl);
  const seen = new Set(pool.warmQueue);
  let added = 0;
  urls.forEach((rawUrl) => {
    if (added >= MAX_WARM_ROUTES) return;
    const url = parsedUrl(rawUrl);
    if (!url || !eligibleFastRoute(url.href, pool.tenant)) return;
    const key = routeKey(url.href);
    if (!key || key === rootKey || pool.records.has(key) || seen.has(url.href)) return;
    pool.warmQueue.push(url.href);
    seen.add(url.href);
    added += 1;
  });
  pumpWarmQueue(pool);
}

function pumpWarmQueue(pool) {
  if (!pool || !pool.host || pool.host.isDestroyed()) return;
  while (pool.warmInFlight < WARM_CONCURRENCY && pool.warmQueue.length) {
    const url = pool.warmQueue.shift();
    if (!eligibleFastRoute(url, pool.tenant)) continue;
    const key = routeKey(url);
    if (pool.records.has(key)) continue;
    createRouteRecord(pool, url, { activate: false, warm: true });
  }
}

function install() {
  if (installed) return;
  installed = true;

  ipcMain.on('pmd:v140-navigate', (event, rawUrl) => {
    const pool = poolForSender(event.sender);
    if (!pool) return;
    navigate(pool, String(rawUrl || ''));
  });

  ipcMain.on('pmd:v140-warm-routes', (event, urls) => {
    const pool = poolForSender(event.sender);
    if (!pool) return;
    const active = activeContents(pool);
    if (!active || active.id !== event.sender.id) return;
    queueWarmRoutes(pool, Array.isArray(urls) ? urls : []);
  });
}

module.exports = { install };
