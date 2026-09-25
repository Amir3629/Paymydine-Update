import assert from 'node:assert/strict';
import fs from 'node:fs';

const retired = fs.readFileSync(
  'app/Http/Middleware/PmdAdminRetiredPagesR77.php',
  'utf8'
);
const sideMenu = fs.readFileSync(
  'app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php',
  'utf8'
);
const roles = fs.readFileSync(
  'app/admin/Services/PmdDefaultStaffRoleService.php',
  'utf8'
);
const mobileSession = fs.readFileSync(
  'app/Http/Controllers/PmdMobileWorkspaceSessionController.php',
  'utf8'
);

assert.ok(
  retired.includes('PMD_RESERVATIONS2_CURRENT_SURFACE_V130'),
  'V130 current Reservations2 marker missing'
);

const legacyExact = retired.match(
  /private const LEGACY_EXACT = \[(.*?)\n    \];/s
)?.[1] ?? '';

assert.equal(
  legacyExact.includes("'reservations2'"),
  false,
  'Reservations2 must not remain in retired exact pages'
);

assert.ok(
  retired.includes("$relative === 'reservations2'"),
  'Reservations2 exact path must bypass retired-page fallback'
);

assert.ok(
  retired.includes("'reservations2/'"),
  'Reservations2 descendants must bypass retired-page fallback'
);

assert.ok(
  sideMenu.includes("href=\"{{ admin_url('reservations2') }}\""),
  'Cashier side menu must still point to canonical Reservations2'
);

assert.ok(
  roles.includes('$isCashierReservationsV128'),
  'Cashier Reservations role authority must remain present'
);

assert.ok(
  roles.includes("$is('reservations2')"),
  'Cashier role must be allowed to open Reservations2'
);

assert.ok(
  mobileSession.includes('safeNextTargetV129'),
  'V129 exact mobile continuation must remain present'
);

assert.ok(
  mobileSession.includes("PMD_ANDROID_CLOUD_REENTRY_POS_SURFACE_V129"),
  'Signed POS surface mobile re-entry must remain present'
);

console.log(
  'PMD V130 Reservations2 current-surface redirect guard: PASS'
);
