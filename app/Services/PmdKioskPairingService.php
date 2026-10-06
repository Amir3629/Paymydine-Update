<?php

namespace App\Services;

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
            'terminal' => $this->terminalStateForDevice($device),
        ];
    }


    /**
     * PMD_KIOSK_TERMINAL_ONLY_PAYMENT_V18
     *
     * Kiosk payment is intentionally device-bound. The public kiosk WebView
     * never receives provider credentials or a terminal id. It asks the native
     * Android bridge, which calls this bearer-authenticated endpoint.
     */
    public function startTerminalPayment(Request $request): array
    {
        $device = $this->authenticate($request);
        $orderId = max(0, (int)$request->input('order_id', 0));
        if ($orderId < 1) {
            abort(422, 'A valid kiosk order is required.');
        }

        $terminal = $this->linkedTerminalForDevice($device);
        if (!$terminal) {
            abort(
                409,
                'No active payment terminal is linked to this kiosk. Link one under Settings > Devices & hardware.'
            );
        }

        if (!Schema::hasTable('orders')) {
            abort(503, 'Order storage is unavailable.');
        }

        $order = DB::table('orders')->where('order_id', $orderId)->first();
        if (!$order) {
            abort(404, 'Kiosk order was not found.');
        }

        if (
            Schema::hasColumn('orders', 'location_id')
            && (int)($order->location_id ?? 0) > 0
            && (int)$order->location_id !== (int)$device->location_id
        ) {
            abort(403, 'That order belongs to another restaurant location.');
        }

        $provider = strtolower(trim((string)($terminal->provider_code ?? '')));
        $result = app(TerminalPaymentService::class)->createAttempt(
            $orderId,
            $provider,
            (string)$terminal->terminal_device_id
        );

        return array_merge((array)$result, [
            'ok' => (bool)($result['success'] ?? false),
            'terminal' => [
                'id' => (int)$terminal->terminal_device_id,
                'provider' => $provider,
                'name' => $this->terminalLabel($terminal),
            ],
        ]);
    }

    public function terminalPaymentStatus(
        Request $request,
        int $attemptId
    ): array {
        $device = $this->authenticate($request);
        $terminal = $this->linkedTerminalForDevice($device);
        if (!$terminal) {
            abort(409, 'This kiosk no longer has an active payment terminal linked.');
        }

        if (!Schema::hasTable('payment_attempts')) {
            abort(503, 'Payment-attempt storage is unavailable.');
        }

        $attempt = DB::table('payment_attempts')
            ->where('id', $attemptId)
            ->first();

        if (!$attempt) {
            abort(404, 'Terminal payment attempt was not found.');
        }

        $provider = strtolower(trim((string)($terminal->provider_code ?? '')));
        if (
            strtolower(trim((string)($attempt->provider_code ?? ''))) !== $provider
        ) {
            abort(403, 'That payment attempt does not belong to this kiosk terminal.');
        }

        $orderId = (int)($attempt->order_id ?? 0);
        if ($orderId > 0 && Schema::hasTable('orders')) {
            $order = DB::table('orders')->where('order_id', $orderId)->first();
            if (
                !$order
                || (
                    Schema::hasColumn('orders', 'location_id')
                    && (int)($order->location_id ?? 0) > 0
                    && (int)$order->location_id !== (int)$device->location_id
                )
            ) {
                abort(403, 'That payment attempt does not belong to this kiosk location.');
            }
        }

        $result = app(TerminalPaymentService::class)
            ->refreshAttempt($attemptId);

        return array_merge((array)$result, [
            'ok' => (bool)($result['success'] ?? false),
            'order_id' => $orderId,
        ]);
    }

    private function terminalStateForDevice($device): array
    {
        $terminal = $this->linkedTerminalForDevice($device);
        if (!$terminal) {
            return [
                'linked' => false,
                'ready' => false,
                'id' => null,
                'provider' => null,
                'name' => null,
            ];
        }

        return [
            'linked' => true,
            'ready' => true,
            'id' => (int)$terminal->terminal_device_id,
            'provider' => strtolower(trim((string)($terminal->provider_code ?? ''))),
            'name' => $this->terminalLabel($terminal),
        ];
    }

    private function linkedTerminalForDevice($device)
    {
        if (!Schema::hasTable('terminal_devices')) {
            return null;
        }

        $platform = $this->platformInfo($device);
        $terminalId = (int)($platform['payment_terminal_device_id'] ?? 0);
        if ($terminalId < 1) {
            return null;
        }

        $query = DB::table('terminal_devices')
            ->where('terminal_device_id', $terminalId);

        if (Schema::hasColumn('terminal_devices', 'is_active')) {
            $query->where('is_active', 1);
        }
        if (Schema::hasColumn('terminal_devices', 'location_id')) {
            $locationId = (int)$device->location_id;
            $query->where(function ($location) use ($locationId) {
                $location->whereNull('location_id')
                    ->orWhere('location_id', $locationId);
            });
        }

        $terminal = $query->first();
        if (!$terminal) {
            return null;
        }

        $provider = strtolower(trim((string)($terminal->provider_code ?? '')));
        if (!in_array($provider, ['sumup', 'worldline', 'square', 'vr_payment'], true)) {
            return null;
        }

        return $terminal;
    }

    private function terminalLabel($terminal): string
    {
        return trim((string)($terminal->reader_label ?? ''))
            ?: trim((string)($terminal->reader_id ?? ''))
            ?: 'Payment terminal';
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
