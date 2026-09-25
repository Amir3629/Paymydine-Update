<?php

namespace App\Http\Controllers;

use Admin\Models\Users_model;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdMobileSync\PmdMobileDeviceAuthService;
use App\Services\PmdMobileSync\PmdMobileStaffGrantService;
use App\Services\PmdSiteAccessService;
use App\Services\PmdStaffPinService;
use App\Services\PmdWorkSessionPolicyService;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * PMD_ANDROID_STAFF_LOGIN_ROUTER_V4
 * PMD_ANDROID_PAIRED_DEVICE_QUICK_PIN_V17
 *
 * Android has no workspace chooser. One-time pairing establishes restaurant
 * device trust. Operational staff then switch workspaces with their six-digit
 * Quick PIN; Manager/Accountant and legacy clients may still use full
 * username/password. Role, location and work-session policy remain server-side.
 *
 * Do not require a second restaurant approval for every sign-in on an already
 * paired Android device. Owner and usernameportal still continue through their
 * canonical Owner/Portal Authenticator step inside /admin/login.
 */
final class PmdMobileWorkspaceAuthController extends Controller
{
    public function __invoke(
        Request $request,
        PmdMobileDeviceAuthService $deviceAuth
    ) {
        // Legacy 0.3.4 compatibility: keep the old immediate authorization
        // contract while 0.3.5+ uses request()/status().
        $resolved = $this->resolveCredentials($request, $deviceAuth);
        return $this->authorizedResponse(
            $resolved['device_identity'],
            $resolved['user'],
            $resolved['staff'],
            $resolved['role_code'],
            $resolved['route'],
            $resolved['surface'],
            $resolved['destination'],
            $resolved['username']
        );
    }

    /** PMD_ANDROID_PAIRED_DEVICE_QUICK_PIN_REQUEST_V17 */
    public function request(
        Request $request,
        PmdMobileDeviceAuthService $deviceAuth
    ) {
        $resolved = $this->resolveCredentials($request, $deviceAuth);

        // PMD_ANDROID_NO_SECOND_APPROVAL_V13
        // The device already passed one-time restaurant pairing approval.
        // A workspace switch now proves the human with canonical credentials,
        // then role/location policy selects the destination. Requiring another
        // Owner/Manager/Cashier approval here made every non-Owner role depend
        // on an unrelated second screen and left the Android app stuck/erroring.
        return $this->authorizedResponse(
            $resolved['device_identity'],
            $resolved['user'],
            $resolved['staff'],
            $resolved['role_code'],
            $resolved['route'],
            $resolved['surface'],
            $resolved['destination'],
            $resolved['username']
        );
    }

    /** PMD_ANDROID_CANONICAL_LOGIN_STATUS_V12 */
    public function status(
        Request $request,
        PmdMobileDeviceAuthService $deviceAuth
    ) {
        $data = $request->validate([
            'login_request' => ['required', 'string', 'max:4096'],
        ]);

        $deviceIdentity = $deviceAuth->authenticateDevice($request);
        $payload = $this->decodeLoginRequest(
            (string)$data['login_request']
        );

        if (
            (int)($payload['device_id'] ?? 0) !==
                (int)$deviceIdentity['device_id']
            || (int)($payload['location_id'] ?? 0) !==
                (int)$deviceIdentity['location_id']
        ) {
            $this->fail(401, 'This login request belongs to another device.');
        }

        $challenge = DB::table('pmd_site_access_challenges')
            ->where('id', (int)($payload['challenge_id'] ?? 0))
            ->where('public_id', (string)($payload['public_id'] ?? ''))
            ->where('location_id', (int)$deviceIdentity['location_id'])
            ->first();

        if (!$challenge) {
            $this->fail(410, 'This restaurant approval request no longer exists.');
        }

        $status = strtolower((string)$challenge->status);
        if (
            $status === 'pending'
            && now()->greaterThanOrEqualTo($challenge->expires_at)
        ) {
            DB::table('pmd_site_access_challenges')
                ->where('id', (int)$challenge->id)
                ->where('status', 'pending')
                ->update(['status' => 'expired', 'updated_at' => now()]);
            $status = 'expired';
        }

        if ($status !== 'approved') {
            return response()->json([
                'ok' => true,
                'status' => in_array(
                    $status,
                    ['pending', 'declined', 'expired'],
                    true
                ) ? $status : 'expired',
                'request_code' => app(PmdSiteAccessService::class)
                    ->challengeCodeForHub($challenge),
                'expires_at' => (string)$challenge->expires_at,
            ], 200, ['Cache-Control' => 'no-store, private']);
        }

        $user = Users_model::query()->find(
            (int)($payload['user_id'] ?? 0)
        );
        $staff = $user ? $user->staff : null;
        if (
            !$user
            || !$staff
            || (int)$staff->getKey() !== (int)($payload['staff_id'] ?? 0)
            || !$this->activeUser($user, $staff)
        ) {
            $this->fail(401, 'This PayMyDine staff account is no longer active.');
        }

        $grants = app(PmdMobileStaffGrantService::class);
        if (!$grants->userMayUseLocation(
            $user,
            $staff,
            (int)$deviceIdentity['location_id']
        )) {
            $this->fail(403, 'This account no longer has access to this restaurant.');
        }

        $roleCode = app(PmdDefaultStaffRoleService::class)
            ->roleCodeForUser($user);
        if (
            $roleCode === ''
            || !hash_equals(
                strtolower((string)($payload['role_code'] ?? '')),
                strtolower($roleCode)
            )
        ) {
            $this->fail(403, 'PayMyDine staff role changed. Sign in again.');
        }

        DB::table('pmd_site_access_challenges')
            ->where('id', (int)$challenge->id)
            ->where('status', 'approved')
            ->update([
                'status' => 'used',
                'used_at' => now(),
                'updated_at' => now(),
            ]);

        return $this->authorizedResponse(
            $deviceIdentity,
            $user,
            $staff,
            $roleCode,
            (string)$payload['route'],
            (string)$payload['surface'],
            (string)($payload['destination'] ?? 'workspace'),
            (string)($payload['username'] ?? $user->username)
        );
    }

