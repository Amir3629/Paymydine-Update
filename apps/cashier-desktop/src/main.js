'use strict';

const { app, BrowserWindow, ipcMain, shell, session, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const hardware = require('./hardware');
const receipt = require('./receipt');

const APP_VERSION = '1.3.0';
const PLATFORM_PATH = '/admin';
const SETTLE_PATH = /^\/admin\/pmd-waiter-pos-v1\/payment-settle\/(\d+)\/?$/;
const RECEIPT_PATH = /^\/admin\/orders\/split-receipt\/\d+\/?$/;
const MAX_HANDLED_KEYS = 200;

let mainWindow = null;
let setupWindow = null;
let hardwareWindow = null;
let watchedTenant = '';
const pendingCashRequests = new Map();

app.setName('PayMyDine');

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function hardwareDataDir() {
  return path.join(app.getPath('userData'), 'hardware');
}

function virtualPrintDir() {
  return path.join(app.getPath('desktop'), 'PayMyDine Print Tests');
}

function defaultSettings() {
  return {
    tenant: '',
    outputMode: 'physical',
    printerName: '',
    autoPrintReceipt: true,
    autoOpenCash: true,
    drawerCommand: hardware.DEFAULT_DRAWER_COMMAND,
    handledCashKeys: [],
  };
}

function readSettings() {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) || {};
    return Object.assign(defaultSettings(), parsed);
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
    throw new Error('Enter the restaurant code, for example: tomo');
  }
  return tenant;
}

function tenantUrl(tenant, pathname = PLATFORM_PATH) {
  const cleanPath = String(pathname || PLATFORM_PATH).startsWith('/')
    ? String(pathname || PLATFORM_PATH)
    : `/${pathname}`;
  return `https://${tenant}${cleanPath}`;
}

function isAllowedRemoteUrl(rawUrl, tenant) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && url.hostname === tenant;
  } catch (_) {
    return false;
  }
}

function isHttpsUrl(rawUrl) {
  try {
    return new URL(rawUrl).protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function isTrustedLocalPage(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'file:') return false;
    return ['setup.html', 'hardware.html', 'offline.html'].some((name) => (
      url.pathname.endsWith(`/src/${name}`) || url.pathname.endsWith(`/${name}`)
    ));
  } catch (_) {
    return false;
  }
}

function assertTrustedSender(event, allowLocal = true) {
  const senderUrl = event && event.senderFrame ? event.senderFrame.url : '';
  if (allowLocal && isTrustedLocalPage(senderUrl)) return;
  const storedTenant = readSettings().tenant;
  if (!storedTenant) throw new Error('Restaurant is not configured.');
  const tenant = normalizeTenant(storedTenant);
  if (isAllowedRemoteUrl(senderUrl, tenant)) return;
  throw new Error('Untrusted PayMyDine Desktop request.');
}

