'use strict';
// PMD_STAFF_TENANT_CONTACT_AUTHORITY_V1_TEST_20261023
// Static, read-only test: no tenant credentials, attendance changes or location writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '../../');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const middleware = read('app/Http/Middleware/TenantDatabaseMiddleware.php');
const controller = read('app/admin/controllers/Pmdsettings.php');
const view = read('app/admin/views/pmdsettings/restaurant.blade.php');
const audit = read('scripts/pmd-staff-tenant-location-audit-v1.php');

assert.match(middleware, /DB::connection\('mysql'\)->table\('tenants'\)/);
assert.match(middleware, /Config::set\('database\.connections\.tenant\.database', \$tenantInfo->database\)/);
assert.match(middleware, /DB::setDefaultConnection\('tenant'\)/);

assert.match(audit, /PMD_STAFF_TENANT_LOCATION_AUDIT_V1_20261023/);
assert.match(audit, /getopt\('', \['tenant:'\]\)/);
assert.match(audit, /where\('domain', \$domain\)->where\('status', 'active'\)/);
assert.match(audit, /DB::connection\('mysql'\)->table\('tenants'\)/);
assert.match(audit, /DB::purge\('tenant'\)/);
assert.match(audit, /DB::setDefaultConnection\('tenant'\)/);
assert.match(audit, /DB::connection\('tenant'\)->table\('locations'\)->where\('location_id', 1\)/);
assert.match(audit, /CENTRAL DEFAULT DATABASE \/ LOCATION 1 \(NOT TOMO\)/);
assert.match(audit, /READ ONLY: no database edits/);
assert.doesNotMatch(audit, /DB::(table|connection)\([^\n]*->(?:update|insert|delete|truncate)\(/);

assert.match(controller, /PMD_RESTAURANT_CONTACT_READBACK_V1_20261023/);
assert.match(controller, /DB::transaction\(function/);
assert.match(controller, /\$expectedContact = \[/);
assert.match(controller, /'location_address_1' => trim/);
assert.match(controller, /'location_postcode' => trim/);
assert.match(controller, /->update\(\$expectedContact\)/);
assert.match(controller, /->first\(array_keys\(\$expectedContact\)\)/);
assert.match(controller, /Restaurant contact save verification failed/);
assert.match(controller, /if \(\$staffClockCoordinates !== null\)/);

assert.match(view, /PMD_PROFILE_COMPACT_ATTENDANCE_CONFIG_V1_20261023/);
assert.match(view, /<details class="pmd-profile-staff-gps-fold" id="pmd-staff-attendance-config">/);
assert.match(view, /<\/details>/);
assert.match(view, /PMD_PROFILE_ADDRESS_SAVE_AUTHORITY_V1_20261023/);
assert.match(view, /data-pmd-public-booking-location-audit/);
assert.match(view, /data-pmd-staff-pin-audit/);
assert.match(view, /name="profile\[staff_clock_lat\]"/);
assert.match(view, /name="profile\[staff_clock_lng\]"/);
assert.match(view, /name="profile\[address_1\]"/);
assert.match(view, /id="pmd-restaurant-profile-form"/);
assert.ok(view.indexOf('pmd-profile-staff-gps-fold') < view.indexOf('name="profile[staff_clock_lat]"'));
assert.ok(view.indexOf('name="profile[staff_clock_lat]"') < view.indexOf('</details>'));
assert.match(view, /type="submit"/);

console.log('Staff tenant contact authority: read-only exact tenant audit, DB read-back, compact independent GPS controls PASSED');