    private function resolveCredentials(
        Request $request,
        PmdMobileDeviceAuthService $deviceAuth
    ): array {
        $data = $request->validate([
            'surface' => ['nullable', 'string', 'in:pos,kds,reservations'],
            'pin' => ['nullable', 'regex:/^[0-9]{6}$/'],
            'username' => ['nullable', 'string', 'max:191'],
            'password' => ['nullable', 'string', 'min:6', 'max:191'],
        ]);

        // PMD_ANDROID_TRUSTED_DEVICE_QUICK_PIN_V17
        // The bearer-authenticated paired device establishes restaurant trust
        // before a human credential is evaluated.
        $deviceIdentity = $deviceAuth->authenticateDevice($request);
        $locationId = (int)$deviceIdentity['location_id'];

        $pin = trim((string)($data['pin'] ?? ''));
        $typedUsername = trim((string)($data['username'] ?? ''));
        $password = (string)($data['password'] ?? '');
        $usingQuickPin = $pin !== '';
        $destination = 'workspace';
        $pins = app(PmdStaffPinService::class);

        if ($usingQuickPin) {
            // PMD_ANDROID_PIN_STORAGE_SELFHEAL_V18F
            // Older tenants may predate the Quick PIN table. The Shifts editor
            // provisions it when a PIN is saved, but native login must be
            // equally safe if schema rollout lagged behind the app release.
            // Always repair only this additive PIN table on the already-selected
            // tenant connection before evaluating the submitted PIN.
            if (!$pins->ensureReady()) {
                logger()->error('PMD Android Staff PIN storage unavailable', [
                    'host' => $request->getHost(),
                    'database' => DB::connection()->getDatabaseName(),
                    'location_id' => $locationId,
                ]);
                $this->fail(
                    503,
                    'Staff PIN storage is temporarily unavailable for this restaurant.'
                );
            }

            $user = $pins->userForPin($pin);
            $staff = $user ? $user->staff : null;

            if (!$user || !$staff || !$this->activeUser($user, $staff)) {
                $this->fail(401, 'Staff PIN is incorrect.');
            }
        } else {
            if ($typedUsername === '' || $password === '') {
                $this->fail(401, 'Username or password is incorrect.');
            }

            [$lookupUsername, $destination] =
                $this->canonicalLoginIdentity($typedUsername);

            $user = Users_model::query()
                ->whereRaw(
                    'LOWER(username) = ?',
                    [mb_strtolower($lookupUsername)]
                )
                ->first();
            $staff = $user ? $user->staff : null;
            $passwordHash = (string)($user->password ?? '');

            if (
                !$user
                || !$staff
                || !$this->activeUser($user, $staff)
                || $passwordHash === ''
                || !Hash::check($password, $passwordHash)
            ) {
                $this->fail(401, 'Username or password is incorrect.');
            }
        }

        $grants = app(PmdMobileStaffGrantService::class);
        if (!$grants->userMayUseLocation($user, $staff, $locationId)) {
            $this->fail(
                403,
                'This PayMyDine account cannot use this restaurant location.'
            );
        }

        $roles = app(PmdDefaultStaffRoleService::class);
        $roleCode = $roles->roleCodeForUser($user);

        if ($usingQuickPin && !$pins->canUseRole($roleCode)) {
            $this->fail(
                403,
                'This account requires full username and password sign-in.'
            );
        }

        if ($usingQuickPin) {
            try {
                $activePerson = DB::table('pmd_operational_people')
                    ->where('location_id', $locationId)
                    ->where('staff_id', (int)$staff->getKey())
                    ->where('is_active', 1)
                    ->exists();
            } catch (\Throwable $error) {
                $activePerson = false;
            }

            if (!$activePerson) {
                $this->fail(401, 'Staff PIN is incorrect.');
            }

            try {
                $pins->touchUser((int)$user->getKey());
            } catch (\Throwable $error) {
                logger()->warning('PMD Android Quick PIN usage update failed', [
                    'user_id' => (int)$user->getKey(),
                    'message' => $error->getMessage(),
                ]);
            }
        }

        $route = $destination === 'staff'
            ? 'mywork'
            : $roles->routeForRoleCode($roleCode);

        if ($roleCode === '' || $route === null || trim($route) === '') {
            $this->fail(
                403,
                'This PayMyDine account has no Android destination.'
            );
        }

        $requestedSurface = strtolower(
            trim((string)($data['surface'] ?? ''))
        );
        if (
            $requestedSurface !== ''
            && !$this->roleMayOpen($roleCode, $requestedSurface)
        ) {
            $this->fail(
                403,
                'This PayMyDine account cannot open that workspace.'
            );
        }

        // PMD_MOBILE_REQUESTED_SURFACE_AUTHORITY_V123
        // Owner/Manager can deliberately open Reservations. Do not replace
        // that requested workspace with their default dashboard surface.
        $resolvedSurface = $destination === 'staff'
            ? 'web'
            : (
                $requestedSurface !== ''
                    ? $requestedSurface
                    : $this->surfaceForRole($roleCode)
            );

        if ($resolvedSurface === 'reservations') {
            $route = 'reservations2';
        }

        return [
            'device_identity' => $deviceIdentity,
            'user' => $user,
            'staff' => $staff,
            'username' => trim((string)($user->username ?? $typedUsername)),
            'role_code' => $roleCode,
            'route' => $route,
            'surface' => $resolvedSurface,
            'destination' => $destination,
        ];
    }

