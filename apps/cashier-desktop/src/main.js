'use strict';

const { app, BrowserWindow, ipcMain, shell, session, Menu } = require('electron');
const fs = require('fs');
const path = require('path');
const hardware = require('./hardware');

const CASHIER_PATH = '/admin/cashierlab';
const SETTLE_PATH = /^\/admin\/pmd-waiter-pos-v1\/payment-settle\/(\d+)\/?$/;
const RECEIPT_PATH = /^\/admin\/orders\/split-receipt\/\d+\/?$/;
const MAX_HANDLED_KEYS = 100;

let mainWindow = null;
let setupWindow = null;
let hardwareWindow = null;
const pendingCashRequests = new Map();

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function hardwareDataDir() {
  return path.join(app.getPath('userData'), 'hardware');
}

function defaultSettings() {
  return {
    tenant: '',
    printerName: '',
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
  const current = readSettings();
  const merged = Object.assign({}, current, next);
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function normalizeTenant(value) {
  let tenant = String(value || '').trim().toLowerCase();
  tenant = tenant.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (/^[a-z0-9][a-z0-9-]*$/.test(tenant)) tenant = `${tenant}.paymydine.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.paymydine\.com$/.test(tenant)) {
    throw new Error('Enter the restaurant code, for example: a or mimoza');
  }
  return tenant;
}

function tenantUrl(tenant, pathname = CASHIER_PATH) {
  return `https://${tenant}${pathname}`;
}

function isAllowedRemoteUrl(rawUrl, tenant) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && url.hostname === tenant;
  } catch (_) {
    return false;
  }
}

function isTrustedLocalPage(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'file:') return false;
    return ['setup.html', 'hardware.html', 'offline.html'].some((name) => url.pathname.endsWith(`/src/${name}`) || url.pathname.endsWith(`/${name}`));
  } catch (_) {
    return false;
  }
}

function assertTrustedSender(event, allowLocal = true) {
  const senderUrl = event && event.senderFrame ? event.senderFrame.url : '';
  if (allowLocal && isTrustedLocalPage(senderUrl)) return;
  const tenant = readSettings().tenant;
  if (tenant && isAllowedRemoteUrl(senderUrl, tenant)) return;
  throw new Error('Untrusted desktop request.');
}

function secureWindowOptions(extra) {
  return Object.assign({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#f8fbfd',
    show: false,
    autoHideMenuBar: false,
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

function buildMenu() {
  return Menu.buildFromTemplate([
    {
      label: 'PayMyDine',
      submenu: [
        { label: 'Cashier', accelerator: 'Ctrl+1', click: () => focusCashier() },
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
        { label: 'Reload', accelerator: 'Ctrl+R', click: () => mainWindow && mainWindow.reload() },
        { label: 'Fullscreen', accelerator: 'F11', click: () => mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
      ],
    },
  ]);
}

function focusCashier() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createCashierWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
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
    autoHideMenuBar: true,
  }));
  setupWindow.loadFile(path.join(__dirname, 'setup.html'));
  setupWindow.once('ready-to-show', () => setupWindow.show());
  setupWindow.on('closed', () => { setupWindow = null; });
}

function createHardwareWindow() {
  const settings = readSettings();
  if (!settings.tenant) {
    createSetupWindow();
    return;
  }
  if (hardwareWindow && !hardwareWindow.isDestroyed()) {
    hardwareWindow.focus();
    return;
  }
  hardwareWindow = new BrowserWindow(secureWindowOptions({
    width: 650,
    height: 690,
    minWidth: 650,
    minHeight: 650,
    resizable: true,
    autoHideMenuBar: true,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
  }));
  hardwareWindow.loadFile(path.join(__dirname, 'hardware.html'));
  hardwareWindow.once('ready-to-show', () => hardwareWindow.show());
  hardwareWindow.on('closed', () => { hardwareWindow = null; });
}

function createCashierWindow() {
  const settings = readSettings();
  if (!settings.tenant) {
    createSetupWindow();
    return;
  }

  const tenant = normalizeTenant(settings.tenant);
  installCashSettlementWatcher(tenant);
  mainWindow = new BrowserWindow(secureWindowOptions({ width: 1440, height: 900 }));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedRemoteUrl(url, tenant)) {
      try {
        const parsed = new URL(url);
        if (RECEIPT_PATH.test(parsed.pathname) && readSettings().printerName) {
          printRemoteUrl(url)
            .then((result) => sendHardwareEvent({ type: 'receipt-printed', result }))
            .catch((error) => sendHardwareEvent({ type: 'receipt-print-error', message: error.message }));
          return { action: 'deny' };
        }
      } catch (_) {}
      return { action: 'allow' };
    }
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (isAllowedRemoteUrl(url, tenant) || isTrustedLocalPage(url)) return;
    event.preventDefault();
    shell.openExternal(url).catch(() => {});
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame || errorCode === -3 || isTrustedLocalPage(validatedUrl)) return;
    console.error('[PMD Desktop] Cashier load failed:', errorCode, errorDescription, validatedUrl);
    mainWindow.loadFile(path.join(__dirname, 'offline.html')).catch(() => {});
  });

  mainWindow.loadURL(tenantUrl(tenant));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });

  if (!settings.printerName) {
    mainWindow.webContents.once('did-finish-load', () => setTimeout(() => createHardwareWindow(), 700));
  }
}

