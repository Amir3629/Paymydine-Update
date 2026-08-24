'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('PayMyDineDesktop', Object.freeze({
  isDesktopApp: true,
  platform: process.platform,
  getConfig: () => ipcRenderer.invoke('pmd:get-config'),
  saveTenant: (tenant) => ipcRenderer.invoke('pmd:save-tenant', tenant),
  resetTenant: () => ipcRenderer.invoke('pmd:reset-tenant'),
}));
