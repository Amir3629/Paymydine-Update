<?php

namespace App\Services;

use Admin\Facades\AdminAuth;
use Admin\Models\Pos_devices_model;
use Admin\Services\PmdDefaultStaffRoleService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * PMD_SITE_ACCESS_V1
 *
 * One tenant-scoped authority for workplace verification and personal-device
 * pairing. Raw device tokens and recovery codes never enter the database.
 */
class PmdSiteAccessService
{
    public const HUB_COOKIE = 'pmd_site_hub_v1';
    public const STAFF_DEVICE_COOKIE = 'pmd_staff_device_v1';

    public const PURPOSE_WORKSPACE = 'workspace_login';
    public const PURPOSE_PAIR_STAFF = 'pair_staff_device';
    public const PURPOSE_ELEVATE = 'elevate_session';

    public const SESSION_PENDING = 'pmd_site_access_pending_v1';
    public const SESSION_DESTINATION = 'pmd_login_destination_v1';
    public const SESSION_VERIFIED_LOCATION = 'pmd_site_verified_location_v1';
    public const SESSION_VERIFIED_UNTIL = 'pmd_site_verified_until_v1';
    public const SESSION_VERIFIED_METHOD = 'pmd_site_verified_method_v1';
    public const SESSION_VERIFIED_DEVICE = 'pmd_site_verified_device_v1';

    public function ready(): bool
    {
        try {
            return Schema::hasTable('pmd_site_access_devices')
                && Schema::hasTable('pmd_site_access_challenges')
                && Schema::hasTable('pmd_site_access_events')
                && Schema::hasTable('pmd_site_access_recovery_codes');
        } catch (\Throwable $error) {
            return false;
        }
    }

    public function identity($user = null): array
    {
        $user = $user ?: AdminAuth::getUser();
        $staff = $user ? $user->staff : null;
        $staffId = (int)($staff->staff_id ?? 0);
        $locationId = 0;

        if ($staffId > 0 && Schema::hasTable('pmd_operational_people')) {
            try {
                $person = DB::table('pmd_operational_people')
                    ->where('staff_id', $staffId)
                    ->where('is_active', 1)
                    ->orderByDesc('id')
                    ->first(['location_id']);
                $locationId = (int)($person->location_id ?? 0);
            } catch (\Throwable $error) {
            }
        }

        if ($locationId < 1 && $staff) {
            $locationId = (int)($staff->staff_location_id ?? 0);
        }

        if ($locationId < 1 && $staff) {
            try {
                $location = $staff->locations()->orderBy('location_id')->first();
                $locationId = (int)($location->location_id ?? 0);
            } catch (\Throwable $error) {
            }
        }

        return [
            'user' => $user,
            'user_id' => (int)($user ? $user->getKey() : 0),
            'staff' => $staff,
            'staff_id' => $staffId,
            'location_id' => $locationId,
        ];
    }

    /** Site Access becomes enforcing only after a restaurant activates a hub. */
    public function policyEnabled(?int $locationId = null): bool
    {
        if (!$this->ready()) return false;
        $locationId = $locationId ?: (int)$this->identity()['location_id'];
        if ($locationId < 1) return false;

        return DB::table('pmd_site_access_devices')
            ->where('location_id', $locationId)
            ->where('device_kind', 'site_hub')
            ->whereNull('revoked_at')
            ->exists();
    }

    public function hasOnlineHub(int $locationId): bool
    {
        if (!$this->ready() || $locationId < 1) return false;

        return DB::table('pmd_site_access_devices')
            ->where('location_id', $locationId)
            ->where('device_kind', 'site_hub')
            ->whereNull('revoked_at')
            ->where('last_seen_at', '>=', now()->subMinutes(2))
            ->exists();
    }

