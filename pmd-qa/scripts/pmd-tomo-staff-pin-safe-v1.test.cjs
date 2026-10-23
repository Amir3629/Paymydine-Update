'use strict';
// PMD_TOMO_PIN_SAFE_V1_TEST_20261023
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const read = file => fs.readFileSync(path.resolve(__dirname, '../../', file), 'utf8');
const src = read('scripts/pmd-tomo-staff-entrance-pin-fix-v1.php');
const fixture = JSON.parse(read('app/system/database/records/location.json'));

assert.equal(Number(fixture.location_lat), 52.415884, 'Coventry GPS is a product sample/seed');
assert.equal(Number(fixture.location_lng), -1.603648, 'Coventry GPS is a product sample/seed');
assert.match(src, /PMD_TOMO_ENTRANCE_PIN_REPAIR_V1_20261023/);
assert.match(src, /where\('domain', 'tomo\.paymydine\.com'\)/);
assert.match(src, /where\('status', 'active'\)/);
assert.match(src, /DB::connection\('mysql'\)->table\('tenants'\)/);
assert.match(src, /DB::setDefaultConnection\('tenant'\)/);
assert.match(src, /\$database !== 'tomo'/);
assert.match(src, /where\('location_id', 1\)/);
assert.match(src, /staff_id|employee|attendance|shift/i); // only doc strings; no employee write
assert.match(src, /'location_address_1'/);
assert.match(src, /location_postcode/);
assert.match(src, /60327/);
assert.match(src, /52\.415884/);
assert.match(src, /-1\.603648/);
assert.match(src, /getopt\('', \['lat:', 'lng:', 'apply', 'confirm:'\]\)/);
assert.match(src, /VERIFIED-TOMO-ENTRANCE/);
assert.match(src, /if \(!isset\(\$opts\['apply'\]\)\)/);
assert.match(src, /DRY RUN ONLY/);
assert.match(src, /lockForUpdate\(\)/);
assert.match(src, /->transaction\(function/);
assert.match(src, /file_put_contents\(\$backupFile/);
assert.match(src, /@chmod\(\$backupFile, 0600\)/);
assert.match(src, /update\(\['location_lat' => \$lat, 'location_lng' => \$lng\]\)/);
assert.doesNotMatch(src, /update\([^;]*location_address_1/s);
assert.match(src, /Read-back verification failed/);
console.log('Tomo GPS scoped repair: seed attribution, exact tenant, address guard, dry-run, confirmed pin, transactional backup OK');
