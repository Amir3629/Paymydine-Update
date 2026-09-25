import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css', 'utf8');
const parity = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');

assert.equal(parity, css);

assert.ok(css.includes('PMD_QPOS_MOBILE_PAYMENT_STACK_V120'));
assert.ok(css.includes('.pmd-qpos-payment-main > *'));
assert.ok(css.includes('grid-area: auto !important'));
assert.ok(css.includes('flex-direction: column !important'));
assert.ok(css.includes('grid-template-columns: repeat(2,minmax(0,1fr)) !important'));
assert.ok(css.includes('grid-template-columns: repeat(4,minmax(0,1fr)) !important'));
assert.ok(css.includes('height: 100dvh !important'));
assert.ok(css.includes('overflow-y: auto !important'));

assert.ok(view.includes('pmd-qpos-web-parity-v112.css?v=20260925-v125'));
assert.ok(view.includes('pmd-quick-pos-v1.css?v=20260925-v125'));

assert.ok(css.includes('PMD_QPOS_BATCH_BILL_PREVIEW_V116'));

console.log('PMD V120 mobile payment stack: PASS');