    public function currentHub(Request $request, ?int $locationId = null)
    {
        if (!$this->ready()) return null;
        $raw = trim((string)$request->cookie(self::HUB_COOKIE, ''));
        if ($raw === '') return null;

        $query = DB::table('pmd_site_access_devices')
            ->where('token_hash', $this->tokenHash($raw))
            ->where('device_kind', 'site_hub')
            ->whereNull('revoked_at');

        if ($locationId && $locationId > 0) $query->where('location_id', $locationId);
        return $query->first();
    }

    public function currentStaffDevice(Request $request, ?int $staffId = null, ?int $locationId = null)
    {
        if (!$this->ready()) return null;
        $raw = trim((string)$request->cookie(self::STAFF_DEVICE_COOKIE, ''));
        if ($raw === '') return null;

        $query = DB::table('pmd_site_access_devices')
            ->where('token_hash', $this->tokenHash($raw))
            ->where('device_kind', 'staff_personal')
            ->whereNull('revoked_at');

        if ($staffId && $staffId > 0) $query->where('staff_id', $staffId);
        if ($locationId && $locationId > 0) $query->where('location_id', $locationId);
        return $query->first();
    }

    public function touchDevice(int $deviceId): void
    {
        if (!$this->ready() || $deviceId < 1) return;
        DB::table('pmd_site_access_devices')->where('id', $deviceId)->update([
            'last_seen_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Bind the current browser to a configured POS record as a trusted site hub.
     * Returns [device, raw_token].
     */
    public function activateHub(int $posDeviceId, Request $request): array
    {
        if (!$this->ready()) throw new \RuntimeException('Site Access schema is not ready.');

        $identity = $this->identity();
        if ($identity['staff_id'] < 1 || $identity['location_id'] < 1) {
            throw new \RuntimeException('A Team identity and restaurant location are required.');
        }

        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
        if (!in_array($role, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true)) {
            throw new \RuntimeException('Only an Owner or Manager can activate a Site Access hub.');
        }

        if (!Schema::hasTable('pos_devices')) throw new \RuntimeException('POS device storage is not available.');
        $pos = Pos_devices_model::find($posDeviceId);
        if (!$pos) throw new \RuntimeException('Choose an existing POS device.');

        $rawToken = bin2hex(random_bytes(32));
        $deviceName = trim((string)($pos->name ?: $pos->code ?: 'Restaurant POS'));
        $platform = $this->platformInfo($request);

        DB::transaction(function () use ($identity, $posDeviceId, $deviceName, $rawToken, $platform, $pos) {
            DB::table('pmd_site_access_devices')
                ->where('location_id', $identity['location_id'])
                ->where('device_kind', 'site_hub')
                ->where('pos_device_id', $posDeviceId)
                ->whereNull('revoked_at')
                ->update(['revoked_at' => now(), 'updated_at' => now()]);

            DB::table('pmd_site_access_devices')->insert([
                'location_id' => $identity['location_id'],
                'device_kind' => 'site_hub',
                'staff_id' => null,
                'pos_device_id' => $posDeviceId,
                'device_name' => $deviceName,
                'token_hash' => $this->tokenHash($rawToken),
                'capabilities' => json_encode(['site_auth_hub', 'workspace_approval', 'staff_device_pairing']),
                'platform_info' => json_encode($platform),
                'paired_by_staff_id' => $identity['staff_id'],
                'paired_at' => now(),
                'last_seen_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            try {
                $capabilities = is_array($pos->capabilities) ? $pos->capabilities : [];
                $capabilities = array_values(array_unique(array_merge($capabilities, [
                    'site_auth_hub', 'workspace_approval', 'staff_device_pairing',
                ])));
                $pos->capabilities = $capabilities;
                $pos->is_local_terminal = true;
                $pos->device_status = $pos->device_status ?: 'active';
                $pos->last_seen_at = now();
                $pos->save();
            } catch (\Throwable $error) {
                logger()->warning('PMD Site Access POS capability sync failed', ['message' => $error->getMessage()]);
            }
        });

        $device = DB::table('pmd_site_access_devices')
            ->where('token_hash', $this->tokenHash($rawToken))
            ->first();

        $this->audit('hub_activated', true, $identity, (int)($device->id ?? 0), null, $request, [
            'pos_device_id' => $posDeviceId,
        ]);

        return [$device, $rawToken];
    }

    public function revokeDevice(int $deviceId, Request $request): bool
    {
        if (!$this->ready()) return false;
        $identity = $this->identity();
        if ($identity['location_id'] < 1) return false;

        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
        $device = DB::table('pmd_site_access_devices')
            ->where('id', $deviceId)
            ->where('location_id', $identity['location_id'])
            ->whereNull('revoked_at')
            ->first();
        if (!$device) return false;

        $ownPersonal = $device->device_kind === 'staff_personal' && (int)$device->staff_id === $identity['staff_id'];
        $manage = in_array($role, [PmdDefaultStaffRoleService::OWNER, PmdDefaultStaffRoleService::MANAGER], true);
        if (!$ownPersonal && !$manage) return false;

        DB::table('pmd_site_access_devices')->where('id', $deviceId)->update([
            'revoked_at' => now(), 'updated_at' => now(),
        ]);
        $this->audit('device_revoked', true, $identity, $deviceId, null, $request, ['kind' => $device->device_kind]);
        return true;
    }

    public function beginChallenge(string $purpose, string $redirectPath, Request $request)
    {
        if (!$this->ready()) return null;
        $identity = $this->identity();
        if ($identity['user_id'] < 1 || $identity['staff_id'] < 1 || $identity['location_id'] < 1) return null;
        if (!$this->policyEnabled($identity['location_id'])) return null;

        if ($purpose === self::PURPOSE_WORKSPACE) {
            $hub = $this->currentHub($request, $identity['location_id']);
            if ($hub) {
                $this->touchDevice((int)$hub->id);
                $this->markWorkspaceVerified($identity['location_id'], 'trusted_site_hub', (int)$hub->id);
                $this->audit('workspace_auto_verified', true, $identity, (int)$hub->id, null, $request);
                return null;
            }
        }

        if ($purpose === self::PURPOSE_PAIR_STAFF) {
            $personal = $this->currentStaffDevice($request, $identity['staff_id'], $identity['location_id']);
            if ($personal) {
                $this->touchDevice((int)$personal->id);
                $this->audit('staff_device_recognized', true, $identity, (int)$personal->id, null, $request);
                return null;
            }
        }

        DB::table('pmd_site_access_challenges')
            ->where('user_id', $identity['user_id'])
            ->where('status', 'pending')
            ->update(['status' => 'expired', 'updated_at' => now()]);

        $publicId = (string)Str::uuid();
        $code = $this->challengeCode($publicId, $identity['location_id']);
        $expiresAt = now()->addSeconds(90);

        $id = DB::table('pmd_site_access_challenges')->insertGetId([
            'public_id' => $publicId,
            'location_id' => $identity['location_id'],
            'user_id' => $identity['user_id'],
            'staff_id' => $identity['staff_id'],
            'purpose' => $purpose,
            'status' => 'pending',
            'code_hash' => $this->codeHash($publicId, $code),
            'requested_device_name' => $this->deviceName($request),
            'requested_ip' => substr((string)$request->ip(), 0, 45),
            'requested_user_agent' => substr((string)$request->userAgent(), 0, 2000),
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        session()->put(self::SESSION_PENDING, [
            'public_id' => $publicId,
            'purpose' => $purpose,
            'redirect' => $redirectPath,
        ]);

        $this->audit('challenge_created', true, $identity, null, $id, $request, ['purpose' => $purpose]);
        return $this->challengeByPublicId($publicId);
    }

    public function challengeForSession()
    {
        if (!$this->ready()) return null;
        $pending = (array)session()->get(self::SESSION_PENDING, []);
        $publicId = trim((string)($pending['public_id'] ?? ''));
        if ($publicId === '') return null;
        return $this->challengeByPublicId($publicId);
    }

    public function challengeByPublicId(string $publicId)
    {
        if (!$this->ready() || $publicId === '') return null;
        $challenge = DB::table('pmd_site_access_challenges')->where('public_id', $publicId)->first();
        if (!$challenge) return null;
        if ($challenge->status === 'pending' && Carbon::parse($challenge->expires_at)->isPast()) {
            DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update([
                'status' => 'expired', 'updated_at' => now(),
            ]);
            $challenge->status = 'expired';
        }
        return $challenge;
    }

    public function challengeCodeForHub($challenge): string
    {
        return $challenge ? $this->challengeCode((string)$challenge->public_id, (int)$challenge->location_id) : '';
    }

    public function signedQrUrl($challenge): string
    {
        if (!$challenge) return '';
        $publicId = (string)$challenge->public_id;
        $token = hash_hmac('sha256', 'qr|'.$publicId.'|'.$challenge->location_id, $this->appSecret());
        return admin_url('siteaccess/qr').'?challenge='.rawurlencode($publicId).'&token='.$token;
    }

    public function verifyQrToken(string $publicId, string $token): bool
    {
        $challenge = $this->challengeByPublicId($publicId);
        if (!$challenge || $challenge->status !== 'pending') return false;
        $expected = hash_hmac('sha256', 'qr|'.$publicId.'|'.$challenge->location_id, $this->appSecret());
        return hash_equals($expected, $token);
    }

    public function verifyChallengeCode(string $code, Request $request): array
    {
        $challenge = $this->challengeForSession();
        $identity = $this->identity();
        if (!$challenge || (int)$challenge->user_id !== $identity['user_id']) return [false, 'No active verification request.'];
        if ($challenge->status !== 'pending') return [false, 'This verification request is no longer pending.'];
        if (Carbon::parse($challenge->expires_at)->isPast()) return [false, 'The code expired. Request a new one.'];

        $attempts = (int)$challenge->attempts + 1;
        DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update([
            'attempts' => $attempts, 'updated_at' => now(),
        ]);
        if ($attempts > 8) {
            DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update(['status' => 'declined']);
            $this->audit('challenge_code_locked', false, $identity, null, (int)$challenge->id, $request);
            return [false, 'Too many attempts. Start again.'];
        }

        $clean = preg_replace('/\D+/', '', $code);
        $valid = strlen($clean) === 6
            && hash_equals((string)$challenge->code_hash, $this->codeHash((string)$challenge->public_id, $clean));
        if (!$valid) {
            $this->audit('challenge_code_failed', false, $identity, null, (int)$challenge->id, $request);
            return [false, 'The Site Access code is not correct.'];
        }

        if (!$this->hasOnlineHub((int)$challenge->location_id)) {
            return [false, 'The restaurant Site Access device is offline. Open Site Access on the Cashier first.'];
        }

        DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update([
            'status' => 'approved', 'approved_at' => now(), 'updated_at' => now(),
        ]);
        $this->audit('challenge_code_verified', true, $identity, null, (int)$challenge->id, $request);
        return [true, null];
    }

    public function approveChallenge(int $challengeId, Request $request): bool
    {
        $identity = $this->identity();
        $hub = $this->currentHub($request, $identity['location_id']);
        if (!$hub) return false;
        $this->touchDevice((int)$hub->id);

        $challenge = DB::table('pmd_site_access_challenges')
            ->where('id', $challengeId)
            ->where('location_id', $identity['location_id'])
            ->where('status', 'pending')
            ->where('expires_at', '>', now())
            ->first();
        if (!$challenge) return false;

        DB::table('pmd_site_access_challenges')->where('id', $challengeId)->update([
            'status' => 'approved',
            'approved_by_device_id' => (int)$hub->id,
            'approved_by_staff_id' => $identity['staff_id'] ?: null,
            'approved_at' => now(),
            'updated_at' => now(),
        ]);
        $this->audit('challenge_approved', true, $identity, (int)$hub->id, $challengeId, $request, ['purpose' => $challenge->purpose]);
        return true;
    }

    public function declineChallenge(int $challengeId, Request $request): bool
    {
        $identity = $this->identity();
        $hub = $this->currentHub($request, $identity['location_id']);
        if (!$hub) return false;
        $this->touchDevice((int)$hub->id);

        $updated = DB::table('pmd_site_access_challenges')
            ->where('id', $challengeId)
            ->where('location_id', $identity['location_id'])
            ->where('status', 'pending')
            ->update(['status' => 'declined', 'updated_at' => now()]);
        $this->audit('challenge_declined', $updated > 0, $identity, (int)$hub->id, $challengeId, $request);
        return $updated > 0;
    }

    /**
     * Complete an approved challenge for the logged-in user.
     * Returns ['redirect'=>..., 'staff_device_token'=>?].
     */
    public function finalizeCurrent(Request $request): array
    {
        $identity = $this->identity();
        $challenge = $this->challengeForSession();
        $pending = (array)session()->get(self::SESSION_PENDING, []);
        if (!$challenge || $identity['user_id'] < 1 || (int)$challenge->user_id !== $identity['user_id']) {
            throw new \RuntimeException('No matching Site Access request.');
        }
        if ($challenge->status !== 'approved') throw new \RuntimeException('Restaurant verification is still pending.');
        if (Carbon::parse($challenge->expires_at)->isPast()) throw new \RuntimeException('This verification request expired.');

        $staffDeviceToken = null;
        if ($challenge->purpose === self::PURPOSE_PAIR_STAFF) {
            [$device, $staffDeviceToken] = $this->createPersonalDevice($identity, $request, (int)($challenge->approved_by_device_id ?? 0));
            $this->audit('staff_device_paired', true, $identity, (int)$device->id, (int)$challenge->id, $request);
        } else {
            $this->markWorkspaceVerified((int)$challenge->location_id, 'site_access', (int)($challenge->approved_by_device_id ?? 0));
            $this->audit('workspace_verified', true, $identity, (int)($challenge->approved_by_device_id ?? 0), (int)$challenge->id, $request);
        }

        DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update([
            'status' => 'used', 'used_at' => now(), 'updated_at' => now(),
        ]);
        session()->forget(self::SESSION_PENDING);

        return [
            'redirect' => (string)($pending['redirect'] ?? admin_url('dashboard')),
            'staff_device_token' => $staffDeviceToken,
        ];
    }

    public function pendingChallengesForHub(Request $request)
    {
        $identity = $this->identity();
        $hub = $this->currentHub($request, $identity['location_id']);
        if (!$hub) return collect();
        $this->touchDevice((int)$hub->id);

        return DB::table('pmd_site_access_challenges as challenge')
            ->leftJoin('staffs as staff', 'staff.staff_id', '=', 'challenge.staff_id')
            ->where('challenge.location_id', $identity['location_id'])
            ->where('challenge.status', 'pending')
            ->where('challenge.expires_at', '>', now())
            ->select([
                'challenge.*',
                'staff.staff_name',
            ])
            ->orderBy('challenge.created_at')
            ->get()
            ->map(function ($challenge) {
                $challenge->display_code = $this->challengeCodeForHub($challenge);
                $challenge->qr_url = $this->signedQrUrl($challenge);
                return $challenge;
            });
    }

    public function activeDevices(int $locationId)
    {
        if (!$this->ready() || $locationId < 1) return collect();
        return DB::table('pmd_site_access_devices as device')
            ->leftJoin('staffs as staff', 'staff.staff_id', '=', 'device.staff_id')
            ->leftJoin('pos_devices as pos', 'pos.device_id', '=', 'device.pos_device_id')
            ->where('device.location_id', $locationId)
            ->whereNull('device.revoked_at')
            ->select(['device.*', 'staff.staff_name', 'pos.name as pos_name'])
            ->orderBy('device.device_kind')
            ->orderByDesc('device.last_seen_at')
            ->get();
    }

    public function isWorkspaceVerified(?int $locationId = null): bool
    {
        $locationId = $locationId ?: (int)$this->identity()['location_id'];
        if ($locationId < 1) return false;
        if ((int)session()->get(self::SESSION_VERIFIED_LOCATION, 0) !== $locationId) return false;
        $until = session()->get(self::SESSION_VERIFIED_UNTIL);
        return $until && Carbon::parse($until)->isFuture();
    }

    public function markWorkspaceVerified(int $locationId, string $method, int $deviceId = 0): void
    {
        $until = $this->restaurantDayBoundary();
        session()->put(self::SESSION_VERIFIED_LOCATION, $locationId);
        session()->put(self::SESSION_VERIFIED_UNTIL, $until->toIso8601String());
        session()->put(self::SESSION_VERIFIED_METHOD, $method);
        session()->put(self::SESSION_VERIFIED_DEVICE, $deviceId ?: null);
        session()->forget(self::SESSION_PENDING);
    }

    public function clearVerification(): void
    {
        session()->forget([
            self::SESSION_PENDING,
            self::SESSION_DESTINATION,
            self::SESSION_VERIFIED_LOCATION,
            self::SESSION_VERIFIED_UNTIL,
            self::SESSION_VERIFIED_METHOD,
            self::SESSION_VERIFIED_DEVICE,
        ]);
    }

    /**
     * Global Admin gate. It deliberately acts only on sessions that Login has
     * marked pending, so rollout cannot lock existing production sessions.
     */
    public function gateResponse(Request $request)
    {
        if (!$this->ready() || !AdminAuth::isLogged()) return null;
        $pending = (array)session()->get(self::SESSION_PENDING, []);
        if (empty($pending['public_id'])) return null;

        $path = trim((string)$request->path(), '/');
        $admin = trim((string)config('system.adminUri', 'admin'), '/');
        $relative = $path === $admin ? '' : (str_starts_with($path, $admin.'/') ? substr($path, strlen($admin) + 1) : $path);

        foreach (['siteaccess', 'login', '_assets', '_pmd/language-switch'] as $allowed) {
            if ($relative === $allowed || str_starts_with($relative, $allowed.'/')) return null;
        }

        return redirect(admin_url('siteaccess'));
    }

    public function generateRecoveryCodes(Request $request): array
    {
        if (!$this->ready()) throw new \RuntimeException('Site Access schema is not ready.');
        $identity = $this->identity();
        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
        if ($role !== PmdDefaultStaffRoleService::OWNER) throw new \RuntimeException('Only the Owner can generate recovery codes.');

        $codes = [];
        DB::transaction(function () use (&$codes, $identity) {
            DB::table('pmd_site_access_recovery_codes')
                ->where('location_id', $identity['location_id'])
                ->where('user_id', $identity['user_id'])
                ->whereNull('used_at')
                ->delete();

            for ($i = 0; $i < 8; $i++) {
                $code = strtoupper(substr(bin2hex(random_bytes(4)), 0, 4).'-'.substr(bin2hex(random_bytes(4)), 0, 4));
                $codes[] = $code;
                DB::table('pmd_site_access_recovery_codes')->insert([
                    'location_id' => $identity['location_id'],
                    'user_id' => $identity['user_id'],
                    'code_hash' => $this->recoveryHash($identity['user_id'], $code),
                    'created_at' => now(),
                ]);
            }
        });
        $this->audit('recovery_codes_generated', true, $identity, null, null, $request, ['count' => count($codes)]);
        return $codes;
    }

    public function useRecoveryCode(string $code, Request $request): bool
    {
        if (!$this->ready()) return false;
        $identity = $this->identity();
        $role = app(PmdDefaultStaffRoleService::class)->roleCodeForUser($identity['user']);
        if ($role !== PmdDefaultStaffRoleService::OWNER) return false;

        $hash = $this->recoveryHash($identity['user_id'], strtoupper(trim($code)));
        $record = DB::table('pmd_site_access_recovery_codes')
            ->where('location_id', $identity['location_id'])
            ->where('user_id', $identity['user_id'])
            ->where('code_hash', $hash)
            ->whereNull('used_at')
            ->first();
        if (!$record) {
            $this->audit('recovery_code_failed', false, $identity, null, null, $request);
            return false;
        }

        DB::table('pmd_site_access_recovery_codes')->where('id', $record->id)->update(['used_at' => now()]);
        $challenge = $this->challengeForSession();
        if ($challenge && $challenge->purpose === self::PURPOSE_WORKSPACE) {
            DB::table('pmd_site_access_challenges')->where('id', $challenge->id)->update([
                'status' => 'approved', 'approved_at' => now(), 'updated_at' => now(),
            ]);
        }
        $this->markWorkspaceVerified($identity['location_id'], 'owner_recovery', 0);
        $this->audit('owner_recovery_used', true, $identity, null, $challenge ? (int)$challenge->id : null, $request);
        return true;
    }

    public function audit(string $eventType, bool $success, array $identity, ?int $deviceId, ?int $challengeId, Request $request, array $metadata = []): void
    {
        if (!$this->ready()) return;
        try {
            DB::table('pmd_site_access_events')->insert([
                'location_id' => $identity['location_id'] ?: null,
                'user_id' => $identity['user_id'] ?: null,
                'staff_id' => $identity['staff_id'] ?: null,
                'device_id' => $deviceId ?: null,
                'challenge_id' => $challengeId ?: null,
                'event_type' => $eventType,
                'success' => $success ? 1 : 0,
                'ip_address' => substr((string)$request->ip(), 0, 45),
                'user_agent' => substr((string)$request->userAgent(), 0, 2000),
                'metadata' => $metadata ? json_encode($metadata) : null,
                'created_at' => now(),
            ]);
        } catch (\Throwable $error) {
            logger()->warning('PMD Site Access audit failed', ['event' => $eventType, 'message' => $error->getMessage()]);
        }
    }

    private function createPersonalDevice(array $identity, Request $request, int $approvedByDeviceId): array
    {
        $rawToken = bin2hex(random_bytes(32));
        $deviceId = DB::table('pmd_site_access_devices')->insertGetId([
            'location_id' => $identity['location_id'],
            'device_kind' => 'staff_personal',
            'staff_id' => $identity['staff_id'],
            'pos_device_id' => null,
            'device_name' => $this->deviceName($request),
            'token_hash' => $this->tokenHash($rawToken),
            'capabilities' => json_encode(['staff_portal']),
            'platform_info' => json_encode($this->platformInfo($request)),
            'paired_by_staff_id' => null,
            'paired_at' => now(),
            'last_seen_at' => now(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        $device = DB::table('pmd_site_access_devices')->where('id', $deviceId)->first();
        return [$device, $rawToken];
    }

    private function restaurantDayBoundary(): Carbon
    {
        $now = now();
        $boundary = $now->copy()->startOfDay()->addHours(6);
        if ($now->gte($boundary)) $boundary->addDay();
        return $boundary;
    }

    private function challengeCode(string $publicId, int $locationId): string
    {
        $hex = hash_hmac('sha256', 'code|'.$locationId.'|'.$publicId, $this->appSecret());
        $number = hexdec(substr($hex, 0, 12)) % 1000000;
        return str_pad((string)$number, 6, '0', STR_PAD_LEFT);
    }

    private function codeHash(string $publicId, string $code): string
    {
        return hash_hmac('sha256', 'verify|'.$publicId.'|'.$code, $this->appSecret());
    }

    private function recoveryHash(int $userId, string $code): string
    {
        return hash_hmac('sha256', 'recovery|'.$userId.'|'.$code, $this->appSecret());
    }

    private function tokenHash(string $raw): string
    {
        return hash_hmac('sha256', 'device|'.$raw, $this->appSecret());
    }

    private function appSecret(): string
    {
        return (string)config('app.key', 'pmd-site-access');
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
