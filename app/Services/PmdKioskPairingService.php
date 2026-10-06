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

        $profile = app(PmdTableDisplayService::class)
            ->customerSurfaceProfile($locationId);

        // PMD_KIOSK_TERMINAL_STATE_V18
        // The guest never chooses a provider. Device Control binds one physical
        // terminal to this kiosk and the native app receives only that binding.
        $platform = $this->platformInfo($device);
        $terminalDeviceId = max(
            0,
            (int)($platform['payment_terminal_device_id'] ?? 0)
        );
        $terminalProvider = strtolower(trim(
            (string)($platform['payment_terminal_provider'] ?? '')
        ));
        $terminalName = '';
        if ($terminalDeviceId > 0 && Schema::hasTable('terminal_devices')) {
            $terminal = DB::table('terminal_devices')
                ->where('terminal_device_id', $terminalDeviceId)
                ->first();
            if ($terminal) {
                $terminalName = trim((string)($terminal->reader_label ?? ''))
                    ?: trim((string)($terminal->reader_id ?? ''))
                    ?: 'Payment terminal';
            }
        }

        DB::table('pmd_site_access_devices')
            ->where('id', (int)$device->id)
            ->update([
                'last_seen_at' => now(),
                'updated_at' => now(),
            ]);

        $localization = $this->kioskLocalization();

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
            // PMD_KIOSK_TENANT_LOCALES_V20
            // Kiosk language choices are owned by the paired tenant/location,
            // never by a hard-coded Android list. Use the same language settings
            // as Customer Menu, with framework supported_languages as fallback.
            'localization' => $localization,
            'service_modes' => [
                ['id' => 'eat_in', 'label' => 'Dine in'],
                ['id' => 'pickup', 'label' => 'Take away'],
            ],
            'idle_timeout_seconds' => 120,
            'payments_enabled' => $terminalDeviceId > 0 && $terminalProvider !== '',
            'payment_terminal' => [
                'linked' => $terminalDeviceId > 0 && $terminalProvider !== '',
                'terminal_device_id' => $terminalDeviceId ?: null,
                'provider_code' => $terminalProvider ?: null,
                'name' => $terminalName ?: null,
            ],
        ];
    }

    /**
     * PMD_KIOSK_TENANT_LOCALES_V20
     * Resolve the guest languages from the active tenant database. The kiosk is
     * already authenticated to one location, so the current tenant setting store
     * is authoritative for that device. Customer Menu's explicit enabled-language
     * list wins; framework supported_languages remains the compatibility fallback.
     */
    private function kioskLocalization(): array
    {
        $default = $this->normalizeLocaleCode(
            (string)setting('default_language', 'en')
        ) ?: 'en';

        $raw = setting('pmd_v2_enabled_languages', null);
        if ($raw === null || $raw === '' || $raw === []) {
            $raw = setting('supported_languages', []);
        }

        $supported = $this->normalizeLocaleList($raw);
        if (!$supported) {
            $supported = [$default];
        }
        if (!in_array($default, $supported, true)) {
            array_unshift($supported, $default);
        }

        return [
            'default' => $default,
            'supported' => array_values(array_unique($supported)),
        ];
    }

    private function normalizeLocaleList($raw): array
    {
        if (is_string($raw)) {
            $trimmed = trim($raw);
            if ($trimmed === '') {
                return [];
            }

            $decoded = json_decode($trimmed, true);
            if (is_array($decoded)) {
                $raw = $decoded;
            } else {
                $unserialized = @unserialize($trimmed);
                if (is_array($unserialized)) {
                    $raw = $unserialized;
                } else {
                    $raw = preg_split('/[\\s,;|]+/', $trimmed) ?: [];
                }
            }
        } elseif (!is_array($raw)) {
            $raw = [$raw];
        }

        $out = [];
        foreach ($raw as $key => $value) {
            if (is_bool($value) && is_string($key)) {
                $candidate = $value ? $key : '';
            } else {
                $candidate = is_scalar($value) ? (string)$value : '';
            }

            $code = $this->normalizeLocaleCode($candidate);
            if ($code !== '' && !in_array($code, $out, true)) {
                $out[] = $code;
            }
        }

        return $out;
    }

    private function normalizeLocaleCode(string $value): string
    {
        $value = strtolower(trim($value));
        if ($value === '') {
            return '';
        }

        $parts = preg_split('/[-_]/', $value) ?: [];
        $code = preg_replace('/[^a-z]/', '', (string)($parts[0] ?? ''));
        return strlen($code) >= 2 && strlen($code) <= 3 ? $code : '';
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
