'use strict';
// PMD_STAFF_UX_V2_CONTRACT_20261022
// Read-only static+parser test: no credentials, devices or attendance writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const read = file => fs.readFileSync(path.resolve(__dirname,'../../',file),'utf8');

const view = read('app/admin/views/pmd-staff-portal/index_v5.blade.php');
const login = read('app/admin/views/pmd-staff-portal/login.blade.php');
const css = read('app/admin/assets/css/pmd-staff-portal-v4.css');
const locale = read('app/admin/assets/js/pmd-staff-portal-locale-v2.js');
const clock = read('app/admin/assets/js/pmd-staff-time-clock-v1.js');
const controller = read('app/Http/Controllers/PmdStaffPortalV6Controller.php');
const native = read('mobile/android/staff/src/main/java/com/paymydine/staff/StaffActivity.kt');
const manifest = read('mobile/android/staff/src/main/AndroidManifest.xml');
const logo = read('app/admin/assets/images/pmd-brand-mark.svg');
const appIcon = read('mobile/android/staff/src/main/res/drawable/ic_staff_launcher.xml');
const gradle = read('mobile/android/staff/build.gradle.kts');

assert.match(view,/data-pmd-mobile-active="schedule"/);
assert.ok(view.indexOf('data-pmd-mobile-target="schedule"') < view.indexOf('data-pmd-mobile-target="chat"'));
assert.match(view,/function screenFromHash\(\)/);
assert.match(view,/return 'schedule';/);
assert.match(view,/PMD_STAFF_MARKET_LOCALE_V2_20261022/);
assert.match(view,/\$pmdStaffMarket === 'DE'/);
assert.match(view,/\$pmdStaffMarket === 'TR'/);
assert.match(view,/data-pmd-staff-language-toggle/);
assert.match(view,/data-pmd-staff-privacy-modal/);
assert.match(view,/data-pmd-staff-native-only hidden/);
assert.match(view,/pmdstaff:\/\/workplace/);
assert.doesNotMatch(view,/class="pmd-staff-person pmd-staff-person-button"/);
assert.match(view,/pmd-staff-portal-v4.css/);
assert.match(css,/PMD_STAFF_PORTAL_SHIFT_FIRST_UI_V4_20261022/);
assert.match(css,/@media \(min-width:761px\)/);
assert.match(css,/data-pmd-mobile-active="schedule"/);

assert.match(login,/PMD_STAFF_MARKET_LOGIN_V2_20261022/);
assert.match(login,/'tr' => \[/);
assert.match(login,/pmd-staff-login-privacy/);
assert.match(login,/name="username"/);
assert.match(login,/name="password"/);
assert.match(login,/@csrf/);

assert.match(controller,/PMD_STAFF_CLOCK_STICKY_ERRORS_V2_20261022/);
assert.match(controller,/with\('pmd_staff_clock_error', \$message\)/);
assert.match(clock,/data-pmd-clock-server-error/);
assert.match(clock,/role="alert"/);
assert.match(clock,/PMD_STAFF_NATIVE_CLOCK_GPS_V1_20261022/);
assert.match(clock,/HTMLFormElement.prototype.submit.call\(punchForm\)/);

assert.match(native,/PMD_STAFF_NATIVE_ONBOARDING_V2_20261022/);
assert.match(native,/staff_notice_ack_v2/);
assert.match(native,/noticeCheckbox.isChecked/);
assert.match(native,/onboardingScroll.visibility = View.GONE/);
assert.match(native,/pmdstaffgeo/);
assert.match(native,/uri.scheme == "pmdstaff"/);
assert.match(native,/isTrustedClockDocument\(view.url\)/);
assert.match(native,/return "\$code.paymydine.com"/);
assert.match(native,/Manifest.permission.ACCESS_FINE_LOCATION/);
assert.doesNotMatch(manifest,/ACCESS_BACKGROUND_LOCATION/);
assert.match(gradle,/applicationId = "com.paymydine.staff"/);
assert.match(gradle,/versionName = "0.2.3"/);

const officialLogoPaths = Array.from(logo.matchAll(/<path[^>]+\bd="([^"]+)"/g), x => x[1]);
assert.equal(officialLogoPaths.length,2);
for(const logoPath of officialLogoPaths)assert.ok(appIcon.includes(logoPath),
  'launcher must preserve official PMD mark vectors without redrawing brand geometry');
assert.match(appIcon,/PMD_STAFF_BRANDED_CLOCK_ICON_V2_20261022/);

const resourceKeys = locale => {
  const xml=read('mobile/android/staff/src/main/res/'+locale+'/strings.xml');
  return Array.from(xml.matchAll(/<string name="([^"]+)">/g), x=>x[1]).sort();
};
assert.deepEqual(resourceKeys('values'),resourceKeys('values-de'));
assert.deepEqual(resourceKeys('values'),resourceKeys('values-tr'));

new vm.Script(locale, {filename:'pmd-staff-portal-locale-v2.js'});
const lastScript = view.lastIndexOf('<script>');
assert.ok(lastScript > 0);
const lastClose = view.indexOf('</script>',lastScript);
assert.ok(lastClose > lastScript);
new vm.Script(view.slice(lastScript+'<script>'.length,lastClose),
  {filename:'Staff Portal bottom inline script'});

assert.doesNotMatch(locale,/\.pmd-staff-chat__messages[^\n]*\{[^\n]*textContent\s*=/);
assert.match(locale,/pmd-staff-chat__messages/);
console.log('Staff UX V2 contract: navigation, privacy, German-Turkish locales, error retention, Android identity, JS syntax PASSED');
