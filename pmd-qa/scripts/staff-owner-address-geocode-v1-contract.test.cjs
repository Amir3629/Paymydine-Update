'use strict';
// PMD_STAFF_OWNER_ADDRESS_GEOCODE_V1_TEST_20261023
// Test cross-file architecture without changing tenant data or making web calls.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = p => fs.readFileSync(path.resolve(__dirname,'../../',p),'utf8');
const controller=read('app/admin/controllers/Pmdsettings.php');
const view=read('app/admin/views/pmdsettings/restaurant.blade.php');
const js=read('app/admin/assets/js/pmd-staff-address-geocode-v1.js');
const fence=read('app/Services/PmdStaffClockGeofenceV1.php');
const trait=read('app/admin/traits/HasDeliveryAreas.php');
const fixture=JSON.parse(read('app/system/database/records/location.json'));

assert.equal(fixture.location_lat,0,'Never seed Coventry as a working Staff GPS pin');
assert.equal(fixture.location_lng,0,'No default point in a new restaurant');
assert.match(trait,/Geocoder::geocode\(\$address\)->first\(\)/);
assert.match(controller,/PMD_STAFF_ADDRESS_GEO_PREVIEW_V1_20261023/);
assert.match(controller,/public function onPreviewStaffClockAddress\(\)/);
assert.match(controller,/Validator::make\(\$input/);
assert.match(controller,/DB::table\('locations'\)->where\('location_id', \$locationId\)/);
assert.match(controller,/\\Igniter\\Flame\\Geolite\\Facades\\Geocoder::geocode\(\$address\)->first\(\)/);
assert.match(controller,/hasCoordinates\(\)/);
assert.match(controller,/getLatitude\(\)/);
assert.match(controller,/getLongitude\(\)/);
assert.match(controller,/pmd_staff_address_lookup/);
assert.match(controller,/PMD_STAFF_SEED_PIN_WARNING_V1_20261023/);
// Geocoder endpoint previews only. No insert/update/save within the method itself.
const geoStart=controller.indexOf('public function onPreviewStaffClockAddress()');
const geoEnd=controller.indexOf('public function onSaveRestaurantProfile()',geoStart);
assert.ok(geoStart>0 && geoEnd>geoStart);
const previewMethod=controller.slice(geoStart,geoEnd);
assert.match(previewMethod,/Old sample locations may still/);
assert.doesNotMatch(previewMethod,/->value\('country_name'\)/);
assert.doesNotMatch(previewMethod,/->update\(|->insert\(|->delete\(|->save\(|DB::transaction\(/);
assert.match(previewMethod,/location_id/);

assert.match(view,/PMD_STAFF_ADDRESS_GEO_PREVIEW_V1_20261023/);
assert.match(view,/data-pmd-staff-address-setup/);
assert.match(view,/data-pmd-staff-find-address/);
assert.match(view,/data-pmd-staff-address-preview/);
assert.match(view,/data-pmd-staff-found-map/);
assert.match(view,/data-pmd-staff-confirm-entrance/);
assert.match(view,/data-pmd-staff-use-address disabled/);
assert.match(view,/pmd-staff-address-geocode-v1\.js/);
assert.match(view,/staff_clock_demo_pin/);
assert.match(view,/name="profile\[address_1\]"/);
assert.match(view,/name="profile\[city\]"/);
assert.match(view,/name="profile\[postcode\]"/);
assert.match(view,/name="profile\[staff_clock_lat\]"/);
assert.match(view,/name="profile\[staff_clock_lng\]"/);
assert.match(view,/id="pmd-restaurant-profile-form"/);

assert.match(js,/PMD_STAFF_ADDRESS_GEO_PREVIEW_V1_20261023/);
assert.match(js,/X-IGNITER-REQUEST-HANDLER': 'onPreviewStaffClockAddress'/);
assert.match(js,/credentials: 'same-origin'/);
assert.match(js,/_token/);
assert.match(js,/accepted\.checked = false/);
assert.match(js,/apply\.disabled = true/);
assert.match(js,/pending\.lat\.toFixed\(6\)/);
assert.match(js,/pending\.lng\.toFixed\(6\)/);
assert.match(js,/setStatus\('Check-in location selected/);
assert.doesNotMatch(js,/navigator\.geolocation|location\.assign\(/);
assert.doesNotMatch(js,/localStorage|fetch\(['"]https:/);
new vm.Script(js,{filename:'pmd-staff-address-geocode-v1.js'});

assert.match(fence,/PMD_STAFF_DEMO_GEOFENCE_REJECT_V1_20261023/);
assert.match(fence,/52\.415884/);
assert.match(fence,/-1\.603648|\+ 1\.603648/);
assert.match(fence,/str_contains\(strtolower/);
assert.match(fence,/demo_pin/);
assert.match(fence,/RADIUS_METERS = 150/);
assert.match(fence,/MAX_ACCURACY_METERS = 90/);
assert.match(fence,/MAX_AGE_SECONDS = 90/);
assert.match(fence,/distance > self::RADIUS_METERS \+ 25/);
assert.match(fence,/demo GPS pin/i);
console.log('Owner address geocoding contracts: existing provider, consented preview, fail-closed demo pin, no clock bypass PASSED');
