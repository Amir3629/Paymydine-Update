import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const js = read('app/admin/assets/js/pmd-dashboard-lab-analytics-v1.js');
const partial = read(
  'app/admin/views/_partials/pmd_dashboard_lab_analytics_v1.blade.php'
);
const owner = read('app/admin/controllers/Dashboardlab.php');
const manager = read('app/admin/controllers/Managerlab.php');
const accountant = read('app/admin/controllers/Accountantlab.php');
const snapshot = read(
  'app/admin/Services/PmdDashboardAnalyticsSnapshotV132.php'
);

assert.ok(
  js.includes('PMD_DASHBOARD_ANALYTICS_SWR_V132'),
  'V132 SWR runtime marker missing'
);
assert.ok(
  js.includes("var VERSION = '1.0.2-v132-swr'"),
  'V132 runtime version missing'
);
assert.ok(
  js.includes('readPersistentBootstrapV132'),
  'persistent first-paint fallback missing'
);
assert.ok(
  js.includes('persistAnalyticsBootstrapV132'),
  'persistent snapshot writer missing'
);
assert.ok(
  js.includes("request('last30', true)") &&
    js.includes("request('month', true)"),
  'background force-fresh revalidation missing'
);
assert.equal(
  js.includes('requestIdleCallback(startDeferredAnalytics'),
  false,
  'old cold-start idle delay must stay removed'
);
assert.ok(
  js.includes('persistentBootstrapReadyV132'),
  'persistent bootstrap audit state missing'
);

assert.ok(
  partial.includes('data-pmd-dashboard-analytics-location-id'),
  'analytics location scope missing'
);
assert.ok(
  partial.includes('data-pmd-dashboard-analytics-locale'),
  'analytics locale scope missing'
);
assert.ok(
  partial.includes('data-pmd-dashboard-analytics-snapshot-source'),
  'analytics snapshot source marker missing'
);

for (const controller of [owner, manager, accountant]) {
  assert.ok(
    controller.includes('pmd-dashboard-lab-analytics-v1.js?v=132-swr'),
    'role dashboard must cache-bust V132 analytics runtime'
  );
  assert.ok(
    controller.includes('PmdDashboardAnalyticsSnapshotV132'),
    'role dashboard must use V132 snapshot authority'
  );
}

assert.ok(
  owner.includes('resolveAnalyticsBootstrap(\n        int $locationId'),
  'Owner first paint must be snapshot-only'
);
assert.ok(
  owner.includes(')->bootstrap($locationId);'),
  'Owner normal navigation must read snapshot cache'
);
assert.ok(
  manager.includes(')->bootstrap(\n            max(0, (int)$shared->locationId())'),
  'Manager normal navigation must read location snapshot'
);
assert.ok(
  accountant.includes(')->bootstrap(\n            max(0, (int)$shared->locationId())'),
  'Accountant normal navigation must read location snapshot'
);

assert.ok(
  snapshot.includes('PMD_DASHBOARD_ANALYTICS_SNAPSHOT_V132'),
  'server snapshot marker missing'
);
assert.ok(
  snapshot.includes("private const TTL_MINUTES = 30"),
  'server snapshot TTL contract missing'
);
assert.ok(
  snapshot.includes("DB::connection()->getDatabaseName()"),
  'tenant database cache scope missing'
);
assert.ok(
  snapshot.includes("'last30'") && snapshot.includes("'month'"),
  'required first-paint periods missing'
);
assert.equal(
  snapshot.includes('ownerAnalyticsPayload'),
  false,
  'snapshot service must not execute analytics authority'
);
assert.equal(
  snapshot.includes('analyticsPayload('),
  false,
  'snapshot service must remain read/write cache only'
);

new Function(js);

console.log(
  'PMD V132 dashboard analytics first-paint SWR: PASS'
);