function secureWindowOptions(extra) {
  return Object.assign({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#f8fbfd',
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

function externalWindowOptions() {
  return {
    width: 1100,
    height: 820,
    minWidth: 760,
    minHeight: 560,
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

function sendHardwareEvent(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('pmd:hardware-event', payload);
  }
  if (hardwareWindow && !hardwareWindow.isDestroyed()) {
    hardwareWindow.webContents.send('pmd:hardware-event', payload);
  }
}

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'PayMyDine',
      submenu: [
        { label: 'Home', accelerator: 'CmdOrCtrl+1', click: () => openPlatformHome() },
        { label: 'Printer & cash drawer', accelerator: 'CmdOrCtrl+2', click: () => createHardwareWindow() },
        { type: 'separator' },
        { label: 'Change restaurant', click: () => resetTenant() },
        { type: 'separator' },
        process.platform === 'darwin'
          ? { role: 'quit', label: 'Quit PayMyDine' }
          : { role: 'quit', label: 'Exit PayMyDine' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', click: () => mainWindow && mainWindow.reload() },
        { label: 'Fullscreen', accelerator: process.platform === 'darwin' ? 'Ctrl+Cmd+F' : 'F11', click: () => mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
      ],
    },
  ]);
}

function focusPlatform() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createPlatformWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function openPlatformHome() {
  const settings = readSettings();
  if (!settings.tenant) return createSetupWindow();
  const tenant = normalizeTenant(settings.tenant);
  if (!mainWindow || mainWindow.isDestroyed()) return createPlatformWindow();
  mainWindow.loadURL(tenantUrl(tenant, PLATFORM_PATH)).catch(() => {});
  focusPlatform();
}

function createSetupWindow() {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.focus();
    return;
  }
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

function createHardwareWindow() {
  const settings = readSettings();
  if (!settings.tenant) return createSetupWindow();
  if (hardwareWindow && !hardwareWindow.isDestroyed()) {
    hardwareWindow.focus();
    return;
  }
  hardwareWindow = new BrowserWindow(secureWindowOptions({
    width: 720,
    height: 780,
    minWidth: 650,
    minHeight: 650,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
  }));
  hardwareWindow.loadFile(path.join(__dirname, 'hardware.html'));
  hardwareWindow.once('ready-to-show', () => hardwareWindow.show());
  hardwareWindow.on('closed', () => { hardwareWindow = null; });
}

function createPlatformWindow() {
  const settings = readSettings();
  if (!settings.tenant) {
    createSetupWindow();
    return;
  }
  if (mainWindow && !mainWindow.isDestroyed()) return focusPlatform();

  const tenant = normalizeTenant(settings.tenant);
  installCashSettlementWatcher(tenant);

  mainWindow = new BrowserWindow(secureWindowOptions());
  mainWindow.setTitle('PayMyDine');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedRemoteUrl(url, tenant)) {
      try {
        const parsed = new URL(url);
        if (RECEIPT_PATH.test(parsed.pathname) && readSettings().autoPrintReceipt !== false) {
          printReceiptRemoteUrl(url)
            .then((result) => sendHardwareEvent({ type: 'receipt-printed', result }))
            .catch((error) => sendHardwareEvent({ type: 'receipt-print-error', message: error.message }));
          return { action: 'deny' };
        }
      } catch (_) {}
      return { action: 'allow', overrideBrowserWindowOptions: externalWindowOptions() };
    }

    if (isHttpsUrl(url)) {
      return { action: 'allow', overrideBrowserWindowOptions: externalWindowOptions() };
    }

    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedRemoteUrl(url, tenant) || isHttpsUrl(url)) return;
    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    if (!isAllowedRemoteUrl(validatedUrl, tenant)) return;
    console.error('[PMD Desktop] Platform load failed:', errorCode, errorDescription, validatedUrl);
    mainWindow.loadFile(path.join(__dirname, 'offline.html')).catch(() => {});
  });

  mainWindow.loadURL(tenantUrl(tenant, PLATFORM_PATH));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

