import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync('app/admin/assets/css/pmd-dashboard-kpi-recovery-v136.css', 'utf8');

assert.match(css, /PMD_DASHBOARD_KPI_FLOW_V143/);
assert.doesNotMatch(
  css,
  /\.pmd-r2-kpi-v2401-more,\s*#pmd-dashboard-lab\s*#pmd-r2-reservation-kpis-v307\s*\.pmd-kpi-info-button\s*\{\s*position:\s*relative/
);
assert.match(css, /button\.pmd-kpi-info-button\s*\{[\s\S]*?position: absolute !important/);
assert.match(css, /grid-template-rows: minmax\(0, 1fr\) !important/);
assert.match(css, /height: 100px !important/);
assert.match(css, /max-height: 100px !important/);

console.log('PMD V143 dashboard KPI single-row flow: PASS');
