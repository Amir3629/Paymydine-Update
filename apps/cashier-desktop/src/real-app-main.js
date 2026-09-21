'use strict';

const { app, BrowserWindow, ipcMain, Menu, shell, session } = require('electron');
const fs = require('fs');
const path = require('path');
const hardware = require('./hardware');
const receipt = require('./receipt');
const LocalStore = require('./local-store');

const APP_VERSION = '1.1.0';
const MAX_HANDLED_KEYS = 200;
let mainWindow = null;
let setupWindow = null;
let hardwareWindow = null;
let loginWindow = null;
let compatibilityWindow = null;
let store = null;
let csrf = { tenant: '', token: '', at: 0 };

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function hardwareDataDir() {
  return path.join(app.getPath('userData'), 'hardware');
}

function storePath() {
  return path.join(app.getPath('userData'), 'real-app-store.json');
}

function defaultSettings() {
  return {
    tenant: '',
    printerName: '',
    autoPrintReceipt: true,
    autoOpenCash: true,
    drawerCommand: hardware.DEFAULT_DRAWER_COMMAND,
    handledCashKeys: [],
  };
}

function readSettings() {
  try {
    return Object.assign(defaultSettings(), JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) || {});
  } catch (_) {
    return defaultSettings();
  }
}

function saveSettings(next) {
  const merged = Object.assign({}, readSettings(), next || {});
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function normalizeTenant(value) {
  let tenant = String(value || '').trim().toLowerCase();
  tenant = tenant.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (/^[a-z0-9][a-z0-9-]*$/.test(tenant)) tenant = `${tenant}.paymydine.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.paymydine\.com$/.test(tenant)) {
    throw new Error('Enter the restaurant code, for example: mimoza');
  }
  return tenant;
}

function tenantUrl(tenant, pathname = '/admin') {
  const cleanPath = String(pathname || '/admin').startsWith('/') ? String(pathname || '/admin') : `/${pathname}`;
  return `https://${tenant}${cleanPath}`;
}

function isAllowedRemoteUrl(rawUrl, tenant) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === 'https:' && parsed.hostname === tenant;
  } catch (_) {
    return false;
  }
}

function isTrustedLocalPage(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'file:') return false;
    return ['app.html', 'setup.html', 'hardware.html', 'offline.html'].some((name) => parsed.pathname.endsWith(`/${name}`));
  } catch (_) {
    return false;
  }
}

function assertTrustedSender(event, allowRemote = false) {
  const senderUrl = event && event.senderFrame ? event.senderFrame.url : '';
  if (isTrustedLocalPage(senderUrl)) return;
  if (allowRemote) {
    const tenant = readSettings().tenant;
    if (tenant && isAllowedRemoteUrl(senderUrl, tenant)) return;
  }
  throw new Error('Untrusted PayMyDine desktop request.');
}

function secureWindowOptions(extra) {
  return Object.assign({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#f5f7fb',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
    },
  }, extra || {});
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
  if (hardwareWindow && !hardwareWindow.isDestroyed()) hardwareWindow.webContents.send(channel, payload);
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'PayMyDine',
      submenu: [
        { label: 'Cashier', accelerator: 'Ctrl+1', click: () => focusCashier() },
        { label: 'Sign in', click: () => createLoginWindow() },
        { label: 'Printer & cash drawer', accelerator: 'Ctrl+2', click: () => createHardwareWindow() },
        { type: 'separator' },
        { label: 'Change restaurant', click: () => resetTenant() },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload app', accelerator: 'Ctrl+R', click: () => mainWindow && mainWindow.reload() },
        { label: 'Fullscreen', accelerator: 'F11', click: () => mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
      ],
    },
  ]);
}

