import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const parityJs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js', 'utf8');
const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css', 'utf8');
const parityCss = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css', 'utf8');
const persist = fs.readFileSync(
  'app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php',
  'utf8'
);
const save = fs.readFileSync(
  'app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php',
  'utf8'
);
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');

const count = (text, needle) => text.split(needle).length - 1;

assert.equal(parityJs, js);
assert.equal(parityCss, css);

assert.ok(js.includes('PMD_QPOS_SERVER_ROUND_AUTHORITY_V121'));
assert.ok(js.includes('roundCandidateOrderIdV121'));
assert.ok(js.includes('round_candidate_order_id: snapshot.roundCandidateOrderId'));

assert.ok(persist.includes('PMD_QPOS_SERVER_ROUND_AUTHORITY_V121'));
assert.ok(persist.includes('resolveQuickPosKitchenRoundCandidateV121'));
assert.ok(persist.includes("foreach (['received', 'accepted', 'confirmed'] as $received)"));
assert.ok(persist.includes("strpos($phase, $started) !== false"));

assert.ok(count(save, 'round_candidate_order_id') >= 2);
assert.ok(count(save, 'resolveQuickPosKitchenRoundCandidateV121') >= 2);

assert.ok(css.includes('PMD_QPOS_MOBILE_FLOATING_KEYPAD_V121'));
assert.ok(css.includes('position: fixed !important'));
assert.ok(css.includes('padding-bottom: calc(326px + env(safe-area-inset-bottom)) !important'));

assert.ok(view.includes('pmd-qpos-web-parity-v112.css?v=20260925-v126'));
assert.ok(view.includes('pmd-quick-pos-v1.css?v=20260925-v126'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.js?v=20260925-v126'));
assert.ok(view.includes('pmd-quick-pos-v1.js?v=20260925-v126'));

assert.ok(js.includes('PMD_QPOS_KITCHEN_ROUND_SPLIT_V119'));
assert.ok(js.includes('PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117'));
assert.ok(js.includes('PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114'));
assert.ok(css.includes('PMD_QPOS_MOBILE_PAYMENT_STACK_V120'));

console.log('PMD V121 server round authority + floating mobile keypad: PASS');
