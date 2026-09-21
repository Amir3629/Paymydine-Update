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
let snapshotBusy = false;
const snapshotQueue = [];
const snapshotTimers = new Map();
const failedRouteByContents = new WeakMap();

function userDataPath() {
  return app.getPath('userData');
}

function storePath() {
  return path.join(userDataPath(), 'desktop-local-cache-v130.json');
}

function snapshotRoot() {
  return path.join(userDataPath(), 'platform-snapshots-v130');
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

function removeFile(file) {
  if (!file) return;
  try { fs.rmSync(file, { force: true }); } catch (_) {}
}

function removeSnapshotFiles(row) {
  if (!row) return;
  removeFile(row.file);
  removeFile(row.png);
  removeFile(row.fallback);
  if (row.file) {
    try {
      const ext = path.extname(row.file);
      const base = row.file.slice(0, -ext.length);
      fs.rmSync(`${base}_files`, { recursive: true, force: true });
    } catch (_) {}
  }
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

function fallbackHtml(row, pngFile) {
  const imageName = pngFile ? path.basename(pngFile) : '';
  const originalUrl = String(row && row.url || 'PayMyDine');
  const safeUrl = originalUrl.replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  }[char]));
  const image = imageName
    ? `<img src="${imageName}" alt="Cached PayMyDine screen">`
    : '<div class="no-image">The cached page image is unavailable.</div>';

  return `<!doctype html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PayMyDine · Offline</title>
<style>
html,body{margin:0;min-height:100%;background:#eef4f8;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#17324d}
.banner{position:sticky;top:0;z-index:10;padding:10px 16px;background:#fff3cd;color:#664d03;border-bottom:1px solid #ffecb5;text-align:center;font-size:13px;font-weight:800}
.meta{padding:8px 16px;background:#fff;color:#526b82;border-bottom:1px solid #dce7ef;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.viewport{display:flex;justify-content:center;padding:0;background:#f7fafc;min-height:calc(100vh - 74px)}
img{display:block;width:100%;height:auto;object-fit:contain;object-position:top center;align-self:flex-start;background:#fff}
.no-image{margin:auto;padding:40px;text-align:center}
</style></head>
<body><div class="banner">Offline · cached PayMyDine screen · reconnect before saving, sending to kitchen or paying</div>
<div class="meta">${safeUrl}</div><div class="viewport">${image}</div></body></html>`;
}

async function saveSnapshot(contents, tenant, rawUrl) {
  if (!contents || contents.isDestroyed()) return null;
  if (!sameTenantAdmin(rawUrl, tenant) || isLoginLike(rawUrl)) return null;
  if (normalizeTenant(readSettings().tenant) !== tenant) return null;
  if (String(contents.getURL() || '') !== String(rawUrl || '')) return null;

  const key = routeKey(rawUrl);
  const dir = tenantDir(tenant);
  const file = path.join(dir, `${key}.mhtml`);
  const png = path.join(dir, `${key}.png`);
  const fallback = path.join(dir, `${key}.offline.html`);
  fs.mkdirSync(dir, { recursive: true });

  try {
    await contents.savePage(file, 'MHTML');

    let hasPng = false;
    try {
      const image = await contents.capturePage();
      if (image && typeof image.isEmpty === 'function' && !image.isEmpty()) {
        fs.writeFileSync(png, image.toPNG());
        hasPng = true;
      }
    } catch (error) {
      console.warn('[PMD Desktop] snapshot screenshot failed:', error.message);
    }

    const row = {
      url: rawUrl,
      file,
      png: hasPng ? png : '',
      fallback,
      savedAt: Date.now(),
    };
    fs.writeFileSync(fallback, fallbackHtml(row, hasPng ? png : ''), 'utf8');

    const index = readIndex(tenant);
    const previous = index.routes[key];
    if (previous) removeSnapshotFiles(previous);
    index.routes[key] = row;
    index.last = row;
    pruneIndex(tenant, index);
    writeIndex(tenant, index);
    return row;
  } catch (error) {
    console.warn('[PMD Desktop] MHTML snapshot save failed:', error.message);
    removeFile(file);
    return null;
  }
}

function queueSnapshot(contents, tenant, rawUrl) {
  if (!contents || contents.isDestroyed()) return;
  const id = contents.id;
  const previous = snapshotTimers.get(id);
  if (previous) clearTimeout(previous);

  const timer = setTimeout(() => {
    snapshotTimers.delete(id);
    snapshotQueue.push({ contents, tenant, rawUrl });
    pumpSnapshotQueue();
  }, 850);
  snapshotTimers.set(id, timer);
}

