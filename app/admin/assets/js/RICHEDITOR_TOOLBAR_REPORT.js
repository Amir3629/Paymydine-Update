/**
 * Rich Editor Toolbar - Report for sharing
 * Paste this in browser console, copy ALL output, and share it.
 * Highlights: oversized buttons, stuck-together pairs.
 */
(function() {
  const toolbar = document.querySelector('.note-toolbar');
  if (!toolbar) {
    console.log('No .note-toolbar found. Make sure the rich editor is visible.');
    return;
  }

  const groups = toolbar.querySelectorAll(':scope > .note-btn-group');
  const raw = toolbar.querySelectorAll('.note-btn, .note-btn-group .btn, .note-btn-group button');
  const buttons = Array.from(raw).filter(el => {
    if (el.closest('.dropdown-menu')) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });

  const rects = buttons.map((btn, i) => {
    const r = btn.getBoundingClientRect();
    const label = btn.getAttribute('title') || btn.getAttribute('aria-label') || btn.textContent?.trim().slice(0, 20) || '?';
    return { i, el: btn, w: r.width, h: r.height, left: r.left, right: r.right, top: r.top, label };
  });

  const out = [];
  out.push('=== RICH EDITOR TOOLBAR REPORT ===\n');

  out.push('--- BUTTON SIZES (index: width x height, label) ---');
  rects.forEach(r => {
    out.push(`  ${r.i}: ${r.w.toFixed(0)}x${r.h.toFixed(0)}px  "${r.label}"`);
  });

  out.push('\n--- GAPS (button N → N+1) ---');
  const problems = [];
  for (let i = 0; i < rects.length - 1; i++) {
    const gap = rects[i + 1].left - rects[i].right;
    const sameGroup = rects[i].el.closest('.note-btn-group') === rects[i + 1].el.closest('.note-btn-group');
    const line = `  ${i} → ${i + 1}: ${gap.toFixed(1)}px ${sameGroup ? '(same group)' : '(different group)'}`;
    out.push(line);
    if (gap <= 1) problems.push(`STUCK: buttons ${i} and ${i + 1} (gap ${gap.toFixed(1)}px)`);
  }

  out.push('\n--- OVERSIZED (w>50 or h>45) ---');
  rects.forEach(r => {
    if (r.w > 50 || r.h > 45) problems.push(`BIG: button ${r.i} = ${r.w.toFixed(0)}x${r.h.toFixed(0)}px "${r.label}"`);
  });
  if (problems.length === 0) out.push('  (none)');
  else problems.forEach(p => out.push('  ' + p));

  out.push('\n--- UNIQUE SIZES ---');
  const sizes = [...new Set(rects.map(r => r.w.toFixed(0) + 'x' + r.h.toFixed(0)))];
  out.push('  ' + sizes.join(', '));

  const txt = out.join('\n');
  console.log(txt);
  console.log('\n--- COPY EVERYTHING ABOVE AND PASTE IT TO SHARE ---');

  // Visual overlay: label each button with index + size, highlight problems
  const overlay = document.createElement('div');
  overlay.id = 'toolbar-report-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;pointer-events:none;z-index:99999;';
  document.body.appendChild(overlay);

  rects.forEach(r => {
    const div = document.createElement('div');
    const big = r.w > 50 || r.h > 45;
    const color = big ? 'red' : '#333';
    div.style.cssText = `position:fixed;left:${r.left}px;top:${r.top - 18}px;font-size:10px;color:${color};font-weight:bold;background:rgba(255,255,255,0.9);padding:1px 4px;border-radius:2px;white-space:nowrap;`;
    div.textContent = `${r.i}: ${r.w.toFixed(0)}×${r.h}`;
    overlay.appendChild(div);
  });

  // Highlight stuck pairs with red bar
  for (let i = 0; i < rects.length - 1; i++) {
    const gap = rects[i + 1].left - rects[i].right;
    if (gap <= 1) {
      const midX = (rects[i].right + rects[i + 1].left) / 2;
      const bar = document.createElement('div');
      bar.style.cssText = `position:fixed;left:${midX - 20}px;top:${rects[i].top}px;width:40px;height:${rects[i].h}px;background:rgba(255,0,0,0.3);border:2px solid red;display:flex;align-items:center;justify-content:center;font-size:11px;color:red;font-weight:bold;`;
      bar.textContent = '0px';
      overlay.appendChild(bar);
    }
  }

  setTimeout(() => overlay.remove(), 6000);
  console.log('\n(Overlay: button index+size above each button, red = oversized, red bar = stuck. Disappears in 6s)');
})();
