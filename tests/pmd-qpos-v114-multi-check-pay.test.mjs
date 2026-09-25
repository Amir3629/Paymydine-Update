import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css','utf8');
const pcss = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css','utf8');
const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js','utf8');
const pjs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js','utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php','utf8');
const routes = fs.readFileSync('routes/admin-quick-mode.php','utf8');
const controller = fs.readFileSync('app/admin/controllers/PmdQuickPosV1.php','utf8');
const batch = fs.readFileSync('app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php','utf8');

assert.equal(pcss, css);
assert.equal(pjs, js);
assert.ok(css.includes('PMD_QPOS_MULTI_CHECK_PAY_V114'));
assert.ok(js.includes('PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114'));
assert.ok(js.includes('PMD_QPOS_MULTI_CHECK_OFFLINE_GUARD_V115'));
assert.ok(js.includes('Combined payment needs an internet connection right now.'));
assert.ok(js.includes('/admin/pos/payment-batch-summary'));
assert.ok(js.includes('/admin/pos/payment-batch-settle'));
assert.ok(view.includes('PMD_QPOS_BATCH_EXTERNAL_TERMINAL_V114'));
assert.ok(routes.includes('PMD_QPOS_MULTI_CHECK_PAY_ROUTES_V114'));
assert.ok(controller.includes('PmdQuickPosBatchPaymentV114Concern'));
assert.ok(batch.includes('PMD_QPOS_MULTI_CHECK_PAY_BACKEND_V114'));
assert.ok(batch.includes('DB::transaction'));
assert.ok(batch.includes('$order->processed = 1'));
assert.ok(js.includes('PMD_QPOS_RECEIVED_REUSE_V113'));
assert.ok(js.includes('PMD_QPOS_PAY_BEFORE_KITCHEN_V108'));
console.log('PMD V114 multi-check pay: PASS');
