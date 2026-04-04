/**
 * Rich Editor Toolbar - Spacing Diagnostic
 * Run this in the browser console to see distances between buttons.
 * Copy the output and share it to fix spacing issues.
 */
(function() {
  const toolbar = document.querySelector('.note-toolbar');
  if (!toolbar) {
    console.log('No .note-toolbar found on page. Make sure the rich editor is visible.');
    return;
  }

  const report = [];
  report.push('=== RICH EDITOR TOOLBAR SPACING DIAGNOSTIC ===\n');

  // Direct child groups only - exclude nested dropdown content
  const groups = toolbar.querySelectorAll(':scope > .note-btn-group');
  // Visible toolbar buttons only: direct children of groups, exclude zero-size (dropdown menus)
  const raw = toolbar.querySelectorAll(':scope > .note-btn-group > .note-btn, :scope > .note-btn-group > .btn, :scope > .note-btn-group > button, :scope > .note-btn-group > .dropdown > .dropdown-toggle');
  const allButtons = Array.from(raw).filter(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && !el.closest('.dropdown-menu');
  });

  report.push('Button groups: ' + groups.length);
  report.push('Total buttons: ' + allButtons.length);
  report.push('');

  // Measure gaps between buttons
  const rects = [];
  allButtons.forEach((btn, i) => {
    const r = btn.getBoundingClientRect();
    const styles = window.getComputedStyle(btn);
    rects.push({
      i,
      el: btn,
      left: r.left,
      right: r.right,
      top: r.top,
      bottom: r.bottom,
      width: r.width,
      height: r.height,
      marginLeft: styles.marginLeft,
      marginRight: styles.marginRight,
      classList: btn.className.substring(0, 60)
    });
  });

  report.push('--- Horizontal gaps (distance from right of button N to left of button N+1) ---');
  for (let i = 0; i < rects.length - 1; i++) {
    const gap = rects[i + 1].left - rects[i].right;
    const sameGroup = rects[i].el.closest('.note-btn-group') === rects[i + 1].el.closest('.note-btn-group');
    report.push(`  Button ${i} → ${i + 1}: ${gap.toFixed(1)}px ${sameGroup ? '(same group)' : '(different group)'}`);
  }

  report.push('');
  report.push('--- Button sizes (width x height) ---');
  rects.forEach((r, i) => {
    report.push(`  Button ${i}: ${r.width.toFixed(1)} x ${r.height.toFixed(1)}px`);
  });

  const uniqueSizes = [...new Set(rects.map(x => x.width.toFixed(0) + 'x' + x.height.toFixed(0)))];
  report.push('');
  report.push('Unique sizes found: ' + uniqueSizes.join(', '));

  report.push('');
  report.push('--- Group boundaries (gap between groups) ---');
  for (let g = 0; g < groups.length - 1; g++) {
    const g1 = groups[g].getBoundingClientRect();
    const g2 = groups[g + 1].getBoundingClientRect();
    const gap = g2.left - g1.right;
    report.push(`  Group ${g} → ${g + 1}: ${gap.toFixed(1)}px`);
  }

  report.push('');
  report.push('--- CSS computed (first 3 buttons) ---');
  allButtons[0] && report.push('Button 0 margin: ' + window.getComputedStyle(allButtons[0]).margin);
  allButtons[1] && report.push('Button 1 margin: ' + window.getComputedStyle(allButtons[1]).margin);
  allButtons[2] && report.push('Button 2 margin: ' + window.getComputedStyle(allButtons[2]).margin);
  report.push('Toolbar gap: ' + window.getComputedStyle(toolbar).gap);

  const output = report.join('\n');
  console.log(output);

  // Also highlight gaps visually for 3 seconds
  const overlay = document.createElement('div');
  overlay.id = 'spacing-diagnostic-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:99999;';
  document.body.appendChild(overlay);

  for (let i = 0; i < rects.length - 1; i++) {
    const gap = rects[i + 1].left - rects[i].right;
    const midX = (rects[i].right + rects[i + 1].left) / 2;
    const div = document.createElement('div');
    div.style.cssText = `position:fixed;left:${midX - 15}px;top:${rects[i].top}px;width:30px;height:${rects[i].height}px;background:rgba(255,0,0,0.2);border:1px dashed red;display:flex;align-items:center;justify-content:center;font-size:10px;color:red;font-weight:bold;`;
    div.textContent = gap.toFixed(0);
    overlay.appendChild(div);
  }

  setTimeout(() => overlay.remove(), 4000);
  console.log('\n(Red overlay with gap sizes shown for 4 seconds)');
})();
