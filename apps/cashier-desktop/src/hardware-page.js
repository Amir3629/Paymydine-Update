'use strict';

const outputMode = document.getElementById('output-mode');
const physicalFields = document.getElementById('physical-printer-fields');
const virtualNote = document.getElementById('virtual-note');
const printer = document.getElementById('printer');
const printerMeta = document.getElementById('printer-meta');
const autoPrint = document.getElementById('auto-print');
const autoOpen = document.getElementById('auto-open');
const drawerCommand = document.getElementById('drawer-command');
const statusNode = document.getElementById('status');
const refreshButton = document.getElementById('refresh');
const testPrintButton = document.getElementById('test-print');
const testDrawerButton = document.getElementById('test-drawer');
const diagnoseButton = document.getElementById('diagnose');
const buttons = Array.from(document.querySelectorAll('button'));
const platformName = window.PayMyDineDesktop.platform === 'darwin' ? 'macOS' : 'Windows';
let printers = [];
let savedPrinterName = '';

function isVirtual() {
  return String(outputMode.value || 'physical') === 'pdf';
}

function setBusy(busy) {
  buttons.forEach((button) => { button.disabled = Boolean(busy); });
  if (!busy) applyModeUi();
}

function setStatus(message, type) {
  statusNode.textContent = message || '';
  statusNode.classList.toggle('ok', type === 'ok');
  statusNode.classList.toggle('error', type === 'error');
}

function selectedPrinter() {
  return String(printer.value || '').trim();
}

function renderPrinterMeta() {
  const row = printers.find((item) => item.name === selectedPrinter());
  if (!row) {
    printerMeta.textContent = '';
    return;
  }
  const details = [row.driver, row.port, row.default ? `${platformName} default` : '', row.offline ? 'Offline' : 'Online'].filter(Boolean);
  printerMeta.textContent = details.join(' · ');
}

function applyModeUi() {
  const virtual = isVirtual();
  physicalFields.hidden = virtual;
  virtualNote.hidden = !virtual;
  testPrintButton.textContent = virtual ? 'Test Virtual PDF' : 'Test print';
  autoOpen.disabled = virtual;
  testDrawerButton.disabled = virtual;
  diagnoseButton.disabled = virtual;
  drawerCommand.disabled = virtual;
  if (refreshButton) refreshButton.disabled = virtual;
}

async function loadPrinters(preferred) {
  if (isVirtual()) {
    applyModeUi();
    return;
  }
  setBusy(true);
  setStatus(`Reading ${platformName} printers…`);
  try {
    printers = await window.PayMyDineDesktop.listPrinters();
    printer.innerHTML = '';
    if (!printers.length) {
      printer.innerHTML = `<option value="">No ${platformName} printers found</option>`;
      setStatus(`No printer was found. You can use Virtual PDF mode now, or add the receipt printer in ${platformName} later.`, 'error');
      return;
    }

    printers.forEach((row) => {
      const option = document.createElement('option');
      option.value = row.name;
      option.textContent = row.name + (row.default ? ' — Default' : '') + (row.offline ? ' — Offline' : '');
      printer.appendChild(option);
    });

    const wanted = preferred && printers.find((row) => row.name === preferred)
      ? preferred
      : ((printers.find((row) => row.default && !row.offline) || printers.find((row) => !row.offline) || printers[0]).name);
    printer.value = wanted;
    savedPrinterName = wanted || savedPrinterName;
    renderPrinterMeta();
    setStatus(`${printers.length} printer(s) found on ${platformName}.`, 'ok');
  } catch (error) {
    printer.innerHTML = '<option value="">Could not read printers</option>';
    setStatus(error.message || `Could not read ${platformName} printers. Virtual PDF mode can still be used.`, 'error');
  } finally {
    setBusy(false);
  }
}

async function save() {
  const mode = isVirtual() ? 'pdf' : 'physical';
  const printerName = selectedPrinter() || savedPrinterName;
  if (mode === 'physical' && !printerName) throw new Error('Choose a receipt printer first, or select Virtual PDF.');
  const result = await window.PayMyDineDesktop.saveHardware({
    outputMode: mode,
    printerName,
    autoPrintReceipt: autoPrint.checked,
    autoOpenCash: autoOpen.checked,
    drawerCommand: drawerCommand.value,
  });
  if (printerName) savedPrinterName = printerName;
  return result;
}

