<?php

namespace App\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Trusted-device pairing/bootstrap for PayMyDine self-service kiosks.
 *
 * Kiosks never store a staff password. A manager starts a short-lived kiosk
 * deployment from Devices & hardware, the Android device exchanges the six
 * digit code once, and the resulting bearer credential is stored in Android
 * Keystore-backed storage.
 */
final class PmdKioskPairingService
{
    private const DEVICE_KIND = 'kiosk';

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
            abort(422, 'The kiosk setup code must contain 6 digits.');
        }

        return DB::transaction(function () use (
            $code,
            $deviceName,
            $installationId,
            $platformInfo,
            $request
        ) {
            $deployment = app(PmdDevicePlatformService::class)
                ->lockDeploymentByCode($code, self::DEVICE_KIND);

            if (!$deployment) {
                abort(410, 'This kiosk deployment code is invalid, full or expired.');
            }

            $locationId = (int)($deployment->location_id ?? 0);
            if ($locationId < 1) {
                abort(422, 'Restaurant location could not be resolved.');
            }

            $normalizedInstallationId = mb_substr(
                trim($installationId),
                0,
                96
            );
            if ($normalizedInstallationId === '') {
                abort(422, 'installation_id is required.');
            }

            $existingDevice = null;
            $existingPlatform = [];
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

            $sameDeploymentRetry = (
                $existingDevice
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
            $deviceName = trim($deviceName);
            if ($deviceName === '') {
                $deviceName = 'PMD-KIOSK-'.strtoupper(
                    substr(hash('sha256', $normalizedInstallationId), 0, 6)
                );
            }
            $deviceName = mb_substr($deviceName, 0, 128);

            $platformInfo = array_merge(
                $existingPlatform,
                $platformInfo,
                [
                    'paired_protocol' => 'pmd-kiosk-v1',
                    'device_mode' => 'kiosk',
                    'centrally_managed' => true,
                    'deployment_session_id' => (int)$deployment->id,
                    'installation_id' => $normalizedInstallationId,
                    'paired_ip' => substr((string)$request->ip(), 0, 45),
                ]
            );

            $deviceId = DB::table('pmd_site_access_devices')->insertGetId([
                'location_id' => $locationId,
                'device_kind' => self::DEVICE_KIND,
                'staff_id' => null,
                'pos_device_id' => null,
                'device_name' => $deviceName,
                'token_hash' => hash('sha256', $rawToken),
                'capabilities' => json_encode([
                    'kiosk_v1',
                    'customer_menu',
                    'guest_checkout',
                    'payments',
                    'eat_in',
                    'pickup',
                    'device_platform_v1',
                    'managed_power',
                    'lock_task_capable',
                ], JSON_UNESCAPED_SLASHES),
                'platform_info' => json_encode(
                    $platformInfo,
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                ),
                'paired_by_staff_id' => (int)($deployment->created_by_staff_id ?? 0) ?: null,
                'paired_at' => now(),
                'last_seen_at' => now(),
                'revoked_at' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            if (!$sameDeploymentRetry) {
                app(PmdDevicePlatformService::class)
                    ->markDeploymentPaired((int)$deployment->id);
            }

            return [
                'ok' => true,
                'protocol' => 'pmd-kiosk-v1',
                'device_token' => $rawToken,
                'device_id' => (int)$deviceId,
                'location_id' => $locationId,
                'message' => 'PayMyDine Kiosk paired and ready.',
            ];
        });
    }

    public function stateForDevice(Request $request): array
    {
        $device = $this->authenticate($request);
        $locationId = (int)$device->location_id;
        $platform = $this->platformInfo($device);

        // PMD_KIOSK_DEVICE_HARDWARE_V18
        // Device Control binds one physical card terminal to this exact kiosk.
        // Public menu JavaScript never receives provider credentials; Android
        // uses the bearer-protected kiosk payment endpoints below.
        $terminal = null;
        $terminalDeviceId = (int)($platform['payment_terminal_device_id'] ?? 0);
        if ($terminalDeviceId > 0 && Schema::hasTable('terminal_devices')) {
            $terminal = DB::table('terminal_devices')
                ->where('terminal_device_id', $terminalDeviceId)
                ->first();
        }

        $profile = app(PmdTableDisplayService::class)
            ->customerSurfaceProfile($locationId);

        DB::table('pmd_site_access_devices')
            ->where('id', (int)$device->id)
            ->update([
                'last_seen_at' => now(),
                'updated_at' => now(),
            ]);

        return [
            'ok' => true,
            'protocol' => 'pmd-kiosk-v1',
            'server_time' => now()->toIso8601String(),
            'device' => [
                'id' => (int)$device->id,
                'name' => (string)$device->device_name,
                'location_id' => $locationId,
            ],
            'restaurant' => (array)($profile['restaurant'] ?? []),
            'theme' => (array)($profile['theme'] ?? []),
            'menu_url' => rtrim($request->getSchemeAndHttpHost(), '/').'/',
            'service_modes' => [
                ['id' => 'eat_in', 'label' => 'Dine in'],
                ['id' => 'pickup', 'label' => 'Take away'],
            ],
            'payment_terminal' => $terminal ? [
                'terminal_device_id' => (int)($terminal->terminal_device_id ?? 0),
                'provider_code' => strtolower(trim((string)($terminal->provider_code ?? ''))),
                'label' => trim((string)($terminal->reader_label ?? ''))
                    ?: trim((string)($terminal->reader_id ?? ''))
                    ?: 'Payment terminal',
                'ready' => (bool)($terminal->is_active ?? true),
            ] : null,
            'receipt_printer' => [
                'connection_type' => strtolower(trim((string)($platform['receipt_printer_connection_type'] ?? ''))),
                'host' => trim((string)($platform['receipt_printer_host'] ?? '')),
                'port' => max(1, min(65535, (int)($platform['receipt_printer_port'] ?? 9100))),
                'name' => trim((string)($platform['receipt_printer_name'] ?? '')),
            ],
            'idle_timeout_seconds' => 120,
            'payments_enabled' => $terminal !== null,
        ];
    }

    public function authenticate(Request $request)
    {
        $this->ensureStorage();

        $token = trim((string)$request->bearerToken());
        if ($token === '' || strlen($token) < 32) {
            abort(401, 'Kiosk device authentication is required.');
        }

        $device = DB::table('pmd_site_access_devices')
            ->where('device_kind', self::DEVICE_KIND)
            ->where('token_hash', hash('sha256', $token))
            ->whereNull('revoked_at')
            ->first();

        if (!$device) {
            abort(401, 'This PayMyDine Kiosk is not paired.');
        }

        return $device;
    }

    private function platformInfo($device): array
    {
        $decoded = json_decode((string)($device->platform_info ?? '{}'), true);
        return is_array($decoded) ? $decoded : [];
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
        app(PmdDevicePlatformService::class)->ensureStorage();

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
            throw new \RuntimeException('PayMyDine trusted-device storage is not installed.');
        }

        require_once $migration;
        (new \System\Database\Migrations\CreatePmdSiteAccessTables())->up();
    }
}
