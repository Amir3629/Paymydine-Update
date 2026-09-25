import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('app/admin/assets/css/pmd-qpos-android-tablet-v111.css', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');

assert.ok(css.includes('PMD_QPOS_ANDROID_TABLET_DESKTOP_PARITY_V110'));
assert.ok(css.includes('PMD_QPOS_ANDROID_TABLET_SQUARE_GEOMETRY_V111'));
assert.ok(css.includes('.pmd-qpos-table'));
assert.ok(css.includes('.pmd-qpos-product'));
assert.ok((css.match(/aspect-ratio: 1 \/ 1 !important/g) || []).length >= 2);
assert.ok(css.includes('html.pmd-qpos-android-pos-v105'));
assert.ok(css.includes('html.pmd-qpos-android-pos-v107'));
assert.ok(!css.includes('@media (max-width: 599px)'));
assert.ok(view.includes('pmd-qpos-android-tablet-v111.css?v=20260925-v111'));
assert.ok(!view.includes('pmd-qpos-android-tablet-v110.css?v=20260925-v110'));

console.log('PMD V111 Android tablet square geometry contract: PASS');