    private function authorizedResponse(
        array $deviceIdentity,
        $user,
        $staff,
        string $roleCode,
        string $route,
        string $surface,
        string $destination,
        string $username
    ) {
        $identity = $this->grantIdentity(
            $deviceIdentity,
            $user,
            $staff,
            $roleCode
        );
        $policy = app(PmdWorkSessionPolicyService::class)->policy($identity);
        $grantExpiresAt = min(
            now()->addHours(8)->timestamp,
            $policy['expires_at']->timestamp
        );
        $staffGrant = app(PmdMobileStaffGrantService::class)
            ->issue(
                $deviceIdentity,
                $user,
                $destination,
                $grantExpiresAt,
                $surface
            );

        return response()->json([
            'ok' => true,
            'status' => 'authorized',
            'surface' => $surface,
            'destination' => $destination,
            'username' => $username,
            'staff_name' => (string)(
                $staff->staff_name
                ?? $user->staff_name
                ?? $username
            ),
            'user_id' => (int)$user->getKey(),
            'staff_id' => (int)$staff->getKey(),
            'role_code' => $roleCode,
            'route' => $route,
            'staff_grant' => $staffGrant,
            'lease_expires_at' => $grantExpiresAt,
            'lease_expires_iso' => date(DATE_ATOM, $grantExpiresAt),
            'offline_expires_at' => $policy['expires_at']->timestamp,
            'offline_expires_iso' =>
                $policy['expires_at']->toIso8601String(),
            'offline_session_reason' => $policy['reason'],
        ], 200, ['Cache-Control' => 'no-store, private']);
    }

    private function grantIdentity(
        array $deviceIdentity,
        $user,
        $staff,
        string $roleCode
    ): array {
        return array_merge($deviceIdentity, [
            'user' => $user,
            'user_id' => (int)$user->getKey(),
            'staff' => $staff,
            'staff_id' => (int)$staff->getKey(),
            'role_code' => $roleCode,
            'permissions' => (array)$user->getPermissions(),
        ]);
    }

