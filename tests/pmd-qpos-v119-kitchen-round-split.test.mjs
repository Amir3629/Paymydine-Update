import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const parityJs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js', 'utf8');
const save = fs.readFileSync(
  'app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php',
  'utf8'
);
const persist = fs.readFileSync(
  'app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php',
  'utf8'
);

assert.equal(parityJs, js);

assert.ok(js.includes('PMD_QPOS_KITCHEN_ROUND_SPLIT_V119'));
assert.ok(js.includes('PMD_QPOS_SILENT_KITCHEN_LOCK_V119'));
assert.ok(js.includes('!mutation.kitchen_started'));
assert.ok(!js.includes('Kitchen preparing/ready · sent item quantities are locked.'));

assert.ok(js.includes('PMD_QPOS_RECEIVED_REUSE_V113'));
assert.ok(js.includes('orderAcceptsReceivedAppendV113(order)'));
assert.ok(js.includes('var appendOrderIdV113'));
assert.ok(js.includes('!!order && !canAppendReceivedV113'));

assert.ok(persist.includes('PMD_QPOS_RECEIVED_APPEND_GATE_V113'));
assert.ok(persist.includes("['received', 'accepted', 'confirmed']"));
assert.ok(save.includes('$mode === \'send\' && !$paymentGate'));
assert.ok(!save.includes('explicit_order_selection'));
assert.ok(!persist.includes('can_append_selected_items'));

assert.ok(js.includes('PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117'));
assert.ok(js.includes('PMD_QPOS_APPEND_AUTHORITY_V116'));
assert.ok(js.includes('PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114'));
assert.ok(js.includes('PMD_QPOS_PAY_BEFORE_KITCHEN_V108'));

console.log('PMD V119 kitchen-round split + silent kitchen lock: PASS');
