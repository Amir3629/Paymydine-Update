'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('PMDDeveloperExit', Object.freeze({
  submit: (password) => ipcRenderer.invoke('pmd:developer-exit-submit', String(password || '')),
  cancel: () => ipcRenderer.send('pmd:developer-exit-cancel'),
}));
