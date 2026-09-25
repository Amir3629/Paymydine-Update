import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync('app/admin/assets/js/pmd-quick-pos-v1.js', 'utf8');
const parityJs = fs.readFileSync('app/admin/assets/js/pmd-qpos-web-parity-v112.js', 'utf8');
const css = fs.readFileSync('app/admin/assets/css/pmd-quick-pos-v1.css', 'utf8');
const parityCss = fs.readFileSync('app/admin/assets/css/pmd-qpos-web-parity-v112.css', 'utf8');
const view = fs.readFileSync('app/admin/views/pmd_quick_pos_v1.blade.php', 'utf8');

assert.equal(parityJs, js);
assert.equal(parityCss, css);

const badSingleDollarForEach = [...js.matchAll(/\$\([^;\n]*\)\.forEach\s*\(/g)]
  .filter((match) => match.index === 0 || js[match.index - 1] !== '$');

assert.equal(
  badSingleDollarForEach.length,
  0,
  'Single-element $() selector cannot be used with forEach; use $$().'
);

assert.ok(js.includes('PMD_QPOS_HISTORY_ITERATION_HOTFIX_V124'));
assert.ok(js.includes("$$('[data-qpos-history-order]', list).forEach"));
assert.ok(js.includes("$$('[data-qpos-history-preset]').forEach"));
assert.ok(js.includes('return isPhoneViewportV102() || isTabletPortraitV102();'));

assert.ok(css.includes('PMD_QPOS_HISTORY_PORTRAIT_SINGLE_PANE_V124'));
assert.ok(css.includes('grid-template-columns: repeat(4,minmax(0,1fr)) !important'));
assert.ok(css.includes('html.pmd-qpos-android-pos-v105'));
assert.ok(css.includes('html.pmd-qpos-android-pos-v107'));

assert.ok(view.includes('pmd-qpos-web-parity-v112.css?v=20260925-v127'));
assert.ok(view.includes('pmd-quick-pos-v1.css?v=20260925-v127'));
assert.ok(view.includes('pmd-qpos-web-parity-v112.js?v=20260925-v127'));
assert.ok(view.includes('pmd-quick-pos-v1.js?v=20260925-v127'));

assert.ok(js.includes('PMD_QPOS_HISTORY_INLINE_V123'));
assert.ok(js.includes('PMD_QPOS_HISTORY_DATE_RANGE_V123'));
assert.ok(js.includes('PMD_QPOS_BATCH_MAIN_PAY_V122'));
assert.ok(js.includes('PMD_QPOS_SERVER_ROUND_AUTHORITY_V121'));

console.log('PMD V124 History selector + portrait inline hotfix: PASS');
