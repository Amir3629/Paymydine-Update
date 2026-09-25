import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(path, 'utf8');

const owner = read('app/admin/controllers/Dashboardlab.php');
const manager = read('app/admin/controllers/Managerlab.php');
const accountant = read('app/admin/controllers/Accountantlab.php');
const coverage = read('app/admin/assets/js/pmd-admin-coverage-r3-v11b.js');
const recovery = read('app/admin/assets/css/pmd-dashboard-kpi-recovery-v136.css');

assert.match(recovery, /PMD_DASHBOARD_KPI_RECOVERY_V136/);

for (const [name, controller] of [
  ['Owner', owner],
  ['Manager', manager],
  ['Accountant', accountant],
]) {
  assert.match(
    controller,
    /pmd-dashboard-kpi-recovery-v136\.css/,
    name + ' must load the KPI geometry recovery authority'
  );
}

assert.match(owner, /PMD_ROLE_DASHBOARD_LOCATION_FAILOPEN_V137/);
assert.match(owner, /PmdCleanWorkspaceSharedV1::class/);
assert.match(owner, /resolveWorkspaceLocationV137\(\)/);

for (const [name, controller] of [
  ['Manager', manager],
  ['Accountant', accountant],
]) {
  assert.match(controller, /PMD_ROLE_DASHBOARD_SERVICE_FAILOPEN_V137/);
  assert.match(controller, /class_exists\(PmdRoleDashboardDataV1::class\)/);
  assert.match(controller, /role-dashboard-service-unavailable/);
  assert.match(
    controller,
    /admin_url\('dashboardlab'\)\.\'?pmd_analytics=1'/,
    name + ' must fall back to the canonical Owner analytics endpoint'
  );
}

assert.match(coverage, /PMD_SHIFTS_PREPAINT_I18N_V137/);
assert.match(coverage, /isShiftsPrepaintRouteV137/);
assert.match(coverage, /3\.2\.1-v137-shifts-prepaint/);
assert.match(
  coverage,
  /isShiftsPrepaintRouteV137[\s\S]*?run\(\);[\s\S]*?startObserver\(\);/,
  'Shifts must execute the coverage translation before DOMContentLoaded'
);
assert.match(
  coverage,
  /if \(!isShiftsPrepaintRouteV137\)[\s\S]*?window\.addEventListener\([\s\S]*?'load'/,
  'Shifts must not schedule a second full-body coverage pass on window.load'
);

console.log('PMD V137 dashboard recovery + Shifts prepaint i18n: PASS');
