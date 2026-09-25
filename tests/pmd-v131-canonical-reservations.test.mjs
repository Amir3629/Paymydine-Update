import assert from 'node:assert/strict';
import fs from 'node:fs';

const menu = fs.readFileSync(
  'app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php',
  'utf8'
);
const session = fs.readFileSync(
  'app/Http/Controllers/PmdMobileWorkspaceSessionController.php',
  'utf8'
);
const retired = fs.readFileSync(
  'app/Http/Middleware/PmdAdminRetiredPagesR77.php',
  'utf8'
);
const routes = fs.readFileSync(
  'routes/admin-app-before.php',
  'utf8'
);
const roles = fs.readFileSync(
  'app/admin/Services/PmdDefaultStaffRoleService.php',
  'utf8'
);
const reservationsController = fs.readFileSync(
  'app/admin/controllers/Reservations.php',
  'utf8'
);

assert.ok(
  menu.includes('PMD_RESERVATIONS_CANONICAL_NAV_V131'),
  'V131 side-menu marker missing'
);
assert.ok(
  menu.includes("href=\"{{ admin_url('reservations') }}\""),
  'Side menu must point to /admin/reservations'
);
assert.equal(
  menu.includes("href=\"{{ admin_url('reservations2') }}\""),
  false,
  'Side menu must not point to Reservations2'
);

assert.ok(
  session.includes('PMD_RESERVATIONS_CANONICAL_ROUTE_V131'),
  'V131 mobile route marker missing'
);
assert.ok(
  session.includes("$route = 'reservations';"),
  'Mobile Reservations bootstrap must target canonical reservations'
);

assert.ok(
  retired.includes('PMD_RESERVATIONS2_LEGACY_ALIAS_V131'),
  'Reservations2 legacy alias marker missing'
);
assert.ok(
  retired.includes("'reservations2' =>\n                'reservations'"),
  'Reservations2 exact legacy URL must redirect to canonical Reservations'
);
assert.ok(
  retired.includes("'reservations2/' =>\n                'reservations/'"),
  'Reservations2 descendants must migrate to canonical Reservations'
);

assert.ok(
  routes.includes("'reservationslab' =>\n                        'reservations'"),
  'Server clean-path authority must identify Reservations as canonical'
);
assert.ok(
  routes.includes("? 'reservationslab'\n                            : 'reservations'"),
  '/admin/reservations document navigation must run Reservationslab internally'
);

assert.ok(
  roles.includes("'admin/reservations' =>\n                'admin/reservationslab'"),
  'Role authority must normalize canonical Reservations to Reservationslab'
);
assert.ok(
  roles.includes("$is('reservations2')"),
  'Stale Reservations2 links must remain authorized long enough to migrate'
);
assert.ok(
  roles.includes("$is('reservations')"),
  'Cashier must remain authorized for canonical Reservations'
);

assert.ok(
  reservationsController.includes('PMD_RESERVATIONS_CANONICAL_CONTROLLER_FALLBACK_V131'),
  'Legacy Reservations controller canonical fallback marker missing'
);
assert.ok(
  reservationsController.includes("return redirect(admin_url('reservations'));"),
  'Legacy Reservations controller must not redirect to Reservations2'
);
assert.equal(
  reservationsController.includes("return redirect(admin_url('reservations2'));"),
  false,
  'Legacy Reservations controller must not revive Reservations2'
);

console.log(
  'PMD V131 canonical Reservations navigation + legacy Reservations2 migration: PASS'
);
