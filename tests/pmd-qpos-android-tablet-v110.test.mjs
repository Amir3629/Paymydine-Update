import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('app/admin/assets/css/pmd-qpos-android-tablet-v110.css', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');

assert.ok(css.includes('PMD_QPOS_ANDROID_TABLET_DESKTOP_PARITY_V110'));
assert.ok(css.includes('grid-template-columns: 300px minmax(360px,1fr) 220px'));
assert.ok(css.includes('grid-column: 1 !important'));
assert.ok(css.includes('Use the existing DOM order exactly: Tables -> Menu -> Check'));
assert.ok(css.includes('display: block !important'));
assert.ok(css.includes('min-height: 520px !important'));
assert.ok(css.includes('font-size: 17px !important'));
assert.ok(css.includes('font-size: 20px !important'));
assert.ok(!css.includes('@media (max-width: 599px)'));
assert.ok(view.includes('pmd-qpos-android-tablet-v110.css?v=20260925-v110'));
assert.ok(!view.includes('pmd-qpos-android-tablet-v109.css?v=20260925-v109'));

console.log('PMD V110 tablet Desktop-parity contract: PASS');
