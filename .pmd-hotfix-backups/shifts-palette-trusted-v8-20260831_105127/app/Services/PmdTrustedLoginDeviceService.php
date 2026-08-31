<?php

namespace App\Services;

use Admin\Facades\AdminAuth;
use Admin\Services\PmdDefaultStaffRoleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_TRUSTED_LOGIN_DEVICE_V1
 *
 * A successful second-factor verification may remember this exact browser as a
 * user + restaurant scoped trusted login device. The browser holds only a
 * random HttpOnly token; the database stores only its HMAC hash. Revoking the
 * device invalidates the token immediately.
 */
class PmdTrustedLoginDeviceService
{
    public const COOKIE = 'pmd_trusted_login_v1';
    public const KIND = 'trusted_login';

    public function ready(): bool
    {
        try {
            return Schema::hasTable('pmd_site_access_devices')
                && Schema::hasColumn('pmd_site_access_devices', 'user_id');
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function current(Request $request, ?array $identity = null)
    {
        if (!$this->ready()) return null;

        $identity = $identity ?: app(PmdSiteAccessService::class)->identity();
        $userId = (int)($identity['user_id'] ?? 0);
        $locationId = (int)($identity['location_id'] ?? 0);
        if ($userId < 1 || $locationId < 1) return null;

        $raw = trim((string)$request->cookie(self::COOKIE, ''));
        if ($raw === '') return null;

        return DB::table('pmd_site_access_devices')
            ->where('token_hash', $this->tokenHash($raw))
            ->where('device_kind', self::KIND)
            ->where('user_id', $userId)
            ->where('location_id', $locationId)
            ->whereNull('revoked_at')
            ->first();
    }

    /**
     * If a verified workspace response does not yet have a persistent trusted
     * login token, create one and attach its HttpOnly cookie to that response.
     */
    public function rememberVerifiedResponse(Request $request, $response)
    {
        if (!$this->ready() || !AdminAuth::isLogged()) return $response;

        $site = app(PmdSiteAccessService::class);
        $identity = $site->identity();
        $userId = (int)($identity['user_id'] ?? 0);
        $locationId = (int)($identity['location_id'] ?? 0);
        if ($userId < 1 || $locationId < 1) return $response;

        if (!$site->isWorkspaceVerified($locationId)) return $response;

        try {
            if (!app(PmdSiteAccessSessionBindingService::class)->isBoundToCurrentUser()) {
                return $response;
            }
        } catch (\Throwable $error) {
            return $response;
        }

        $existing = $this->current($request, $identity);
        if ($existing) {
            $this->touch((int)$existing->id);
            return $response;
        }

        if (!method_exists($response, 'withCookie')) return $response;

        [$device, $rawToken] = $this->create($identity, $request);
        if (!$device || $rawToken === '') return $response;

        $site->audit(
            'trusted_login_device_created',
            true,
            $identity,
            (int)$device->id,
            null,
            $request,
            ['kind' => self::KIND]
        );

        return $response->withCookie($this->cookie($rawToken, $request));
    }

    /**
     * Resume a fresh password login before the OTP/restaurant-approval screen is
     * rendered. Returns null when the current browser is not a trusted device.
     */
    public function resumeIfPossible(Request $request)
    {
        if (!$this->ready() || !AdminAuth::isLogged()) return null;

        $site = app(PmdSiteAccessService::class);
        if (!$site->ready()) return null;

        $identity = $site->identity();
        $userId = (int)($identity['user_id'] ?? 0);
        $locationId = (int)($identity['location_id'] ?? 0);
        if ($userId < 1 || $locationId < 1) return null;
        if (!$site->policyEnabled($locationId)) return null;

        $device = $this->current($request, $identity);
        if (!$device) return null;

        $ownerSecurity = (array)session()->get('pmd_login_owner_security_v1', []);
        $pending = (array)session()->get(PmdSiteAccessService::SESSION_PENDING, []);
        $challenge = $site->challengeForSession();

        $hasPendingOwner = !empty($ownerSecurity['user_id'])
            && (int)$ownerSecurity['user_id'] === $userId
            && (int)($ownerSecurity['location_id'] ?? 0) === $locationId;

        $hasPendingWorkspace = $challenge
            && (int)$challenge->user_id === $userId
            && (int)$challenge->location_id === $locationId
            && (string)$challenge->purpose === PmdSiteAccessService::PURPOSE_WORKSPACE
            && in_array((string)$challenge->status, ['pending', 'approved'], true);

        if (
            !$hasPendingOwner
            && !$hasPendingWorkspace
            && $site->isWorkspaceVerified($locationId)
        ) {
            $this->touch((int)$device->id);
            return null;
        }

        if ($hasPendingWorkspace) {
            DB::table('pmd_site_access_challenges')
                ->where('id', (int)$challenge->id)
                ->where('user_id', $userId)
                ->where('location_id', $locationId)
                ->update([
                    'status' => 'used',
                    'approved_by_device_id' => (int)$device->id,
                    'approved_at' => $challenge->approved_at ?: now(),
                    'used_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        $target = trim((string)session()->get('pmd_owner_totp_after_v1', ''));
        if ($target === '') $target = trim((string)($pending['redirect'] ?? ''));
        if ($target === '') {
            $destination = (string)session()->get(
                PmdSiteAccessService::SESSION_DESTINATION,
                'workspace'
            );

            if ($destination === 'staff') {
                $target = admin_url('mywork');
            } else {
                $role = app(PmdDefaultStaffRoleService::class)
                    ->roleCodeForUser($identity['user'] ?? null);
                $route = app(PmdDefaultStaffRoleService::class)
                    ->routeForRoleCode($role);
                $target = admin_url($route ?: 'dashboard');
            }
        }

        $site->markWorkspaceVerified(
            $locationId,
            'trusted_login_device',
            (int)$device->id
        );
        app(PmdSiteAccessSessionBindingService::class)->bindCurrentUser();
        $policy = app(PmdWorkSessionPolicyService::class)->apply($identity);

        session()->forget([
            PmdSiteAccessService::SESSION_PENDING,
            'pmd_login_owner_security_v1',
            'pmd_owner_totp_after_v1',
        ]);

        $this->touch((int)$device->id);
        $site->audit(
            'trusted_login_device_resumed',
            true,
            $identity,
            (int)$device->id,
            $challenge ? (int)$challenge->id : null,
            $request,
            [
                'session_until' => $policy['expires_at']->toIso8601String(),
                'session_reason' => $policy['reason'],
            ]
        );

        return redirect($target)
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    }

    private function create(array $identity, Request $request): array
    {
        $rawToken = bin2hex(random_bytes(32));
        $staffId = (int)($identity['staff_id'] ?? 0);

        $id = (int)DB::table('pmd_site_access_devices')->insertGetId([
            'location_id' => (int)$identity['location_id'],
            'user_id' => (int)$identity['user_id'],
            'device_kind' => self::KIND,
            'staff_id' => $staffId ?: null,
            'pos_device_id' => null,
            'device_name' => $this->deviceName($request),
            'token_hash' => $this->tokenHash($rawToken),
            'capabilities' => json_encode(['trusted_login'], JSON_UNESCAPED_SLASHES),
            'platform_info' => json_encode($this->platformInfo($request), JSON_UNESCAPED_SLASHES),
            'paired_by_staff_id' => $staffId ?: null,
            'paired_at' => now(),
            'last_seen_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            DB::table('pmd_site_access_devices')->where('id', $id)->first(),
            $rawToken,
        ];
    }

    private function touch(int $deviceId): void
    {
        if ($deviceId < 1) return;
        DB::table('pmd_site_access_devices')
            ->where('id', $deviceId)
            ->whereNull('revoked_at')
            ->update([
                'last_seen_at' => now(),
                'updated_at' => now(),
            ]);
    }

    private function cookie(string $token, Request $request)
    {
        return cookie(
            self::COOKIE,
            $token,
            60 * 24 * 365 * 3,
            '/',
            null,
            $request->isSecure(),
            true,
            false,
            'Lax'
        );
    }

    private function tokenHash(string $raw): string
    {
        return hash_hmac(
            'sha256',
            'trusted-login|'.$raw,
            (string)config('app.key', 'pmd-trusted-login')
        );
    }

    private function deviceName(Request $request): string
    {
        $ua = strtolower((string)$request->userAgent());
        if (str_contains($ua, 'iphone')) return 'iPhone';
        if (str_contains($ua, 'ipad')) return 'iPad';
        if (str_contains($ua, 'android')) return 'Android device';
        if (str_contains($ua, 'macintosh')) return 'Mac';
        if (str_contains($ua, 'windows')) return 'Windows device';
        return 'Browser device';
    }

    private function platformInfo(Request $request): array
    {
        return [
            'name' => $this->deviceName($request),
            'user_agent' => substr((string)$request->userAgent(), 0, 500),
            'ip' => substr((string)$request->ip(), 0, 45),
        ];
    }
}
