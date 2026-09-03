'use strict';

const { contextBridge, ipcRenderer, webFrame } = require('electron');

contextBridge.exposeInMainWorld('PayMyDineDesktop', Object.freeze({
  isDesktopApp: true,
  fullPlatformApp: true,
  desktopPlatformV120: true,
  localCacheV121: true,
  platform: process.platform,
  printerCompatibilityV109: true,

  getConfig: () => ipcRenderer.invoke('pmd:get-config'),
  saveTenant: (tenant) => ipcRenderer.invoke('pmd:save-tenant', tenant),
  resetTenant: () => ipcRenderer.invoke('pmd:reset-tenant'),

  cachedJsonGet: (request) => ipcRenderer.invoke('pmd:v121-json-get', request || {}),
  localCacheInfo: () => ipcRenderer.invoke('pmd:v121-cache-info'),

  listPrinters: () => ipcRenderer.invoke('pmd:list-printers'),
  saveHardware: (values) => ipcRenderer.invoke('pmd:save-hardware', values || {}),
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

if (process.isMainFrame !== false) {
  webFrame.executeJavaScript(`(function(){
    if (window.__PMD_DESKTOP_JSON_CACHE_V121__) return;
    window.__PMD_DESKTOP_JSON_CACHE_V121__ = true;

    var originalFetch = window.fetch.bind(window);
    var patterns = [
      /^\\/admin\\/pmd-waiter-dashboard-v9-tenant-data(?:\\?|$)/,
      /^\\/admin\\/pmd-waiter-pos-v1\\/data\\/[^?]+(?:\\?|$)/
    ];

    function pathFor(input) {
      var raw = '';
      if (typeof input === 'string') raw = input;
      else if (input && typeof input.url === 'string') raw = input.url;
      if (!raw) return '';
      if (raw.indexOf('/admin/') === 0) return raw;
      try {
        var u = new URL(raw, location.href);
        return u.pathname + u.search;
      } catch (error) {
        return '';
      }
    }

    function isCacheable(pathname) {
      return patterns.some(function(re){ return re.test(pathname); });
    }

    function methodFor(input, init) {
      if (init && init.method) return String(init.method).toUpperCase();
      if (input && typeof input === 'object' && input.method) return String(input.method).toUpperCase();
      return 'GET';
    }

    function markOffline(cachedAt) {
      try {
        document.documentElement.setAttribute('data-pmd-desktop-offline-data', '1');
        var existing = document.getElementById('pmd-desktop-data-cache-banner-v121');
        if (existing) return;
        var banner = document.createElement('div');
        banner.id = 'pmd-desktop-data-cache-banner-v121';
        banner.textContent = 'Offline · using the last saved restaurant data on this device';
        banner.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483646;padding:8px 12px;text-align:center;background:#fff3cd;color:#664d03;border-top:1px solid #ffecb5;font:700 12px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
        (document.body || document.documentElement).appendChild(banner);
      } catch (error) {}
    }

    window.fetch = async function(input, init) {
      var pathname = pathFor(input);
      if (methodFor(input, init) === 'GET' && isCacheable(pathname) && window.PayMyDineDesktop && window.PayMyDineDesktop.cachedJsonGet) {
        try {
          var result = await window.PayMyDineDesktop.cachedJsonGet({ path: pathname });
          if (result && result.ok) {
            if (result.cached) markOffline(result.cachedAt || 0);
            return new Response(JSON.stringify(result.data || {}), {
              status: 200,
              headers: {
                'Content-Type': 'application/json',
                'X-PayMyDine-Desktop-Cache': result.cached ? 'HIT-OFFLINE' : 'MISS-ONLINE'
              }
            });
          }
          if (result && result.online === false) {
            return new Response(JSON.stringify({
              ok: false,
              message: result.message || 'Offline data is not cached yet.'
            }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          }
        } catch (error) {
          // Fall through to the canonical browser fetch while online.
        }
      }
      return originalFetch(input, init);
    };
  })()`, false).catch(() => {});
}
