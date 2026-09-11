'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MAIN = path.join(ROOT, 'src', 'main.js');

function mustReplace(source, needle, replacement, label) {
  if (source.includes(replacement)) return source;
  if (!source.includes(needle)) {
    throw new Error(`V1.0.4 patch anchor missing: ${label}`);
  }
  return source.replace(needle, replacement);
}

let source = fs.readFileSync(MAIN, 'utf8');

source = mustReplace(
  source,
  "function hardwareDataDir() {\n  return path.join(app.getPath('userData'), 'hardware');\n}\n",
  `function hardwareDataDir() {\n  return path.join(app.getPath('userData'), 'hardware');\n}\n\n// PMD_VIRTUAL_PDF_PRINT_V104\nfunction virtualPdfDir() {\n  return path.join(app.getPath('desktop'), 'PayMyDine Print Tests');\n}\n\nfunction isVirtualPdfMode(settings = readSettings()) {\n  return String(settings && settings.outputMode || 'physical') === 'pdf';\n}\n\nfunction hasConfiguredPrintTarget(settings = readSettings()) {\n  return isVirtualPdfMode(settings) || Boolean(String(settings && settings.printerName || '').trim());\n}\n\nfunction safePdfStem(value) {\n  const clean = String(value || 'PayMyDine-Receipt')\n    .replace(/[\\/:*?\"<>|]+/g, '-')\n    .replace(/\\s+/g, ' ')\n    .trim()\n    .slice(0, 80);\n  return clean || 'PayMyDine-Receipt';\n}\n\nfunction pdfTimestamp() {\n  const d = new Date();\n  const p = (n) => String(n).padStart(2, '0');\n  return [d.getFullYear(), p(d.getMonth() + 1), p(d.getDate()), '-', p(d.getHours()), p(d.getMinutes()), p(d.getSeconds())].join('');\n}\n\nasync function saveVirtualPdfBuffer(buffer, label, sourceUrl) {\n  const dir = virtualPdfDir();\n  fs.mkdirSync(dir, { recursive: true });\n  const filePath = path.join(dir, safePdfStem(label) + '-' + pdfTimestamp() + '.pdf');\n  fs.writeFileSync(filePath, buffer);\n  shell.openPath(filePath).catch(() => {});\n  return {\n    ok: true,\n    mode: 'virtual-pdf',\n    path: filePath,\n    sourceUrl: sourceUrl || null,\n    opened: true,\n  };\n}\n`,
  'virtual PDF helpers',
);

source = mustReplace(
  source,
  "    printerName: '',\n    autoPrintReceipt: true,",
  "    printerName: '',\n    outputMode: 'physical', // PMD_VIRTUAL_PDF_PRINT_V104\n    autoPrintReceipt: true,",
  'default outputMode',
);

source = mustReplace(
  source,
  "        if (RECEIPT_PATH.test(parsed.pathname) && readSettings().printerName) {",
  "        if (RECEIPT_PATH.test(parsed.pathname) && hasConfiguredPrintTarget(readSettings())) { // PMD_VIRTUAL_PDF_PRINT_V104",
  'receipt popup print target',
);

source = mustReplace(
  source,
  "  if (!settings.printerName) {\n    mainWindow.webContents.once('did-finish-load', () => setTimeout(() => createHardwareWindow(), 700));\n  }",
  "  if (!hasConfiguredPrintTarget(settings)) { // PMD_VIRTUAL_PDF_PRINT_V104\n    mainWindow.webContents.once('did-finish-load', () => setTimeout(() => createHardwareWindow(), 700));\n  }",
  'hardware setup prompt',
);

source = mustReplace(
  source,
  "function handleSuccessfulCashSettlement(meta) {\n  const settings = readSettings();\n  if (settings.autoOpenCash === false || !meta || !meta.key || handledCashKey(meta.key)) return;",
  `function handleSuccessfulCashSettlement(meta) {\n  const settings = readSettings();\n  if (settings.autoOpenCash === false || !meta || !meta.key || handledCashKey(meta.key)) return;\n  // PMD_VIRTUAL_PDF_PRINT_V104: debug mode must never touch physical drawer hardware.\n  if (isVirtualPdfMode(settings)) {\n    rememberCashKey(meta.key);\n    sendHardwareEvent({ type: 'cash-drawer-skipped', orderId: meta.orderId, reason: 'virtual-pdf-mode' });\n    return;\n  }`,
  'virtual drawer skip',
);