function focusCashier() {
  if (!mainWindow || mainWindow.isDestroyed()) return createCashierWindow();
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function createSetupWindow() {
  if (setupWindow && !setupWindow.isDestroyed()) return setupWindow.focus();
  setupWindow = new BrowserWindow(secureWindowOptions({
    width: 560,
    height: 520,
    minWidth: 560,
    minHeight: 520,
    resizable: false,
  }));
  setupWindow.loadFile(path.join(__dirname, 'setup.html'));
  setupWindow.once('ready-to-show', () => setupWindow.show());
  setupWindow.on('closed', () => { setupWindow = null; });
}

function createCashierWindow() {
  const settings = readSettings();
  if (!settings.tenant) return createSetupWindow();
  if (mainWindow && !mainWindow.isDestroyed()) return focusCashier();

  mainWindow = new BrowserWindow(secureWindowOptions());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const tenant = normalizeTenant(readSettings().tenant);
    if (isAllowedRemoteUrl(url, tenant)) {
      createCompatibilityWindow(new URL(url).pathname + new URL(url).search);
    } else {
      shell.openExternal(url).catch(() => {});
    }
    return { action: 'deny' };
  });
  mainWindow.loadFile(path.join(__dirname, 'app.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

function createHardwareWindow() {
  if (!readSettings().tenant) return createSetupWindow();
  if (hardwareWindow && !hardwareWindow.isDestroyed()) return hardwareWindow.focus();
  hardwareWindow = new BrowserWindow(secureWindowOptions({
    width: 700,
    height: 760,
    minWidth: 650,
    minHeight: 650,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
  }));
  hardwareWindow.loadFile(path.join(__dirname, 'hardware.html'));
  hardwareWindow.once('ready-to-show', () => hardwareWindow.show());
  hardwareWindow.on('closed', () => { hardwareWindow = null; });
}

function createCompatibilityWindow(pathname = '/admin/cashierlab') {
  const tenant = normalizeTenant(readSettings().tenant);
  if (compatibilityWindow && !compatibilityWindow.isDestroyed()) compatibilityWindow.close();
  compatibilityWindow = new BrowserWindow(secureWindowOptions({
    width: 1440,
    height: 900,
    autoHideMenuBar: false,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
  }));
  compatibilityWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedRemoteUrl(url, tenant)) return { action: 'allow' };
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });
  compatibilityWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedRemoteUrl(url, tenant)) return;
    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  });
  compatibilityWindow.loadURL(tenantUrl(tenant, pathname));
  compatibilityWindow.once('ready-to-show', () => compatibilityWindow.show());
  compatibilityWindow.on('closed', () => { compatibilityWindow = null; });
  return { ok: true };
}

function createLoginWindow() {
  const settings = readSettings();
  if (!settings.tenant) {
    createSetupWindow();
    return { ok: false, reason: 'tenant-required' };
  }
  const tenant = normalizeTenant(settings.tenant);
  if (loginWindow && !loginWindow.isDestroyed()) {
    loginWindow.focus();
    return { ok: true };
  }
  loginWindow = new BrowserWindow(secureWindowOptions({ width: 1120, height: 800, minWidth: 800, minHeight: 600 }));
  loginWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedRemoteUrl(url, tenant)) return;
    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  });
  const detectAuth = (_event, url) => {
    try {
      const parsed = new URL(url || loginWindow.webContents.getURL());
      if (parsed.hostname !== tenant) return;
      if (/\/login(?:\/|$|\?)/i.test(parsed.pathname + parsed.search)) return;
      if (!/^\/admin(?:\/|$)/.test(parsed.pathname)) return;
      csrf = { tenant: '', token: '', at: 0 };
      send('pmd:auth-changed', { authenticated: true, at: Date.now() });
      setTimeout(() => {
        if (loginWindow && !loginWindow.isDestroyed()) loginWindow.close();
      }, 250);
    } catch (_) {}
  };
  loginWindow.webContents.on('did-navigate', detectAuth);
  loginWindow.webContents.on('did-navigate-in-page', detectAuth);
  loginWindow.loadURL(tenantUrl(tenant, '/admin'));
  loginWindow.once('ready-to-show', () => loginWindow.show());
  loginWindow.on('closed', () => { loginWindow = null; });
  return { ok: true };
}

function cacheKeyFor(tenant, pathname) {
  return `${tenant}:${pathname}`;
}

