/**
 * Rich Editor - "Things breaking" diagnostic
 * Run this, then USE the dropdown buttons (Style, Font, Paragraph, Table, Color).
 * Select options, type in the editor, etc. When something breaks, copy the log.
 */
(function() {
  const log = [];
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;

  function ts() { return new Date().toISOString().slice(11, 23); }
  function add(msg, data) {
    const line = '[' + ts() + '] ' + msg + (data ? ' ' + JSON.stringify(data) : '');
    log.push(line);
    origLog.call(console, line);
  }

  // Capture JS errors
  window.addEventListener('error', function(e) {
    add('ERROR: ' + e.message, { file: e.filename, line: e.lineno });
    add('  Stack: ' + (e.error?.stack || ''));
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', function(e) {
    add('PROMISE REJECTION: ' + (e.reason?.message || e.reason));
  });

  // Track dropdown opens/closes
  document.addEventListener('click', function(e) {
    const t = e.target;
    if (t.closest?.('.note-toolbar')) {
      if (t.classList?.contains('dropdown-toggle') || t.closest('.dropdown-toggle')) {
        add('CLICK: dropdown toggle');
      }
      if (t.classList?.contains('dropdown-item') || t.closest('.dropdown-item') || t.closest('a[role="menuitem"]')) {
        add('CLICK: dropdown item', { text: t.textContent?.trim().slice(0, 40) });
      }
    }
  });

  // Watch for DOM changes that might indicate "broken" state
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(m) {
      if (m.type === 'attributes') {
        const el = m.target;
        if (el.closest?.('.note-editor') && (m.attributeName === 'style' || m.attributeName === 'class')) {
          add('DOM CHANGE (attr): ' + m.attributeName + ' on ' + (el.className || el.tagName));
        }
      }
      if (m.type === 'childList' && m.removedNodes.length) {
        m.removedNodes.forEach(function(n) {
          if (n.nodeType === 1 && n.closest?.('.note-editor')) {
            add('DOM REMOVED: ' + (n.className || n.tagName || n.nodeName));
          }
        });
      }
    });
  });

  const editor = document.querySelector('.note-editor');
  if (editor) {
    observer.observe(editor, { childList: true, subtree: true, attributes: true });
  }

  add('=== RICH EDITOR USE DIAGNOSTIC STARTED ===');
  add('Now use the dropdowns (Style, Font, Paragraph, Table, Color). Select options.');
  add('When something breaks, copy EVERYTHING from this console and paste to share.');
  add('');

  // Helper: run when something looks broken - captures current state
  window.richeditorDiagnosticSnapshot = function() {
    const ed = document.querySelector('.note-editor');
    add('--- SNAPSHOT (run when broken) ---');
    if (!ed) { add('  note-editor: NOT FOUND'); } else {
      const editable = ed.querySelector('.note-editable');
      const rect = ed.getBoundingClientRect();
      const styles = editable ? window.getComputedStyle(editable) : null;
      add('  note-editor rect: ' + rect.width + 'x' + rect.height + ', display=' + window.getComputedStyle(ed).display);
      add('  note-editable: ' + (editable ? 'exists, display=' + (styles?.display) + ', visibility=' + (styles?.visibility) : 'NOT FOUND'));
      add('  contentEditable: ' + (editable?.getAttribute?.('contenteditable') ?? 'n/a'));
      const overlay = document.querySelector('[style*="position: fixed"][style*="z-index"]');
      if (overlay && !overlay.closest('.dropdown-menu')) add('  Possible overlay: ' + (overlay.id || overlay.className));
    }
    add('');
  };

  // Helper: dump full log to copy
  window.richeditorDiagnosticDump = function() {
    richeditorDiagnosticSnapshot();
    const out = log.join('\n');
    origLog.call(console, '\n--- COPY FROM HERE ---\n' + out + '\n--- TO HERE ---');
    return out;
  };

  add('When something breaks: run richeditorDiagnosticSnapshot() then richeditorDiagnosticDump()');
  add('');
})();
