'use strict';

const { app, ipcMain, session } = require('electron');
const fs = require('fs');
const path = require('path');
const LocalStore = require('./local-store');

const SNAPSHOT_LIMIT = 12;
const CACHEABLE_JSON = [
  /^\/admin\/pmd-waiter-dashboard-v9-tenant-data(?:\?|$)/,
  /^\/admin\/pmd-waiter-pos-v1\/data\/[^?]+(?:\?|$)/,
];

let store = null;
let installedIpc = false;

function userDataPath() {
  return app.getPath('userData');
}

function storePath() {
  return path.join(userDataPath(), 'desktop-local-cache-v121.json');
}

function snapshotRoot() {
  return path.join(userDataPath(), 'platform-snapshots-v121');
}

function settingsPath() {
  return path.join(userDataPath(), 'settings.json');
}

function readSettings() {
  try {
    return JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) || {};
  } catch (_) {
    return {};
  }
}

function normalizeTenant(value) {
  let tenant = String(value || '').trim().toLowerCase();
  tenant = tenant.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  if (/^[a-z0-9][a-z0-9-]*$/.test(tenant)) tenant = `${tenant}.paymydine.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.paymydine\.com$/.test(tenant)) return '';
  return tenant;
}

function tenantUrl(tenant, pathname) {
  const p = String(pathname || '/admin');
  return `https://${tenant}${p.startsWith('/') ? p : `/${p}`}`;
}

function sameTenantAdmin(rawUrl, tenant) {
  try {
    const u = new URL(rawUrl);
    return u.protocol === 'https:' && u.hostname === tenant && /^\/admin(?:\/|$)/.test(u.pathname);
  } catch (_) {
    return false;
  }
}

function isLoginLike(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return /^\/admin\/(?:login|logout)(?:\/|$)/.test(u.pathname);
  } catch (_) {
    return false;
  }
}

function routeKey(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const value = `${u.pathname}${u.search}` || '/admin';
    return Buffer.from(value).toString('base64url').slice(0, 120) || 'admin';
  } catch (_) {
    return 'admin';
  }
}

function tenantDir(tenant) {
  return path.join(snapshotRoot(), tenant.replace(/[^a-z0-9.-]/g, '_'));
}

function indexPath(tenant) {
  return path.join(tenantDir(tenant), 'index.json');
}

function readIndex(tenant) {
  try {
    const data = JSON.parse(fs.readFileSync(indexPath(tenant), 'utf8'));
    return data && typeof data === 'object'
      ? Object.assign({ routes: {}, last: null }, data)
      : { routes: {}, last: null };
  } catch (_) {
    return { routes: {}, last: null };
  }
}