function parseUploadJson(uploadData) {
  try {
    const chunks = (uploadData || [])
      .filter((row) => row && row.bytes)
      .map((row) => Buffer.from(row.bytes));
    if (!chunks.length) return null;
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (_) {
    return null;
  }
}

function handledCashKey(key) {
  return readSettings().handledCashKeys.map(String).includes(String(key));
}

function rememberCashKey(key) {
  const current = readSettings();
  const keys = current.handledCashKeys.map(String).filter((row) => row !== String(key));
  keys.push(String(key));
  saveSettings({ handledCashKeys: keys.slice(-MAX_HANDLED_KEYS) });
}

function handleSuccessfulCashSettlement(meta) {
  const settings = readSettings();
  if (settings.outputMode === 'pdf') {
    sendHardwareEvent({ type: 'cash-drawer-skipped', orderId: meta && meta.orderId });
    return;
  }
  if (settings.autoOpenCash === false || !meta || !meta.key || handledCashKey(meta.key)) return;
  if (!settings.printerName) return;

  try {
    const result = hardware.openDrawer(
      hardwareDataDir(),
      settings.printerName,
      settings.drawerCommand || hardware.DEFAULT_DRAWER_COMMAND,
    );
    rememberCashKey(meta.key);
    sendHardwareEvent({ type: 'cash-drawer-opened', orderId: meta.orderId, result });
  } catch (error) {
    console.error('[PMD Desktop] Cash drawer auto-open failed:', error.message);
    sendHardwareEvent({ type: 'cash-drawer-error', orderId: meta.orderId, message: error.message });
  }
}

function installCashSettlementWatcher(tenant) {
  if (watchedTenant === tenant) return;
  watchedTenant = tenant;
  const ses = session.defaultSession;
  const filter = { urls: ['https://*.paymydine.com/*'] };

  ses.webRequest.onBeforeRequest(filter, (details, callback) => {
    try {
      const url = new URL(details.url);
      const match = url.hostname === tenant ? url.pathname.match(SETTLE_PATH) : null;
      if (match && String(details.method).toUpperCase() === 'POST') {
        const payload = parseUploadJson(details.uploadData);
        if (payload && String(payload.payment_method || '').toLowerCase() === 'cash') {
          pendingCashRequests.set(details.id, {
            key: payload.idempotency_key || `request-${details.id}`,
            orderId: Number(match[1]) || null,
          });
        }
      }
    } catch (_) {}
    callback({});
  });

  ses.webRequest.onCompleted(filter, (details) => {
    const pending = pendingCashRequests.get(details.id);
    if (!pending) return;
    pendingCashRequests.delete(details.id);
    if (details.statusCode >= 200 && details.statusCode < 300) {
      handleSuccessfulCashSettlement(pending);
    }
  });

  ses.webRequest.onErrorOccurred(filter, (details) => pendingCashRequests.delete(details.id));
}

function findConfiguredPrinter(printerName) {
  const wanted = String(printerName || '').trim().toLowerCase();
  if (!wanted) return null;
  try {
    return hardware.listPrinters().find((row) => (
      String(row && row.name || '').trim().toLowerCase() === wanted
    )) || null;
  } catch (_) {
    return null;
  }
}

async function waitForReceiptAssets(webContents) {
  await webContents.executeJavaScript(`new Promise(function(resolve){
    var images = Array.prototype.slice.call(document.images || []);
    var pending = images.filter(function(img){ return !img.complete; });
    if (!pending.length) return resolve(true);
    var left = pending.length;
    function done(){ left -= 1; if (left <= 0) resolve(true); }
    pending.forEach(function(img){
      img.addEventListener('load', done, {once:true});
      img.addEventListener('error', done, {once:true});
    });
    setTimeout(function(){ resolve(true); }, 1800);
  })`, true);
}

async function captureReceiptImage(printWindow) {
  await waitForReceiptAssets(printWindow.webContents);
  const measure = async () => printWindow.webContents.executeJavaScript(`(function(){
    var el = document.querySelector('.receipt') || document.querySelector('[data-pmd-receipt]') || document.body;
    document.documentElement.style.background = '#fff';
    document.body.style.background = '#fff';
    if (el && el.style) el.style.boxShadow = 'none';
    var r = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.floor(r.left + window.scrollX)),
      y: Math.max(0, Math.floor(r.top + window.scrollY)),
      width: Math.max(1, Math.ceil(r.width)),
      height: Math.max(1, Math.ceil(r.height))
    };
  })()`, true);

  let box = await measure();
  printWindow.setContentSize(
    Math.max(360, Math.min(1400, box.width + 32)),
    Math.max(300, Math.min(8000, box.height + 32)),
  );
  await new Promise((resolve) => setTimeout(resolve, 100));
  box = await measure();
  return printWindow.webContents.capturePage(box);
}

function safeTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function savePdfFromWindow(printWindow, prefix) {
  await waitForReceiptAssets(printWindow.webContents);
  const bytes = await printWindow.webContents.printToPDF({ printBackground: true });
  const dir = virtualPrintDir();
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, `${prefix}-${safeTimestamp()}.pdf`);
  fs.writeFileSync(target, bytes);
  shell.openPath(target).catch(() => {});
  return { ok: true, mode: 'virtual-pdf', path: target };
}

