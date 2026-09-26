import fs from 'node:fs';
import assert from 'node:assert/strict';

const view = fs.readFileSync(
  'app/admin/views/_partials/pmd_clean_workspace_shared_v1.blade.php',
  'utf8'
);

const floor = view.indexOf("@include('admin::_partials.pmd_dashboard_lab_exact_floor_v1'");
const managerPre = view.indexOf('PMD_MANAGER_SERVER_ANALYTICS_PRE_RUNTIME_V150');
const composer = view.indexOf('PMD_CLEAN_WORKSPACE_CANONICAL_RESERVATION_COMPOSER_SURFACE_V1_START');
const generic = view.indexOf('!$pmdCleanWorkspaceManagerCalendarSurface');

assert.ok(floor >= 0, 'floor include missing');
assert.ok(managerPre > floor, 'Manager analytics must be after Floor');
assert.ok(composer > managerPre, 'Manager analytics must be parsed before Composer/runtime');
assert.ok(generic > composer, 'generic after-Floor guard must remain later');
assert.match(
  view,
  /\$pmdCleanWorkspaceManagerCalendarSurface && \$pmdCleanWorkspaceAfterFloorPartial/
);
assert.match(
  view,
  /!\$pmdCleanWorkspaceManagerCalendarSurface/
);

console.log('PMD V150 Manager after-Floor parser order: PASS');
