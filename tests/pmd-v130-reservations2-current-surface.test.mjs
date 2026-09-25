import assert from 'node:assert/strict';
import fs from 'node:fs';

const retired = fs.readFileSync(
  'app/Http/Middleware/PmdAdminRetiredPagesR77.php',
  'utf8'
);

const legacyExact = retired.match(
  /private const LEGACY_EXACT = \[(.*?)\n    \];/s
)?.[1] ?? '';

assert.equal(
  legacyExact.includes("'reservations2'"),
  false,
  'Reservations2 must not return to the retired dashboard-fallback list'
);

assert.ok(
  retired.includes('PMD_RESERVATIONS2_LEGACY_ALIAS_V131'),
  'V131 must supersede V130 by migrating Reservations2 to the canonical route'
);

assert.ok(
  retired.includes("'reservations2' =>\n                'reservations'"),
  'Reservations2 must migrate to /admin/reservations'
);

console.log(
  'PMD V130 guard superseded safely by V131 Reservations2 legacy alias: PASS'
);