const printAnchor = "async function printRemoteUrl(rawUrl) {";
if (!source.includes('async function printVirtualPdfRemoteUrl(rawUrl) {')) {
  if (!source.includes(printAnchor)) throw new Error('V1.0.4 patch anchor missing: printRemoteUrl');
  source = source.replace(printAnchor, `async function printVirtualPdfRemoteUrl(rawUrl) {\n  const settings = readSettings();\n  const tenant = normalizeTenant(settings.tenant);\n  if (!isAllowedRemoteUrl(rawUrl, tenant)) throw new Error('Only this restaurant can be printed from the Cashier app.');\n\n  const printWindow = new BrowserWindow({\n    show: false,\n    webPreferences: {\n      contextIsolation: true,\n      nodeIntegration: false,\n      sandbox: true,\n      session: session.defaultSession,\n    },\n  });\n\n  try {\n    await printWindow.loadURL(rawUrl);\n    await waitForReceiptAssets(printWindow.webContents);\n    await new Promise((resolve) => setTimeout(resolve, 180));\n    const title = await printWindow.webContents.executeJavaScript(\n      \"String(document.title || document.querySelector('h1,h2')?.textContent || 'PayMyDine Receipt')\",\n      true,\n    ).catch(() => 'PayMyDine Receipt');\n    const pdf = await printWindow.webContents.printToPDF({\n      printBackground: true,\n      preferCSSPageSize: true,\n    });\n    return await saveVirtualPdfBuffer(pdf, title, rawUrl);\n  } finally {\n    if (!printWindow.isDestroyed()) printWindow.close();\n  }\n}\n\nasync function createVirtualTestPdf() {\n  const printWindow = new BrowserWindow({\n    show: false,\n    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },\n  });\n  const html = \`<!doctype html><html><head><meta charset=\"utf-8\"><style>@page{size:80mm 120mm;margin:5mm}body{font-family:Arial,sans-serif;padding:10px;color:#111}h1{font-size:20px}.ok{font-size:16px;font-weight:700}small{color:#555}</style></head><body><h1>PayMyDine Cashier</h1><p class=\"ok\">Virtual PDF output OK</p><p>This proves the Desktop App can render and create a printable document without physical hardware.</p><small>\${new Date().toLocaleString()}</small></body></html>\`;\n  try {\n    await printWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));\n    const pdf = await printWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });\n    return await saveVirtualPdfBuffer(pdf, 'PayMyDine-Virtual-Print-Test', null);\n  } finally {\n    if (!printWindow.isDestroyed()) printWindow.close();\n  }\n}\n\n${printAnchor}`);
}

source = mustReplace(
  source,
  "  if (!isAllowedRemoteUrl(rawUrl, tenant)) throw new Error('Only this restaurant can be printed from the Cashier app.');\n  if (!settings.printerName) throw new Error('Choose a receipt printer first.');\n\n  return new Promise((resolve, reject) => {",
  "  if (!isAllowedRemoteUrl(rawUrl, tenant)) throw new Error('Only this restaurant can be printed from the Cashier app.');\n  if (isVirtualPdfMode(settings)) return printVirtualPdfRemoteUrl(rawUrl); // PMD_VIRTUAL_PDF_PRINT_V104\n  if (!settings.printerName) throw new Error('Choose a receipt printer first.');\n\n  return new Promise((resolve, reject) => {",
  'system print virtual branch',
);