function looksLikeLogin(responseUrl, bodyText) {
  const url = String(responseUrl || '');
  if (/\/login(?:\/|$|\?)/i.test(url)) return true;
  return /<form[^>]+(?:login|signin)|name=["']password["']/i.test(String(bodyText || ''));
}

async function csrfToken(tenant) {
  if (csrf.tenant === tenant && csrf.token && Date.now() - csrf.at < 30 * 60 * 1000) return csrf.token;
  try {
    const cookies = await session.defaultSession.cookies.get({ url: tenantUrl(tenant, '/') });
    const xsrf = cookies.find((row) => String(row.name).toUpperCase() === 'XSRF-TOKEN');
    if (xsrf && xsrf.value) {
      csrf = { tenant, token: decodeURIComponent(xsrf.value), at: Date.now() };
      return csrf.token;
    }
  } catch (_) {}

  const response = await session.defaultSession.fetch(tenantUrl(tenant, '/admin/cashierlab'), {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'text/html' },
  });
  const text = await response.text();
  if (looksLikeLogin(response.url, text)) throw Object.assign(new Error('Sign in to PayMyDine first.'), { authRequired: true });
  const match = text.match(/<meta[^>]+name=["']csrf-token["'][^>]+content=["']([^"']+)["']/i)
    || text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']csrf-token["']/i);
  if (!match) throw new Error('Could not read the PayMyDine security token.');
  csrf = { tenant, token: match[1], at: Date.now() };
  return csrf.token;
}

async function remoteRequest(rawRequest) {
  const settings = readSettings();
  const tenant = normalizeTenant(settings.tenant);
  const request = rawRequest && typeof rawRequest === 'object' ? rawRequest : {};
  const method = String(request.method || 'GET').toUpperCase();
  const pathname = String(request.path || '/admin/pmd-waiter-dashboard-v9-tenant-data');
  if (!pathname.startsWith('/admin/')) throw new Error('Only PayMyDine Admin API paths are allowed.');
  const key = String(request.cacheKey || cacheKeyFor(tenant, pathname));
  const url = tenantUrl(tenant, pathname);
  const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  let body;

  if (method !== 'GET' && method !== 'HEAD') {
    const token = await csrfToken(tenant);
    headers['Content-Type'] = 'application/json';
    headers['X-CSRF-TOKEN'] = token;
    headers['X-XSRF-TOKEN'] = token;
    body = JSON.stringify(request.body || {});
  }

  try {
    const response = await session.defaultSession.fetch(url, {
      method,
      credentials: 'include',
      redirect: 'follow',
      headers,
      body,
    });
    const text = await response.text();
    if (looksLikeLogin(response.url, text)) {
      send('pmd:connectivity', { online: true, authenticated: false, at: Date.now() });
      return { ok: false, status: 401, authRequired: true, online: true, message: 'Sign in to PayMyDine.' };
    }
    let data;
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }
    if (!response.ok || (data && data.ok === false)) {
      const message = data && (data.message || data.error) ? (data.message || data.error) : `HTTP ${response.status}`;
      return { ok: false, status: response.status, online: true, data, message };
    }
    if (method === 'GET' && data && typeof data === 'object') store.cacheSet(key, data);
    send('pmd:connectivity', { online: true, authenticated: true, at: Date.now() });

    if (method === 'POST' && /\/payment-settle\/\d+\/?$/.test(pathname)) {
      maybeOpenDrawerAfterCash(request.body || {}, data);
    }

    return { ok: true, status: response.status, online: true, cached: false, data };
  } catch (error) {
    const cached = method === 'GET' ? store.cacheGet(key) : null;
    send('pmd:connectivity', { online: false, authenticated: null, at: Date.now() });
    if (cached) {
      return {
        ok: true,
        status: 200,
        online: false,
        cached: true,
        cachedAt: cached.savedAt,
        data: cached.value,
        warning: 'Offline: showing the last saved restaurant data.',
      };
    }
    return { ok: false, status: 0, online: false, cached: false, message: error.message || 'PayMyDine cloud is unreachable.' };
  }
}

async function checkOnline() {
  const settings = readSettings();
  if (!settings.tenant) return { online: false, authenticated: false };
  const tenant = normalizeTenant(settings.tenant);
  try {
    const response = await session.defaultSession.fetch(tenantUrl(tenant, '/admin/pmd-waiter-dashboard-v9-tenant-data'), {
      method: 'GET', credentials: 'include', redirect: 'follow', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    });
    const text = await response.text();
    const authenticated = !looksLikeLogin(response.url, text) && response.ok;
    const result = { online: true, authenticated, at: Date.now() };
    send('pmd:connectivity', result);
    return result;
  } catch (_) {
    const result = { online: false, authenticated: null, at: Date.now() };
    send('pmd:connectivity', result);
    return result;
  }
}

function handledCashKey(key) {
  return readSettings().handledCashKeys.map(String).includes(String(key));
}

function rememberCashKey(key) {
  const settings = readSettings();
  const keys = settings.handledCashKeys.map(String).filter((row) => row !== String(key));
  keys.push(String(key));
  saveSettings({ handledCashKeys: keys.slice(-MAX_HANDLED_KEYS) });
}

