/**
 * BUTTON COLOR INSPECTOR
 * Paste this in the browser console (e.g. on /admin/locations/create) to see
 * every color applied to the toolbar Save / primary buttons and where they come from.
 *
 * Usage: Open DevTools → Console → paste entire script → Enter
 */
(function() {
  'use strict';

  const log = (...args) => console.log('[COLORS]', ...args);
  const warn = (...args) => console.warn('[COLORS]', ...args);

  // Match rgb/rgba/#hex with flexible spacing (browsers normalize differently)
  const GREEN_PATTERNS = [/8\s*,\s*129\s*,\s*94/, /0a9169/i, /0ecc88/i];

  function extractColorsFromString(str, sourceLabel) {
    if (!str || typeof str !== 'string') return [];
    const out = [];
    function add(match) {
      const raw = match.trim();
      if (!raw) return;
      const isGreen = GREEN_PATTERNS.some(p => p.test(raw));
      out.push({ raw, source: sourceLabel, isGreen });
    }
    let m;
    const re = /rgba?\s*\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(,\s*[\d.]+\s*)?\)|#[0-9a-fA-F]{3,8}\b/g;
    while ((m = re.exec(str)) !== null) add(m[0]);
    return out;
  }

  function inspectElement(el, label) {
    if (!el || !el.getComputedStyle) return;
    const c = getComputedStyle(el);
    const allColors = [];
    const rawValues = {};

    const propList = [
      ['background', c.background],
      ['backgroundColor', c.backgroundColor],
      ['backgroundImage', c.backgroundImage],
      ['borderTopColor', c.borderTopColor],
      ['borderRightColor', c.borderRightColor],
      ['borderBottomColor', c.borderBottomColor],
      ['borderLeftColor', c.borderLeftColor],
      ['borderColor', c.borderColor],
      ['boxShadow', c.boxShadow],
      ['color', c.color],
      ['outlineColor', c.outlineColor],
      ['textShadow', c.textShadow],
      ['fill', c.fill],
      ['stroke', c.stroke]
    ];

    propList.forEach(([prop, value]) => {
      if (value) rawValues[prop] = value;
      if (!value) return;
      extractColorsFromString(String(value), prop).forEach(o => allColors.push(o));
    });

    // Dedupe by normalized value (ignore spaces)
    const seen = new Set();
    const unique = [];
    allColors.forEach(item => {
      const key = item.raw.replace(/\s+/g, '').toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push(item);
    });

    const greenCount = unique.filter(x => x.isGreen).length;

    log('═══════════════════════════════════════════════════════════');
    log('BUTTON:', label);
    log('Element:', el.tagName, el.className || '', el.getAttribute('data-request') || '');
    log('───────────────────────────────────────────────────────────');
    log('TOTAL COLORS IN THIS BUTTON:', unique.length);
    if (greenCount > 0) warn('GREEN COLORS FOUND:', greenCount);
    log('───────────────────────────────────────────────────────────');
    if (unique.length > 0) {
      unique.forEach((item, i) => {
        const flag = item.isGreen ? ' ⚠️ GREEN' : '';
        console.log('  ' + (i + 1) + '. ' + item.raw + '  ← ' + item.source + flag);
      });
    } else {
      log('(No rgb/rgba/#hex parsed. Showing raw computed values below.)');
    }
    log('───────────────────────────────────────────────────────────');
    log('RAW COMPUTED VALUES (what the browser reports):');
    Object.keys(rawValues).forEach(p => {
      const v = rawValues[p];
      const preview = v.length > 120 ? v.slice(0, 120) + '...' : v;
      console.log('  ' + p + ':', preview);
    });
    log('───────────────────────────────────────────────────────────');
    log('INLINE STYLE (first 500 chars):');
    log(el.getAttribute('style') ? el.getAttribute('style').slice(0, 500) : '(none)');
    log('═══════════════════════════════════════════════════════════\n');

    return { total: unique.length, green: greenCount, colors: unique, raw: rawValues };
  }

  // Find toolbar Save and all primary buttons in progress-indicator
  const saveBtn = document.querySelector('.progress-indicator-container [data-request="onSave"], .progress-indicator-container .btn-primary[data-request="onSave"]');
  const primaryInToolbar = document.querySelectorAll('.toolbar-action .btn-primary, .progress-indicator-container .btn-primary');
  const buttons = saveBtn ? [saveBtn, ...Array.from(primaryInToolbar).filter(b => b !== saveBtn)] : Array.from(primaryInToolbar);

  if (buttons.length === 0) {
    warn('No toolbar primary / Save button found. Selectors used: .progress-indicator-container .btn-primary, .toolbar-action .btn-primary');
    return;
  }

  log('Found', buttons.length, 'button(s). Inspecting each:\n');
  const results = [];
  buttons.forEach((btn, i) => {
    const label = btn.getAttribute('data-request') === 'onSave' ? 'Save' : (btn.textContent.trim().slice(0, 20) || 'Primary ' + (i + 1));
    results.push(inspectElement(btn, label));
  });

  const totalColors = results.reduce((sum, r) => sum + (r ? r.total : 0), 0);
  const totalGreen = results.reduce((sum, r) => sum + (r ? r.green : 0), 0);
  log('SUMMARY: Total color entries across all buttons:', totalColors, '| Green entries:', totalGreen);
})();
