/**
 * DIAGNOSTIC: Run this in the browser console on a page like /admin/locations/create
 * to log everything about button styles and green color sources.
 *
 * Usage:
 * 1. Open http://127.0.0.1:8000/admin/locations/create
 * 2. Open DevTools (F12) → Console
 * 3. Paste this entire script and press Enter
 * 4. Refresh the page (or run again after load) to capture styles after full load
 */

(function() {
  'use strict';

  const GREEN_HEX = ['#0a9169', '#0ecc88', '0a9169', '0ecc88', 'rgb(8, 129, 94)', '8, 129, 94', '8,129,94'];
  const log = (...args) => console.log('[DIAG]', ...args);
  const warn = (...args) => console.warn('[DIAG]', ...args);

  function getComputedStyleSummary(el, label) {
    if (!el || !el.getComputedStyle) return null;
    const c = getComputedStyle(el);
    return {
      label: label || el.className || el.tagName,
      background: c.background || c.backgroundColor,
      backgroundImage: c.backgroundImage,
      boxShadow: c.boxShadow,
      borderColor: c.borderColor,
      color: c.color,
      cssText: el.getAttribute('style') ? el.getAttribute('style').slice(0, 200) + '...' : '(no inline)'
    };
  }

  function hasGreen(str) {
    if (!str || typeof str !== 'string') return false;
    const s = str.toLowerCase();
    return GREEN_HEX.some(g => s.includes(g.toLowerCase().replace('#', '')));
  }

  log('========== STYLESHEETS (order loaded) ==========');
  const sheets = [];
  for (let i = 0; i < document.styleSheets.length; i++) {
    try {
      const sh = document.styleSheets[i];
      const href = sh.href || '(inline or unknown)';
      sheets.push({ index: i, href: href.split('/').pop() || href, full: href });
      log(i, href.split('/').pop() || href);
    } catch (e) {
      log(i, '(cross-origin or error)', e.message);
    }
  }

  log('\n========== BUTTONS IN PROGRESS INDICATOR / TOOLBAR ==========');
  const containers = document.querySelectorAll('.progress-indicator-container, .toolbar-action');
  containers.forEach((cont, i) => {
    const btns = cont.querySelectorAll('.btn-primary, .btn.btn-primary, [data-request="onSave"]');
    btns.forEach((btn, j) => {
      const sum = getComputedStyleSummary(btn, 'Button ' + (j + 1));
      if (sum) {
        log('\n--- Button:', btn.textContent.trim().slice(0, 30), '---');
        log('  background:', sum.background);
        log('  backgroundImage:', sum.backgroundImage);
        log('  boxShadow:', sum.boxShadow);
        log('  borderColor:', sum.borderColor);
        log('  HAS GREEN in computed?', hasGreen(sum.background + sum.boxShadow + sum.borderColor));
        if (btn.getAttribute('style')) log('  inline style length:', btn.getAttribute('style').length);
      }
    });
  });

  log('\n========== SEARCHING CSS RULES FOR GREEN ==========');
  let foundGreen = [];
  for (let i = 0; i < document.styleSheets.length; i++) {
    let sheet;
    try {
      sheet = document.styleSheets[i];
      if (!sheet.cssRules) continue;
    } catch (e) { continue; }
    try {
      for (let r = 0; r < sheet.cssRules.length; r++) {
        const rule = sheet.cssRules[r];
        if (rule.selectorText && rule.cssText && hasGreen(rule.cssText)) {
          const snippet = rule.cssText.slice(0, 180);
          foundGreen.push({ sheet: (sheet.href || '').split('/').pop(), selector: rule.selectorText, snippet });
          log('GREEN FOUND:', rule.selectorText, '→', snippet);
        }
      }
    } catch (e) { /* cross-origin */ }
  }
  if (foundGreen.length === 0) log('No CSS rules containing green hex/rgb found in same-origin sheets.');

  log('\n========== SAVE BUTTON ELEMENT DETAILS ==========');
  const saveBtn = document.querySelector('.progress-indicator-container .btn-primary[data-request="onSave"], .progress-indicator-container [data-request="onSave"]');
  if (saveBtn) {
    log('Tag:', saveBtn.tagName, 'Classes:', saveBtn.className);
    log('Inline style (full):', saveBtn.getAttribute('style'));
    const c = getComputedStyle(saveBtn);
    log('Computed background:', c.background);
    log('Computed boxShadow:', c.boxShadow);
  } else {
    log('Save button not found in DOM.');
  }

  log('\n========== DONE. Copy this output if needed. ==========');
})();

/* Optional: run again after 1.5s to see if styles change (e.g. green appears later). Uncomment to use:
setTimeout(function() {
  console.log('\n\n[DIAG] ===== RUNNING AGAIN AFTER 1.5s =====');
  // Re-run the same diagnostic by re-pasting the script, or run the checks below:
  var btn = document.querySelector('.progress-indicator-container .btn-primary[data-request="onSave"]');
  if (btn) {
    var c = getComputedStyle(btn);
    console.log('[DIAG] Save button after 1.5s - background:', c.background, 'boxShadow:', c.boxShadow);
  }
}, 1500);
*/
