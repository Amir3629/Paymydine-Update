'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MARK = 'PMD_CASHIER_PRINTER_COMPAT_V109';

function fail(message) {
  throw new Error(`V1.0.9 printer-compat patch refused: ${message}`);
}

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function write(relative, text) {
  fs.writeFileSync(path.join(ROOT, relative), text, 'utf8');
}

function patchMain() {
  const relative = 'src/main.js';
  let source = read(relative);
  if (source.includes(MARK)) return;

  const anchor = 'async function printReceiptRemoteUrl(rawUrl) {';
  if (!source.includes(anchor)) fail('printReceiptRemoteUrl anchor missing');

  const helpers = `// ${MARK}
async function extractReceiptTextPayload(webContents) {
  await waitForReceiptAssets(webContents);
  return webContents.executeJavaScript(\`(function(){
    var el = document.querySelector('.receipt') || document.querySelector('[data-pmd-receipt]') || document.body;
    if (!el) return { text: '', paperWidth: '80mm' };

    var clone = el.cloneNode(true);
    Array.prototype.slice.call(clone.querySelectorAll('script,style,button,img,svg')).forEach(function(node){
      if (node && node.parentNode) node.parentNode.removeChild(node);
    });

    Array.prototype.slice.call(clone.querySelectorAll('.sep')).forEach(function(node){
      node.textContent = '------------------------------------------------';
    });

    Array.prototype.slice.call(clone.querySelectorAll('.row')).forEach(function(node){
      var parts = Array.prototype.slice.call(node.children || []).map(function(child){
        return String(child.innerText || child.textContent || '').replace(/\\s+/g, ' ').trim();
      }).filter(Boolean);
      if (parts.length) node.textContent = parts.join('    ');
    });

    Array.prototype.slice.call(clone.querySelectorAll('tr')).forEach(function(node){
      var cells = Array.prototype.slice.call(node.querySelectorAll('th,td')).map(function(cell){
        return String(cell.innerText || cell.textContent || '').replace(/\\s+/g, ' ').trim();
      }).filter(Boolean);
      if (cells.length) node.textContent = cells.join('    ');
    });

    var text = String(clone.innerText || clone.textContent || '')
      .replace(/\\u00a0/g, ' ')
      .replace(/[ \\t]+\\n/g, '\\n')
      .replace(/\\n[ \\t]+/g, '\\n')
      .replace(/\\n{3,}/g, '\\n\\n')
      .trim();

    var paperWidth = '80mm';
    try {
      paperWidth = String(getComputedStyle(document.body).getPropertyValue('--pmd-page-width') || '80mm').trim() || '80mm';
    } catch (_) {}

    return { text: text, paperWidth: paperWidth };
  })()\`, true);
}

async function printWindowsDriverTextRemoteUrl(rawUrl) {
  const settings = readSettings();
  const tenant = normalizeTenant(settings.tenant);
  if (!isAllowedRemoteUrl(rawUrl, tenant)) throw new Error('Only this restaurant can be printed from the Cashier app.');
  if (!settings.printerName) throw new Error('Choose a receipt printer first.');

  const printWindow = new BrowserWindow({
    width: 520,
    height: 1200,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      session: session.defaultSession,
    },
  });

  try {
    await printWindow.loadURL(rawUrl);
    await new Promise((resolve) => setTimeout(resolve, 220));
    const payload = await extractReceiptTextPayload(printWindow.webContents);
    if (!payload || !String(payload.text || '').trim()) {
      throw new Error('Receipt page rendered without printable text.');
    }
    return receipt.printWindowsDriverText(
      hardware,
      hardwareDataDir(),
      settings.printerName,
      payload.text,
      payload.paperWidth || '80mm',
    );
  } finally {
    if (!printWindow.isDestroyed()) printWindow.close();
  }
}

async function printSystemDriverTest(printerName) {
  const selected = hardware.resolvePrinterName(printerName);
  if (typeof hardware.assertPrinterAvailable === 'function') hardware.assertPrinterAvailable(selected);

  const html = '<!doctype html><html><head><meta charset="utf-8"><style>@page{size:80mm 70mm;margin:4mm}body{font-family:Arial,sans-serif;color:#111;background:#fff;font-size:13px}h1{font-size:17px;margin:0 0 8px}p{margin:4px 0}</style></head><body><h1>PayMyDine Cashier</h1><p>Printer driver test</p><p>Windows/macOS print pipeline OK</p><p>' + new Date().toLocaleString() + '</p></body></html>';
  const testWindow = new BrowserWindow({
    show: false,
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });

  try {
    await testWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return await new Promise((resolve, reject) => {
      testWindow.webContents.print({
        silent: true,
        printBackground: true,
        deviceName: selected,
        margins: { marginType: 'none' },
      }, (success, failureReason) => {
        if (!success) {
          reject(new Error(failureReason || 'Printer driver test failed.'));
          return;
        }
        resolve({
          ok: true,
          printerName: selected,
          mode: 'system-driver-test',
          physicalConfirmed: false,
          message: 'The operating system accepted the driver-rendered test. Check the physical printer for paper output.',
        });
      });
    });
  } finally {
    if (!testWindow.isDestroyed()) testWindow.close();
  }
}

async function printPhysicalTestOutput(printerName) {
  const selected = hardware.resolvePrinterName(printerName);
  const printerInfo = findConfiguredPrinter(selected);
  if (receipt.shouldUseWindowsDriverText(printerInfo)) {
    return receipt.printWindowsDriverText(
      hardware,
      hardwareDataDir(),
      selected,
      ['PayMyDine Cashier', 'Windows driver text test', 'Printer: ' + selected, new Date().toLocaleString()].join('\\n'),
      '80mm',
    );
  }
  return printSystemDriverTest(selected);
}
`;

  source = source.replace(anchor, `${helpers}\n${anchor}`);

  const receiptFunction = /async function printReceiptRemoteUrl\(rawUrl\) \{[\s\S]*?\n\}\n\nasync function resetTenant/;
  if (!receiptFunction.test(source)) fail('printReceiptRemoteUrl function block missing');
  source = source.replace(
    receiptFunction,
    `async function printReceiptRemoteUrl(rawUrl) {
  const settings = readSettings();
  const tenant = normalizeTenant(settings.tenant);
  if (!isAllowedRemoteUrl(rawUrl, tenant)) throw new Error('Only this restaurant can be printed from the Cashier app.');
  if (isVirtualPdfMode(settings)) return printVirtualPdfRemoteUrl(rawUrl);
  if (!settings.printerName) throw new Error('Choose a receipt printer first.');

  const printerInfo = findConfiguredPrinter(settings.printerName);

  // ${MARK}: Generic / Text Only is a Windows DRIVER identity, not proof that
  // the physical printer understands ESC/POS graphics. Use the driver-safe text
  // path instead of blindly sending GS v 0 raster bytes.
  if (receipt.shouldUseWindowsDriverText(printerInfo)) {
    return printWindowsDriverTextRemoteUrl(rawUrl);
  }

  return printRemoteUrl(rawUrl);
}

async function resetTenant`,
  );

  const testHandler = /ipcMain\.handle\('pmd:test-print', \(event, printerName\) => \{[\s\S]*?\n\}\);/;
  if (!testHandler.test(source)) fail('pmd:test-print handler missing');
  source = source.replace(
    testHandler,
    `ipcMain.handle('pmd:test-print', (event, printerName) => {
  assertTrustedSender(event, true);
  const settings = readSettings();
  if (isVirtualPdfMode(settings)) return createVirtualTestPdf();
  return printPhysicalTestOutput(printerName || settings.printerName);
});`,
  );

  const required = [
    MARK,
    'printWindowsDriverTextRemoteUrl',
    'shouldUseWindowsDriverText',
    'printPhysicalTestOutput',
    "mode: 'system-driver-test'",
  ];
  required.forEach((value) => {
    if (!source.includes(value)) fail(`main contract missing: ${value}`);
  });

  write(relative, source);
}