function writeIndex(tenant, index) {
  const target = indexPath(tenant);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const temp = `${target}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(index, null, 2), 'utf8');
  fs.renameSync(temp, target);
}

function removeSnapshotFiles(row) {
  if (!row || !row.file) return;
  try { fs.rmSync(row.file, { force: true }); } catch (_) {}
  try {
    const ext = path.extname(row.file);
    const base = row.file.slice(0, -ext.length);
    fs.rmSync(`${base}_files`, { recursive: true, force: true });
  } catch (_) {}
}

function pruneIndex(tenant, index) {
  const entries = Object.entries(index.routes || {});
  if (entries.length <= SNAPSHOT_LIMIT) return;
  entries
    .sort((a, b) => Number(a[1] && a[1].savedAt || 0) - Number(b[1] && b[1].savedAt || 0))
    .slice(0, entries.length - SNAPSHOT_LIMIT)
    .forEach(([key, row]) => {
      removeSnapshotFiles(row);
      delete index.routes[key];
    });
}

async function saveSnapshot(contents, tenant, rawUrl) {
  if (!sameTenantAdmin(rawUrl, tenant) || isLoginLike(rawUrl)) return null;
  const key = routeKey(rawUrl);
  const dir = tenantDir(tenant);
  const file = path.join(dir, `${key}.html`);
  fs.mkdirSync(dir, { recursive: true });

  try {
    await contents.savePage(file, 'HTMLComplete');
    const index = readIndex(tenant);
    const previous = index.routes[key];
    if (previous && previous.file !== file) removeSnapshotFiles(previous);
    const row = { url: rawUrl, file, savedAt: Date.now() };
    index.routes[key] = row;
    index.last = row;
    pruneIndex(tenant, index);
    writeIndex(tenant, index);
    return row;
  } catch (error) {
    console.warn('[PMD Desktop] snapshot save failed:', error.message);
    return null;
  }
}

function cachedSnapshot(tenant, requestedUrl) {
  const index = readIndex(tenant);
  if (requestedUrl) {
    const exact = index.routes && index.routes[routeKey(requestedUrl)];
    if (exact && exact.file && fs.existsSync(exact.file)) return exact;
  }
  if (index.last && index.last.file && fs.existsSync(index.last.file)) return index.last;
  return null;
}

async function loadSnapshot(contents, tenant, requestedUrl) {
  const row = cachedSnapshot(tenant, requestedUrl);
  if (!row) return false;
  try {
    await contents.loadFile(row.file);
    await contents.executeJavaScript(`(function(){
      if (document.getElementById('pmd-desktop-offline-banner-v121')) return;
      var banner=document.createElement('div');
      banner.id='pmd-desktop-offline-banner-v121';
      banner.textContent='Offline · cached PayMyDine screen · live writes, kitchen sends and payments require connection';
      banner.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483647;padding:9px 14px;text-align:center;background:#fff3cd;color:#664d03;border-bottom:1px solid #ffecb5;font:700 13px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
      document.documentElement.style.scrollPaddingTop='42px';
      document.body && document.body.appendChild(banner);
      document.addEventListener('submit',function(e){e.preventDefault();alert('Offline: this action was not sent. Reconnect before saving or paying.');},true);
    })()`);
    return true;
  } catch (error) {
    console.warn('[PMD Desktop] snapshot load failed:', error.message);
    return false;
  }
}

function cacheKey(tenant, pathname) {
  return `json:${tenant}:${String(pathname || '')}`;
}

function cacheableJsonPath(pathname) {
  return CACHEABLE_JSON.some((re) => re.test(String(pathname || '')));
}

async function nativeJsonGet(request) {
  const settings = readSettings();
  const tenant = normalizeTenant(settings.tenant);
  if (!tenant) return { ok: false, status: 400, online: false, message: 'Restaurant is not configured.' };

  const pathname = String(request && request.path || '');
  if (!cacheableJsonPath(pathname)) {
    return { ok: false, status: 403, online: true, message: 'This endpoint is not available through offline cache.' };
  }

  const key = cacheKey(tenant, pathname);
  try {
    const response = await session.defaultSession.fetch(tenantUrl(tenant, pathname), {
      method: 'GET',
      credentials: 'include',
      redirect: 'follow',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = {}; }
    if (!response.ok || !data || typeof data !== 'object') {
      return { ok: false, status: response.status, online: true, data, message: `HTTP ${response.status}` };
    }
    store.cacheSet(key, data);
    return { ok: true, status: response.status, online: true, cached: false, data };
  } catch (error) {
    const cached = store.cacheGet(key);
    if (cached) {
      return {
        ok: true,
        status: 200,
        online: false,
        cached: true,
        cachedAt: cached.savedAt,
        data: cached.value,
        warning: 'Offline: using the last saved PayMyDine data on this device.',
      };
    }
    return { ok: false, status: 0, online: false, cached: false, message: error.message || 'PayMyDine cloud is unreachable.' };
  }
}

function trustedIpcSender(event) {
  const settings = readSettings();
  const tenant = normalizeTenant(settings.tenant);
  const senderUrl = event && event.senderFrame ? String(event.senderFrame.url || '') : '';
  if (tenant && sameTenantAdmin(senderUrl, tenant)) return true;
  try {
    const u = new URL(senderUrl);
    if (u.protocol !== 'file:') return false;
    return u.pathname.includes('/platform-snapshots-v121/')
      || /\/(?:setup|hardware|offline)\.html$/.test(u.pathname);
  } catch (_) {
    return false;
  }
}

function installIpc() {
  if (installedIpc) return;
  installedIpc = true;
  ipcMain.handle('pmd:v121-json-get', (event, request) => {
    if (!trustedIpcSender(event)) throw new Error('Untrusted PayMyDine offline-cache request.');
    return nativeJsonGet(request || {});
  });
  ipcMain.handle('pmd:v121-cache-info', (event) => {
    if (!trustedIpcSender(event)) throw new Error('Untrusted PayMyDine offline-cache request.');
    const tenant = normalizeTenant(readSettings().tenant);
    const snapshot = tenant ? cachedSnapshot(tenant, '') : null;
    return {
      json: store.cacheStats(),
      snapshot: snapshot ? { url: snapshot.url, savedAt: snapshot.savedAt } : null,
    };
  });
}

function installPageAcceleration(contents, tenant) {
  try {
    session.defaultSession.preconnect({ url: `https://${tenant}`, numSockets: 6 });
  } catch (_) {}

  contents.executeJavaScript(`(function(){
    if (window.__PMD_DESKTOP_NAV_WARM_V121__) return;
    window.__PMD_DESKTOP_NAV_WARM_V121__=true;
    var timer=null;
    document.addEventListener('mouseover',function(event){
      var a=event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if(!a) return;
      var u;
      try { u=new URL(a.href, location.href); } catch(e){ return; }
      if(u.origin!==location.origin || !/^\\/admin(?:\\/|$)/.test(u.pathname) || /\\/logout(?:\\/|$)/.test(u.pathname)) return;
      clearTimeout(timer);
      timer=setTimeout(function(){
        if(document.querySelector('link[data-pmd-desktop-prefetch="'+CSS.escape(u.href)+'"]')) return;
        var link=document.createElement('link');
        link.rel='prefetch';
        link.href=u.href;
        link.setAttribute('data-pmd-desktop-prefetch',u.href);
        document.head && document.head.appendChild(link);
      },180);
    },true);
  })()`).catch(() => {});
}

function install() {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('did-finish-load', async () => {
      const settings = readSettings();
      const tenant = normalizeTenant(settings.tenant);
      if (!tenant || contents.isDestroyed()) return;
      const current = contents.getURL();

      if (sameTenantAdmin(current, tenant)) {
        installPageAcceleration(contents, tenant);
        await saveSnapshot(contents, tenant, current);
        return;
      }

      try {
        const u = new URL(current);
        if (u.protocol === 'file:' && /\/offline\.html$/.test(u.pathname)) {
          setTimeout(() => {
            if (!contents.isDestroyed()) loadSnapshot(contents, tenant, tenantUrl(tenant, '/admin')).catch(() => {});
          }, 40);
        }
      } catch (_) {}
    });
  });

  app.whenReady().then(() => {
    store = new LocalStore(storePath());
    installIpc();
  });
}

module.exports = { install };