async function printRemoteUrl(rawUrl, receiptMode = false) {
  const settings = readSettings();
  const tenant = normalizeTenant(settings.tenant);
  const url = String(rawUrl || '').startsWith('/')
    ? tenantUrl(tenant, rawUrl)
    : String(rawUrl || '');
  if (!isAllowedRemoteUrl(url, tenant)) {
    throw new Error('Only this restaurant can be printed from PayMyDine Desktop.');
  }

  if (settings.outputMode !== 'pdf' && !settings.printerName) {
    throw new Error('Choose a receipt printer first, or select Virtual PDF.');
  }

  const printerInfo = findConfiguredPrinter(settings.printerName);
  const useNative = settings.outputMode !== 'pdf'
    && receiptMode
    && receipt.shouldUseRawRaster(printerInfo);

  return new Promise((resolve, reject) => {
    const printWindow = new BrowserWindow({
      width: 440,
      height: 1200,
      show: false,
      backgroundColor: '#ffffff',
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
        session: session.defaultSession,
      },
    });

    let finished = false;
    const finish = (error, result) => {
      if (finished) return;
      finished = true;
      if (!printWindow.isDestroyed()) printWindow.close();
      if (error) reject(error); else resolve(result);
    };

    printWindow.webContents.on('did-fail-load', (_event, code, description) => {
      finish(new Error(`Print page failed to load (${code}: ${description})`));
    });

    printWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        try {
          if (settings.outputMode === 'pdf') {
            const result = await savePdfFromWindow(printWindow, receiptMode ? 'PayMyDine-Receipt' : 'PayMyDine-Print');
            finish(null, result);
            return;
          }

          if (useNative) {
            const image = await captureReceiptImage(printWindow);
            const result = receipt.printNativeImage(
              hardware,
              hardwareDataDir(),
              settings.printerName,
              image,
            );
            finish(null, result);
            return;
          }

          printWindow.webContents.print({
            silent: true,
            printBackground: true,
            deviceName: settings.printerName,
            margins: { marginType: 'none' },
          }, (success, failureReason) => {
            if (!success) return finish(new Error(failureReason || 'Printing failed.'));
            finish(null, {
              ok: true,
              printerName: settings.printerName,
              mode: 'system-driver',
            });
          });
        } catch (error) {
          finish(error);
        }
      }, 300);
    });

    printWindow.loadURL(url).catch((error) => finish(error));
  });
}

function printReceiptRemoteUrl(rawUrl) {
  return printRemoteUrl(rawUrl, true);
}

