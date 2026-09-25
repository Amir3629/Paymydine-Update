import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const parityJs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js', 'utf8');
const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css', 'utf8');
const parityCss = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');

assert.equal(parityJs, js);
assert.equal(parityCss, css);

assert.ok(js.includes('PMD_QPOS_HISTORY_FOOD_PREVIEW_V125'));
assert.ok(js.includes('function historyFirstFoodPreviewV125(entry)'));
assert.ok(js.includes("summary.split(',')[0]"));
assert.ok(js.includes('preview = historyFirstFoodPreviewV125(entry)'));
assert.ok(js.includes('pmd-qpos-history-food-preview-v125'));

assert.ok(css.includes('PMD_QPOS_HISTORY_FOOD_PREVIEW_V125'));
assert.ok(css.includes('.pmd-qpos-history-food-preview-v125'));
assert.ok(css.includes('text-overflow: ellipsis'));

assert.ok(view.includes('pmd-qpos-web-parity-v112.css?v=20260925-v125'));
assert.ok(view.includes('pmd-quick-pos-v1.css?v=20260925-v125'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.js?v=20260925-v125'));
assert.ok(view.includes('pmd-quick-pos-v1.js?v=20260925-v125'));

assert.ok(js.includes('PMD_QPOS_HISTORY_ITERATION_HOTFIX_V124'));
assert.ok(js.includes('PMD_QPOS_HISTORY_INLINE_V123'));
assert.ok(js.includes('PMD_QPOS_BATCH_MAIN_PAY_V122'));

console.log('PMD V125 History food-name preview: PASS');
