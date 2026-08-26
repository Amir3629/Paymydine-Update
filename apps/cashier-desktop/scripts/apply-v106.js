'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function fail(message) {
  throw new Error(`PMD V1.0.6 patch refused: ${message}`);
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), 'utf8');
}

function write(relative, text) {
  fs.writeFileSync(path.join(root, relative), text, 'utf8');
}

function replaceRequired(text, needle, replacement, label) {
  if (!text.includes(needle)) fail(`${label || needle} anchor missing`);
  return text.replace(needle, replacement);
}

function replaceRegexRequired(text, regex, replacement, label) {
  if (!regex.test(text)) fail(`${label} anchor missing`);
  return text.replace(regex, replacement);
}

function patchHardware() {
  const relative = 'src/hardware.js';
  let text = read(relative);
  if (text.includes('PMD_CASHIER_HARDWARE_TRUTH_V106')) return;

  const macBlock = `// PMD_CASHIER_HARDWARE_TRUTH_V106
function normalizePrinterKey(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function macSystemPrinterStatuses() {
  const output = safeCommand('/usr/sbin/system_profiler', ['SPPrintersDataType']);
  const statuses = {};
  let current = '';
  output.split(/\\r?\\n/).forEach((line) => {
    const header = line.match(/^\\s{4}([^:]+):\\s*$/);
    if (header && header[1].trim().toLowerCase() !== 'printers') {
      current = header[1].trim();
      return;
    }
    const status = line.match(/^\\s{6,}Status:\\s*(.+)$/i);
    if (current && status) statuses[normalizePrinterKey(current)] = status[1].trim();
  });
  return statuses;
}

function isUnavailableStatus(value) {
  return /(offline|stopped|disabled|unable|not available|looking for printer|error)/i.test(String(value || ''));
}

function listPrintersMac() {
  const printerOutput = safeCommand('/usr/bin/lpstat', ['-p']);
  const defaultOutput = safeCommand('/usr/bin/lpstat', ['-d']);
  const deviceOutput = safeCommand('/usr/bin/lpstat', ['-v']);
  const physicalStatuses = macSystemPrinterStatuses();

  const defaultMatch = defaultOutput.match(/system default destination:\\s*(.+)$/im);
  const defaultName = defaultMatch ? defaultMatch[1].trim() : '';

  const devices = {};
  deviceOutput.split(/\\r?\\n/).forEach((line) => {
    const match = line.match(/^device for\\s+(.+?):\\s*(.+)$/i);
    if (match) devices[match[1].trim()] = match[2].trim();
  });

  const rows = [];
  printerOutput.split(/\\r?\\n/).forEach((line) => {
    const match = line.match(/^printer\\s+(.+?)\\s+(?:is\\s+|disabled\\s+|now\\s+printing\\s+)/i);
    if (!match) return;
    const name = match[1].trim();
    if (!name || rows.some((row) => row.name === name)) return;
    const uri = devices[name] || '';
    const systemStatus = physicalStatuses[normalizePrinterKey(name)] || '';
    const cupsStatus = /\\bdisabled\\b/i.test(line)
      ? 'Disabled'
      : (/\\bidle\\b/i.test(line) ? 'Idle' : line.replace(/^printer\\s+\\S+\\s*/i, '').trim());
    const status = systemStatus || cupsStatus || 'Unknown';
    const offline = /\\bdisabled\\b/i.test(line) || isUnavailableStatus(status);
    rows.push({
      name,
      driver: 'macOS CUPS',
      port: uri,
      default: name === defaultName,
      network: /^(ipp|ipps|lpd|socket|smb|dnssd):/i.test(uri),
      offline,
      status,
      platform: 'macOS',
    });
  });

  return rows;
}

function printerAvailability(row) {
  if (!row) return { available: false, reason: 'Printer queue not found.' };
  const windowsCode = row.platform === 'windows' ? Number(row.status) : 0;
  const unavailable = Boolean(row.offline)
    || windowsCode === 6
    || windowsCode === 7
    || isUnavailableStatus(row.status);
  return {
    available: !unavailable,
    reason: unavailable ? String(row.status || 'Offline') : String(row.status || 'Available'),
  };
}

function assertPrinterAvailable(printerName) {
  const target = resolvePrinterName(printerName);
  const wanted = String(target || '').trim().toLowerCase();
  const row = listPrinters().find((item) => String(item && item.name || '').trim().toLowerCase() === wanted);
  const state = printerAvailability(row);
  if (!state.available) {
    throw new Error(`Printer "${target}" is not physically available (${state.reason}). Connect/enable the printer or use Virtual PDF mode.`);
  }
  return row;
}
`;

  text = replaceRegexRequired(
    text,
    /function listPrintersMac\(\) \{[\s\S]*?\n\}\n\nfunction listPrinters\(\)/,
    `${macBlock}\nfunction listPrinters()`,
    'listPrintersMac',
  );

  text = replaceRegexRequired(
    text,
    /function sendRaw\(baseDir, printerName, bytes\) \{[\s\S]*?\n\}/,
    `function sendRaw(baseDir, printerName, bytes) {
  ensureSupportedPlatform();
  const printerInfo = assertPrinterAvailable(printerName);
  const targetPrinter = printerInfo.name;
  if (process.platform === 'darwin') {
    sendRawMac(baseDir, targetPrinter, bytes);
  } else {
    sendRawWindows(baseDir, targetPrinter, bytes);
  }
  return {
    printerName: targetPrinter,
    queueAccepted: true,
    physicalConfirmed: false,
    status: printerInfo.status,
    port: printerInfo.port || '',
    platform: process.platform,
  };
}`,
    'sendRaw',
  );

  text = replaceRegexRequired(
    text,
    /function testPrint\(baseDir, printerName\) \{[\s\S]*?\n\}/,
    `function testPrint(baseDir, printerName) {
  const text = ['PayMyDine Cashier', 'Printer queue test', new Date().toLocaleString(), '', ''].join('\\r\\n');
  const delivery = sendRaw(baseDir, printerName, Buffer.from(text, 'ascii'));
  return {
    ok: true,
    queueAccepted: true,
    physicalConfirmed: false,
    printerName: delivery.printerName,
    status: delivery.status,
    platform: process.platform,
    message: 'The operating system accepted the print job. Physical paper output is not confirmed by software.',
  };
}`,
    'testPrint',
  );

  text = replaceRegexRequired(
    text,
    /function openDrawer\(baseDir, printerName, command\) \{[\s\S]*?\n\}/,
    `function openDrawer(baseDir, printerName, command) {
  const bytes = parseDrawerCommand(command);
  const delivery = sendRaw(baseDir, printerName, bytes);
  return {
    ok: true,
    queueAccepted: true,
    commandSent: true,
    physicalConfirmed: false,
    printerName: delivery.printerName,
    status: delivery.status,
    command: String(command || DEFAULT_DRAWER_COMMAND),
    bytes: Array.from(bytes),
    platform: process.platform,
    message: 'Drawer pulse was accepted by the operating system. Physical opening must be confirmed by a person.',
  };
}`,
    'openDrawer',
  );

  text = replaceRegexRequired(
    text,
    /async function diagnoseDrawer\(baseDir, printerName\) \{[\s\S]*?\n\}/,
    `async function diagnoseDrawer(baseDir, printerName) {
  const attempts = [];
  for (const command of DRAWER_COMMANDS) {
    try {
      attempts.push({ command, ...openDrawer(baseDir, printerName, command) });
    } catch (error) {
      attempts.push({ command, ok: false, commandSent: false, error: error.message });
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
  }
  return {
    ok: attempts.some((row) => row.commandSent),
    commandsSent: attempts.filter((row) => row.commandSent).length,
    physicalConfirmed: false,
    attempts,
    platform: process.platform,
    message: 'Compatible drawer pulses were sent. Software cannot confirm that the physical drawer opened.',
  };
}`,
    'diagnoseDrawer',
  );

  text = replaceRequired(
    text,
    '  resolvePrinterName,\n  testPrint,',
    '  resolvePrinterName,\n  assertPrinterAvailable,\n  testPrint,',
    'hardware exports',
  );

  write(relative, text);
}

