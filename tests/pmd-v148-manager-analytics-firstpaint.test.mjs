import fs from 'node:fs';
import assert from 'node:assert/strict';

const view = fs.readFileSync(
  'app/admin/views/_partials/pmd_role_dashboard_v1.blade.php',
  'utf8'
);

assert.match(view, /PMD_MANAGER_ANALYTICS_FIRSTPAINT_V148/);
assert.match(view, /id="pmd-manager-analytics-firstpaint-v148"/);
assert.match(view, /data-pmd-lab-analytics-widget="salesByHour"/);
assert.match(view, /grid-column: span 9 !important/);
assert.match(view, /height: 430px !important/);
assert.match(view, /data-pmd-lab-analytics-widget="alerts"/);
assert.match(view, /grid-column: span 3 !important/);
assert.match(view, /display: none !important/);
assert.match(view, /@media \(max-width: 760px\)/);

console.log('PMD V148 Manager analytics first-paint geometry: PASS');
