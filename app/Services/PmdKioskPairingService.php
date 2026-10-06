<?php

namespace App\Services;

use Admin\Models\Terminal_devices_model;
use App\Services\TerminalPayments\TerminalPaymentService;
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
                ['id' => 'eat_in', 'label' => 'Eat here'],
                ['id' => 'pickup', 'label' => 'Take away'],
            ],
            'idle_timeout_seconds' => 120,
            'payments_enabled' => true,
        ];
    }

    /**
     * PMD_KIOSK_CONNECTED_TERMINAL_V18
     *
     * Kiosk terminal payments are device-authenticated, card-present operations.
     * The browser never receives provider credentials and never chooses PayPal,
     * Apple Pay, card forms, etc. The server resolves one active reader for the
     * paired kiosk location and TerminalPaymentService remains settlement authority.
     */
    public function terminalStateForDevice(Request $request): array
    {
        $device = $this->authenticate($request);
        $terminal = $this->preferredTerminalForLocation((int)$device->location_id);

        return [
            'ok' => true,
            'connected' => $terminal !== null,
            'terminal' => $terminal ? [
                'id' => (int)$terminal->terminal_device_id,
                'provider_code' => strtolower((string)$terminal->provider_code),
                'label' => trim((string)($terminal->reader_label ?? ''))
                    ?: strtoupper((string)$terminal->provider_code).' terminal',
                'status' => (string)($terminal->terminal_status ?? 'ready'),
            ] : null,
        ];
    }

    public function createTerminalPaymentForDevice(
        Request $request,
        int $orderId
    ): array {
        $device = $this->authenticate($request);
        $locationId = (int)$device->location_id;
        $this->assertOrderBelongsToLocation($orderId, $locationId);

        $terminal = $this->preferredTerminalForLocation($locationId);
        if (!$terminal) {
            return [
                'success' => false,
                'status' => 'unavailable',
                'error' => 'No connected payment terminal is configured for this kiosk.',
            ];
        }

        $result = app(TerminalPaymentService::class)->createAttempt(
            $orderId,
            strtolower((string)$terminal->provider_code),
            (string)$terminal->terminal_device_id,
            false
        );

        return array_merge(
            [
                'terminal' => [
                    'id' => (int)$terminal->terminal_device_id,
                    'provider_code' => strtolower((string)$terminal->provider_code),
                    'label' => trim((string)($terminal->reader_label ?? ''))
                        ?: strtoupper((string)$terminal->provider_code).' terminal',
                ],
            ],
            $result
        );
    }

    public function refreshTerminalPaymentForDevice(
        Request $request,
        int $attemptId
    ): array {
        $device = $this->authenticate($request);
        if (!Schema::hasTable('payment_attempts')) {
            return [
                'success' => false,
                'status' => 'failed',
                'error' => 'Payment attempt storage is unavailable.',
            ];
        }

        $attempt = DB::table('payment_attempts')
            ->where('id', $attemptId)
            ->first();
        if (!$attempt) {
            abort(404, 'Terminal payment attempt was not found.');
        }

        $orderId = (int)($attempt->order_id ?? 0);
        $this->assertOrderBelongsToLocation(
            $orderId,
            (int)$device->location_id
        );

        return app(TerminalPaymentService::class)
            ->refreshAttempt($attemptId);
    }

    private function preferredTerminalForLocation(int $locationId)
    {
        if (!Schema::hasTable('terminal_devices')) {
            return null;
        }

        $allowed = array_keys(Terminal_devices_model::listProviderOptions());
        $allowed = array_values(array_intersect(
            array_map(
                static fn ($value) => strtolower(trim((string)$value)),
                $allowed
            ),
            ['sumup', 'worldline', 'square', 'vr_payment']
        ));
        if (!$allowed) {
            return null;
        }

        $query = DB::table('terminal_devices')
            ->whereIn(DB::raw('LOWER(provider_code)'), $allowed)
            ->whereNotNull('reader_id')
            ->where('reader_id', '!=', '');

        if (Schema::hasColumn('terminal_devices', 'is_active')) {
            $query->where('is_active', 1);
        }
        if (Schema::hasColumn('terminal_devices', 'location_id')) {
            $query->where(function ($location) use ($locationId) {
                $location->whereNull('location_id')
                    ->orWhere('location_id', $locationId);
            });
        }
        if (Schema::hasColumn('terminal_devices', 'pairing_state')) {
            $query->orderByRaw(
                "CASE WHEN LOWER(COALESCE(pairing_state,'')) = 'paired' THEN 0 ELSE 1 END"
            );
        }
        if (Schema::hasColumn('terminal_devices', 'terminal_status')) {
            $query->orderByRaw(
                "CASE WHEN LOWER(COALESCE(terminal_status,'')) IN ('ready','online','connected') THEN 0 ELSE 1 END"
            );
        }

        // Real terminals are preferred over the dedicated VR simulator.
        $query->orderByRaw(
            "CASE WHEN UPPER(COALESCE(reader_id,'')) LIKE 'PMD-VR-SIM-%' THEN 1 ELSE 0 END"
        );

        return $query
            ->orderBy('terminal_device_id')
            ->first();
    }

    private function assertOrderBelongsToLocation(
        int $orderId,
        int $locationId
    ): void {
        if ($orderId < 1 || !Schema::hasTable('orders')) {
            abort(404, 'Kiosk order was not found.');
        }

        $query = DB::table('orders')->where('order_id', $orderId);
        if (Schema::hasColumn('orders', 'location_id')) {
            $query->where('location_id', $locationId);
        }

        if (!$query->exists()) {
            abort(403, 'This order does not belong to the paired kiosk location.');
        }
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
