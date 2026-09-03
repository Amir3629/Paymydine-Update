'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const { execFile, execFileSync, spawn } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PASSWORD_SHA256 = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';

let installed = false;
let mainWindow = null;
let unlockWindow = null;
let allowQuit = false;
let developerDesktop = false;
let lockdownPoliciesApplied = false;
const decoratedWindows = new WeakSet();

function programDataRoot() {
  return process.env.ProgramData || 'C:\\ProgramData';
}

function markerPath() {
  return path.join(programDataRoot(), 'PayMyDine', 'device-mode.json');
}

function readMarker() {
  if (process.platform !== 'win32') return { enabled: false, platform: process.platform };
  try {
    const parsed = JSON.parse(fs.readFileSync(markerPath(), 'utf8')) || {};
    return Object.assign({ enabled: false, platform: process.platform }, parsed);
  } catch (_) {
    return { enabled: false, platform: process.platform };
  }
}

function deviceModeEnabled() {
  return process.platform === 'win32' && readMarker().enabled === true;
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

function runReg(args) {
  if (process.platform !== 'win32') return;
  try { execFileSync('reg.exe', args, { windowsHide: true, stdio: 'ignore' }); } catch (_) {}
}

function applyUserLockdownPolicies() {
  if (process.platform !== 'win32' || !deviceModeEnabled() || developerDesktop || lockdownPoliciesApplied) return;
  runReg(['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System', '/v', 'DisableTaskMgr', '/t', 'REG_DWORD', '/d', '1', '/f']);
  runReg(['add', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer', '/v', 'NoWinKeys', '/t', 'REG_DWORD', '/d', '1', '/f']);
  lockdownPoliciesApplied = true;
}

function relaxUserLockdownPolicies() {
  if (process.platform !== 'win32') return;
  runReg(['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System', '/v', 'DisableTaskMgr', '/f']);
  runReg(['delete', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\Explorer', '/v', 'NoWinKeys', '/f']);
  lockdownPoliciesApplied = false;
}

function applyKioskWindow(win) {
  if (!win || win.isDestroyed() || !deviceModeEnabled() || developerDesktop) return;
  mainWindow = win;
  applyUserLockdownPolicies();

  try { win.setMenuBarVisibility(false); } catch (_) {}
  try { win.setAutoHideMenuBar(true); } catch (_) {}
  try { win.setFullScreen(true); } catch (_) {}
  try { win.setKiosk(true); } catch (_) {}

  if (!decoratedWindows.has(win)) {
    decoratedWindows.add(win);

    win.on('close', (event) => {
      if (!deviceModeEnabled() || developerDesktop || allowQuit) return;
      event.preventDefault();
      try {
        if (win.isMinimized()) win.restore();
        win.show();
        win.focus();
        win.setKiosk(true);
      } catch (_) {}
    });

    win.webContents.on('before-input-event', (event, input) => {
      if (!deviceModeEnabled() || developerDesktop) return;
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

function scriptPath(name) {
  const packaged = path.join(process.resourcesPath, 'windows-device-mode', name);
  if (fs.existsSync(packaged)) return packaged;
  return path.resolve(__dirname, '..', 'scripts', 'windows', name);
}

function currentUserSid() {
  const output = execFileSync('whoami.exe', ['/user', '/fo', 'csv', '/nh'], {
    encoding: 'utf8',
    windowsHide: true,
  });
  const match = String(output || '').match(/S-\d-\d+(?:-\d+)+/i);
  if (!match) throw new Error('Could not determine the current Windows user SID.');
  return match[0];
}

function psSingleQuote(value) {
  return `'${String(value == null ? '' : value).replace(/'/g, "''")}'`;
}

function runElevatedScript(file, namedArgs) {
  return new Promise((resolve, reject) => {
    const pieces = ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', `"${file.replace(/"/g, '`"')}"`];
    Object.entries(namedArgs || {}).forEach(([key, value]) => {
      pieces.push(`-${key}`);
      pieces.push(`"${String(value).replace(/"/g, '`"')}"`);
    });
    const argumentString = pieces.join(' ');
    const command = [
      '$ErrorActionPreference="Stop"',
      `$p=Start-Process -FilePath 'powershell.exe' -Verb RunAs -Wait -PassThru -ArgumentList ${psSingleQuote(argumentString)}`,
      'exit $p.ExitCode',
    ].join('; ');

    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
      windowsHide: true,
      timeout: 120000,
      maxBuffer: 1024 * 1024,
    }, (error, stdout, stderr) => {
      if (error) {
        const detail = String(stderr || stdout || error.message || '').trim();
        reject(new Error(detail || 'Windows administrator approval was cancelled or Device Mode setup failed.'));
        return;
      }
      resolve({ ok: true, stdout: String(stdout || '').trim(), stderr: String(stderr || '').trim() });
    });
  });
}

function localSetupSender(event) {
  const raw = event && event.senderFrame ? String(event.senderFrame.url || '') : '';
  try {
    const url = new URL(raw);
    return url.protocol === 'file:' && /\/setup\.html$/.test(url.pathname);
  } catch (_) {
    return false;
  }
}

async function enableDeviceMode(event) {
  if (process.platform !== 'win32') throw new Error('Windows Device Mode is only available on Windows.');
  if (!localSetupSender(event)) throw new Error('Windows Device Mode can only be enabled from the local PayMyDine setup screen.');
  if (!app.isPackaged) throw new Error('Install the packaged PayMyDine Desktop app before enabling Windows Device Mode.');

  const sid = currentUserSid();
  const result = await runElevatedScript(scriptPath('enable-device-mode.ps1'), {
    AppPath: process.execPath,
    UserSid: sid,
  });

  const marker = readMarker();
  if (!marker.enabled) {
    throw new Error('Windows accepted the setup, but PayMyDine could not verify Shell Launcher. Reboot once and run Device Mode setup again.');
  }

  applyUserLockdownPolicies();
  try {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false,
      args: ['--pmd-device-mode'],
    });
  } catch (_) {}

  BrowserWindow.getAllWindows().forEach((win) => {
    if (isTenantAdminUrl(win.webContents.getURL())) applyKioskWindow(win);
  });

  return Object.assign({ ok: true, userSid: sid }, marker, { setupOutput: result.stdout });
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
  if (!deviceModeEnabled() || process.platform !== 'win32') return { ok: false, enabled: false };
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
      preload: path.join(__dirname, 'developer-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });
  unlockWindow.loadFile(path.join(__dirname, 'developer-unlock.html'));
  unlockWindow.once('ready-to-show', () => {
    if (!unlockWindow || unlockWindow.isDestroyed()) return;
    unlockWindow.show();
    unlockWindow.focus();
  });
  unlockWindow.on('closed', () => { unlockWindow = null; });
  return { ok: true };
}

function openWindowsDesktop() {
  developerDesktop = true;
  relaxUserLockdownPolicies();

  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setKiosk(false);
      mainWindow.setFullScreen(false);
      mainWindow.setAlwaysOnTop(false);
      mainWindow.hide();
    }
  } catch (_) {}

  const explorer = spawn('explorer.exe', [], {
    detached: true,
    windowsHide: false,
    stdio: 'ignore',
  });
  explorer.unref();
}

function installIpc() {
  ipcMain.handle('pmd:device-mode-state', () => {
    const marker = readMarker();
    return Object.assign({}, marker, {
      enabled: deviceModeEnabled(),
      developerDesktop,
      supportedStrictEditions: ['Enterprise', 'Enterprise LTSC', 'Education', 'IoT Enterprise', 'IoT Enterprise LTSC'],
    });
  });

  ipcMain.handle('pmd:device-mode-enable', (event) => enableDeviceMode(event));
  ipcMain.handle('pmd:developer-exit-open', () => openUnlockWindow());

  ipcMain.handle('pmd:developer-exit-submit', (event, password) => {
    if (!unlockWindow || unlockWindow.isDestroyed() || event.sender.id !== unlockWindow.webContents.id) {
      throw new Error('Untrusted developer unlock request.');
    }
    if (!comparePassword(password)) return { ok: false, message: 'Wrong password.' };
    closeUnlockWindow();
    openWindowsDesktop();
    return { ok: true };
  });

  ipcMain.on('pmd:developer-exit-cancel', (event) => {
    if (unlockWindow && !unlockWindow.isDestroyed() && event.sender.id === unlockWindow.webContents.id) closeUnlockWindow();
  });
}

function install() {
  if (installed) return;
  installed = true;

  installIpc();
  app.on('browser-window-created', (_event, win) => watchWindow(win));
  app.on('before-quit', () => { allowQuit = true; });

  app.whenReady().then(() => {
    if (process.platform === 'win32' && deviceModeEnabled()) {
      applyUserLockdownPolicies();
      try {
        app.setLoginItemSettings({ openAtLogin: true, openAsHidden: false, args: ['--pmd-device-mode'] });
      } catch (_) {}
    }
    BrowserWindow.getAllWindows().forEach((win) => watchWindow(win));
  });
}

module.exports = { install, readMarker, deviceModeEnabled };
