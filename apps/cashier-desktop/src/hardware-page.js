'use strict';

const printer = document.getElementById('printer');
const printerMeta = document.getElementById('printer-meta');
const autoOpen = document.getElementById('auto-open');
const drawerCommand = document.getElementById('drawer-command');
const statusNode = document.getElementById('status');
const buttons = Array.from(document.querySelectorAll('button'));
let printers = [];

function setBusy(busy) {
  buttons.forEach((button) => { button.disabled = Boolean(busy); });
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
  const details = [row.driver, row.port, row.default ? 'Windows default' : '', row.offline ? 'Offline' : 'Online'].filter(Boolean);
  printerMeta.textContent = details.join(' · ');
}

async function loadPrinters(preferred) {
  setBusy(true);
  setStatus('Reading Windows printers…');
  try {
    printers = await window.PayMyDineDesktop.listPrinters();
    printer.innerHTML = '';
    if (!printers.length) {
      printer.innerHTML = '<option value="">No Windows printers found</option>';
      setStatus('No Windows printer was found. Install the receipt-printer driver in Windows first.', 'error');
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
    renderPrinterMeta();
    setStatus(`${printers.length} printer(s) found.`, 'ok');
  } catch (error) {
    printer.innerHTML = '<option value="">Could not read printers</option>';
    setStatus(error.message || 'Could not read Windows printers.', 'error');
  } finally {
    setBusy(false);
  }
}

async function save() {
  const printerName = selectedPrinter();
  if (!printerName) throw new Error('Choose a receipt printer first.');
  return window.PayMyDineDesktop.saveHardware({
    printerName,
    autoOpenCash: autoOpen.checked,
    drawerCommand: drawerCommand.value,
  });
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

printer.addEventListener('change', renderPrinterMeta);
document.getElementById('refresh').addEventListener('click', () => loadPrinters(selectedPrinter()));

document.getElementById('save').addEventListener('click', async () => {
  try { await run('Save hardware setup', save); } catch (_) {}
});

document.getElementById('test-print').addEventListener('click', async () => {
  try {
    await save();
    await run('Test print', () => window.PayMyDineDesktop.testPrint(selectedPrinter()));
  } catch (error) {
    if (!statusNode.classList.contains('error')) setStatus(error.message, 'error');
  }
});

document.getElementById('test-drawer').addEventListener('click', async () => {
  try {
    await save();
    await run('Cash drawer test', () => window.PayMyDineDesktop.testDrawer({
      printerName: selectedPrinter(),
      command: drawerCommand.value,
    }));
  } catch (error) {
    if (!statusNode.classList.contains('error')) setStatus(error.message, 'error');
  }
});

document.getElementById('diagnose').addEventListener('click', async () => {
  try {
    await save();
    await run('Drawer compatibility test', () => window.PayMyDineDesktop.diagnoseDrawer(selectedPrinter()));
  } catch (error) {
    if (!statusNode.classList.contains('error')) setStatus(error.message, 'error');
  }
});

window.PayMyDineDesktop.onHardwareEvent((event) => {
  if (!event || !event.type) return;
  if (event.type === 'cash-drawer-opened') {
    setStatus(`Cash payment completed. Drawer command sent${event.orderId ? ` for order #${event.orderId}` : ''}.`, 'ok');
  } else if (event.type === 'cash-drawer-error') {
    setStatus(`Cash payment completed, but drawer could not open: ${event.message || 'Unknown error'}`, 'error');
  } else if (event.type === 'receipt-printed') {
    setStatus('Receipt printed.', 'ok');
  } else if (event.type === 'receipt-print-error') {
    setStatus(`Receipt could not print: ${event.message || 'Unknown error'}`, 'error');
  }
});

(async () => {
  try {
    const cfg = await window.PayMyDineDesktop.getConfig();
    autoOpen.checked = cfg.autoOpenCash !== false;
    drawerCommand.value = cfg.drawerCommand || '27,112,0,60,120';
    await loadPrinters(cfg.printerName || '');
  } catch (error) {
    setStatus(error.message || 'Hardware setup could not start.', 'error');
  }
})();
