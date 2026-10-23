'use strict';
// PMD_PORTAL_TRUSTED_DEVICE_V028_SECURITY_TEST_20261023
// Cross-file security contracts. No live DB or cookie values are inspected.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p=>fs.readFileSync(path.resolve(__dirname,'../../',p),'utf8');
const trust=read('app/Services/PmdPortalTrustedDeviceService.php');
const totp=read('app/Services/PmdPortalTotpService.php');
const trait=read('app/admin/traits/HandlesPortalMfa.php');
const login=read('app/admin/controllers/Login.php');
const mobile=read('app/Http/Controllers/PmdMobileWorkspaceSessionController.php');
const view=read('app/admin/views/auth/login_portal_mfa_v1.blade.php');
const profile=read('app/admin/views/pmd-staff-portal/index_v5.blade.php');
const manager=read('app/admin/views/pmd-staff-portal/management_v1.blade.php');
const deviceView=read('app/admin/views/pmd-staff-portal/trusted_devices_v1.blade.php');
const controller=read('app/admin/controllers/Mywork.php');
const workspaceTrust=read('app/Services/PmdTrustedLoginDeviceService.php');
const gate=read('app/Services/PmdSiteAccessWorkspaceGateService.php');

assert.match(trust,/PMD_PORTAL_TRUSTED_DEVICE_V028_20261023/);
assert.match(trust,/public const COOKIE = 'pmd_portal_trusted_device_v1'/);
assert.match(trust,/public const KIND = 'portal_mfa_trusted'/);
assert.match(trust,/public const TTL_DAYS = 90/);
assert.match(trust,/bin2hex\(random_bytes\(32\)\)/);
assert.match(trust,/hash_hmac\([\s\S]{0,90}'portal-trusted-device-v1\|'/);
assert.match(trust,/token_hash' => \$this->tokenHash\(\$raw\)/);
assert.match(trust,/where\('token_hash', \$this->tokenHash\(\$raw\)\)/);
assert.match(trust,/where\('user_id', \$userId\)/);
assert.match(trust,/where\('location_id', \$locationId\)/);
assert.match(trust,/where\('device_kind', self::KIND\)/);
assert.match(trust,/whereNull\('revoked_at'\)/);
assert.match(trust,/where\('paired_at', '>', now\(\)->subDays\(self::TTL_DAYS\)\)/);
assert.match(trust,/portal_factor_id/);
assert.match(trust,/portal_factor_confirmed_at/);
assert.match(trust,/whereNotNull\('recovery_acknowledged_at'\)/);
assert.match(trust,/whereNull\('disabled_at'\)/);
assert.match(trust,/preg_match\('\/\\A\[a-f0-9\]\{64\}\\z\/D'/);
assert.match(trust,/if \(!\$this->ready\(\) \|\| !\$request->isSecure\(\)\) return null/);
assert.match(trust,/self::TTL_DAYS \* 24 \* 60/);
assert.match(trust,/'\/', null, true, true, false, 'Lax'/);
assert.match(trust,/public function revoke\(/);
assert.match(trust,/where\('id', \$deviceId\)/);
assert.doesNotMatch(trust,/pmd_trusted_login_v1/);
assert.doesNotMatch(trust,/markWorkspaceVerified/);
assert.doesNotMatch(trust,/^.*(password|secret_encrypted)' => /m);

assert.match(totp,/PMD_PORTAL_TRUSTED_RESUME_V028_20261023/);
assert.match(totp,/public function resumeFromTrustedDevice\(/);
assert.match(totp,/SESSION_DESTINATION, ''\) !== 'staff'/);
assert.match(totp,/PmdPortalTrustedDeviceService::class/);
assert.match(totp,/->current\(\$request, \$actual\)/);
assert.match(totp,/->markSessionVerified\(\$userId, \$locationId, 'portal_trusted_device'\)/);
assert.match(totp,/needsRecoveryAcknowledgement\(\$userId\)/);
assert.match(totp,/AdminAuth::isLogged\(\)/);
assert.match(totp,/portal_trusted_device_resumed/);

assert.match(login,/PMD_PORTAL_TRUSTED_LOGIN_V028_20261023/);
assert.ok(login.indexOf('AdminAuth::authenticate($credentials') < login.indexOf('resumeFromTrustedDevice($identity, request())'));
assert.match(login,/if \(\$destination === 'staff'\) \{[\s\S]{0,420}resumeFromTrustedDevice\(\$identity, request\(\)\)/);
assert.match(login,/return \$this->pmdFinishPortalMfa\(\$identity\)/);
assert.match(login,/pmdBeginPortalMfa\(\)/);
assert.match(mobile,/PMD_MOBILE_STAFF_PORTAL_TRUSTED_RESUME_V028_20261023/);
assert.match(mobile,/resumeFromTrustedDevice\(\$identity, \$request\)/);
assert.match(mobile,/markWorkspaceVerified\(\$locationId, 'portal_totp', 0\)/);
assert.match(mobile,/session\(\)->put\('pmd_login_portal_security_v1'/);
assert.match(mobile,/SESSION_DESTINATION/);

assert.match(trait,/PMD_PORTAL_TRUST_ON_VERIFIED_MFA_V028_20261023/);
assert.match(trait,/PMD_PORTAL_TRUST_CONSENT/);
assert.match(trait,/pmdPortalMfaAssertAttemptBudget/);
assert.match(trait,/->verify\(/);
assert.match(trait,/sessionVerified\(\$userId, \$locationId, 900\)/);
assert.match(trait,/needsRecoveryAcknowledgement\(\$userId\)/);
assert.match(trait,/->issueAfterVerifiedTotp\(request\(\), \$identity\)/);
assert.match(trait,/->withCookie\(\$cookie\)/);
assert.match(trait,/session\(\)->pull\(self::PMD_PORTAL_TRUST_CONSENT, false\)/);
assert.match(trait,/array_get\(\$data, 'trust_device', ''\) === '1'/);
assert.match(trait,/function pmdPortalMfaAbortToLogin/);

assert.equal((view.match(/name="trust_device"/g)||[]).length,2,'first enrollment and recurring TOTP both offer device consent');
assert.match(view,/trust_hint/);
assert.match(view,/Uncheck on shared devices/);
assert.match(view,/gemeinsam genutzten Geräten/);

assert.match(controller,/PMD_PORTAL_TRUST_DEVICES_ACCOUNT_V028_20261023/);
assert.match(controller,/public function trusteddevices\(\)/);
assert.match(controller,/public function revoketrusted\(\)/);
assert.match(controller,/if \(!request\(\)->isMethod\('post'\)\) abort\(405\)/);
assert.match(controller,/portalTrustedDeviceIdentity\(\)/);
assert.match(controller,/SESSION_DESTINATION, ''\) !== 'staff'/);
assert.match(controller,/isBoundToCurrentUser\(\)/);
assert.match(controller,/sessionVerified\(\$uid, \$loc, 86400\)/);
assert.match(controller,/->revoke\(\$identity, \$revokeId\)/);
assert.match(deviceView,/name="device_id"/);
assert.match(deviceView,/@csrf/);
assert.match(deviceView,/mywork\/revoketrusted/);
assert.match(profile,/mywork\/trusteddevices/);
assert.match(manager,/mywork\/trusteddevices/);

// Legacy Admin Workspace trusted-device authority MUST remain separate.
assert.match(workspaceTrust,/public const COOKIE = 'pmd_trusted_login_v1'/);
assert.match(workspaceTrust,/public const KIND = 'trusted_login'/);
assert.match(workspaceTrust,/PMD_PORTAL_MFA_NO_TRUSTED_RESUME_V1/);
assert.match(workspaceTrust,/=== 'staff'\) \{\s*return null;/);
assert.match(gate,/SESSION_VERIFIED_METHOD, ''\) === 'portal_totp'/);
assert.match(gate,/factorMatchesProof/);
assert.match(gate,/portal->sessionVerified/);

console.log('Portal MFA trusted device v028: password-first, OTP-only issuance, factor reset invalidation, tenant isolation and revoke contracts PASS');
