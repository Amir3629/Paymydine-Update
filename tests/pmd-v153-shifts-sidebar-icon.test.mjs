import fs from 'node:fs';
import assert from 'node:assert/strict';

const view = fs.readFileSync(
  'app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php',
  'utf8'
);

assert.match(view, /PMD_SHIFTS_CANONICAL_NAV_V153/);
assert.match(view, /<circle cx="8\.5" cy="7\.5" r="3"\/>/);
assert.match(view, /<circle cx="17" cy="16\.5" r="4"\/>/);
assert.match(view, /M17 14\.5v2\.2l1\.45\.9/);

// Reservations keeps its calendar icon.
assert.match(view, /PMD_RESERVATIONS_CANONICAL_NAV_V131/);
assert.match(view, /M16 3v4M8 3v4M4 11h16/);

// Old Shifts calendar-frame glyph must be gone.
assert.doesNotMatch(view, /<rect x="3" y="4" width="18" height="17" rx="2"\/>/);

console.log('PMD V153 distinct Shifts sidebar icon: PASS');