function patchHardwarePage() {
  const relative = 'src/hardware-page.js';
  let source = read(relative);
  if (source.includes(MARK)) return;

  const metaNeedle = "  const details = [row.driver, row.port, row.default ? `${platformName} default` : '', row.offline ? 'Offline' : 'Online'].filter(Boolean);\n  printerMeta.textContent = details.join(' · ');";
  if (!source.includes(metaNeedle)) fail('hardware-page printer meta anchor missing');

  source = source.replace(
    metaNeedle,
    `  const details = [row.driver, row.port, row.default ? \`${'${platformName}'} default\` : '', row.offline ? 'Offline' : 'Online'].filter(Boolean);
  const identity = (String(row.name || '') + ' ' + String(row.driver || '')).toLowerCase();
  const genericText = /generic\\s*\\/\\s*text\\s*only|generic.*text.*only|text\\s*only/.test(identity); // ${MARK}
  if (genericText) details.push('Driver-safe text mode');
  printerMeta.textContent = details.join(' · ');`,
  );

  write(relative, source);
}

function patchHardwareHtml() {
  const relative = 'src/hardware.html';
  let source = read(relative);
  if (source.includes(MARK)) return;

  const needle = '        <div class="printer-meta" id="printer-meta"></div>';
  if (!source.includes(needle)) fail('hardware.html printer meta anchor missing');
  source = source.replace(
    needle,
    `${needle}\n        <!-- ${MARK} -->\n        <p class="printer-meta">For best logo/graphics output, install the receipt printer manufacturer\'s Windows driver. If the queue is <b>Generic / Text Only</b>, PayMyDine automatically switches to driver-safe text receipt mode instead of assuming ESC/POS raster compatibility.</p>`,
  );

  write(relative, source);
}

patchMain();
patchHardwarePage();
patchHardwareHtml();
console.log('PMD_CASHIER_PRINTER_COMPAT_V109_PATCH_OK');
