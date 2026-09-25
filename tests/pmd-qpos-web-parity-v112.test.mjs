import assert from 'node:assert/strict';
import fs from 'node:fs';

const canonicalCss = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css', 'utf8');
const parityCss = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css', 'utf8');
const canonicalJs = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const parityJs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');

assert.equal(parityCss, canonicalCss, 'Android CSS must be byte-for-byte Web CSS');
assert.equal(parityJs, canonicalJs, 'Android JS must be byte-for-byte Web JS');

assert.ok(view.includes('PMD_QPOS_WEB_PARITY_V112'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.css?v=20260925-v120'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.js?v=20260925-v120'));

for (const forbidden of [
  'pmd-qpos-android-form-factor-v107.css',
  'pmd-qpos-android-tablet-v111.css',
  'pmd-qpos-android-form-factor-v107.js',
  'pmd-qpos-android-runtime-v108.js',
  'pmd-qpos-android-pos-v107'
]) {
  assert.ok(!view.includes(forbidden), 'Android-only layout override still active: ' + forbidden);
}

assert.ok(canonicalJs.includes('PMD_QPOS_PAY_BEFORE_KITCHEN_V108'));
console.log('PMD V112 Android/Web parity contract: PASS');
