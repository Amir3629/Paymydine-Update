import assert from 'node:assert/strict';
import fs from 'node:fs';

const session = fs.readFileSync(
  'app/Http/Controllers/PmdMobileWorkspaceSessionController.php',
  'utf8'
);
const auth = fs.readFileSync(
  'app/Http/Controllers/PmdMobileWorkspaceAuthController.php',
  'utf8'
);
const pos = fs.readFileSync(
  'mobile/android/app/src/main/java/com/paymydine/mobile/PosActivity.kt',
  'utf8'
);
const gradle = fs.readFileSync(
  'mobile/android/app/build.gradle.kts',
  'utf8'
);

assert.ok(session.includes('PMD_ANDROID_CLOUD_REENTRY_V129'));
assert.ok(session.includes('safeNextTargetV129'));
assert.ok(session.includes('PMD_ANDROID_CLOUD_REENTRY_POS_SURFACE_V129'));
assert.ok(session.includes("$effectiveSurface !== 'pos'"));
assert.ok(session.includes("'next_target_v129'"));
assert.ok(session.includes('PmdDefaultStaffRoleService::CASHIER'));
assert.ok(session.includes("$nextTargetV129 ?: admin_url($route)"));

assert.ok(auth.includes('PMD_ANDROID_CLOUD_REENTRY_V129'));
assert.ok(auth.includes("|| $roleCode === $roles::CASHIER"));

assert.ok(pos.includes('PMD_ANDROID_CLOUD_REENTRY_V129'));
assert.ok(pos.includes('pendingCloudAdminTargetV129'));
assert.ok(pos.includes('routeCloudAdminNavigationV129'));
assert.ok(pos.includes('/admin/mobile/workspace/open'));
assert.ok(pos.includes('?surface=auto&destination=workspace&next='));
assert.ok(pos.includes('X-PayMyDine-Staff-Grant'));
assert.ok(pos.includes('CookieManager.getInstance()'));
assert.ok(pos.includes('URLEncoder.encode'));

assert.ok(gradle.includes('versionCode = 51'));
assert.ok(gradle.includes('versionName = "0.3.38-v129-cloud-reentry"'));

console.log('PMD V129 Local-First cloud re-entry + Reservations authority: PASS');
