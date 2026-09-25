import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('app/admin/assets/css/pmd-qpos-android-tablet-v109.css', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');

assert.ok(css.includes('PMD_QPOS_ANDROID_TABLET_LAYOUT_V109'));
assert.ok(css.includes('grid-template-columns: 170px minmax(0,1fr) 360px'));
assert.ok(css.includes('"tables tables"'));
assert.ok(css.includes('"catalog check"'));
assert.ok(css.includes('font-size: 24px !important'));
assert.ok(css.includes('.pmd-qpos-table small:not([hidden])'));
assert.ok(css.includes('html.pmd-qpos-android-pos-v105'));
assert.ok(css.includes('html.pmd-qpos-android-pos-v107'));
assert.ok(!css.includes('@media (max-width: 599px)'));
assert.ok(view.includes('pmd-qpos-android-tablet-v109.css?v=20260925-v109'));

console.log('PMD V109 tablet-only layout contract: PASS');