    private function canonicalLoginIdentity(string $typedUsername): array
    {
        $destination = 'workspace';
        $lookupUsername = $typedUsername;
        $lower = mb_strtolower($typedUsername);

        if (
            mb_strlen($typedUsername) > 6
            && str_ends_with($lower, 'portal')
        ) {
            $lookupUsername = trim(
                mb_substr(
                    $typedUsername,
                    0,
                    mb_strlen($typedUsername) - 6
                )
            );
            $destination = 'staff';
        }

        if ($lookupUsername === '') {
            $this->fail(401, 'Username or password is incorrect.');
        }

        return [$lookupUsername, $destination];
    }

    private function activeUser($user, $staff): bool
    {
        return !(
            (isset($user->is_activated) && !(bool)$user->is_activated)
            || (isset($staff->staff_status) && !(bool)$staff->staff_status)
        );
    }

    private function loginRequestToken(array $payload): string
    {
        $body = $this->base64UrlEncode(
            json_encode(
                $payload,
                JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR
            )
        );

        return $body.'.'.$this->base64UrlEncode(
            hash_hmac(
                'sha256',
                'pmd-android-login-request-v1|'.$body,
                (string)config('app.key', 'pmd-android-login'),
                true
            )
        );
    }

    private function decodeLoginRequest(string $raw): array
    {
        $parts = explode('.', trim($raw), 2);
        if (count($parts) !== 2) {
            $this->fail(401, 'This PayMyDine login request is invalid.');
        }

        [$body, $signature] = $parts;
        $expected = $this->base64UrlEncode(
            hash_hmac(
                'sha256',
                'pmd-android-login-request-v1|'.$body,
                (string)config('app.key', 'pmd-android-login'),
                true
            )
        );

        if (
            $body === ''
            || $signature === ''
            || !hash_equals($expected, $signature)
        ) {
            $this->fail(401, 'This PayMyDine login request is invalid.');
        }

        try {
            $payload = json_decode(
                $this->base64UrlDecode($body),
                true,
                32,
                JSON_THROW_ON_ERROR
            );
        } catch (\Throwable $error) {
            $this->fail(401, 'This PayMyDine login request is invalid.');
        }

        if (
            !is_array($payload)
            || (int)($payload['v'] ?? 0) !== 1
            || (int)($payload['iat'] ?? 0) > time() + 30
            || (int)($payload['exp'] ?? 0) <= time()
        ) {
            $this->fail(410, 'This restaurant approval request expired.');
        }

        return $payload;
    }

    private function base64UrlEncode(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $raw): string
    {
        if (!preg_match('/^[A-Za-z0-9_-]+$/', $raw)) {
            throw new \InvalidArgumentException('Invalid base64url payload.');
        }
        $padding = strlen($raw) % 4;
        if ($padding > 0) {
            $raw .= str_repeat('=', 4 - $padding);
        }
        $decoded = base64_decode(strtr($raw, '-_', '+/'), true);
        if ($decoded === false) {
            throw new \InvalidArgumentException('Invalid base64url payload.');
        }
        return $decoded;
    }

    private function fail(int $status, string $message): void
    {
        throw new HttpResponseException(
            response()->json(
                ['ok' => false, 'message' => $message],
                $status,
                ['Cache-Control' => 'no-store, private']
            )
        );
    }

    private function surfaceForRole(string $roleCode): string
    {
        $roles = PmdDefaultStaffRoleService::class;

        if (
            $roleCode === $roles::CASHIER
            || $roleCode === $roles::WAITER
        ) {
            return 'pos';
        }
        if (str_starts_with($roleCode, $roles::KDS_PREFIX)) {
            return 'kds';
        }
        if ($roleCode === $roles::RESERVATIONS) {
            return 'reservations';
        }

        return 'web';
    }

    private function roleMayOpen(string $roleCode, string $surface): bool
    {
        $roles = PmdDefaultStaffRoleService::class;

        if (
            $roleCode === $roles::OWNER
            || $roleCode === $roles::MANAGER
        ) {
            return true;
        }

        if ($surface === 'pos') {
            return $roleCode === $roles::CASHIER
                || $roleCode === $roles::WAITER;
        }

        if ($surface === 'kds') {
            return str_starts_with($roleCode, $roles::KDS_PREFIX);
        }

        if ($surface === 'reservations') {
            // PMD_ANDROID_CLOUD_REENTRY_V129
            // Cashier owns the Reservations side-menu entry. Keep the native
            // surface router aligned with the server route authority.
            return $roleCode === $roles::RESERVATIONS
                || $roleCode === $roles::CASHIER
                || $roleCode === 'cashier';
        }

        return false;
    }
}
