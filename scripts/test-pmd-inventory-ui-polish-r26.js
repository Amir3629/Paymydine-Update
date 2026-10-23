#!/usr/bin/env node
/* PMD_INVENTORY_UI_POLISH_R26
 * Tests UI wiring only. Stock/waste/purchase APIs remain authoritative.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const base = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(base, p), 'utf8');
const js = read('app/admin/assets/js/pmd-inventory-ui-polish-r26.js');
const css = read('app/admin/assets/css/pmd-inventory-ui-polish-r26.css');
const php = read('app/admin/controllers/Pmdmenus.php');

assert.doesNotThrow(() => new vm.Script(js), 'JavaScript parses');
assert.equal((css.match(/\{/g) || []).length, (css.match(/\}/g) || []).length, 'CSS brace balance');
assert.match(js, /window.PMDInventoryFocusDialogsV1/, 'Requires the installed R25 dialogs');
assert.deepEqual(
  ['stock','purchases','waste','shopping'].map(x => js.includes("'"+x+"'")),
  [true,true,true,true], 'Four workflows preserved');
assert.match(js, /introduction\.remove\(\)/, 'Removes tab editorial headings');
assert.match(js, /head\.classList\.add\('pmd-inv-r26-toolbar'\)/, 'Retains tools in heading');
assert.match(js, /delivery\.hidden = true/, 'Visible Delivery/Supplier section removed');
assert.match(js, /delivery\.inert = true/, 'Hidden metadata is not focusable');
assert.match(js, /aria-hidden/, 'Delivery metadata hidden from accessibility tree');
assert.match(js, /introduction && introduction\.tagName === 'DIV'/, 'Only introductory text nodes are removed');
const dialogs=['stock','purchase','waste','review','count','barcode'];
dialogs.forEach(key => assert.ok(js.includes("key:'"+key+"'"), key+' dialog refined'));
assert.match(js, /original\.click\(\)/, 'Calls original R19 cancel handler');
assert.match(js, /actions\.insertBefore\(countCancel, actions\.firstChild\)/, 'Moves count Cancel into footer');
assert.match(js, /pmd-inv-r26-count-columns/, 'Readable physical count columns');
assert.match(js, /Actual counted quantity for/, 'Count inputs labeled accessibly');
assert.match(js, /data-r19-shopping-row/, 'Shopping rows are read without editing amounts');
assert.match(js, /data-r19-shopping-qty/, 'Original quantity controls retained');
assert.match(js, /pmd-inv-r26-negative-stock/, 'Negative inventory is not silently clamped');
assert.match(js, /fullSummary\.split\(' · '\)\[0\]/, 'Short summary, retains forecast details');
assert.ok(!/api\.request\(|fetch\(|XMLHttpRequest/.test(js), 'No duplicated inventory writes');
assert.match(css, /pmd-inv-r26-ready/, 'CSS scoped to the new UI readiness class');
assert.match(css, /data-r19-pane="shopping"/, 'Shopping pane has dedicated restrained layout');
assert.match(css, /pmd-inv-r19-count-row > strong > span/, 'Category separated from stock item name');
assert.match(css, /background-image:none!important/, 'Remove inherited gradient button skins');
assert.match(css, /@media\(max-width:650px\)/, 'Mobile layout');
assert.match(css, /prefers-reduced-motion/, 'Reduced motion');
for (const file of ['pmd-inventory-ui-polish-r26.js','pmd-inventory-ui-polish-r26.css']) {
  assert.equal(php.split(file).length - 1, 1, 'Register asset exactly once: '+file);
}
console.log('PASS: Inventory R26 headings, form hiding, consistent dialog actions, count, shopping and regression guards.');
