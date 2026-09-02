'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('PayMyDineDesktop', Object.freeze({
  isDesktopApp: true,
  realAppV110: true,
  platform: process.platform,
  printerCompatibilityV109: true,

  getConfig: () => ipcRenderer.invoke('pmd:get-config'),
  saveTenant: (tenant) => ipcRenderer.invoke('pmd:save-tenant', tenant),
  resetTenant: () => ipcRenderer.invoke('pmd:reset-tenant'),

  apiRequest: (request) => ipcRenderer.invoke('pmd:api-request', request || {}),
  checkOnline: () => ipcRenderer.invoke('pmd:check-online'),
  openLogin: () => ipcRenderer.invoke('pmd:open-login'),
  openCompatibility: (path) => ipcRenderer.invoke('pmd:open-compatibility', path),
  cacheStats: () => ipcRenderer.invoke('pmd:cache-stats'),
  clearCache: () => ipcRenderer.invoke('pmd:clear-cache'),
  getDraft: (key) => ipcRenderer.invoke('pmd:get-draft', key),
  saveDraft: (key, value) => ipcRenderer.invoke('pmd:save-draft', key, value),
  deleteDraft: (key) => ipcRenderer.invoke('pmd:delete-draft', key),

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
  onAuthChanged: (listener) => {
    if (typeof listener !== 'function') return () => {};
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on('pmd:auth-changed', wrapped);
    return () => ipcRenderer.removeListener('pmd:auth-changed', wrapped);
  },
  onConnectivity: (listener) => {
    if (typeof listener !== 'function') return () => {};
    const wrapped = (_event, payload) => listener(payload);
    ipcRenderer.on('pmd:connectivity', wrapped);
    return () => ipcRenderer.removeListener('pmd:connectivity', wrapped);
  },
}));
