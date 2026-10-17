<?php
/** Run: php tests/restaurant-groups/security.php (isolated, no live services). */
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require __DIR__.'/fixtures.inc';
$root = dirname(__DIR__, 2);
foreach (['Policy', 'SecurityProof', 'ManagedIdentity', 'Auth', 'Totp', 'TrustedLogin'] as $name) {
    require $root.'/app/Services/RestaurantGroups/'.$name.'.php';
}

use App\Services\RestaurantGroups\{Auth, Store, Policy, SecurityProof, Totp, TrustedLogin};
use App\Services\{PmdOwnerTotpService, PmdTrustedLoginDeviceService, PmdSiteAccessService};
use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\{DB, Hash};
use Illuminate\Http\Request;

function resetFixture(bool $enrolled = true): void {
    $GLOBALS['test_clock'] = 1791054705;
    $GLOBALS['test_config'] = [];
    $GLOBALS['test_session'] = new TestSession();
    $central = $GLOBALS['test_central'] = new TestDB();
    $central->tables = [
        'pmd_group_owners' => [[
            'id' => 1, 'auth_version' => 7, 'username' => 'owner', 'status' => 'active',
            'password' => Hash::make('correct-password-123'), 'name' => 'Test Owner',
            'confirmed_at' => $enrolled ? '2026-10-01 10:00:00' : null,
            'secret_encrypted' => $enrolled ? base64_encode('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ') : null,
            'last_used_step' => null, 'mfa_reset_at' => null,
        ]],
        'pmd_group_access' => [['owner_id' => 1, 'tenant_id' => 2, 'user_id' => 10]],
    ];
    $tenant = new TestDB(); $tenant->tables = ['pmd_group_identity' => [['user_id' => 10]]];
    DB::$dbs = ['tenant' => $tenant];
    $store = new Store(); $auth = new Auth($store);
    $GLOBALS['test_app'] = [Store::class => $store, Auth::class => $auth, PmdSiteAccessService::class => new PmdSiteAccessService()];
    AdminAuth::$user = new TestUser();
    session()->put(Auth::SESSION, ['owner_id' => 1, 'tenant_id' => 2, 'user_id' => 10,
        'auth_version' => 7, 'password_at' => $GLOBALS['test_clock'] - 3, 'mfa_at' => 0, 'session_id' => null]);
    PmdOwnerTotpService::$calls = [];
    PmdTrustedLoginDeviceService::$calls = [];
    PmdTrustedLoginDeviceService::$onResume = null;
    PmdTrustedLoginDeviceService::$device = (object)['paired_at' => '2026-10-03 18:00:00', 'revoked_at' => null];
}
function ownerRow(): object { return (object)$GLOBALS['test_central']->tables['pmd_group_owners'][0]; }
function changeOwner(array $data): void { $GLOBALS['test_central']->tables['pmd_group_owners'][0] = array_merge((array)ownerRow(), $data); }
function codeFor(string $secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'): string { return Policy::totp($secret, intdiv($GLOBALS['test_clock'], 30)); }
function check(bool $ok, string $message = 'Assertion failed'): void { if (!$ok) throw new RuntimeException($message); }
function throws(callable $fn): void { try { $fn(); } catch (Throwable $e) { return; } throw new RuntimeException('Expected rejection'); }
$tests = [];
function test(string $name, callable $fn): void { $GLOBALS['tests'][$name] = $fn; }

// RFC 6238 Appendix B SHA1 vectors, reduced to this product's six digits.
foreach ([59 => '287082', 1111111109 => '081804', 1111111111 => '050471', 1234567890 => '005924', 2000000000 => '279037', 20000000000 => '353130'] as $time => $expected) {
    test('RFC6238 SHA1 '.$time, fn() => check(Policy::totp('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', intdiv($time, 30)) === $expected));
}
test('TOTP rejects replay', fn() => check(Policy::matchingTotpStep('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '287082', 59, 1) === null));
test('TOTP rejects malformed code', fn() => check(Policy::matchingTotpStep('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', '28 7082', 59, null) === null));
test('target list rejects unauthorized tenant', fn() => throws(fn() => Policy::targets([2, 99], [2, 3])));
test('target list rejects floats', fn() => throws(fn() => Policy::targets([2.0], [2])));
test('target list de-duplicates', fn() => check(Policy::targets([2, '2', 3], [2, 3]) === [2, 3]));
test('canonical digest ignores object key order', fn() => check(Policy::digest(['b' => 2, 'a' => ['d' => 4, 'c' => 3]]) === Policy::digest(['a' => ['c' => 3, 'd' => 4], 'b' => 2])));

test('valid password proof accepted', fn() => check(app(Auth::class)->owner(false)->id === 1));
foreach (['tenant_id' => 9, 'user_id' => 9, 'auth_version' => 6, 'password_at' => 1791054800] as $key => $value) {
    test('password proof rejects '.$key, function () use ($key, $value) { $p = session()->get(Auth::SESSION); $p[$key] = $value; session()->put(Auth::SESSION, $p); throws(fn() => app(Auth::class)->owner(false)); });
}
test('expired password proof rejected', function () { $p = session()->get(Auth::SESSION); $p['password_at'] = $GLOBALS['test_clock'] - 43200; session()->put(Auth::SESSION, $p); throws(fn() => app(Auth::class)->owner(false)); });
test('changed access mapping invalidates session', function () { app(Store::class)->mappedUserId = 20; throws(fn() => app(Auth::class)->owner(false)); });
test('MFA proof required', fn() => throws(fn() => app(Auth::class)->owner(true)));
test('MFA bound to session ID', function () { app(Auth::class)->verified(10, 4); session()->id = 'different-session'; throws(fn() => app(Auth::class)->owner(true)); });
test('MFA proof cannot predate password', function () { app(Auth::class)->verified(10, 4); $p = session()->get(Auth::SESSION); $p['mfa_at'] = $p['password_at'] - 1; session()->put(Auth::SESSION, $p); throws(fn() => app(Auth::class)->owner(true)); });
test('unconfirmed owner cannot gain verified proof', function () { changeOwner(['confirmed_at' => null]); throws(fn() => app(Auth::class)->verified(10, 4)); check(!session()->get(PmdOwnerTotpService::SESSION_VERIFIED)); });

test('group password login accepted without remember cookie', function () { $m = new TestManager(); check(app(Auth::class)->attempt($m, ['username' => 'owner', 'password' => 'correct-password-123']) instanceof TestUser); check($m->logins === [[10, false]]); });
test('invalid shared password rejected', function () { check(app(Auth::class)->attempt(new TestManager(), ['username' => 'owner', 'password' => 'wrong']) === false); check(!session()->get(Auth::SESSION)); });
test('revoked mapped account cannot fall through when local lookup misses', function () { $m = new TestManager(); $m->local = null; app(Store::class)->denyAccess = true; check(app(Auth::class)->attempt($m, ['username' => 'owner', 'password' => 'correct-password-123']) === false); });
test('legacy user remains on legacy path', function () { DB::$dbs['tenant']->tables['pmd_group_identity'] = []; check(app(Auth::class)->attempt(new TestManager(), ['username' => 'legacy', 'password' => 'local']) === null); });
test('foreign-company username does not shadow local user', function () { DB::$dbs['tenant']->tables['pmd_group_identity'] = []; $GLOBALS['test_central']->tables['pmd_group_access'] = []; check(app(Auth::class)->attempt(new TestManager(), ['username' => 'owner', 'password' => 'local']) === null); });
test('identity storage failure rejects login', function () { DB::$dbs['tenant']->failSchema = true; check(app(Auth::class)->attempt(new TestManager(), ['username' => 'owner', 'password' => 'correct-password-123']) === false); });
test('identity storage failure invalidates current session', function () { DB::$dbs['tenant']->failSchema = true; check(!app(Auth::class)->sessionAllowed(new TestUser())); });
test('local credential lookup failure rejects login', function () { $m = new TestManager(); $m->failLookup = true; check(app(Auth::class)->attempt($m, ['username' => 'owner', 'password' => 'correct-password-123']) === false); });
test('password-change audit failure rolls back credential change', function () { app(Auth::class)->verified(10, 4); $before = ownerRow()->password; app(Store::class)->failAudit = true; throws(fn() => app(Auth::class)->changePassword('correct-password-123', 'new-password-98765')); check(ownerRow()->password === $before && ownerRow()->auth_version === 7); });
test('password change increments version and clears both proofs', function () { app(Auth::class)->verified(10, 4); app(Auth::class)->changePassword('correct-password-123', 'new-password-98765'); check(ownerRow()->auth_version === 8); check(!session()->get(Auth::SESSION) && !session()->get(PmdOwnerTotpService::SESSION_VERIFIED)); });

test('managed MFA outage never invokes legacy verify', function () { app(Store::class)->denyAccess = true; check(!(new Totp())->verify(10, codeFor())); check(PmdOwnerTotpService::$calls === []); });
test('managed schema outage never invokes legacy confirm', function () { DB::$dbs['tenant']->failSchema = true; check(!(new Totp())->confirmEnrollment(10, 4, codeFor())); check(PmdOwnerTotpService::$calls === []); });
test('legacy MFA still delegates', function () { DB::$dbs['tenant']->tables['pmd_group_identity'] = []; check((new Totp())->verify(10, 'legacy')); check(PmdOwnerTotpService::$calls === ['verify']); });
test('MFA code accepted once', function () { $t = new Totp(); check($t->verify(10, codeFor())); check(!$t->verify(10, codeFor())); check(app(Auth::class)->owner(true)->id === 1); });
test('wrong MFA code is not consumed', function () { check(!(new Totp())->verify(10, 'abcdef')); check(ownerRow()->last_used_step === null); });
test('wrong location cannot consume MFA code', function () { app(PmdSiteAccessService::class)->value['location_id'] = 99; check(!(new Totp())->verify(10, codeFor())); check(ownerRow()->last_used_step === null); });
test('reset between initial validation and row lock rejects code', function () { $GLOBALS['test_central']->onLock = fn($db) => changeOwner(['auth_version' => 8]); check(!(new Totp())->verify(10, codeFor())); check(!session()->get(PmdOwnerTotpService::SESSION_VERIFIED)); });
test('failed commit cannot create MFA session proof', function () { $GLOBALS['test_central']->failCommit = true; check(!(new Totp())->verify(10, codeFor())); check(ownerRow()->last_used_step === null); check(!session()->get(PmdOwnerTotpService::SESSION_VERIFIED)); });
test('audit failure rolls back MFA consumption', function () { app(Store::class)->failAudit = true; check(!(new Totp())->verify(10, codeFor())); check(ownerRow()->last_used_step === null); });
test('MFA session check revalidates central auth version', function () { $t = new Totp(); check($t->verify(10, codeFor())); changeOwner(['auth_version' => 8]); check(!$t->sessionVerified(10, 4)); });
test('clearing MFA clears group proof too', function () { (new Totp())->verify(10, codeFor()); (new Totp())->clearSessionVerification(); throws(fn() => app(Auth::class)->owner(true)); });
test('cannot enroll over existing Authenticator', fn() => throws(fn() => (new Totp())->enrollment(10, 4)));
test('enrollment is version and tenant scoped', function () { resetFixture(false); $e = (new Totp())->enrollment(10, 4); check($e['auth_version'] === 7 && $e['tenant_id'] === 2 && strlen($e['secret']) === 32); });
test('compact group QR stays within canonical length', function () { resetFixture(false); $t = new Totp(); $e = $t->enrollment(10, 4); check(strlen($t->provisioningUri($e)) <= 106); });
test('modified QR secret rejected', function () { resetFixture(false); $t = new Totp(); $e = $t->enrollment(10, 4); $e['secret'] = str_repeat('A', 32); throws(fn() => $t->provisioningUri($e)); });
test('enrollment confirms only once', function () { resetFixture(false); $t = new Totp(); $e = $t->enrollment(10, 4); $code = codeFor($e['secret']); check($t->confirmEnrollment(10, 4, $code)); session()->put(PmdOwnerTotpService::SESSION_ENROLLMENT, $e); check(!$t->confirmEnrollment(10, 4, $code)); });
test('pre-reset enrollment cannot confirm after fresh sign-in', function () { resetFixture(false); $t = new Totp(); $e = $t->enrollment(10, 4); changeOwner(['auth_version' => 8]); $p = session()->get(Auth::SESSION); $p['auth_version'] = 8; session()->put(Auth::SESSION, $p); check(!$t->confirmEnrollment(10, 4, codeFor($e['secret']))); });
test('concurrent confirmation cannot replace first factor', function () { resetFixture(false); $t = new Totp(); $e = $t->enrollment(10, 4); $GLOBALS['test_central']->onLock = fn($db) => changeOwner(['confirmed_at' => now(), 'secret_encrypted' => 'already-confirmed']); check(!$t->confirmEnrollment(10, 4, codeFor($e['secret']))); check(ownerRow()->secret_encrypted === 'already-confirmed'); });
test('expired enrollment rejected', function () { resetFixture(false); $t = new Totp(); $e = $t->enrollment(10, 4); $GLOBALS['test_clock'] += 600; check(!$t->confirmEnrollment(10, 4, codeFor($e['secret']))); });

test('pre-reset trusted device rejected by current()', function () { changeOwner(['mfa_reset_at' => '2026-10-03 19:00:00']); check((new TrustedLogin())->current(new Request()) === null); });
test('same-second pre-reset device rejected', function () { changeOwner(['mfa_reset_at' => '2026-10-03 18:00:00']); check((new TrustedLogin())->current(new Request()) === null); });
test('unknown pairing timestamp rejected after reset', function () { changeOwner(['mfa_reset_at' => '2026-10-03 17:00:00']); PmdTrustedLoginDeviceService::$device->paired_at = null; check((new TrustedLogin())->current(new Request()) === null); });
test('post-reset trusted device accepted', function () { changeOwner(['mfa_reset_at' => '2026-10-03 17:00:00']); check((new TrustedLogin())->current(new Request()) !== null); });
test('trusted device of another identity rejected', fn() => check((new TrustedLogin())->current(new Request(), ['user_id' => 20, 'location_id' => 4]) === null));
test('unconfirmed factor cannot resume trust', function () { changeOwner(['confirmed_at' => null]); check((new TrustedLogin())->resumeIfPossible(new Request()) === null); check(!in_array('resume', PmdTrustedLoginDeviceService::$calls, true)); });
test('central outage cannot fall back to trusted resume', function () { app(Store::class)->denyAccess = true; check((new TrustedLogin())->resumeIfPossible(new Request()) === null); check(PmdTrustedLoginDeviceService::$calls === []); });
test('workplace approval cannot create central MFA proof', function () { check(!(new TrustedLogin())->trustAfterVerifiedSecondFactor(new Request())); check(PmdTrustedLoginDeviceService::$calls === []); check(!session()->get(PmdOwnerTotpService::SESSION_VERIFIED)); });
test('completed group MFA can create trust', function () { (new Totp())->verify(10, codeFor()); check((new TrustedLogin())->trustAfterVerifiedSecondFactor(new Request())); check(in_array('trust', PmdTrustedLoginDeviceService::$calls, true)); });
test('verified proof cannot create trust for another identity', function () { (new Totp())->verify(10, codeFor()); check(!(new TrustedLogin())->trustAfterVerifiedSecondFactor(new Request(), ['user_id' => 20, 'location_id' => 4])); });
test('trusted response renewal requires group MFA proof', function () { (new TrustedLogin())->rememberVerifiedResponse(new Request(), (object)[]); check(PmdTrustedLoginDeviceService::$calls === []); });
test('trusted resume binds group proof', function () { check((new TrustedLogin())->resumeIfPossible(new Request()) !== null); check(app(Auth::class)->owner(true)->id === 1); });
test('revocation during resume clears workspace and login', function () { PmdTrustedLoginDeviceService::$onResume = fn() => changeOwner(['auth_version' => 8]); check((new TrustedLogin())->resumeIfPossible(new Request()) === null); check(app(PmdSiteAccessService::class)->cleared && AdminAuth::$user === null); check(!session()->get(Auth::SESSION)); });
test('legacy trusted flow preserved', function () { DB::$dbs['tenant']->tables['pmd_group_identity'] = []; check((new TrustedLogin())->trustAfterVerifiedSecondFactor(new Request())); check(PmdTrustedLoginDeviceService::$calls === ['trust']); });

$failed = 0;
foreach ($tests as $name => $fn) {
    resetFixture();
    try { $fn(); echo 'PASS '.$name.PHP_EOL; }
    catch (Throwable $e) { $failed++; echo 'FAIL '.$name.': '.$e->getMessage().PHP_EOL; }
}
echo sprintf('%d tests, %d failed (isolated service fixtures; not VPS integration).', count($tests), $failed).PHP_EOL;
exit($failed ? 1 : 0);
