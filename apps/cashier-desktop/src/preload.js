'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('PayMyDineDesktop', Object.freeze({
  isDesktopApp: true,
  platform: process.platform,
  printerCompatibilityV109: true,

  getConfig: () => ipcRenderer.invoke('pmd:get-config'),
  saveTenant: (tenant) => ipcRenderer.invoke('pmd:save-tenant', tenant),
  resetTenant: () => ipcRenderer.invoke('pmd:reset-tenant'),

  listPrinters: () => ipcRenderer.invoke('pmd:list-printers'),
  saveHardware: (values) => ipcRenderer.invoke('pmd:save-hardware', values),
  testPrint: (printerName) => ipcRenderer.invoke('pmd:test-print', printerName),
  testDrawer: (options) => ipcRenderer.invoke('pmd:test-drawer', options || {}),
  diagnoseDrawer: (printerName) => ipcRenderer.invoke('pmd:diagnose-drawer', printerName),
  printUrl: (url) => ipcRenderer.invoke('pmd:print-url', url),
  printReceiptUrl: (url) => ipcRenderer.invoke('pmd:print-receipt-url', url),
  openHardwareSetup: () => ipcRenderer.invoke('pmd:open-hardware'),
  retryCashier: () => ipcRenderer.invoke('pmd:retry-cashier'),

  onHardwareEvent: (listener) => {
    if (typeof listener !== 'function') return () => {};
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on('pmd:hardware-event', wrapped);
    return () => ipcRenderer.removeListener('pmd:hardware-event', wrapped);
  },
}));
