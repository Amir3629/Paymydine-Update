'use strict';

const { app, BrowserWindow, ipcMain, shell, session, Menu } = require('electron');
const fs = require('fs');
const path = require('path');

const CASHIER_PATH = '/admin/cashierlab';
let mainWindow = null;
let setupWindow = null;

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function normalizeTenant(value) {
  let tenant = String(value || '').trim().toLowerCase();
  tenant = tenant.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (!/^[a-z0-9][a-z0-9-]*\.paymydine\.com$/.test(tenant)) {
    throw new Error('Use a PayMyDine address like a.paymydine.com');
  }
  return tenant;
}

function saveSettings(next) {
  const current = readSettings();
  const merged = Object.assign({}, current, next);
  fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function tenantUrl(tenant) {
  return `https://${tenant}${CASHIER_PATH}`;
}

function isAllowedUrl(rawUrl, tenant) {
  try {
    const u = new URL(rawUrl);
    return u.protocol === 'https:' && u.hostname === tenant;
  } catch (_) {
    return false;
  }
}

function secureWindowOptions(extra) {
  return Object.assign({
    width: 1366,
    height: 820,
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

function createCashierWindow() {
  const settings = readSettings();
  if (!settings.tenant) {
    createSetupWindow();
    return;
  }

  const tenant = normalizeTenant(settings.tenant);
  mainWindow = new BrowserWindow(secureWindowOptions({
    width: 1440,
    height: 900,
  }));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedUrl(url, tenant)) return { action: 'allow' };
    shell.openExternal(url).catch(() => {});
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAllowedUrl(url, tenant)) {
      event.preventDefault();
      shell.openExternal(url).catch(() => {});
    }
  });

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.key === 'F11' && input.type === 'keyDown') {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
    }
  });

  mainWindow.loadURL(tenantUrl(tenant));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => { mainWindow = null; });
}

ipcMain.handle('pmd:get-config', () => readSettings());
ipcMain.handle('pmd:save-tenant', (_event, rawTenant) => {
  const tenant = normalizeTenant(rawTenant);
  saveSettings({ tenant });
  if (setupWindow && !setupWindow.isDestroyed()) setupWindow.close();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  createCashierWindow();
  return { ok: true, tenant };
});
ipcMain.handle('pmd:reset-tenant', () => {
  saveSettings({ tenant: '' });
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.close();
  createSetupWindow();
  return { ok: true };
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const target = mainWindow || setupWindow;
    if (target && !target.isDestroyed()) {
      if (target.isMinimized()) target.restore();
      target.focus();
    }
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);

    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
      callback(false);
    });

    createCashierWindow();
  });

  app.on('activate', () => {
    if (!mainWindow && !setupWindow) createCashierWindow();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
