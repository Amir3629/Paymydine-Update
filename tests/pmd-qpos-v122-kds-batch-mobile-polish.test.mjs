import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const parityJs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js', 'utf8');
const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css', 'utf8');
const parityCss = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');
const kds = fs.readFileSync('app/admin/views/kitchendisplay/index.blade.php', 'utf8');

assert.equal(parityJs, js);
assert.equal(parityCss, css);

assert.ok(js.includes('PMD_QPOS_BATCH_MAIN_PAY_V122'));
assert.ok(js.includes('batchPayReadyV122'));
assert.ok(js.includes('openBatchPaymentV114();'));
assert.ok(js.includes("'Select 2+ to Pay'"));

assert.ok(js.includes('PMD_QPOS_MOBILE_CART_END_V122'));
assert.ok(js.includes("block: 'end'"));
assert.ok(js.includes("document.scrollingElement"));
assert.ok(js.includes("window.scrollTo({top: bottom, behavior: 'smooth'})"));

assert.ok(css.includes('PMD_QPOS_MOBILE_LAYER_TOP_V122'));
assert.ok(css.includes('z-index: 45 !important'));
assert.ok(css.includes('z-index: 40 !important'));
assert.ok(css.includes('padding-top: 0 !important'));
assert.ok(css.includes('top: 0 !important'));

assert.ok(kds.includes('PMD_KDS_RECEIVED_APPEND_REFRESH_V122'));
assert.ok(kds.includes('!card.dataset.renderSignatureV1'));
assert.ok(kds.includes("cache: 'no-store'"));
assert.ok(kds.includes("formData.append('_v122', String(Date.now()))"));

assert.ok(view.includes('pmd-qpos-web-parity-v112.css?v=20260925-v123'));
assert.ok(view.includes('pmd-quick-pos-v1.css?v=20260925-v123'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.js?v=20260925-v123'));
assert.ok(view.includes('pmd-quick-pos-v1.js?v=20260925-v123'));

assert.ok(js.includes('PMD_QPOS_SERVER_ROUND_AUTHORITY_V121'));
assert.ok(css.includes('PMD_QPOS_MOBILE_FLOATING_KEYPAD_V121'));
assert.ok(js.includes('PMD_QPOS_KITCHEN_ROUND_SPLIT_V119'));
assert.ok(js.includes('PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114'));

console.log('PMD V122 KDS append refresh + batch Pay + mobile cart/category polish: PASS');