source = mustReplace(
  source,
  "  if (!isAllowedRemoteUrl(rawUrl, tenant)) throw new Error('Only this restaurant can be printed from the Cashier app.');\n  if (!settings.printerName) throw new Error('Choose a receipt printer first.');\n\n  const printerInfo = findConfiguredPrinter(settings.printerName);",
  "  if (!isAllowedRemoteUrl(rawUrl, tenant)) throw new Error('Only this restaurant can be printed from the Cashier app.');\n  if (isVirtualPdfMode(settings)) return printVirtualPdfRemoteUrl(rawUrl); // PMD_VIRTUAL_PDF_PRINT_V104\n  if (!settings.printerName) throw new Error('Choose a receipt printer first.');\n\n  const printerInfo = findConfiguredPrinter(settings.printerName);",
  'receipt print virtual branch',
);

source = mustReplace(
  source,
  "ipcMain.handle('pmd:save-hardware', (event, values) => {\n  assertTrustedSender(event, true);\n  const printerName = String(values && values.printerName || '').trim();\n  if (printerName) hardware.resolvePrinterName(printerName);",
  `ipcMain.handle('pmd:save-hardware', (event, values) => {\n  assertTrustedSender(event, true);\n  const outputMode = values && values.outputMode === 'pdf' ? 'pdf' : 'physical'; // PMD_VIRTUAL_PDF_PRINT_V104\n  const printerName = String(values && values.printerName || '').trim();\n  if (outputMode === 'physical') {\n    if (!printerName) throw new Error('Choose a receipt printer first.');\n    hardware.resolvePrinterName(printerName);\n  }`,
  'save hardware output mode',
);

source = mustReplace(
  source,
  "  return saveSettings({\n    printerName,\n    drawerCommand,",
  "  return saveSettings({\n    printerName,\n    outputMode, // PMD_VIRTUAL_PDF_PRINT_V104\n    drawerCommand,",
  'persist output mode',
);

source = mustReplace(
  source,
  "ipcMain.handle('pmd:test-print', (event, printerName) => {\n  assertTrustedSender(event, true);\n  const settings = readSettings();\n  return hardware.testPrint(hardwareDataDir(), printerName || settings.printerName);\n});",
  `ipcMain.handle('pmd:test-print', (event, printerName) => {\n  assertTrustedSender(event, true);\n  const settings = readSettings();\n  if (isVirtualPdfMode(settings)) return createVirtualTestPdf(); // PMD_VIRTUAL_PDF_PRINT_V104\n  return hardware.testPrint(hardwareDataDir(), printerName || settings.printerName);\n});`,
  'virtual test output',
);

source = mustReplace(
  source,
  "ipcMain.handle('pmd:test-drawer', (event, options) => {\n  assertTrustedSender(event, true);\n  const settings = readSettings();",
  "ipcMain.handle('pmd:test-drawer', (event, options) => {\n  assertTrustedSender(event, true);\n  const settings = readSettings();\n  if (isVirtualPdfMode(settings)) throw new Error('Cash drawer testing is disabled in Virtual PDF mode.'); // PMD_VIRTUAL_PDF_PRINT_V104",
  'virtual drawer test guard',
);

source = mustReplace(
  source,
  "ipcMain.handle('pmd:diagnose-drawer', (event, printerName) => {\n  assertTrustedSender(event, true);\n  const settings = readSettings();",
  "ipcMain.handle('pmd:diagnose-drawer', (event, printerName) => {\n  assertTrustedSender(event, true);\n  const settings = readSettings();\n  if (isVirtualPdfMode(settings)) throw new Error('Cash drawer diagnostics are disabled in Virtual PDF mode.'); // PMD_VIRTUAL_PDF_PRINT_V104",
  'virtual drawer diagnose guard',
);

fs.writeFileSync(MAIN, source, 'utf8');

const required = [
  'PMD_VIRTUAL_PDF_PRINT_V104',
  'printVirtualPdfRemoteUrl',
  'createVirtualTestPdf',
  "outputMode: 'physical'",
  "outputMode === 'pdf'",
  "mode: 'virtual-pdf'",
];
for (const marker of required) {
  if (!source.includes(marker)) throw new Error(`V1.0.4 contract missing: ${marker}`);
}

console.log('PMD_CASHIER_DESKTOP_V104_PATCH_OK');
