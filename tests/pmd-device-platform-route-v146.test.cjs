'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');
const admin = read('app/admin/routes.php');
const root = read('routes.php');
const mobile = read('routes/pmd-mobile-sync-v1.php');
const device = read('routes/pmd-device-platform-v1.php');
const controller = read('app/Http/Controllers/PmdDevicePlatformController.php');
const auth = read('app/Services/PmdDevicePlatformAuthService.php');
const service = read('app/Services/PmdDevicePlatformService.php');

test('active tenant Admin loader includes device heartbeat module BEFORE Admin fallback', () => {
  const marker = 'PMD_DEVICE_PLATFORM_DIRECT_ADMIN_LOADER_V146';
  const name = "require_once base_path('routes/pmd-device-platform-v1.php');";
  assert.match(admin, /PMD_DEVICE_PLATFORM_DIRECT_ADMIN_LOADER_V146/);
  assert.equal(admin.split(name).length - 1, 1);
  const devicePos = admin.indexOf(name);
  assert.ok(devicePos > admin.indexOf(marker));
  assert.ok(devicePos < admin.indexOf("require_once base_path('routes/pmd-mobile-sync-v1.php');"));
  assert.ok(devicePos > admin.indexOf("require_once base_path('routes/admin-app-before.php');"));
  // Root may also load routes: require_once avoids duplicate definitions.
  assert.match(root, /require_once __DIR__\.'\/routes\/pmd-device-platform-v1\.php';/);
  assert.match(mobile, /PMD_MOBILE_SYNC_DIRECT_REGISTER_V8/);
});

test('public-looking device endpoints are bearer-authenticated and CSRF safe', () => {
  for(const endpoint of ['heartbeat','logs','ack']) {
    assert.match(device, new RegExp("Route::post\\('" + endpoint + "'"));
  }
  assert.equal((device.match(/withoutMiddleware\(\[VerifyCsrfToken::class\]\)/g) || []).length, 3);
  assert.equal((device.match(/->middleware\('throttle:/g) || []).length, 3);
  assert.match(controller, /\$auth->authenticate\(\$request\)/);
  assert.match(auth, /\$request->bearerToken\(\)/);
  assert.match(auth, /hash\('sha256', \$raw\)/);
  assert.match(auth, /whereNull\('revoked_at'\)/);
  assert.match(service, /public function heartbeat\(/);
});

test('no diagnostic endpoint allows anonymous commands or fake payments', () => {
  assert.doesNotMatch(device, /Route::(?:get|match|any)\(/);
  assert.doesNotMatch(device, /payment|settle|terminal|nfc/i);
  assert.doesNotMatch(admin.slice(admin.indexOf('PMD_DEVICE_PLATFORM_DIRECT_ADMIN_LOADER_V146'),admin.indexOf("require_once base_path('routes/pmd-mobile-sync-v1.php');")), /withoutMiddleware|disableMiddleware|csrf.*false/i);
});
