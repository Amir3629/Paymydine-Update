import fs from 'node:fs';
import assert from 'node:assert/strict';

const accountant = fs.readFileSync('app/admin/controllers/Accountantlab.php', 'utf8');

assert.match(accountant, /PMD_ROLE_DASHBOARD_SERVICE_FAILOPEN_V137/);
assert.match(accountant, /class_exists\(PmdRoleDashboardDataV1::class\)/);
assert.match(accountant, /role-dashboard-service-unavailable/);
assert.match(accountant, /admin_url\('dashboardlab'\)\.\'?pmd_analytics=1'/);

console.log('PMD V140 Accountant optional role-dashboard service fail-open: PASS');