async function pumpSnapshotQueue() {
  if (snapshotBusy) return;
  const job = snapshotQueue.shift();
  if (!job) return;
  snapshotBusy = true;
  try {
    if (
      job.contents
      && !job.contents.isDestroyed()
      && normalizeTenant(readSettings().tenant) === job.tenant
      && String(job.contents.getURL() || '') === String(job.rawUrl || '')
    ) {
      await saveSnapshot(job.contents, job.tenant, job.rawUrl);
    }
  } catch (_) {}
  snapshotBusy = false;
  if (snapshotQueue.length) setTimeout(pumpSnapshotQueue, 70);
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

async function injectOfflineGuard(contents, row) {
  await contents.executeJavaScript(`(function(){
    var originalUrl=${JSON.stringify(String(row && row.url || ''))};
    var head=document.head||document.documentElement;
    if(head&&!document.querySelector('base[data-pmd-desktop-origin-v130]')){
      var base=document.createElement('base');
      base.setAttribute('data-pmd-desktop-origin-v130','1');
      base.href=originalUrl;
      head.insertBefore(base,head.firstChild||null);
    }
    if(!document.getElementById('pmd-desktop-offline-banner-v130')){
      var banner=document.createElement('div');
      banner.id='pmd-desktop-offline-banner-v130';
      banner.textContent='Offline · cached PayMyDine screen · reconnect before saving, sending to kitchen or paying';
      banner.style.cssText='position:fixed;left:0;right:0;top:0;z-index:2147483647;padding:9px 14px;text-align:center;background:#fff3cd;color:#664d03;border-bottom:1px solid #ffecb5;font:800 13px/1.3 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif';
      document.documentElement.style.scrollPaddingTop='42px';
      (document.body||document.documentElement).appendChild(banner);
    }
    document.addEventListener('submit',function(e){e.preventDefault();alert('Offline: this action was not sent. Reconnect and reload before saving or paying.');},true);
    try{
      var nativeFetch=window.fetch&&window.fetch.bind(window);
      if(nativeFetch){
        window.fetch=function(input,init){
          var method=String((init&&init.method)||(input&&input.method)||'GET').toUpperCase();
          if(method!=='GET'&&method!=='HEAD') return Promise.reject(new Error('Offline cached screen is read-only.'));
          return nativeFetch(input,init);
        };
      }
      var open=XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open=function(method){
        var verb=String(method||'GET').toUpperCase();
        if(verb!=='GET'&&verb!=='HEAD') throw new Error('Offline cached screen is read-only.');
        return open.apply(this,arguments);
      };
    }catch(e){}
  })()`, true);
}

async function snapshotLooksVisible(contents) {
  try {
    return await contents.executeJavaScript(`(function(){
      var body=document.body;
      var root=document.documentElement;
      var text=body?String(body.innerText||'').trim().length:0;
      var height=root?Number(root.scrollHeight||0):0;
      var width=root?Number(root.scrollWidth||0):0;
      return text>20||height>180||width>320;
    })()`, true);
  } catch (_) {
    return false;
  }
}

async function loadSnapshot(contents, tenant, requestedUrl) {
  const row = cachedSnapshot(tenant, requestedUrl);
  if (!row) return false;

  try {
    await contents.loadFile(row.file);
    if (await snapshotLooksVisible(contents)) {
      await injectOfflineGuard(contents, row);
      return true;
    }
  } catch (error) {
    console.warn('[PMD Desktop] MHTML snapshot restore failed:', error.message);
  }

  try {
    if (row.fallback && fs.existsSync(row.fallback)) {
      await contents.loadFile(row.fallback);
      return true;
    }
  } catch (error) {
    console.warn('[PMD Desktop] visual offline fallback failed:', error.message);
  }

  return false;
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
    const contentType = String(response.headers.get('content-type') || '').toLowerCase();
    const authRequired = isLoginLike(response.url);
    if (authRequired || !contentType.includes('json')) {
      return {
        ok: false,
        status: authRequired ? 401 : response.status,
        online: true,
        authRequired,
        message: authRequired ? 'Sign in to PayMyDine.' : 'PayMyDine returned a non-JSON response.',
      };
    }

    let data = null;
    try { data = text ? JSON.parse(text) : {}; } catch (_) { data = null; }
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
    return u.pathname.includes('/platform-snapshots-v130/')
      || /\/(?:setup|hardware|offline)\.html$/.test(u.pathname);
  } catch (_) {
    return false;
  }
}

function installIpc() {
  if (installedIpc) return;
  installedIpc = true;
  ipcMain.handle('pmd:v130-json-get', (event, request) => {
    if (!trustedIpcSender(event)) throw new Error('Untrusted PayMyDine offline-cache request.');
    return nativeJsonGet(request || {});
  });
  ipcMain.handle('pmd:v130-cache-info', (event) => {
    if (!trustedIpcSender(event)) throw new Error('Untrusted PayMyDine offline-cache request.');
    const tenant = normalizeTenant(readSettings().tenant);
    const snapshot = tenant ? cachedSnapshot(tenant, '') : null;
    return {
      json: store.cacheStats(),
      snapshot: snapshot ? { url: snapshot.url, savedAt: snapshot.savedAt } : null,
    };
  });
}

function preconnectTenant(tenant) {
  try {
    session.defaultSession.preconnect({ url: `https://${tenant}`, numSockets: 6 });
  } catch (_) {}
}

function install() {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('did-fail-load', (_failedEvent, errorCode, _errorDescription, validatedUrl, isMainFrame) => {
      const tenant = normalizeTenant(readSettings().tenant);
      if (!tenant || !isMainFrame || errorCode === -3) return;
      if (sameTenantAdmin(validatedUrl, tenant)) {
        failedRouteByContents.set(contents, validatedUrl);
      }
    });

    contents.on('destroyed', () => {
      const timer = snapshotTimers.get(contents.id);
      if (timer) clearTimeout(timer);
      snapshotTimers.delete(contents.id);
    });

    contents.on('did-finish-load', () => {
      const settings = readSettings();
      const tenant = normalizeTenant(settings.tenant);
      if (!tenant || contents.isDestroyed()) return;
      const current = String(contents.getURL() || '');

      if (sameTenantAdmin(current, tenant)) {
        failedRouteByContents.delete(contents);
        preconnectTenant(tenant);
        if (!isLoginLike(current)) queueSnapshot(contents, tenant, current);
        return;
      }

      try {
        const u = new URL(current);
        if (u.protocol === 'file:' && /\/offline\.html$/.test(u.pathname)) {
          const requested = failedRouteByContents.get(contents) || tenantUrl(tenant, '/admin');
          setTimeout(() => {
            if (!contents.isDestroyed()) loadSnapshot(contents, tenant, requested).catch(() => {});
          }, 30);
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