function maybeOpenDrawerAfterCash(payload, response) {
  if (!payload || String(payload.payment_method || '').toLowerCase() !== 'cash') return;
  if (!response || response.ok === false) return;
  const key = String(payload.idempotency_key || '');
  const settings = readSettings();
  if (!key || handledCashKey(key) || settings.autoOpenCash === false) return;
  try {
    const result = hardware.openDrawer(hardwareDataDir(), settings.printerName, settings.drawerCommand || hardware.DEFAULT_DRAWER_COMMAND);
    rememberCashKey(key);
    send('pmd:hardware-event', { type: 'cash-drawer-opened', result });
  } catch (error) {
    send('pmd:hardware-event', { type: 'cash-drawer-error', message: error.message });
  }
}

function findConfiguredPrinter(printerName) {
  const wanted = String(printerName || '').trim().toLowerCase();
  if (!wanted) return null;
  try {
    return hardware.listPrinters().find((row) => String(row && row.name || '').trim().toLowerCase() === wanted) || null;
  } catch (_) {
    return null;
  }
}

async function waitForReceiptAssets(webContents) {
  await webContents.executeJavaScript(`new Promise(function(resolve){var images=Array.prototype.slice.call(document.images||[]);var pending=images.filter(function(img){return !img.complete;});if(!pending.length)return resolve(true);var left=pending.length;function done(){left-=1;if(left<=0)resolve(true);}pending.forEach(function(img){img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true});});setTimeout(function(){resolve(true);},1800);})`, true);
}

async function printRemoteUrl(rawUrl, receiptMode) {
  const settings = readSettings();
  const tenant = normalizeTenant(settings.tenant);
  const url = String(rawUrl || '').startsWith('/') ? tenantUrl(tenant, rawUrl) : String(rawUrl || '');
  if (!isAllowedRemoteUrl(url, tenant)) throw new Error('Only this restaurant can be printed from PayMyDine Cashier.');
  if (!settings.printerName) throw new Error('Choose a receipt printer first.');
  const printerInfo = findConfiguredPrinter(settings.printerName);
  const useNative = receiptMode && receipt.shouldUseRawRaster(printerInfo);

  return new Promise((resolve, reject) => {
    const printWindow = new BrowserWindow({
      width: 440,
      height: 1200,
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, session: session.defaultSession },
    });
    let finished = false;
    const finish = (error, result) => {
      if (finished) return;
      finished = true;
      if (!printWindow.isDestroyed()) printWindow.close();
      if (error) reject(error); else resolve(result);
    };
    printWindow.webContents.on('did-fail-load', (_event, code, description) => finish(new Error(`Receipt page failed to load (${code}: ${description})`)));
    printWindow.webContents.once('did-finish-load', async () => {
      try {
        await waitForReceiptAssets(printWindow.webContents);
        if (!useNative) {
          printWindow.webContents.print({ silent: true, printBackground: true, deviceName: settings.printerName, margins: { marginType: 'none' } }, (success, reason) => {
            if (!success) return finish(new Error(reason || 'Receipt printing failed.'));
            finish(null, { ok: true, printerName: settings.printerName, mode: 'system-driver' });
          });
          return;
        }
        const size = await printWindow.webContents.executeJavaScript(`(function(){var el=document.querySelector('.receipt')||document.querySelector('[data-pmd-receipt]')||document.body;var r=el.getBoundingClientRect();return{x:Math.max(0,Math.floor(r.left+scrollX)),y:Math.max(0,Math.floor(r.top+scrollY)),width:Math.max(1,Math.ceil(r.width)),height:Math.max(1,Math.ceil(r.height))};})()`, true);
        printWindow.setContentSize(Math.max(360, Math.min(1400, size.width + 32)), Math.max(300, Math.min(8000, size.height + 32)));
        await new Promise((r) => setTimeout(r, 100));
        const image = await printWindow.webContents.capturePage(size);
        finish(null, receipt.printNativeImage(hardware, hardwareDataDir(), settings.printerName, image));
      } catch (error) {
        finish(error);
      }
    });
    printWindow.loadURL(url).catch((error) => finish(error));
  });
}

