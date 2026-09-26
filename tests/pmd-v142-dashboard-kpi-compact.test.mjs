import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync('app/admin/assets/css/pmd-dashboard-kpi-recovery-v136.css', 'utf8');

assert.match(css, /PMD_DASHBOARD_KPI_RECOVERY_V136/);
assert.match(css, /PMD_DASHBOARD_KPI_COMPACT_V142/);
assert.match(css, /@media \(min-width: 821px\)/);
assert.match(css, /min-height: 100px !important/);
assert.match(css, /padding: 12px 14px !important/);
assert.match(css, /min-height: 116px !important/);

console.log('PMD V142 dashboard KPI compact desktop geometry: PASS');
