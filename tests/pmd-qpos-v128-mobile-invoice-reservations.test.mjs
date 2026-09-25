import assert from 'node:assert/strict';
import fs from 'node:fs';

const roles = fs.readFileSync(
  'app/admin/Services/PmdDefaultStaffRoleService.php',
  'utf8'
);
const reservations = fs.readFileSync(
  'app/admin/controllers/Reservations.php',
  'utf8'
);

assert.ok(
  roles.includes('PMD_QPOS_MOBILE_INVOICE_RESERVATIONS_AUTHORITY_V128')
);
assert.ok(
  roles.includes("#^admin/pmd-cashier-order-center/invoice/[0-9]+$#")
);
assert.ok(
  roles.includes("$isCashierReservationsV128")
);
assert.ok(
  roles.includes("$is('reservations2')")
);
assert.ok(
  roles.includes("'Admin.Reservations' => 1")
);
assert.ok(
  reservations.includes('PMD_QPOS_MOBILE_INVOICE_RESERVATIONS_AUTHORITY_V128')
);
assert.ok(
  reservations.includes("'PMD.Workspace.Cashier'")
);
assert.ok(
  reservations.includes("'Admin.DeleteReservations'")
);

console.log(
  'PMD V128 mobile invoice + Cashier Reservations authority: PASS'
);