function patchHardwarePage() {
  const relative = 'src/hardware-page.js';
  let text = read(relative);
  if (text.includes('PMD_HARDWARE_TRUTH_UI_V106')) return;

  text = replaceRequired(
    text,
    "const platformName = window.PayMyDineDesktop.platform === 'darwin' ? 'macOS' : 'Windows';",
    "const platformName = window.PayMyDineDesktop.platform === 'darwin' ? 'macOS' : 'Windows';\n// PMD_HARDWARE_TRUTH_UI_V106",
    'hardware UI marker',
  );

  text = replaceRegexRequired(
    text,
    /testPrintButton\.addEventListener\('click', async \(\) => \{[\s\S]*?\n\}\);/,
    `testPrintButton.addEventListener('click', async () => {
  try {
    await save();
    if (isVirtual()) {
      await run('Virtual PDF test', () => window.PayMyDineDesktop.testPrint(selectedPrinter() || savedPrinterName));
      return;
    }
    setBusy(true);
    setStatus('Sending test print to the operating-system queue…');
    const result = await window.PayMyDineDesktop.testPrint(selectedPrinter() || savedPrinterName);
    setStatus(
      `Print job accepted by ${platformName}.\\nPrinter: ${result.printerName || selectedPrinter()}\\nStatus: ${result.status || 'available'}\\n\\nIMPORTANT: this confirms queue delivery only. Check the printer for real paper output.`,
      '',
    );
  } catch (error) {
    setStatus(error.message || 'Test print failed.', 'error');
  } finally {
    setBusy(false);
  }
});`,
    'test print click',
  );

  text = replaceRegexRequired(
    text,
    /testDrawerButton\.addEventListener\('click', async \(\) => \{[\s\S]*?\n\}\);/,
    `testDrawerButton.addEventListener('click', async () => {
  try {
    await save();
    setBusy(true);
    setStatus('Sending cash drawer pulse…');
    const result = await window.PayMyDineDesktop.testDrawer({
      printerName: selectedPrinter() || savedPrinterName,
      command: drawerCommand.value,
    });
    const confirmed = window.confirm('Did the physical cash drawer actually open? Click OK only if you saw it open.');
    if (confirmed) {
      setStatus(`Cash drawer physically confirmed by you.\\nPrinter: ${result.printerName || selectedPrinter()}\\nCommand: ${result.command || drawerCommand.value}`, 'ok');
    } else {
      setStatus(`Drawer command was accepted by ${platformName}, but physical opening is NOT confirmed.\\nThis is not a successful hardware test until the drawer really opens.`, 'error');
    }
  } catch (error) {
    setStatus(error.message || 'Cash drawer test failed.', 'error');
  } finally {
    setBusy(false);
  }
});`,
    'drawer click',
  );

  text = replaceRegexRequired(
    text,
    /diagnoseButton\.addEventListener\('click', async \(\) => \{[\s\S]*?\n\}\);/,
    `diagnoseButton.addEventListener('click', async () => {
  try {
    await save();
    setBusy(true);
    setStatus('Trying compatible drawer pulses…');
    const result = await window.PayMyDineDesktop.diagnoseDrawer(selectedPrinter() || savedPrinterName);
    const confirmed = window.confirm('Did any of the test pulses physically open the cash drawer?');
    if (confirmed) {
      setStatus(`Drawer compatibility physically confirmed by you.\\nCommands sent: ${result.commandsSent || 0}`, 'ok');
    } else {
      setStatus(`Compatibility commands were sent, but no physical opening was confirmed.\\nCommands sent: ${result.commandsSent || 0}`, 'error');
    }
  } catch (error) {
    setStatus(error.message || 'Drawer compatibility test failed.', 'error');
  } finally {
    setBusy(false);
  }
});`,
    'diagnose click',
  );

  text = text.replace(
    "setStatus(`Cash payment completed. Drawer command sent${event.orderId ? ` for order #${event.orderId}` : ''}.`, 'ok');",
    "setStatus(`Cash payment completed. Drawer command was sent${event.orderId ? ` for order #${event.orderId}` : ''}. Physical opening cannot be confirmed by software.`, '');",
  );

  text = text.replace(
    "setStatus('Receipt printed.', 'ok');",
    "setStatus('Receipt job was accepted by the printer queue. Check the physical printer for paper output.', '');",
  );

  write(relative, text);
}

