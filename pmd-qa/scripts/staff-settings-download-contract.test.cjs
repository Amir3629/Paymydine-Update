'use strict';
// PMD_STAFF_APP_SETTINGS_DOWNLOAD_QA_V1_20261022
// Read-only source contracts. No browser session or live business data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (relative) => fs.readFileSync(path.resolve(__dirname, '..', '..', relative), 'utf8');

const view = read('app/admin/views/pmdsettings/index.blade.php');
const installer = read('scripts/pmd-staff-apk-settings-v1-deploy.sh');
const pathFix = read('scripts/pmd-staff-settings-download-path-v2-deploy.sh');
const android = read('mobile/android/staff/build.gradle.kts');
const device = read('mobile/android/app/build.gradle.kts');

assert.match(view, /PMD_STAFF_APP_SETTINGS_DOWNLOAD_V1_20261022/);
assert.match(view, /data-pmd-staff-app-download-v1/);
assert.match(view, /data-pmd-staff-app-download-pending-v1/);
assert.match(view, /PMD_STAFF_APP_DOWNLOAD_PATH_V2_20261022/);
assert.match(view, /base_path\('public\/'\.\$pmdStaffApkRelativePath\)/);
assert.match(view, /public_path\(\$pmdStaffApkRelativePath\)/);
assert.match(view, /is_file\(\$pmdStaffApkPath\)/);
assert.match(view, /is_readable\(\$pmdStaffApkPath\)/);
assert.match(view, /PayMyDine-Staff-App-0\.2\.1-debug\.apk/);
assert.match(view, /\/public\/downloads\/paymydine\/\{\{ \$pmdStaffApkFilename \}\}/);
assert.match(view, /data-pmd-device-app-download-v21/, 'Existing Device App must remain');
assert.match(view, /PayMyDine Device App · Android/);
assert.match(view, /Windows 10 \/ 11/);
assert.match(installer, /PMD_STAFF_APP_SETTINGS_DOWNLOAD_V1_20261022/);
assert.match(installer, /481c252ea4b50d336356c0eda64bb2818fe9c07615de954d621c061d6b542dc2/);
assert.match(installer, /sha256sum -c -/);
assert.match(pathFix, /PMD_STAFF_APP_DOWNLOAD_PATH_V2_DEPLOY_20261022/);
assert.match(pathFix, /STAFF APP SETTINGS DOWNLOAD PATH FIXED/);
assert.match(pathFix, /sha256sum -c -/);
assert.match(pathFix, /php artisan view:clear/);
assert.match(installer, /INSTALLING=1/);
assert.match(installer, /php artisan view:clear/);
assert.match(android, /applicationId = "com.paymydine.staff"/);
assert.match(android, /versionName = "0\.2\.1"/);
assert.match(device, /applicationId = "com.paymydine.mobile"/);
console.log('Staff download: APK link gated, independent package, signed hash gate, safe installer PASSED');
