import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const save = fs.readFileSync(
  'app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php',
  'utf8'
);
const persist = fs.readFileSync(
  'app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php',
  'utf8'
);

assert.ok(!js.includes('PMD_QPOS_EXPLICIT_ORDER_APPEND_V118'));
assert.ok(!js.includes('orderAcceptsExplicitAppendV118'));
assert.ok(!js.includes('explicit_order_selection: snapshot.explicitOrderSelection'));
assert.ok(!save.includes('explicit_order_selection'));
assert.ok(!persist.includes('can_append_selected_items'));

assert.ok(js.includes('PMD_QPOS_KITCHEN_ROUND_SPLIT_V119'));
assert.ok(js.includes('PMD_QPOS_RECEIVED_REUSE_V113'));

console.log('PMD V118 exact-order append superseded by V119 kitchen-round split: PASS');
