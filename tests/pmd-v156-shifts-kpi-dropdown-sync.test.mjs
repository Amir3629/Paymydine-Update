import fs from 'node:fs';
import assert from 'node:assert/strict';

const js = fs.readFileSync('app/admin/assets/js/pmd-shifts-inpage-day-nav-v18e.js','utf8');
const css = fs.readFileSync('app/admin/assets/css/pmd-kpi-info-v1.css','utf8');

assert.match(js,/PMD_SHIFTS_KPI_DROPDOWN_LAYER_V156/);
assert.match(js,/PMD_SHIFTS_KPI_INFO_SYNC_V156/);
assert.match(js,/syncKpiInfo\(card, data\)/);
assert.match(js,/card\.classList\.add\('is-pmd-kpi-menu-open'\)/);
assert.match(js,/section\.classList\.add\('is-pmd-kpi-menu-open'\)/);
assert.match(js,/clearKpiMenuLayerState\(\)/);

assert.match(css,/PMD_SHIFTS_KPI_DROPDOWN_TOP_LAYER_V156/);
assert.match(css,/z-index: 2147482000 !important/);
assert.match(css,/z-index: 2147482200 !important/);
assert.match(css,/\.pmd-shifts-final-toolbar[\s\S]*?z-index: 1 !important/);

console.log('PMD V156 Shifts KPI dropdown sync + top layer: PASS');
