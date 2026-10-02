'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('PayMyDineLinuxDeveloper', Object.freeze({
  submit: (password) => ipcRenderer.invoke('pmd:linux-developer-exit-submit', password),
  cancel: () => ipcRenderer.send('pmd:linux-developer-exit-cancel'),
}));
