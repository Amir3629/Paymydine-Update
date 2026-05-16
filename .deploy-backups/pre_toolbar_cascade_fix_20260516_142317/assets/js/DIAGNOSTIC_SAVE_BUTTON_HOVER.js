/**
 * SAVE BUTTON HOVER DIAGNOSTIC
 * Paste in browser Console to see WHEN and WHO changes the Save button style (what kills hover).
 *
 * PASTE ONLY THIS SCRIPT - no extra characters (e.g. "x") before or after.
 *
 * 1. Open a page with the Save button (e.g. /admin/locations/create)
 * 2. DevTools -> Console
 * 3. Paste from (function() to })(); then Enter
 * 4. Hover the Save button; when hover stops, copy the "[HOVER-DIAG]" line and the stack trace
 */
(function() {
  'use strict';

  const log = (...args) => console.log('[HOVER-DIAG]', ...args);
  const warn = (...args) => console.warn('[HOVER-DIAG]', ...args);

  const btn = document.querySelector('.progress-indicator-container [data-request="onSave"], .toolbar-action .btn-primary[data-request="onSave"]');
  if (!btn) {
    warn('Save button not found. Use a page with the toolbar Save button (e.g. create form).');
    return;
  }

  log('Watching Save button. Hover it – when style changes we log who did it.');
  log('────────────────────────────────────────────────────────────');

  var changeCount = 0;

  var rawSetAttribute = btn.setAttribute.bind(btn);
  btn.setAttribute = function(name, value) {
    if (name === 'style') {
      changeCount++;
      var stack = new Error().stack;
      warn('Style changed (#' + changeCount + ') hovered=' + btn.matches(':hover') + ' – WHO SET IT (setAttribute):');
      console.log(stack);
    }
    return rawSetAttribute(name, value);
  };

  var rawSetProperty = btn.style.setProperty.bind(btn.style);
  btn.style.setProperty = function(name, value, priority) {
    changeCount++;
    var stack = new Error().stack;
    warn('style.setProperty(' + name + ') (#' + changeCount + ') hovered=' + btn.matches(':hover') + ' – WHO SET IT:');
    console.log(stack);
    return rawSetProperty(name, value, priority);
  };

  log('Initial state: background=', (btn.style.background || '').slice(0, 50), '| hovered=', btn.matches(':hover'));
  log('────────────────────────────────────────────────────────────');
  log('Hover the Save button. When hover stops, the stack trace above shows which script changed it.');
})();