async function resetTenant() {
  saveSettings({ tenant: '', handledCashKeys: [] });
  csrf = { tenant: '', token: '', at: 0 };
  try { await session.defaultSession.clearStorageData(); } catch (_) {}
  store.clearCache();
  [mainWindow, hardwareWindow, loginWindow, compatibilityWindow].forEach((win) => {
    if (win && !win.isDestroyed()) win.close();
  });
  createSetupWindow();
}

ipcMain.handle('pmd:get-config', (event) => {
  assertTrustedSender(event, true);
  return Object.assign({}, readSettings(), { appVersion: APP_VERSION, realAppV110: true });
});
ipcMain.handle('pmd:save-tenant', (event, rawTenant) => {
  assertTrustedSender(event, true);
  const tenant = normalizeTenant(rawTenant);
  saveSettings({ tenant });
  csrf = { tenant: '', token: '', at: 0 };
  if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close();
  createCashierWindow();
  return { ok: true, tenant };
});
ipcMain.handle('pmd:reset-tenant', async (event) => { assertTrustedSender(event, true); await resetTenant(); return { ok: true }; });
ipcMain.handle('pmd:api-request', (event, request) => { assertTrustedSender(event, false); return remoteRequest(request); });
ipcMain.handle('pmd:check-online', (event) => { assertTrustedSender(event, false); return checkOnline(); });
ipcMain.handle('pmd:open-login', (event) => { assertTrustedSender(event, false); return createLoginWindow(); });
ipcMain.handle('pmd:open-compatibility', (event, pathname) => { assertTrustedSender(event, false); return createCompatibilityWindow(String(pathname || '/admin/cashierlab')); });
ipcMain.handle('pmd:cache-stats', (event) => { assertTrustedSender(event, false); return store.cacheStats(); });
ipcMain.handle('pmd:clear-cache', (event) => { assertTrustedSender(event, false); store.clearCache(); return { ok: true }; });
ipcMain.handle('pmd:get-draft', (event, key) => { assertTrustedSender(event, false); return store.draftGet(key); });
ipcMain.handle('pmd:save-draft', (event, key, value) => { assertTrustedSender(event, false); return store.draftSet(key, value); });
ipcMain.handle('pmd:delete-draft', (event, key) => { assertTrustedSender(event, false); store.draftDelete(key); return { ok: true }; });

ipcMain.handle('pmd:list-printers', (event) => { assertTrustedSender(event, true); return hardware.listPrinters(); });
ipcMain.handle('pmd:save-hardware', (event, values) => {
  assertTrustedSender(event, true);
  const printerName = String(values && values.printerName || '').trim();
  if (printerName) hardware.resolvePrinterName(printerName);
  const drawerCommand = String(values && values.drawerCommand || hardware.DEFAULT_DRAWER_COMMAND).trim();
  drawerCommand.split(',').map((part) => Number(part.trim())).forEach((value) => {
    if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Invalid drawer command.');
  });
  return saveSettings({ printerName, drawerCommand, autoPrintReceipt: values && values.autoPrintReceipt !== false, autoOpenCash: values && values.autoOpenCash !== false });
});
ipcMain.handle('pmd:test-print', (event, printerName) => { assertTrustedSender(event, true); return hardware.testPrint(hardwareDataDir(), printerName || readSettings().printerName); });
ipcMain.handle('pmd:test-drawer', (event, options) => { assertTrustedSender(event, true); const s = readSettings(); return hardware.openDrawer(hardwareDataDir(), options && options.printerName || s.printerName, options && options.command || s.drawerCommand); });
ipcMain.handle('pmd:diagnose-drawer', (event, printerName) => { assertTrustedSender(event, true); return hardware.diagnoseDrawer(hardwareDataDir(), printerName || readSettings().printerName); });
ipcMain.handle('pmd:print-url', (event, url) => { assertTrustedSender(event, true); return printRemoteUrl(url, false); });
ipcMain.handle('pmd:print-receipt-url', (event, url) => { assertTrustedSender(event, true); return printRemoteUrl(url, true); });
ipcMain.handle('pmd:open-hardware', (event) => { assertTrustedSender(event, true); createHardwareWindow(); return { ok: true }; });
ipcMain.handle('pmd:retry-cashier', (event) => { assertTrustedSender(event, true); createCashierWindow(); return { ok: true }; });

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => focusCashier());
  app.whenReady().then(() => {
    store = new LocalStore(storePath());
    Menu.setApplicationMenu(buildMenu());
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    createCashierWindow();
  });
  app.on('activate', () => {
    if (!mainWindow && !setupWindow) createCashierWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