function patchMain() {
  const relative = 'src/main.js';
  let text = read(relative);
  if (text.includes('PMD_CASHIER_FULLSCREEN_V106')) return;

  text = replaceRequired(
    text,
    "function focusCashier() {\n  if (!mainWindow || mainWindow.isDestroyed()) {\n    createCashierWindow();\n    return;\n  }\n  if (mainWindow.isMinimized()) mainWindow.restore();\n  mainWindow.show();\n  mainWindow.focus();\n}",
    `// PMD_CASHIER_FULLSCREEN_V106
function isLoginOrLogoutUrl(rawUrl, tenant) {
  try {
    const url = new URL(rawUrl);
    if (url.hostname !== tenant) return false;
    return /^\\/admin\\/(?:login|logout)(?:\\/|$)/i.test(url.pathname);
  } catch (_) {
    return false;
  }
}

function applyCashierDisplayMode(rawUrl, tenant) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (isLoginOrLogoutUrl(rawUrl, tenant)) {
    if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
    setTimeout(() => {
      if (!mainWindow || mainWindow.isDestroyed() || mainWindow.isFullScreen()) return;
      mainWindow.setSize(980, 720, true);
      mainWindow.center();
    }, 280);
    return;
  }
  if (isAllowedRemoteUrl(rawUrl, tenant) && !mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(true);
  }
}

function focusCashier() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createCashierWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  const tenant = readSettings().tenant;
  mainWindow.show();
  if (tenant) applyCashierDisplayMode(mainWindow.webContents.getURL(), tenant);
  mainWindow.focus();
}`,
    'focusCashier',
  );

  text = replaceRequired(
    text,
    "mainWindow = new BrowserWindow(secureWindowOptions({ width: 1440, height: 900 }));",
    "mainWindow = new BrowserWindow(secureWindowOptions({ width: 1440, height: 900, minWidth: 900, minHeight: 650, fullscreen: true, autoHideMenuBar: true }));",
    'cashier window',
  );

  text = replaceRequired(
    text,
    "  mainWindow.webContents.on('will-navigate', (event, url) => {",
    "  mainWindow.webContents.on('did-navigate', (_event, url) => applyCashierDisplayMode(url, tenant));\n  mainWindow.webContents.on('did-navigate-in-page', (_event, url) => applyCashierDisplayMode(url, tenant));\n\n  mainWindow.webContents.on('will-navigate', (event, url) => {",
    'navigation display hooks',
  );

  text = replaceRequired(
    text,
    "  mainWindow.once('ready-to-show', () => mainWindow.show());",
    "  mainWindow.once('ready-to-show', () => { mainWindow.show(); applyCashierDisplayMode(mainWindow.webContents.getURL(), tenant); });",
    'ready-to-show',
  );

  text = text.replace(
    "  if (!settings.printerName) throw new Error('Choose a receipt printer first.');\n\n  return new Promise((resolve, reject) => {",
    "  if (!settings.printerName) throw new Error('Choose a receipt printer first.');\n  hardware.assertPrinterAvailable(settings.printerName);\n\n  return new Promise((resolve, reject) => {",
  );

  text = text.replace(
    "  if (!settings.printerName) throw new Error('Choose a receipt printer first.');\n\n  const printerInfo = findConfiguredPrinter(settings.printerName);",
    "  if (!settings.printerName) throw new Error('Choose a receipt printer first.');\n  hardware.assertPrinterAvailable(settings.printerName);\n\n  const printerInfo = findConfiguredPrinter(settings.printerName);",
  );

  text = text.replace(
    "sendHardwareEvent({ type: 'cash-drawer-opened', orderId: meta.orderId, result });",
    "sendHardwareEvent({ type: 'cash-drawer-opened', orderId: meta.orderId, result, physicalConfirmed: false });",
  );

  write(relative, text);
}

patchHardware();
patchHardwarePage();
patchMain();
console.log('PMD_CASHIER_V106_PATCH_OK');
