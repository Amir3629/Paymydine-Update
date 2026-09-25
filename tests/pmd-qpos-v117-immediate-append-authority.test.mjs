import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const parityJs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js', 'utf8');
const save = fs.readFileSync(
  'app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php',
  'utf8'
);

assert.equal(parityJs, js);

assert.ok(save.includes('PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117'));
assert.ok(save.includes("'can_append_items' => $this->pmdOrderAcceptsReceivedAppendV113($order)"));
assert.ok(save.includes("'status_name' => $this->pmdOrderKitchenPhaseNameV113($order)"));
assert.ok(save.includes("'processed' => (int)($order->processed ?? 0)"));

assert.ok(js.includes('PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117'));
assert.ok(js.includes('responseAppendAuthorityV117'));
assert.ok(js.includes('can_append_items: responseAppendAuthorityV117'));
assert.ok(js.includes('? row.can_append_items'));
assert.ok(js.includes(': !responseAppendAuthorityV117'));

assert.ok(js.includes('PMD_QPOS_APPEND_AUTHORITY_V116'));
assert.ok(js.includes('PMD_QPOS_RECEIVED_REUSE_V113'));
assert.ok(js.includes('PMD_QPOS_PAY_BEFORE_KITCHEN_V108'));
assert.ok(js.includes('PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114'));

console.log('PMD V117 immediate append authority: PASS');
