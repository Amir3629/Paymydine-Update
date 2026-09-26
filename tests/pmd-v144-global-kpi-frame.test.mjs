import fs from 'node:fs';
import assert from 'node:assert/strict';

const shared = fs.readFileSync('app/admin/classes/PmdCleanWorkspaceControllerV1.php', 'utf8');
const shifts = fs.readFileSync('app/admin/controllers/Shifts.php', 'utf8');
const css = fs.readFileSync('app/admin/assets/css/pmd-dashboard-kpi-recovery-v136.css', 'utf8');

assert.match(shared, /PMD_GLOBAL_KPI_FRAME_V144/);
assert.match(shared, /pmd-dashboard-kpi-recovery-v136\.css/);
assert.match(shifts, /PMD_GLOBAL_KPI_FRAME_V144/);
assert.match(shifts, /pmd-dashboard-kpi-recovery-v136\.css/);
assert.match(css, /PMD_GLOBAL_KPI_FRAME_V144/);
assert.match(css, /body\.pmd-shifts-page[\s\S]*?height: 100px !important/);
assert.match(css, /grid-template-columns: 52px minmax\(0, 1fr\) 22px !important/);
assert.match(css, /PMD_DASHBOARD_KPI_FLOW_V143/);

console.log('PMD V144 global KPI frame authority: PASS');
