'use strict';

const { app } = require('electron');
const fs = require('fs');
const path = require('path');

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function storePaths() {
  return [
    path.join(app.getPath('userData'), 'desktop-local-cache-v121.json'),
    path.join(app.getPath('userData'), 'desktop-local-cache-v130.json'),
  ];
}

function snapshotRoots() {
  return [
    path.join(app.getPath('userData'), 'platform-snapshots-v121'),
    path.join(app.getPath('userData'), 'platform-snapshots-v130'),
  ];
}

function tenantDir(root, tenant) {
  return path.join(root, String(tenant || '').replace(/[^a-z0-9.-]/g, '_'));
}

function readTenant() {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsPath(), 'utf8')) || {};
    let tenant = String(settings.tenant || '').trim().toLowerCase();
    tenant = tenant.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    if (/^[a-z0-9][a-z0-9-]*$/.test(tenant)) tenant = `${tenant}.paymydine.com`;
    return /^[a-z0-9][a-z0-9-]*\.paymydine\.com$/.test(tenant) ? tenant : '';
  } catch (_) {
    return '';
  }
}

function clearFile(file) {
  try { fs.rmSync(file, { force: true }); } catch (_) {}
}

function clearAllBusinessCache() {
  storePaths().forEach(clearFile);
  snapshotRoots().forEach((root) => {
    try { fs.rmSync(root, { recursive: true, force: true }); } catch (_) {}
  });
}

function clearTenantBusinessCache(tenant) {
  storePaths().forEach(clearFile);
  if (!tenant) return;
  snapshotRoots().forEach((root) => {
    try { fs.rmSync(tenantDir(root, tenant), { recursive: true, force: true }); } catch (_) {}
  });
}

function install() {
  app.on('web-contents-created', (_event, contents) => {
    contents.on('did-finish-load', () => {
      const current = String(contents.getURL() || '');
      let parsed;
      try { parsed = new URL(current); } catch (_) { return; }

      if (parsed.protocol === 'file:' && /\/setup\.html$/.test(parsed.pathname) && !readTenant()) {
        clearAllBusinessCache();
        return;
      }

      const tenant = readTenant();
      if (!tenant || parsed.protocol !== 'https:' || parsed.hostname !== tenant) return;
      if (/^\/admin\/(?:login|logout)(?:\/|$)/.test(parsed.pathname)) {
        clearTenantBusinessCache(tenant);
      }
    });
  });
}

module.exports = { install };
