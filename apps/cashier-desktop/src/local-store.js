'use strict';

const fs = require('fs');
const path = require('path');

class LocalStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { version: 1, cache: {}, drafts: {} };
    this.load();
  }

  load() {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (parsed && typeof parsed === 'object') {
        this.data = {
          version: 1,
          cache: parsed.cache && typeof parsed.cache === 'object' ? parsed.cache : {},
          drafts: parsed.drafts && typeof parsed.drafts === 'object' ? parsed.drafts : {},
        };
      }
    } catch (_) {}
  }

  persist() {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp`;
    fs.writeFileSync(temp, JSON.stringify(this.data), 'utf8');
    fs.renameSync(temp, this.filePath);
  }

  cacheGet(key) {
    const row = this.data.cache[String(key || '')];
    return row && typeof row === 'object' ? row : null;
  }

  cacheSet(key, value) {
    const cacheKey = String(key || '');
    if (!cacheKey) return null;
    this.data.cache[cacheKey] = { savedAt: Date.now(), value };
    this.pruneCache();
    this.persist();
    return this.data.cache[cacheKey];
  }

  pruneCache() {
    const entries = Object.entries(this.data.cache);
    if (entries.length <= 160) return;
    entries
      .sort((a, b) => Number(a[1] && a[1].savedAt || 0) - Number(b[1] && b[1].savedAt || 0))
      .slice(0, entries.length - 160)
      .forEach(([key]) => delete this.data.cache[key]);
  }

  clearCache() {
    this.data.cache = {};
    this.persist();
  }

  cacheStats() {
    const rows = Object.values(this.data.cache);
    const times = rows.map((row) => Number(row && row.savedAt || 0)).filter(Boolean);
    return {
      entries: rows.length,
      newestAt: times.length ? Math.max(...times) : null,
      oldestAt: times.length ? Math.min(...times) : null,
    };
  }

  draftGet(key) {
    const row = this.data.drafts[String(key || '')];
    return row && typeof row === 'object' ? row : null;
  }

  draftSet(key, value) {
    const draftKey = String(key || '');
    if (!draftKey) throw new Error('Draft key is required.');
    this.data.drafts[draftKey] = { savedAt: Date.now(), value };
    this.persist();
    return this.data.drafts[draftKey];
  }

  draftDelete(key) {
    delete this.data.drafts[String(key || '')];
    this.persist();
  }
}

module.exports = LocalStore;
