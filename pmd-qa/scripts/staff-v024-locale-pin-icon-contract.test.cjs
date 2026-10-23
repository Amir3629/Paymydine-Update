'use strict';
// PMD_STAFF_V024_AUDIT_CONTRACT_20261023
// Non-mutating cross-file checks; no live tenant or employee data is accessed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname,'../../');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const view = read('app/admin/views/pmd-staff-portal/index_v5.blade.php');
const v6 = read('app/Http/Controllers/PmdStaffPortalV6Controller.php');
const mywork = read('app/admin/controllers/Mywork.php');
const css = read('app/admin/assets/css/pmd-staff-portal-v4.css');
const pinScript = read('app/admin/assets/js/pmd-staff-pin-audit-v1.js');
const settings = read('app/admin/views/pmdsettings/restaurant.blade.php');
const settingsController = read('app/admin/controllers/Pmdsettings.php');
const fence = read('app/Services/PmdStaffClockGeofenceV1.php');
const manifest = read('mobile/android/staff/src/main/AndroidManifest.xml');
const gradle = read('mobile/android/staff/build.gradle.kts');
const icon = read('mobile/android/staff/src/main/res/drawable/ic_staff_launcher.xml');
const adaptive = read('mobile/android/staff/src/main/res/drawable/ic_staff_launcher_foreground.xml');
const expectedMark = read('app/admin/assets/images/pmd-brand-mark.svg');
const adaptiveRound = read('mobile/android/staff/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml');
const adaptiveNormal = read('mobile/android/staff/src/main/res/mipmap-anydpi-v26/ic_launcher.xml');
const booking = read('app/Http/Controllers/PmdPublicBookingController.php');

assert.match(view,/PMD_STAFF_LOCALE_PERSIST_V4_20261023/);
assert.match(view,/pmd_staff_ui_locale_/);
assert.match(view,/request\(\)->cookie\('pmd_staff_locale_'/);
assert.match(view,/method="post" action="\{\{ admin_url\('mywork\/stafflocale'\) \}\}"/);
assert.match(view,/@csrf/);
assert.match(view,/data-pmd-staff-return-screen/);
assert.doesNotMatch(view,/document\.cookie = cookie/);
assert.match(mywork,/public function stafflocale\(\)/);
assert.match(mywork,/portalResponse\('setStaffLocale'\)/);
assert.match(v6,/public function setStaffLocale\(Request \$request\)/);
assert.match(v6,/in_array\(\$code, \$allowed, true\)/);
assert.match(v6,/Cookie::queue\(cookie\('pmd_staff_locale_'/);
assert.match(v6,/\$request->session\(\)->put\('pmd_staff_ui_locale_'/);
assert.match(v6,/return_screen/);
assert.match(css,/PMD_STAFF_STABLE_VIEWPORT_TABS_V5_20261023/);
assert.match(css,/overflow:hidden!important/);
assert.match(css,/position:absolute!important;inset:0;height:100%!important/);
assert.match(css,/pmd-staff-chat__messages/);
assert.match(view,/pmd-staff-portal-v4\.css\?v=3/);
assert.match(view,/pmd-staff-portal-locale-v2\.js\?v=3/);

assert.match(settings,/PMD_STAFF_PIN_OWNER_DIAGNOSTICS_V1_20261023/);
assert.match(settings,/PMD_PROFILE_PUBLIC_BOOKING_AUDIT_V1_20261023/);
assert.match(settings,/data-pmd-pin-compare/);
assert.match(settings,/data-pmd-pin-use-device/);
assert.match(settings,/data-pmd-public-booking-location-audit/);
assert.match(settings,/pmd-staff-pin-audit-v1\.js/);
assert.match(settingsController,/PMD_PROFILE_PUBLIC_BOOKING_AUDIT_V1_20261023/);
assert.match(settingsController,/Locations_model::getDefault\(\)/);
assert.match(settingsController,/'location_id' => \$locationId/);
assert.match(booking,/Locations_model::getDefault\(\)/);
assert.match(booking,/location_address_1/);
assert.match(booking,/location_postcode/);
assert.match(booking,/location_city/);
assert.match(pinScript,/getCurrentPosition/);
assert.match(pinScript,/maximumAge: 0/);
assert.match(pinScript,/Date\.now\(\) - recent\.captured/);
assert.match(pinScript,/window\.confirm/);
assert.doesNotMatch(pinScript,/fetch\(|XMLHttpRequest|localStorage/);
assert.match(fence,/PMD_STAFF_GEOFENCE_DISTANCE_AUDIT_V2_20261023/);
assert.match(fence,/distance_m.*round\(\$distance\)/);
assert.match(fence,/accuracy_m.*round\(\$accuracy\)/);
assert.doesNotMatch(fence,/logger\(\)->notice\([^;]+(?:geo_lat|geo_lng)/s);
assert.match(fence,/RADIUS_METERS = 150/);
assert.match(fence,/MAX_ACCURACY_METERS = 90/);

assert.match(manifest,/android:icon="@mipmap\/ic_launcher"/);
assert.match(manifest,/android:roundIcon="@mipmap\/ic_launcher_round"/);
for (const xml of [adaptiveRound,adaptiveNormal]) {
    assert.match(xml,/<adaptive-icon/);
    assert.match(xml, /@drawable\/ic_staff_launcher_foreground/);
}
const markPaths=[...expectedMark.matchAll(/<path[^>]+d="([^"]+)"/g)].map(m=>m[1]);
assert.equal(markPaths.length,2);
for (const p of markPaths) {
    assert.ok(adaptive.includes(p), 'foreground must retain untouched PMD logo path');
    assert.ok(icon.includes(p), 'legacy icon must retain untouched PMD logo path');
}
assert.match(icon,/PMD_STAFF_ROUNDED_ICON_V4_20261023/);
assert.match(adaptive,/PMD_STAFF_ADAPTIVE_ICON_V4_20261023/);
assert.match(gradle,/versionCode = 7/);
assert.match(gradle,/versionName = "0\.2\.4"/);
new vm.Script(pinScript,{filename:'pmd-staff-pin-audit-v1.js'});
const inline = view.lastIndexOf('<script>');
const inlineEnd=view.indexOf('</script>',inline);
assert.ok(inline>0 && inlineEnd>inline);
new vm.Script(view.slice(inline+8,inlineEnd),{filename:'Staff Portal inline JS'});
console.log('Staff 0.2.4: secure locale, fixed-viewport tabs, booking/pin audit and adaptive launcher PASSED');
