import fs from 'node:fs';
import assert from 'node:assert/strict';

const owner = fs.readFileSync('app/admin/controllers/Dashboardlab.php', 'utf8');
const manager = fs.readFileSync('app/admin/controllers/Managerlab.php', 'utf8');
const recovery = fs.readFileSync('app/admin/assets/css/pmd-dashboard-kpi-recovery-v136.css', 'utf8');

assert.match(recovery, /PMD_DASHBOARD_KPI_RECOVERY_V136/);
assert.match(owner, /PMD_DASHBOARD_FIRSTPAINT_V141/);
assert.match(manager, /PMD_DASHBOARD_FIRSTPAINT_V141/);
assert.match(owner, /pmd-dashboard-kpi-recovery-v136\.css/);
assert.match(manager, /pmd-dashboard-kpi-recovery-v136\.css/);

console.log('PMD V141 dashboard first-paint KPI authority: PASS');
