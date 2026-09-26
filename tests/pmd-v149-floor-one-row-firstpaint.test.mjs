import fs from 'node:fs';
import assert from 'node:assert/strict';

const view = fs.readFileSync(
  'app/admin/views/_partials/pmd_dashboard_lab_exact_floor_v1.blade.php',
  'utf8'
);

assert.match(view, /PMD_FLOOR_ONE_ROW_CRITICAL_GEOMETRY_V149/);
assert.match(view, /id="pmd-floor-one-row-critical-geometry-v149"/);
assert.match(view, /is-strip-mode[\s\S]*pmd-floor-v1__stage[\s\S]*height: 156px !important/);
assert.match(view, /\[data-floor-scroll\][\s\S]*height: 146px !important/);
assert.match(view, /\[data-floor-canvas\][\s\S]*min-height: 146px !important/);
assert.doesNotMatch(view, /#pmd-r2-shared-floor-canvas-v310:not\(\.is-strip-mode\)[\s\S]{0,200}PMD_FLOOR_ONE_ROW_CRITICAL_GEOMETRY_V149/);

console.log('PMD V149 One-row Floor server first-paint geometry: PASS');
