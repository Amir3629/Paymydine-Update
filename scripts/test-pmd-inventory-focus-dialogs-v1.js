#!/usr/bin/env node
/* PMD_INVENTORY_FOCUS_FORMS_V1 structural regression and syntax checks.
 * No browser/network/DB required. Intended to run against staged or live files.
 */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
function read(name) {return fs.readFileSync(path.join(root, name), 'utf8');}
const js = read('app/admin/assets/js/pmd-inventory-focus-dialogs-v1.js');
const css = read('app/admin/assets/css/pmd-inventory-focus-dialogs-v1.css');
const controller = read('app/admin/controllers/Pmdmenus.php');

assert.doesNotThrow(() => new vm.Script(js), 'Dialog JavaScript parses');
assert.ok(js.includes("window.PMDInventoryFocusDialogsV1"), 'Runtime guard');
const forms = [
  'data-r19-stock-editor',
  'data-r19-purchase-editor',
  'data-r19-waste-editor',
  'data-r19-receipt-review',
  'data-r19-count',
  'data-r19-barcode-panel',
];
const closers = [
  'data-r19-close-stock-editor',
  'data-r19-close-purchase-editor',
  'data-r19-close-waste-editor',
  'data-r19-close-review',
  'data-r19-cancel-count',
  'data-r19-barcode-close'
];
forms.forEach(s => assert.ok(js.includes(s), 'Existing form host preserved: '+s));
closers.forEach(s => assert.ok(js.includes(s), 'Original business-aware closer preserved: '+s));
assert.match(js, /content\.appendChild\(host\)/, 'R19 delegated click/input handlers retained');
assert.match(js, /workspace\.appendChild\(overlay\)/, 'Dialogs remain inside event delegation root');
assert.match(js, /original\.click\(\)/, 'Existing cleanup handlers invoked on close');
assert.match(js, /locked:true/, 'Physical count cannot be backdrop-dismissed');
assert.match(js, /data-r24-camera-stop/, 'Closing scanner also stops live camera safely');
assert.match(js, /new MutationObserver/, 'Visibility follows original form changes');
assert.match(js, /mountDelivery\(activeKey\)/, 'Supplier and invoice details follow active receiving flow');
assert.match(js, /data-r19-purchase-search/, 'Catalogue search remains functional');
assert.ok(!/api\.request\(|fetch\(/.test(js), 'Business network requests still owned by existing inventory runtime');
assert.ok(css.includes('pmd-inv-r25-overlay__backdrop'), 'Blurred modal backdrop');
assert.ok(css.includes('.pmd-inv-r25-delivery'), 'Progressive supplier/invoice details');
assert.ok(css.includes('grid-template-columns:repeat(auto-fill,minmax(156px,1fr))'), 'Compact catalogue grid');
assert.ok(css.includes('prefers-reduced-motion'), 'Reduced motion support');
for (const asset of ['pmd-inventory-focus-dialogs-v1.css','pmd-inventory-focus-dialogs-v1.js']) {
  assert.equal(controller.split(asset).length - 1, 1, 'Controller registers '+asset+' once');
}
console.log('PASS: six Inventory dialogs, delegated actions, supplier details, compact grid, accessibility and syntax.');
