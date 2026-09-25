import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const parityJs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js', 'utf8');
const persist = fs.readFileSync(
  'app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php',
  'utf8'
);
const save = fs.readFileSync(
  'app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php',
  'utf8'
);

assert.equal(parityJs, js);

assert.ok(persist.includes('PMD_QPOS_EXPLICIT_ORDER_APPEND_V118'));
assert.ok(persist.includes('pmdOrderAcceptsExplicitAppendV118'));
assert.ok(persist.includes("'can_append_selected_items' =>"));

assert.ok(save.includes('PMD_QPOS_EXPLICIT_ORDER_APPEND_V118'));
assert.ok(save.includes("$payload['explicit_order_selection']"));
assert.ok(save.includes('!$explicitSelectedAppendV118'));
assert.ok(save.includes('$existingStatusIdV118'));
assert.ok(save.includes("'can_append_selected_items' => $this->pmdOrderAcceptsExplicitAppendV118($order)"));

assert.ok(js.includes('PMD_QPOS_EXPLICIT_ORDER_APPEND_V118'));
assert.ok(js.includes('orderAcceptsExplicitAppendV118'));
assert.ok(js.includes('explicitSelectedAppendV118'));
assert.ok(js.includes('explicit_order_selection: snapshot.explicitOrderSelection'));
assert.ok(js.includes('can_append_selected_items'));
assert.ok(js.includes('!explicitSelectedAppendV118'));

assert.ok(js.includes('PMD_QPOS_APPEND_AUTHORITY_V116'));
assert.ok(js.includes('PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117'));
assert.ok(js.includes('PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114'));
assert.ok(js.includes('PMD_QPOS_PAY_BEFORE_KITCHEN_V108'));

console.log('PMD V118 explicit selected-order append: PASS');