function parseUploadJson(uploadData) {
  try {
    const chunks = (uploadData || []).filter((row) => row && row.bytes).map((row) => Buffer.from(row.bytes));
    if (!chunks.length) return null;
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (_) {
    return null;
  }
}

function sendHardwareEvent(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('pmd:hardware-event', payload);
  if (hardwareWindow && !hardwareWindow.isDestroyed()) hardwareWindow.webContents.send('pmd:hardware-event', payload);
}

function handledCashKey(key) {
  return readSettings().handledCashKeys.includes(String(key));
}

function rememberCashKey(key) {
  const current = readSettings();
  const keys = current.handledCashKeys.filter((row) => String(row) !== String(key));
  keys.push(String(key));
  saveSettings({ handledCashKeys: keys.slice(-MAX_HANDLED_KEYS) });
}

function handleSuccessfulCashSettlement(meta) {
  const settings = readSettings();
  if (settings.autoOpenCash === false || !meta || !meta.key || handledCashKey(meta.key)) return;
  try {
    const result = hardware.openDrawer(hardwareDataDir(), settings.printerName, settings.drawerCommand || hardware.DEFAULT_DRAWER_COMMAND);
    rememberCashKey(meta.key);
    sendHardwareEvent({ type: 'cash-drawer-opened', orderId: meta.orderId, result });
  } catch (error) {
    console.error('[PMD Desktop] Cash drawer auto-open failed:', error.message);
    sendHardwareEvent({ type: 'cash-drawer-error', orderId: meta.orderId, message: error.message });
  }
}

function installCashSettlementWatcher(tenant) {
  const ses = session.defaultSession;
  const filter = { urls: ['https://*/*'] };

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
    if (details.statusCode >= 200 && details.statusCode < 300) handleSuccessfulCashSettlement(pending);
  });

  ses.webRequest.onErrorOccurred(filter, (details) => pendingCashRequests.delete(details.id));
}

async function printRemoteUrl(rawUrl) {
  const settings = readSettings();
  const tenant = normalizeTenant(settings.tenant);
  if (!isAllowedRemoteUrl(rawUrl, tenant)) throw new Error('Only this restaurant can be printed from the Cashier app.');
  if (!settings.printerName) throw new Error('Choose a receipt printer first.');

  return new Promise((resolve, reject) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
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

    printWindow.webContents.on('did-fail-load', (_event, code, description) => finish(new Error(`Receipt page failed to load (${code}: ${description})`)));
    printWindow.webContents.once('did-finish-load', () => {
      setTimeout(() => {
        printWindow.webContents.print({
          silent: true,
          printBackground: true,
          deviceName: settings.printerName,
          margins: { marginType: 'none' },
        }, (success, failureReason) => {
          if (!success) return finish(new Error(failureReason || 'Receipt printing failed.'));
          finish(null, { ok: true, printerName: settings.printerName });
        });
      }, 350);
    });
    printWindow.loadURL(rawUrl).catch((error) => finish(error));
  });
}

async function resetTenant() {
  saveSettings({ tenant: '', handledCashKeys: [] });
  pendingCashRequests.clear();
  try { await session.defaultSession.clearStorageData(); } catch (_) {}
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  if (hardwareWindow && !hardwareWindow.isDestroyed()) hardwareWindow.close();
  createSetupWindow();
}

ipcMain.handle('pmd:get-config', (event) => {
  assertTrustedSender(event, true);
  return readSettings();
});

ipcMain.handle('pmd:save-tenant', (event, rawTenant) => {
  assertTrustedSender(event, true);
  const tenant = normalizeTenant(rawTenant);
  const settings = saveSettings({ tenant });
  if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  createCashierWindow();
  if (!settings.printerName) setTimeout(() => createHardwareWindow(), 500);
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
  const printerName = String(values && values.printerName || '').trim();
  if (printerName) hardware.resolvePrinterName(printerName);
  const drawerCommand = String(values && values.drawerCommand || hardware.DEFAULT_DRAWER_COMMAND).trim();
  drawerCommand.split(',').map((part) => Number(part.trim())).forEach((value) => {
    if (!Number.isInteger(value) || value < 0 || value > 255) throw new Error('Invalid drawer command.');
  });
  return saveSettings({ printerName, drawerCommand, autoOpenCash: values && values.autoOpenCash !== false });
});

ipcMain.handle('pmd:test-print', (event, printerName) => {
  assertTrustedSender(event, true);
  const settings = readSettings();
  return hardware.testPrint(hardwareDataDir(), printerName || settings.printerName);
});

ipcMain.handle('pmd:test-drawer', (event, options) => {
  assertTrustedSender(event, true);
  const settings = readSettings();
  return hardware.openDrawer(
    hardwareDataDir(),
    options && options.printerName || settings.printerName,
    options && options.command || settings.drawerCommand,
  );
});

ipcMain.handle('pmd:diagnose-drawer', (event, printerName) => {
  assertTrustedSender(event, true);
  const settings = readSettings();
  return hardware.diagnoseDrawer(hardwareDataDir(), printerName || settings.printerName);
});

ipcMain.handle('pmd:print-url', (event, rawUrl) => {
  assertTrustedSender(event, false);
  return printRemoteUrl(String(rawUrl || ''));
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
  if (!mainWindow || mainWindow.isDestroyed()) createCashierWindow();
  else mainWindow.loadURL(tenantUrl(normalizeTenant(settings.tenant)));
  return { ok: true };
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => focusCashier());
  app.whenReady().then(() => {
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
