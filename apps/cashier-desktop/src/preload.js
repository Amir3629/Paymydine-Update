'use strict';

const { contextBridge, ipcRenderer, webFrame } = require('electron');

const APP_VERSION = '1.4.1';

contextBridge.exposeInMainWorld('PayMyDineDesktop', Object.freeze({
  isDesktopApp: true,
  fullPlatformApp: true,
  desktopPlatformV141: true,
  desktopPlatformV140: true,
  seamlessRoutePoolV140: true,
  windowsDeviceModeV141: true,
  windowsDeviceModeV140: true,
  localCacheV130: true,
  platform: process.platform,
  printerCompatibilityV109: true,

  getConfig: () => ipcRenderer.invoke('pmd:get-config').then((cfg) => Object.assign({}, cfg || {}, {
    appVersion: APP_VERSION,
    product: 'PayMyDine Desktop',
    desktopPlatformV141: true,
    desktopPlatformV140: true,
    seamlessRoutePoolV140: true,
    windowsDeviceModeV141: true,
    windowsDeviceModeV140: true,
    localCacheV130: true,
    platform: process.platform,
  })),
  saveTenant: (tenant) => ipcRenderer.invoke('pmd:save-tenant', tenant),
  resetTenant: () => ipcRenderer.invoke('pmd:reset-tenant'),

  cachedJsonGet: (request) => ipcRenderer.invoke('pmd:v130-json-get', request || {}),
  localCacheInfo: () => ipcRenderer.invoke('pmd:v130-cache-info'),

  deviceModePreflight: () => ipcRenderer.invoke('pmd:device-mode-preflight'),
  deviceModeState: () => ipcRenderer.invoke('pmd:device-mode-state'),
  enableDeviceMode: () => ipcRenderer.invoke('pmd:device-mode-enable'),
  openDeveloperExit: () => ipcRenderer.invoke('pmd:developer-exit-open'),

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

function pmdFastRoute(rawUrl) {
  try {
    const url = new URL(String(rawUrl || ''), location.href);
    if (url.protocol !== 'https:') return null;
    if (!/^[a-z0-9][a-z0-9-]*\.paymydine\.com$/i.test(url.hostname)) return null;
    if (!/^\/admin(?:\/|$)/.test(url.pathname)) return null;
    if (/\/(?:login|logout|payment|terminal-payment|callback|webhook|download|export)(?:\/|$)/i.test(url.pathname)) return null;
    if (/^(?:1|true)$/i.test(url.searchParams.get('download') || '')) return null;
    return url;
  } catch (_) {
    return null;
  }
}

function pmdPrimaryNavigationAnchor(anchor) {
  if (!anchor || typeof anchor.matches !== 'function') return false;
  return Boolean(
    anchor.matches('.pmd-sm2__item')
      || anchor.matches('[data-pmd-dashboard-route]')
      || anchor.matches('[data-pmd-role-workspace-shortcut]')
      || anchor.closest('.pmd-sm2__nav')
  );
}

function installFastNavigationV140() {
  if (process.isMainFrame === false) return;

  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    const anchor = target && target.closest ? target.closest('a[href]') : null;
    if (!anchor || !pmdPrimaryNavigationAnchor(anchor)) return;
    if (anchor.hasAttribute('download')) return;
    if (anchor.target && anchor.target !== '_self') return;
    if (
      anchor.hasAttribute('onclick')
      || anchor.hasAttribute('data-method')
      || anchor.hasAttribute('data-request')
      || anchor.hasAttribute('data-remote')
      || anchor.hasAttribute('data-toggle')
      || anchor.hasAttribute('data-bs-toggle')
    ) return;

    const url = pmdFastRoute(anchor.href);
    if (!url) return;

    try {
      const current = new URL(location.href);
      if (
        current.protocol === 'https:'
        && current.hostname === url.hostname
        && current.pathname === url.pathname
        && current.search === url.search
        && current.hash !== url.hash
      ) return;
    } catch (_) {}

    event.preventDefault();
    ipcRenderer.send('pmd:v140-navigate', url.href);
  }, true);

  function sendWarmRoutes() {
    const anchors = Array.from(document.querySelectorAll(
      '.pmd-sm2__nav a[href], a[data-pmd-dashboard-route][href], a[data-pmd-role-workspace-shortcut][href]'
    ));
    const seen = new Set();
    const urls = [];

    anchors.forEach((anchor) => {
      if (urls.length >= 8) return;
      const url = pmdFastRoute(anchor.href);
      if (!url || seen.has(url.href)) return;
      seen.add(url.href);
      urls.push(url.href);
    });

    if (urls.length) ipcRenderer.send('pmd:v140-warm-routes', urls);
  }

  const warm = () => {
    setTimeout(sendWarmRoutes, 140);
    setTimeout(sendWarmRoutes, 800);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', warm, { once: true });
  else warm();
  window.addEventListener('pageshow', warm);
}

function installDeveloperExitButtonV140() {
  if (process.isMainFrame === false || process.platform !== 'win32') return;

  const ensureButton = async () => {
    let state;
    try { state = await ipcRenderer.invoke('pmd:device-mode-state'); } catch (_) { return; }
    if (!state || !state.enabled || state.developerDesktop) return;
    if (document.getElementById('pmd-device-mode-exit-v140')) return;

    const button = document.createElement('button');
    button.id = 'pmd-device-mode-exit-v140';
    button.type = 'button';
    button.textContent = 'DEV';
    button.title = 'Developer exit';
    button.setAttribute('aria-label', 'Developer exit');
    button.style.cssText = [
      'all:initial',
      'position:fixed',
      'right:10px',
      'bottom:10px',
      'z-index:2147483647',
      'width:38px',
      'height:28px',
      'display:grid',
      'place-items:center',
      'border-radius:8px',
      'border:1px solid rgba(16,47,66,.28)',
      'background:rgba(255,255,255,.78)',
      'color:#102f42',
      'font:800 10px/1 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif',
      'letter-spacing:.05em',
      'cursor:pointer',
      'box-shadow:0 2px 8px rgba(16,47,66,.12)',
      'opacity:.38',
      'backdrop-filter:blur(6px)',
    ].join(';');
    button.addEventListener('mouseenter', () => { button.style.opacity = '1'; });
    button.addEventListener('mouseleave', () => { button.style.opacity = '.38'; });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      ipcRenderer.invoke('pmd:developer-exit-open').catch(() => {});
    }, true);
    (document.body || document.documentElement).appendChild(button);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureButton, { once: true });
  else ensureButton();
  window.addEventListener('pageshow', ensureButton);
}

installFastNavigationV140();
installDeveloperExitButtonV140();

if (process.isMainFrame !== false) {
  webFrame.executeJavaScript(`(function(){
    if (window.__PMD_DESKTOP_JSON_CACHE_V130__) return;
    window.__PMD_DESKTOP_JSON_CACHE_V130__ = true;

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

    function markOffline() {
      try {
        document.documentElement.setAttribute('data-pmd-desktop-offline-data', '1');
        var existing = document.getElementById('pmd-desktop-data-cache-banner-v130');
        if (existing) return;
        var banner = document.createElement('div');
        banner.id = 'pmd-desktop-data-cache-banner-v130';
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
            if (result.cached) markOffline();
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
