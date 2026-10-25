<?php

namespace App\Services;

use Admin\Facades\AdminAuth;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_PORTAL_TRUSTED_DEVICE_V028_20261023
 *
 * Browser/device recognition AFTER successful personal Portal MFA.
 *
 * This is NOT the legacy Workspace trusted_login cookie and can NEVER
 * approve normal Admin/Owner Workspace authentication. Device trust is
 * a 90-day, revocable, account+restaurant-bound second-factor exception
 * used only after a valid login/password (or an authenticated mobile grant).
 * The client receives only a random HttpOnly/Secure cookie. The tenant
 * database stores its keyed hash, not the plaintext token.
 *
 * The record is bound to the exact active Authenticator enrollment id and
 * confirmed_at. Recovery/re-enrollment therefore invalidates all old
 * trusted devices without requiring any migration.
 */
final class PmdPortalTrustedDeviceService
{
    public const COOKIE = 'pmd_portal_trusted_device_v1';
    public const KIND = 'portal_mfa_trusted';
    public const TTL_DAYS = 90;

    public function ready(): bool
    {
        try {
            if (!Schema::hasTable('pmd_site_access_devices')) return false;
            foreach (['id','user_id','location_id','device_kind','staff_id',
                'token_hash','platform_info','device_name','capabilities',
                'paired_at','last_seen_at','revoked_at','created_at','updated_at',
                'pos_device_id','paired_by_staff_id'
            ] as $column) {
                if (!Schema::hasColumn('pmd_site_access_devices', $column)) return false;
            }
            return Schema::hasTable('pmd_portal_mfa');
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function current(Request $request, array $identity)
    {
        if (!$this->ready() || !$request->isSecure()) return null;
        $userId = (int)($identity['user_id'] ?? 0);
        $locationId = (int)($identity['location_id'] ?? 0);
        $staffId = (int)($identity['staff_id'] ?? 0);
        if ($userId < 1 || $locationId < 1 || !AdminAuth::isLogged()) return null;
        if ((int)optional(AdminAuth::getUser())->getKey() !== $userId) return null;

        $raw = trim((string)$request->cookie(self::COOKIE, ''));
        if (!preg_match('/\A[a-f0-9]{64}\z/D', $raw)) return null;

        $factor = $this->activeFactor($userId);
        if (!$factor) return null;

        $row = DB::table('pmd_site_access_devices')
            ->where('device_kind', self::KIND)
            ->where('user_id', $userId)
            ->where('location_id', $locationId)
            ->where('token_hash', $this->tokenHash($raw))
            ->whereNull('revoked_at')
            ->where('paired_at', '>', now()->subDays(self::TTL_DAYS))
            ->first();
        // Staff identity changes must invalidate the previously verified device.
        if (!$row || (int)($row->staff_id ?? 0) !== $staffId) return null;
        $info = json_decode((string)($row->platform_info ?? ''), true);
        if (!is_array($info)
            || (int)($info['portal_factor_id'] ?? 0) !== (int)$factor->id
            || !hash_equals((string)$factor->confirmed_at, (string)($info['portal_factor_confirmed_at'] ?? ''))
        ) return null;

        return $row;
    }

    public function issueAfterVerifiedTotp(Request $request, array $identity)
    {
        if (!$request->isSecure() || !$this->ready() || !AdminAuth::isLogged()) return null;
        if ((string)session()->get(PmdSiteAccessService::SESSION_DESTINATION) !== 'staff') return null;
        $userId = (int)($identity['user_id'] ?? 0);
        $locationId = (int)($identity['location_id'] ?? 0);
        $staffId = (int)($identity['staff_id'] ?? 0);
        if ($userId < 1 || $locationId < 1 ||
            (int)optional(AdminAuth::getUser())->getKey() !== $userId) return null;
        $totp = app(PmdPortalTotpService::class);
        if (!$totp->sessionVerified($userId, $locationId, 900)
            || $totp->needsRecoveryAcknowledgement($userId)) return null;
        $proof = (array)session()->get(PmdPortalTotpService::SESSION_VERIFIED, []);
        if (!in_array((string)($proof['method'] ?? ''), ['verify','enrollment'], true)) return null;

        $factor = $this->activeFactor($userId);
        if (!$factor) return null;

        // Rotate this browser's existing trust after a fresh real TOTP.
        // Do not leave a second still-valid token behind for the same cookie.
        $this->revokeCurrent($request, $identity);
        $raw = bin2hex(random_bytes(32));
        $agent = substr((string)$request->userAgent(), 0, 300);
        $kind = $this->deviceName($agent);
        $now = now();

        $id = DB::table('pmd_site_access_devices')->insertGetId([
            'user_id' => $userId,
            'location_id' => $locationId,
            'device_kind' => self::KIND,
            'staff_id' => $staffId ?: null,
            'pos_device_id' => null,
            'device_name' => $kind,
            'token_hash' => $this->tokenHash($raw),
            'capabilities' => json_encode(['portal_second_factor_only'], JSON_UNESCAPED_SLASHES),
            'platform_info' => json_encode([
                'portal_factor_id' => (int)$factor->id,
                'portal_factor_confirmed_at' => (string)$factor->confirmed_at,
                'user_agent' => $agent,
            ], JSON_UNESCAPED_SLASHES),
            'paired_by_staff_id' => $staffId ?: null,
            'paired_at' => $now,
            'last_seen_at' => $now,
            'revoked_at' => null,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $site = app(PmdSiteAccessService::class);
        try {
            if ($site->ready()) $site->audit(
                'portal_trusted_device_added',
                true, $identity, $id, null, $request,
                ['scope' => 'staff_portal_only', 'ttl_days' => self::TTL_DAYS]
            );
        } catch (\Throwable $error) {
            // Audit sink failure cannot invalidate the successfully verified MFA.
            logger()->warning('PMD Portal trusted-device audit unavailable', ['user_id' => $userId]);
        }
        return $this->cookie($raw);
    }

    public function listForUser(array $identity): array
    {
        if (!$this->ready()) return [];
        $userId = (int)($identity['user_id'] ?? 0);
        $locationId = (int)($identity['location_id'] ?? 0);
        if ($userId < 1 || $locationId < 1) return [];
        $rows = DB::table('pmd_site_access_devices')
            ->where('user_id', $userId)
            ->where('location_id', $locationId)
            ->where('device_kind', self::KIND)
            ->whereNull('revoked_at')
            ->where('paired_at', '>', now()->subDays(self::TTL_DAYS))
            ->select(['id','device_name','paired_at','last_seen_at'])
            ->orderByDesc('id')->limit(80)->get();
        return $rows->all();
    }

    public function revoke(array $identity, int $deviceId): bool
    {
        $userId = (int)($identity['user_id'] ?? 0);
        $locationId = (int)($identity['location_id'] ?? 0);
        if (!$this->ready() || $userId < 1 || $locationId < 1 || $deviceId < 1) return false;
        return DB::table('pmd_site_access_devices')
            ->where('id', $deviceId)
            ->where('user_id', $userId)
            ->where('location_id', $locationId)
            ->where('device_kind', self::KIND)
            ->whereNull('revoked_at')
            ->update(['revoked_at' => now(), 'updated_at' => now()]) === 1;
    }

    /**
     * PMD_PORTAL_TRUST_OPTOUT_V028
     * A real TOTP with "Remember this device" unchecked revokes any prior
     * token for this same browser, not just the newly proposed token.
     */
    public function revokeCurrent(Request $request, array $identity): bool
    {
        $current = $this->current($request, $identity);
        return $current
            ? $this->revoke($identity, (int)$current->id)
            : false;
    }

    public function forgetCookie()
    {
        // Match the issued cookie's path and host-only domain.
        return cookie(self::COOKIE, '', -60, '/', null, true, true, false, 'Lax');
    }

    private function activeFactor(int $userId)
    {
        $factor = DB::table(PmdPortalTotpService::TABLE)
            ->where('user_id', $userId)
            ->whereNotNull('confirmed_at')
            ->whereNotNull('recovery_acknowledged_at')
            ->whereNull('disabled_at')
            ->orderByDesc('updated_at')->orderByDesc('id')
            ->first(['id','confirmed_at','recovery_acknowledged_at']);
        return $factor && !empty($factor->confirmed_at) ? $factor : null;
    }

    private function tokenHash(string $raw): string
    {
        return hash_hmac(
            'sha256', 'portal-trusted-device-v1|'.$raw,
            (string)config('app.key')
        );
    }

    private function cookie(string $raw)
    {
        return cookie(
            self::COOKIE, $raw, self::TTL_DAYS * 24 * 60,
            '/', null, true, true, false, 'Lax'
        );
    }

    private function deviceName(string $userAgent): string
    {
        $agent = strtolower($userAgent);
        if (str_contains($agent, 'android')) return 'Android · Staff';
        if (str_contains($agent, 'iphone')) return 'iPhone';
        if (str_contains($agent, 'ipad')) return 'iPad';
        if (str_contains($agent, 'macintosh')) return 'Mac browser';
        if (str_contains($agent, 'windows')) return 'Windows browser';
        return 'Staff Portal browser';
    }
}
