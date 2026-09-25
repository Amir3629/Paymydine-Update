import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css', 'utf8');
const parityCss = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');

assert.equal(parityCss, css);

assert.ok(css.includes('PMD_QPOS_KEYBOARD_CATEGORY_POSITION_V126'));
assert.ok(css.includes('.pmd-qpos-text-keyboard-row:last-child'));
assert.ok(css.includes('minmax(0,2fr)'));
assert.ok(css.includes('.pmd-qpos-text-keyboard-row:last-child > button.space'));
assert.ok(css.includes('top: -10px !important'));
assert.ok(css.includes('padding-top: 8px !important'));
assert.ok(css.includes('padding-bottom: 8px !important'));
assert.ok(css.includes('z-index: 80 !important'));

assert.ok(view.includes('pmd-qpos-web-parity-v112.css?v=20260925-v127'));
assert.ok(view.includes('pmd-quick-pos-v1.css?v=20260925-v127'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.js?v=20260925-v127'));
assert.ok(view.includes('pmd-quick-pos-v1.js?v=20260925-v127'));

assert.ok(css.includes('PMD_QPOS_HISTORY_FOOD_PREVIEW_V125'));
assert.ok(css.includes('PMD_QPOS_HISTORY_PORTRAIT_SINGLE_PANE_V124'));

console.log('PMD V126 keyboard Space + category bar top position: PASS');