async function run(label, task) {
  setBusy(true);
  setStatus(label + '…');
  try {
    const result = await task();
    setStatus(label + ' OK\n' + JSON.stringify(result, null, 2), 'ok');
    return result;
  } catch (error) {
    setStatus(error.message || (label + ' failed.'), 'error');
    throw error;
  } finally {
    setBusy(false);
  }
}

printer.addEventListener('change', () => {
  savedPrinterName = selectedPrinter() || savedPrinterName;
  renderPrinterMeta();
});

outputMode.addEventListener('change', async () => {
  applyModeUi();
  if (!isVirtual() && !printers.length) await loadPrinters(savedPrinterName);
  if (isVirtual()) {
    setStatus('Virtual PDF mode ready. PayMyDine print jobs will save PDFs to Desktop / PayMyDine Print Tests. Cash drawer output is disabled.', 'ok');
  }
});

refreshButton.addEventListener('click', () => loadPrinters(selectedPrinter() || savedPrinterName));

document.getElementById('save').addEventListener('click', async () => {
  try { await run('Save hardware setup', save); } catch (_) {}
});

testPrintButton.addEventListener('click', async () => {
  try {
    await save();
    await run(isVirtual() ? 'Virtual PDF test' : 'Test print', () => window.PayMyDineDesktop.testPrint(selectedPrinter() || savedPrinterName));
  } catch (error) {
    if (!statusNode.classList.contains('error')) setStatus(error.message, 'error');
  }
});

testDrawerButton.addEventListener('click', async () => {
  try {
    await save();
    await run('Cash drawer test', () => window.PayMyDineDesktop.testDrawer({
      printerName: selectedPrinter() || savedPrinterName,
      command: drawerCommand.value,
    }));
  } catch (error) {
    if (!statusNode.classList.contains('error')) setStatus(error.message, 'error');
  }
});

diagnoseButton.addEventListener('click', async () => {
  try {
    await save();
    await run('Drawer compatibility test', () => window.PayMyDineDesktop.diagnoseDrawer(selectedPrinter() || savedPrinterName));
  } catch (error) {
    if (!statusNode.classList.contains('error')) setStatus(error.message, 'error');
  }
});

window.PayMyDineDesktop.onHardwareEvent((event) => {
  if (!event || !event.type) return;
  if (event.type === 'cash-drawer-opened') {
    setStatus(`Cash payment completed. Drawer command sent${event.orderId ? ` for order #${event.orderId}` : ''}.`, 'ok');
  } else if (event.type === 'cash-drawer-skipped') {
    setStatus('Cash payment completed. Drawer intentionally skipped because Virtual PDF mode is active.', 'ok');
  } else if (event.type === 'cash-drawer-error') {
    setStatus(`Cash payment completed, but drawer could not open: ${event.message || 'Unknown error'}`, 'error');
  } else if (event.type === 'receipt-printed') {
    const result = event.result || {};
    if (result.mode === 'virtual-pdf') {
      setStatus(`Print rendered to Virtual PDF.\n${result.path || ''}`, 'ok');
    } else {
      setStatus('Receipt printed.', 'ok');
    }
  } else if (event.type === 'receipt-print-error') {
    setStatus(`Receipt could not print: ${event.message || 'Unknown error'}`, 'error');
  }
});

(async () => {
  try {
    const cfg = await window.PayMyDineDesktop.getConfig();
    savedPrinterName = String(cfg.printerName || '');
    outputMode.value = cfg.outputMode === 'pdf' ? 'pdf' : 'physical';
    autoPrint.checked = cfg.autoPrintReceipt !== false;
    autoOpen.checked = cfg.autoOpenCash !== false;
    drawerCommand.value = cfg.drawerCommand || '27,112,0,60,120';
    applyModeUi();
    if (isVirtual()) {
      setStatus('Virtual PDF mode ready. No physical printer is required.', 'ok');
    } else {
      await loadPrinters(savedPrinterName);
    }
  } catch (error) {
    setStatus(error.message || 'Hardware setup could not start.', 'error');
  }
})();
