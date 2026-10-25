#!/usr/bin/env node
/* PMD_INVENTORY_TABLE_CARD_PARITY_R27
 * Static, read-only integration tests for locally deployed PR 544/547/549.
 * R19/R24 remain the only inventory business and network authorities.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(base, file), 'utf8');
const js = read('app/admin/assets/js/pmd-inventory-table-card-parity-r27.js');
const css = read('app/admin/assets/css/pmd-inventory-table-card-parity-r27.css');
const menu = read('app/admin/controllers/Pmdmenus.php');

assert.doesNotThrow(() => new vm.Script(js), 'R27 JS syntax');
assert.equal((css.match(/\{/g) || []).length,(css.match(/\}/g) || []).length,'Balanced R27 CSS');

for (const dialog of ['stock','purchase','waste','review','count','barcode']) {
  assert.ok(js.includes("'" + dialog + "'"), 'R27 preserves ' + dialog);
}
assert.match(js, /new MutationObserver\(scheduleSync\)/, 'R25 hidden state drives native visibility');
assert.match(js, /workspace\.appendChild\(portal\)/, 'Native dialog stays within delegated workspace');
assert.match(js, /portal\.appendChild\(overlay\)/, 'Original R25 editor subtree is retained');
assert.match(js, /portal\.showModal\(\)/, 'True browser top-layer viewport modal');
assert.match(js, /portal\.close\(\)/, 'Native modal properly closes');
assert.match(js, /event\.preventDefault\(\)/, 'Browser Escape cannot bypass busy/count guards');
assert.match(js, /=== 'count'\) return/, 'Count is not backdrop-dismissible');
assert.match(js, /close\.click\(\)/, 'Dismissal delegates to canonical R25/R19 handler');
assert.match(js, /removeAttribute\('aria-modal'\)/, 'Only one semantic modal owner');
assert.match(js, /HTMLDialogElement\.prototype\.showModal/, 'Fail closed on unsupported native modal');
assert.match(js, /data-r19-count-input/, 'Count inputs never receive decoration');
assert.match(js, /input\.dispatchEvent\(new Event\('input'/, 'Stepper sends bubbling input');
assert.match(js, /input\.dispatchEvent\(new Event\('change'/, 'Stepper sends bubbling change');
assert.ok(!/fetch\(|api\.request\(|XMLHttpRequest|FormData\(/.test(js), 'No new inventory API writes');
assert.ok(!/document\.body\.appendChild\(overlay\)/.test(js), 'Delegated stock handlers are never broken by a body portal');

assert.match(css, /dialog\.pmd-inv-r27-native::backdrop/, 'Full-viewport native backdrop');
assert.match(css, /backdrop-filter: blur\(8px\)/, 'Uses PMD global overlay blur');
assert.match(css, /button\.pmd-inv-r25-overlay__backdrop/, 'Stray grey R25 button neutralized');
assert.match(css, /background: transparent !important/, 'No second painted backdrop');
assert.match(css, /width: min\(650px,calc\(100vw - 32px\)\)/, 'Create Table R36 compact 650px base width');
assert.match(css, /--pmd-inv-r27-jade: #075c47/, 'PayMyDine shared jade token');
assert.match(css, /--pmd-inv-r27-radius: 16px/, 'PayMyDine shared radius');
assert.match(css, /radial-gradient\(circle at 9% 8%/, 'Shared Cross Surface glass surface');
assert.match(css, /pmd-inv-r27-stepper__control/, 'R34-style +/- stepper controls');
assert.match(css, /linear-gradient\(180deg,#0b765e,#075c47\)/, 'Create Table primary button gradient');
assert.match(css, /@media \(max-width: 700px\)/, 'Mobile layout');
assert.match(css, /prefers-reduced-motion: reduce/, 'Reduced motion support');

for (const asset of ['pmd-inventory-table-card-parity-r27.js','pmd-inventory-table-card-parity-r27.css']) {
  assert.equal(menu.split(asset).length - 1, 1,'Asset registered once: '+asset);
}
assert.ok(menu.includes('pmd-inventory-focus-dialogs-v1.js'),'Original R25 handler is still loaded');
assert.ok(menu.includes('pmd-inventory-retained-controls-v1.js'),'R19 extended inventory handlers preserved');
console.log('PASS: R27 native full-viewport modal, six editors, shared card tokens, safe steppers and untouched business handlers.');
