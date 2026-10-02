<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * PMD_TABLE_DISPLAY_PAIRING_V1
 *
 * Device trust for the small guest-facing Table Companion. A human password is
 * never stored on the device. Settings creates a short setup code, Android
 * exchanges it once for a random bearer credential, then the trusted device
 * selects one table at the current restaurant location.
 */
final class PmdTableDisplayPairingService
{
    private const PURPOSE = 'pair_table_display';
    private const DEVICE_KIND = 'table_display';

    public function createSetupCode($user, int $locationId, Request $request): array
    {
        $this->ensureStorage();

        $userId = (int)($user ? $user->getKey() : 0);
        if ($userId < 1 || $locationId < 1) {
            abort(422, 'Restaurant location could not be resolved.');
        }

        $staffId = 0;
        try {
            $staffId = (int)($user->staff->staff_id ?? $user->staff_id ?? 0);
        } catch (\Throwable $ignored) {
        }

        DB::table('pmd_site_access_challenges')
            ->where('location_id', $locationId)
            ->where('user_id', $userId)
            ->where('purpose', self::PURPOSE)
            ->where('status', 'pending')
            ->update([
                'status' => 'expired',
                'updated_at' => now(),
            ]);

        $code = (string)random_int(100000, 999999);
        $publicId = (string)Str::uuid();
        $expiresAt = now()->addMinutes(10);

        DB::table('pmd_site_access_challenges')->insert([
            'public_id' => $publicId,
            'location_id' => $locationId,
            'user_id' => $userId,
            'staff_id' => $staffId ?: null,
            'purpose' => self::PURPOSE,
            'status' => 'pending',
            'code_hash' => $this->codeHash($code),
            'requested_device_name' => 'PayMyDine Table Companion',
            'requested_ip' => substr((string)$request->ip(), 0, 45),
            'requested_user_agent' => substr((string)$request->userAgent(), 0, 1000),
            'expires_at' => $expiresAt,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [
            'ok' => true,
            'code' => $code,
            'location_id' => $locationId,
            'expires_at' => $expiresAt->toIso8601String(),
            'expires_in_seconds' => 600,
            'message' => 'Enter this code once in the PayMyDine Table Companion app.',
        ];
    }

    public function exchange(
        string $code,
        string $deviceName,
        string $installationId,
        array $platformInfo,
        Request $request
    ): array {
        $this->ensureStorage();

        $code = trim($code);
        if (!preg_match('/^\d{6}$/', $code)) {
            abort(422, 'The setup code must contain 6 digits.');
        }

        return DB::transaction(function () use (
            $code,
            $deviceName,
            $installationId,
            $platformInfo,
            $request
        ) {
            $challenge = DB::table('pmd_site_access_challenges')
                ->where('purpose', self::PURPOSE)
                ->where('code_hash', $this->codeHash($code))
                ->where('status', 'pending')
                ->whereNull('used_at')
                ->where('expires_at', '>', now())
                ->orderByDesc('id')
                ->lockForUpdate()
                ->first();

            $deployment = null;
            if (!$challenge) {
                $deployment = app(PmdDevicePlatformService::class)
                    ->lockDeploymentByCode($code);
            }

            if (!$challenge && !$deployment) {
                abort(410, 'This Table Companion setup/deployment code is invalid or expired.');
            }

            $locationId = (int)(
                $challenge->location_id
                ?? $deployment->location_id
                ?? 0
            );
            $pairedByStaffId = (int)(
                $challenge->staff_id
                ?? $deployment->created_by_staff_id
                ?? 0
            );
            $deploymentMode = $deployment !== null;

            $normalizedInstallationId = mb_substr(
                trim($installationId),
                0,
                96
            );

            // A transport retry or reinstall must not leave two active trusted
            // records for the same physical Table Companion.
            $existingDevice = null;
            $existingPlatform = [];
            if ($normalizedInstallationId !== '') {
                $candidates = DB::table('pmd_site_access_devices')
                    ->where('location_id', $locationId)
                    ->where('device_kind', self::DEVICE_KIND)
                    ->whereNull('revoked_at')
                    ->orderByDesc('id')
                    ->lockForUpdate()
                    ->get();

                foreach ($candidates as $candidate) {
                    $candidatePlatform = $this->platformInfo($candidate);
                    if (
                        trim((string)($candidatePlatform['installation_id'] ?? ''))
                        === $normalizedInstallationId
                    ) {
                        $existingDevice = $candidate;
                        $existingPlatform = $candidatePlatform;
                        break;
                    }
                }
            }

            $sameDeploymentRetry = (
                $deployment
                && $existingDevice
                && (int)($existingPlatform['deployment_session_id'] ?? 0)
                    === (int)$deployment->id
            );

            if ($existingDevice) {
                DB::table('pmd_site_access_devices')
                    ->where('id', (int)$existingDevice->id)
                    ->update([
                        'revoked_at' => now(),
                        'updated_at' => now(),
                    ]);
            }

            $rawToken = $this->randomToken();

            if ($deploymentMode && $normalizedInstallationId !== '') {
                $deviceName = 'PMD-DISPLAY-'.strtoupper(
                    substr(hash('sha256', $normalizedInstallationId), 0, 6)
                );
            } else {
                $deviceName = trim($deviceName)
                    ?: 'PayMyDine Table Companion';
            }
            $deviceName = mb_substr($deviceName, 0, 128);

            $platformInfo = array_merge(
                $existingPlatform,
                $platformInfo,
                [
                'paired_protocol' => 'pmd-table-display-v1',
                'device_mode' => 'table_display',
                'centrally_managed' => $deploymentMode,
                'deployment_session_id' => $deploymentMode
                    ? (int)$deployment->id
                    : null,
                'installation_id' => $normalizedInstallationId,
                // Preserve a previous central assignment across a safe re-pair.
                'table_id' => (int)($existingPlatform['table_id'] ?? 0) > 0
                    ? (int)$existingPlatform['table_id']
                    : null,
                'payment_terminal_device_id' => (
                    (int)($existingPlatform['payment_terminal_device_id'] ?? 0) > 0
                )
                    ? (int)$existingPlatform['payment_terminal_device_id']
                    : null,
            ]);

            $deviceId = DB::table('pmd_site_access_devices')->insertGetId([
                'location_id' => $locationId,
                'device_kind' => self::DEVICE_KIND,
                'staff_id' => null,
                'pos_device_id' => null,
                'device_name' => $deviceName,
                'token_hash' => hash('sha256', $rawToken),
                'capabilities' => json_encode([
                    'table_display_v1',
                    'table_qr',
                    'live_reactions',
                    'waiter_payment_handoff',
                    'table_payment_handoff',
                    'device_platform_v1',
                    'managed_power',
                    'offline_snapshot',
                    'lock_task_capable',
                ], JSON_UNESCAPED_SLASHES),
                'platform_info' => json_encode(
                    $platformInfo,
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                ),
                'paired_by_staff_id' => $pairedByStaffId ?: null,
                'paired_at' => now(),
                'last_seen_at' => now(),
                'revoked_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if ($challenge) {
                DB::table('pmd_site_access_challenges')
                    ->where('id', (int)$challenge->id)
                    ->update([
                        'status' => 'approved',
                        'approved_by_staff_id' => $pairedByStaffId ?: null,
                        'approved_at' => now(),
                        'used_at' => now(),
                        'updated_at' => now(),
                    ]);
            }

            if ($deployment && !$sameDeploymentRetry) {
                app(PmdDevicePlatformService::class)
                    ->markDeploymentPaired((int)$deployment->id);
            }

            return [
                'ok' => true,
                'protocol' => 'pmd-table-display-v1',
                'device_token' => $rawToken,
                'device_id' => (int)$deviceId,
                'location_id' => $locationId,
                'bound_table_id' => null,
                'deployment_mode' => $deploymentMode,
                'message' => $deploymentMode
                    ? 'Device joined the deployment session. Assign its table from PayMyDine Admin.'
                    : 'Device paired. Choose the table on the device.',
            ];
        });
    }

    public function tablesForDevice(Request $request): array
    {
        $device = $this->authenticate($request);
        $locationId = (int)$device->location_id;

        $tables = array_values(array_filter(
            app(PmdTableDisplayService::class)->tables(),
            static fn (array $table) =>
                (int)($table['location_id'] ?? 0) === $locationId
        ));

        return [
            'ok' => true,
            'device_id' => (int)$device->id,
            'location_id' => $locationId,
            'tables' => $tables,
        ];
    }

    public function bindTable(Request $request, int $tableId): array
    {
        $device = $this->authenticate($request);
        $table = collect(app(PmdTableDisplayService::class)->tables())
            ->first(static fn (array $row) =>
                (int)($row['id'] ?? 0) === $tableId
                && (int)($row['location_id'] ?? 0) === (int)$device->location_id
            );

        if (!$table) {
            abort(404, 'That table is not available at this restaurant location.');
        }

        $platform = $this->platformInfo($device);
        $platform['table_id'] = $tableId;
        $platform['bound_at'] = now()->toIso8601String();

        DB::table('pmd_site_access_devices')
            ->where('id', (int)$device->id)
            ->update([
                'platform_info' => json_encode(
                    $platform,
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                ),
                'last_seen_at' => now(),
                'updated_at' => now(),
            ]);

        return [
            'ok' => true,
            'device_id' => (int)$device->id,
            'table' => $table,
            'message' => 'Table Companion assigned to '.$table['name'].'.',
        ];
    }

    public function stateForDevice(Request $request): array
    {
        $device = $this->authenticate($request);
        $platform = $this->platformInfo($device);
        $tableId = (int)($platform['table_id'] ?? 0);

        if ($tableId < 1) {
            return [
                'ok' => false,
                'code' => 'table_not_bound',
                'message' => 'Choose a table on this device.',
                'device_id' => (int)$device->id,
            ];
        }

        $table = collect(app(PmdTableDisplayService::class)->tables())
            ->first(static fn (array $row) =>
                (int)($row['id'] ?? 0) === $tableId
                && (int)($row['location_id'] ?? 0) === (int)$device->location_id
            );

        if (!$table) {
            abort(409, 'The table assigned to this device is no longer available.');
        }

        $state = app(PmdTableDisplayService::class)->state($tableId);

        DB::table('pmd_site_access_devices')
            ->where('id', (int)$device->id)
            ->update([
                'last_seen_at' => now(),
                'updated_at' => now(),
            ]);

        return [
            'ok' => true,
            'protocol' => 'pmd-table-display-v1',
            'server_time' => $state['server_time'] ?? now()->toIso8601String(),
            'device' => [
                'id' => (int)$device->id,
                'name' => (string)$device->device_name,
                'table_id' => $tableId,
            ],
            'table' => $state['table'] ?? [],
            'restaurant' => $state['restaurant'] ?? [],
            'theme' => $state['theme'] ?? [
                'id' => 'kazen_japanese',
                'background' => '#F5F1EB',
                'text' => '#25231F',
                'muted' => '#777168',
                'accent' => '#B5413F',
                'surface' => '#FBF8F3',
                'is_dark' => false,
            ],
            'event' => $state['event'] ?? [
                'type' => 'idle',
                'key' => 'idle',
                'headline' => 'Scan to order',
                'message' => '',
            ],
        ];
    }

    public function authenticate(Request $request)
    {
        $this->ensureStorage();

        $token = trim((string)$request->bearerToken());
        if ($token === '' || strlen($token) < 32) {
            abort(401, 'Table Companion device authentication is required.');
        }

        $device = DB::table('pmd_site_access_devices')
            ->where('device_kind', self::DEVICE_KIND)
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('revoked_at')
            ->first();

        if (!$device) {
            abort(401, 'This Table Companion device is not paired.');
        }

        return $device;
    }

    private function platformInfo($device): array
    {
        $decoded = json_decode((string)($device->platform_info ?? '{}'), true);
        return is_array($decoded) ? $decoded : [];
    }

    private function codeHash(string $code): string
    {
        return hash_hmac(
            'sha256',
            'pmd-table-display-setup|'.trim($code),
            (string)config('app.key', 'pmd-table-display')
        );
    }

    private function randomToken(): string
    {
        return rtrim(
            strtr(base64_encode(random_bytes(32)), '+/', '-_'),
            '='
        );
    }

    private function ensureStorage(): void
    {
        if (
            Schema::hasTable('pmd_site_access_devices')
            && Schema::hasTable('pmd_site_access_challenges')
        ) {
            return;
        }

        $migration = base_path(
            'app/system/database/migrations/2026_08_30_103000_create_pmd_site_access_tables.php'
        );

        if (!is_file($migration)) {
            throw new \RuntimeException('PayMyDine site-access storage is not installed.');
        }

        require_once $migration;
        (new \System\Database\Migrations\CreatePmdSiteAccessTables())->up();

        if (
            !Schema::hasTable('pmd_site_access_devices')
            || !Schema::hasTable('pmd_site_access_challenges')
        ) {
            throw new \RuntimeException('PayMyDine site-access storage could not be prepared.');
        }
    }
}
