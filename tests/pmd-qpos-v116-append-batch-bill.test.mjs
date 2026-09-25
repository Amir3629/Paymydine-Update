import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css','utf8');
const parityCss = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css','utf8');
const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js','utf8');
const parityJs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js','utf8');
const persist = fs.readFileSync(
  'app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php',
  'utf8'
);

assert.equal(parityCss, css);
assert.equal(parityJs, js);

assert.ok(persist.includes('PMD_QPOS_APPEND_AUTHORITY_V116'));
assert.ok(persist.includes("'can_append_items' =>"));
assert.ok(js.includes('PMD_QPOS_APPEND_AUTHORITY_V116'));
assert.ok(js.includes('order.can_append_items'));

assert.ok(js.includes('PMD_QPOS_BATCH_BILL_PREVIEW_V116'));
assert.ok(js.includes('batchBillTotalV116'));
assert.ok(js.includes('orders selected'));
assert.ok(js.includes('renderCart({batchSelectionV116: true})'));
assert.ok(css.includes('PMD_QPOS_BATCH_BILL_PREVIEW_V116'));
assert.ok(css.includes('.pmd-qpos-sent-order-v116'));

assert.ok(js.includes('PMD_QPOS_RECEIVED_REUSE_V113'));
assert.ok(js.includes('PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114'));
assert.ok(js.includes('PMD_QPOS_PAY_BEFORE_KITCHEN_V108'));

console.log('PMD V116 authoritative append + selected bill preview: PASS');
