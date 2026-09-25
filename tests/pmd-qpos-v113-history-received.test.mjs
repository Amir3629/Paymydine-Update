import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css','utf8');
const pcss = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css','utf8');
const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js','utf8');
const pjs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js','utf8');
const persist = fs.readFileSync('app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php','utf8');
const save = fs.readFileSync('app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php','utf8');

assert.equal(pcss, css);
assert.equal(pjs, js);
assert.ok(css.includes('PMD_QPOS_MOBILE_HISTORY_SCROLL_V113'));
assert.ok(css.includes('touch-action: pan-y !important'));
assert.ok(persist.includes('PMD_QPOS_RECEIVED_APPEND_GATE_V113'));
assert.ok(persist.includes("['received', 'accepted', 'confirmed']"));
assert.ok(save.includes('PMD_QPOS_RECEIVED_APPEND_SAVE_V113'));
assert.ok(js.includes('PMD_QPOS_RECEIVED_REUSE_V113'));
assert.ok(js.includes('orderAcceptsReceivedAppendV113'));
assert.ok(js.includes('Continuing Order #'));
assert.ok(js.includes('PMD_QPOS_PAY_BEFORE_KITCHEN_V108'));
console.log('PMD V113 History + Received reuse: PASS');
