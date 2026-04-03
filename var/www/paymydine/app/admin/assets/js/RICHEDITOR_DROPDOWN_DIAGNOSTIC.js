/**
 * Rich Editor Toolbar - Dropdown Diagnostic
 * Run in browser console to find why dropdowns aren't working.
 * Copy the output and share it.
 */
(function() {
  const toolbar = document.querySelector('.note-toolbar');
  if (!toolbar) {
    console.log('No .note-toolbar found. Make sure the rich editor is visible.');
    return;
  }

  const report = [];
  report.push('=== RICH EDITOR DROPDOWN DIAGNOSTIC ===\n');

  // Find all dropdown toggles
  const dropdownToggles = toolbar.querySelectorAll('.dropdown-toggle, [data-toggle="dropdown"], [data-bs-toggle="dropdown"]');
  const dropdownMenus = toolbar.querySelectorAll('.dropdown-menu, .note-dropdown-menu');

  report.push('--- DROPDOWN TOGGLES FOUND ---');
  report.push('Count: ' + dropdownToggles.length);
  dropdownToggles.forEach((el, i) => {
    const rect = el.getBoundingClientRect();
    const label = el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent?.trim().slice(0, 25) || '?';
    const attrs = {
      'data-toggle': el.getAttribute('data-toggle'),
      'data-bs-toggle': el.getAttribute('data-bs-toggle'),
      'aria-expanded': el.getAttribute('aria-expanded'),
      'aria-haspopup': el.getAttribute('aria-haspopup'),
    };
    const styles = window.getComputedStyle(el);
    const issues = [];
    if (styles.pointerEvents !== 'auto') issues.push('pointer-events: ' + styles.pointerEvents);
    if (parseFloat(styles.opacity) < 0.5) issues.push('opacity: ' + styles.opacity);
    if (styles.visibility === 'hidden') issues.push('visibility: hidden');
    if (styles.display === 'none') issues.push('display: none');
    if (rect.width === 0 || rect.height === 0) issues.push('zero size');
    const parent = el.closest('.dropdown');
    const hasMenu = parent && parent.querySelector('.dropdown-menu');
    report.push(`\n  [${i}] "${label}"`);
    report.push('      Attrs: ' + JSON.stringify(attrs));
    report.push('      Rect: ' + rect.width.toFixed(0) + 'x' + rect.height.toFixed(0) + ', visible: ' + (rect.width > 0 && rect.height > 0));
    report.push('      Parent .dropdown: ' + (parent ? 'yes' : 'NO'));
    report.push('      Has .dropdown-menu sibling: ' + (hasMenu ? 'yes' : 'NO'));
    if (issues.length) report.push('      ISSUES: ' + issues.join(', '));
  });

  report.push('\n--- DROPDOWN MENUS FOUND ---');
  report.push('Count: ' + dropdownMenus.length);
  dropdownMenus.forEach((el, i) => {
    const parent = el.closest('.dropdown');
    const styles = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    report.push(`  [${i}] display: ${styles.display}, visibility: ${styles.visibility}, classes: ${el.className.slice(0, 60)}`);
    report.push('      Parent dropdown: ' + (parent ? parent.querySelector('.dropdown-toggle')?.textContent?.trim().slice(0, 20) : 'none'));
  });

  report.push('\n--- POTENTIAL BLOCKERS ---');
  // Check for overlays that might block clicks
  const overlays = document.querySelectorAll('[style*="position: fixed"], [style*="position:fixed"]');
  let blocking = 0;
  overlays.forEach(el => {
    const s = window.getComputedStyle(el);
    if (s.pointerEvents !== 'none' && s.zIndex > 1000 && el.id !== 'toolbar-report-overlay') {
      const r = el.getBoundingClientRect();
      if (r.width > 100 && r.height > 100) {
        report.push('  Possible blocker: ' + (el.id || el.className || el.tagName) + ' z-index=' + s.zIndex);
        blocking++;
      }
    }
  });
  if (blocking === 0) report.push('  (none obvious)');

  report.push('\n--- INLINE STYLES ON TOGGLE BUTTONS ---');
  dropdownToggles.forEach((el, i) => {
    const style = el.getAttribute('style') || '';
    if (style) {
      const label = el.getAttribute('aria-label') || el.textContent?.trim().slice(0, 15);
      report.push('  [' + i + '] "' + label + '": ' + style.slice(0, 120) + (style.length > 120 ? '...' : ''));
    }
  });

  report.push('\n--- CLICK TEST ---');
  report.push('Run this after the diagnostic to test: document.querySelector(".note-toolbar .dropdown-toggle")?.click()');
  report.push('Then check if a dropdown opens.');

  const txt = report.join('\n');
  console.log(txt);
  console.log('\n--- COPY EVERYTHING ABOVE AND PASTE TO SHARE ---');
})();