async function testVirtualPdf() {
  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 520,
      height: 700,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        webSecurity: true,
      },
    });
    let done = false;
    const finish = (error, result) => {
      if (done) return;
      done = true;
      if (!win.isDestroyed()) win.close();
      if (error) reject(error); else resolve(result);
    };
    win.webContents.once('did-finish-load', async () => {
      try {
        finish(null, await savePdfFromWindow(win, 'PayMyDine-Test'));
      } catch (error) {
        finish(error);
      }
    });
    const html = `<!doctype html><html><body style="font-family:Arial;padding:32px"><h1>PayMyDine</h1><p>Virtual PDF output is working.</p><p>${new Date().toLocaleString()}</p></body></html>`;
    win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`).catch((error) => finish(error));
  });
}

async function resetTenant() {
  saveSettings({ tenant: '', handledCashKeys: [] });
  pendingCashRequests.clear();
  watchedTenant = '';
  try { await session.defaultSession.clearStorageData(); } catch (_) {}
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  if (hardwareWindow && !hardwareWindow.isDestroyed()) hardwareWindow.close();
  createSetupWindow();
}

ipcMain.handle('pmd:get-config', (event) => {
  assertTrustedSender(event, true);
  return Object.assign({}, readSettings(), {
    appVersion: APP_VERSION,
    product: 'PayMyDine Desktop',
    fullPlatformApp: true,
  });
});

ipcMain.handle('pmd:save-tenant', (event, rawTenant) => {
  assertTrustedSender(event, true);
  const tenant = normalizeTenant(rawTenant);
  saveSettings({ tenant });
  if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  createPlatformWindow();
  return { ok: true, tenant };
});

ipcMain.handle('pmd:reset-tenant', async (event) => {
  assertTrustedSender(event, true);
  await resetTenant();
  return { ok: true };
});

ipcMain.handle('pmd:list-printers', (event) => {
  assertTrustedSender(event, true);
  return hardware.listPrinters();
});

ipcMain.handle('pmd:save-hardware', (event, values) => {
  assertTrustedSender(event, true);
  const outputMode = values && values.outputMode === 'pdf' ? 'pdf' : 'physical';
  const printerName = String(values && values.printerName || '').trim();
  if (outputMode === 'physical' && printerName) hardware.resolvePrinterName(printerName);
  const drawerCommand = String(values && values.drawerCommand || hardware.DEFAULT_DRAWER_COMMAND).trim();
  drawerCommand.split(',').map((part) => Number(part.trim())).forEach((value) => {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new Error('Invalid drawer command.');
    }
  });
  return saveSettings({
    outputMode,
    printerName,
    drawerCommand,
    autoPrintReceipt: values && values.autoPrintReceipt !== false,
    autoOpenCash: outputMode === 'pdf' ? false : values && values.autoOpenCash !== false,
  });
});

ipcMain.handle('pmd:test-print', (event, printerName) => {
  assertTrustedSender(event, true);
  const settings = readSettings();
  if (settings.outputMode === 'pdf') return testVirtualPdf();
  return hardware.testPrint(hardwareDataDir(), printerName || settings.printerName);
});

ipcMain.handle('pmd:test-drawer', (event, options) => {
  assertTrustedSender(event, true);
  const settings = readSettings();
  if (settings.outputMode === 'pdf') throw new Error('Cash drawer is disabled in Virtual PDF mode.');
  return hardware.openDrawer(
    hardwareDataDir(),
    options && options.printerName || settings.printerName,
    options && options.command || settings.drawerCommand,
  );
});

ipcMain.handle('pmd:diagnose-drawer', (event, printerName) => {
  assertTrustedSender(event, true);
  const settings = readSettings();
  if (settings.outputMode === 'pdf') throw new Error('Cash drawer is disabled in Virtual PDF mode.');
  return hardware.diagnoseDrawer(hardwareDataDir(), printerName || settings.printerName);
});

ipcMain.handle('pmd:print-url', (event, rawUrl) => {
  assertTrustedSender(event, false);
  return printRemoteUrl(String(rawUrl || ''), false);
});

ipcMain.handle('pmd:print-receipt-url', (event, rawUrl) => {
  assertTrustedSender(event, false);
  return printReceiptRemoteUrl(String(rawUrl || ''));
});

ipcMain.handle('pmd:open-hardware', (event) => {
  assertTrustedSender(event, true);
  createHardwareWindow();
  return { ok: true };
});

ipcMain.handle('pmd:retry-cashier', (event) => {
  assertTrustedSender(event, true);
  const settings = readSettings();
  if (!settings.tenant) return { ok: false };
  if (!mainWindow || mainWindow.isDestroyed()) createPlatformWindow();
  else mainWindow.loadURL(tenantUrl(normalizeTenant(settings.tenant), PLATFORM_PATH));
  return { ok: true };
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => focusPlatform());
  app.whenReady().then(() => {
    Menu.setApplicationMenu(buildMenu());
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      let allowed = false;
      try {
        const settings = readSettings();
        const tenant = settings.tenant ? normalizeTenant(settings.tenant) : '';
        allowed = permission === 'notifications'
          && tenant
          && isAllowedRemoteUrl(webContents.getURL(), tenant);
      } catch (_) {}
      callback(Boolean(allowed));
    });
    createPlatformWindow();
  });
  app.on('activate', () => {
    if (!mainWindow && !setupWindow) createPlatformWindow();
  });
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
