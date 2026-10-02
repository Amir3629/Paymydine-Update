'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const PASSWORD_SHA256 = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';
const APPLIANCE_CONFIG = '/etc/paymydine/appliance-mode.json';
const decoratedWindows = new WeakSet();

let installed = false;
let mainWindow = null;
let unlockWindow = null;
let allowQuit = false;
let developerExitRequested = false;

function readJsonSafe(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')) || {};
  } catch (_) {
    return null;
  }
}

function readApplianceConfig() {
  if (process.platform !== 'linux') return { enabled: false, platform: process.platform };
  return Object.assign({ enabled: false, platform: 'linux' }, readJsonSafe(APPLIANCE_CONFIG) || {});
}

function applianceEnabled() {
  return process.platform === 'linux' && readApplianceConfig().enabled === true;
}

function developerMarkerPath() {
  return path.join(os.homedir(), '.config', 'paymydine', 'developer-desktop-once');
}

function settingsTenant() {
  try {
    const file = path.join(app.getPath('userData'), 'settings.json');
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) || {};
    let tenant = String(parsed.tenant || '').trim().toLowerCase();
    tenant = tenant.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (/^[a-z0-9][a-z0-9-]*$/.test(tenant)) tenant = `${tenant}.paymydine.com`;
    return /^[a-z0-9][a-z0-9-]*\.paymydine\.com$/.test(tenant) ? tenant : '';
  } catch (_) {
    return '';
  }
}

function isTenantAdminUrl(rawUrl) {
  const tenant = settingsTenant();
  if (!tenant) return false;
  try {
    const url = new URL(String(rawUrl || ''));
    return url.protocol === 'https:' && url.hostname === tenant && /^\/admin(?:\/|$)/.test(url.pathname);
  } catch (_) {
    return false;
  }
}

function applyKioskWindow(win) {
  if (!win || win.isDestroyed() || !applianceEnabled() || developerExitRequested) return;
  mainWindow = win;

  try { win.setMenuBarVisibility(false); } catch (_) {}
  try { win.setAutoHideMenuBar(true); } catch (_) {}
  try { win.setFullScreen(true); } catch (_) {}
  try { win.setKiosk(true); } catch (_) {}
  try { win.setAlwaysOnTop(false); } catch (_) {}

  if (decoratedWindows.has(win)) return;
  decoratedWindows.add(win);

  win.on('close', (event) => {
    if (!applianceEnabled() || developerExitRequested || allowQuit) return;
    event.preventDefault();
    try {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
      win.setKiosk(true);
    } catch (_) {}
  });

  win.webContents.on('before-input-event', (event, input) => {
    if (!applianceEnabled() || developerExitRequested) return;
    const key = String(input && input.key || '').toLowerCase();
    const blocked = (
      (input.alt && key === 'f4')
      || key === 'f11'
      || key === 'f12'
      || ((input.control || input.meta) && input.shift && key === 'i')
      || ((input.control || input.meta) && key === 'w')
      || ((input.control || input.meta) && key === 'q')
    );
    if (blocked) event.preventDefault();
  });
}

function watchWindow(win) {
  if (!win || win.isDestroyed()) return;
  const maybeApply = (_event, url) => {
    const candidate = url || win.webContents.getURL();
    if (isTenantAdminUrl(candidate)) applyKioskWindow(win);
  };
  win.webContents.on('did-start-navigation', maybeApply);
  win.webContents.on('did-navigate', maybeApply);
  win.webContents.on('did-finish-load', () => maybeApply(null, win.webContents.getURL()));
}

function comparePassword(value) {
  const actual = crypto.createHash('sha256').update(String(value || ''), 'utf8').digest();
  const expected = Buffer.from(PASSWORD_SHA256, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function closeUnlockWindow() {
  if (unlockWindow && !unlockWindow.isDestroyed()) unlockWindow.close();
  unlockWindow = null;
}

function openUnlockWindow() {
  if (!applianceEnabled()) return { ok: false, enabled: false };
  if (unlockWindow && !unlockWindow.isDestroyed()) {
    unlockWindow.show();
    unlockWindow.focus();
    return { ok: true, alreadyOpen: true };
  }

  unlockWindow = new BrowserWindow({
    width: 430,
    height: 310,
    minWidth: 430,
    minHeight: 310,
    maxWidth: 430,
    maxHeight: 310,
    resizable: false,
    modal: Boolean(mainWindow && !mainWindow.isDestroyed()),
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
    alwaysOnTop: true,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f8fbfc',
    webPreferences: {
      preload: path.join(__dirname, 'linux-developer-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  unlockWindow.loadFile(path.join(__dirname, 'linux-developer-unlock.html'));
  unlockWindow.once('ready-to-show', () => {
    if (!unlockWindow || unlockWindow.isDestroyed()) return;
    unlockWindow.show();
    unlockWindow.focus();
  });
  unlockWindow.on('closed', () => { unlockWindow = null; });
  return { ok: true };
}

function requestDeveloperDesktop() {
  const marker = developerMarkerPath();
  fs.mkdirSync(path.dirname(marker), { recursive: true, mode: 0o700 });
  fs.writeFileSync(marker, `${new Date().toISOString()}\n`, { encoding: 'utf8', mode: 0o600 });
  developerExitRequested = true;
  allowQuit = true;

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
    }
  } catch (_) {}

  setTimeout(() => app.quit(), 120);
}

function installIpc() {
  ipcMain.handle('pmd:linux-appliance-state', () => Object.assign({}, readApplianceConfig(), {
    enabled: applianceEnabled(),
    developerExitRequested,
  }));

  ipcMain.handle('pmd:linux-developer-exit-open', () => openUnlockWindow());

  ipcMain.handle('pmd:linux-developer-exit-submit', (event, password) => {
    if (!unlockWindow || unlockWindow.isDestroyed() || event.sender.id !== unlockWindow.webContents.id) {
      throw new Error('Untrusted developer unlock request.');
    }
    if (!comparePassword(password)) return { ok: false, message: 'Wrong password.' };
    closeUnlockWindow();
    requestDeveloperDesktop();
    return { ok: true };
  });

  ipcMain.on('pmd:linux-developer-exit-cancel', (event) => {
    if (unlockWindow && !unlockWindow.isDestroyed() && event.sender.id === unlockWindow.webContents.id) {
      closeUnlockWindow();
    }
  });
}

function install() {
  if (installed) return;
  installed = true;
  if (process.platform !== 'linux') return;

  installIpc();
  app.on('browser-window-created', (_event, win) => watchWindow(win));
  app.on('before-quit', () => { allowQuit = true; });

  app.whenReady().then(() => {
    BrowserWindow.getAllWindows().forEach((win) => watchWindow(win));
  });
}

module.exports = { install, readApplianceConfig, applianceEnabled, developerMarkerPath };
