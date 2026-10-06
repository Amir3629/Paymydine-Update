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
            'idle_timeout_seconds' => 120,
            'payments_enabled' => true,
        ];
    }

    /**
     * PMD_KIOSK_TERMINAL_PAYMENT_V18
     *
     * Physical kiosks may only pay through the terminal explicitly linked to
     * this trusted kiosk device. Browser wallets/provider forms are not kiosk
     * payment methods. Provider settlement remains authoritative.
     */
    public function startTerminalPayment(
        Request $request,
        int $orderId
    ): array {
        $device = $this->authenticate($request);
        $locationId = (int)$device->location_id;

        if ($orderId < 1 || !Schema::hasTable('orders')) {
            abort(422, 'A valid kiosk order is required.');
        }
        if (!Schema::hasTable('terminal_devices')) {
            abort(503, 'Payment terminal storage is unavailable.');
        }

        $order = DB::table('orders')
            ->where('order_id', $orderId)
            ->first();

        if (!$order) {
            abort(404, 'Kiosk order was not found.');
        }

        $orderLocationId = (int)($order->location_id ?? $locationId);
        if ($orderLocationId > 0 && $orderLocationId !== $locationId) {
            abort(403, 'This order belongs to another restaurant location.');
        }

        $total = max(0.0, (float)($order->order_total ?? 0));
        $settled = max(0.0, (float)($order->settled_amount ?? 0));
        $remaining = round(max(0.0, $total - $settled), 2);

        if ($remaining <= 0.0001) {
            return [
                'ok' => true,
                'paid' => true,
                'status' => 'paid',
                'attempt_id' => null,
                'message' => 'This kiosk order is already paid.',
            ];
        }

        if ($settled > 0.0001) {
            abort(
                422,
                'A partially settled order cannot be paid from kiosk mode.'
            );
        }

        $platform = $this->platformInfo($device);
        $terminalDeviceId = (int)(
            $platform['payment_terminal_device_id']
            ?? $platform['terminal_device_id']
            ?? 0
        );

        if ($terminalDeviceId < 1) {
            abort(
                409,
                'No payment terminal is linked to this kiosk. Link the terminal to this device under Devices & hardware.'
            );
        }

        $terminalQuery = DB::table('terminal_devices')
            ->where('terminal_device_id', $terminalDeviceId);

        if (Schema::hasColumn('terminal_devices', 'is_active')) {
            $terminalQuery->where('is_active', 1);
        }
        if (Schema::hasColumn('terminal_devices', 'location_id')) {
            $terminalQuery->where(function ($query) use ($locationId) {
                $query->whereNull('location_id')
                    ->orWhere('location_id', $locationId);
            });
        }

        $terminal = $terminalQuery->first();
        if (!$terminal) {
            abort(
                409,
                'The terminal linked to this kiosk is inactive or belongs to another location.'
            );
        }

        $providerCode = strtolower(
            trim((string)($terminal->provider_code ?? ''))
        );

        // PMD_KIOSK_TERMINAL_IDEMPOTENCY_V18
        // A slow/pending countertop terminal must never create a second charge
        // just because the guest taps Pay again. Reuse the newest live attempt
        // for this order + linked physical terminal and continue polling it.
        if (Schema::hasTable('payment_attempts')) {
            $liveAttempt = DB::table('payment_attempts')
                ->where('order_id', $orderId)
                ->where('provider_code', $providerCode)
                ->where('terminal_device_id', $terminalDeviceId)
                ->whereIn('status', [
                    'pending',
                    'sent_to_terminal',
                    'processing',
                    'requires_action',
                ])
                ->orderByDesc('id')
                ->first();

            if ($liveAttempt) {
                return [
                    'ok' => true,
                    'paid' => false,
                    'status' => (string)($liveAttempt->status ?? 'pending'),
                    'attempt_id' => (int)$liveAttempt->id,
                    'provider_code' => $providerCode,
                    'terminal_device_id' => $terminalDeviceId,
                    'amount' => $remaining,
                    'message' => 'Existing terminal payment resumed. Do not pay twice.',
                ];
            }
        }

        if (!in_array(
            $providerCode,
            ['sumup', 'worldline', 'square', 'vr_payment'],
            true
        )) {
            abort(
                422,
                'The linked terminal provider is not supported by PayMyDine terminal payments.'
            );
        }

        $result = app(
            \App\Services\TerminalPayments\TerminalPaymentService::class
        )->createAttempt(
            $orderId,
            $providerCode,
            (string)$terminalDeviceId,
            [
                'surface' => 'kiosk',
                'disable_tipping' => true,
            ]
        );

        if (empty($result['success'])) {
            abort(
                422,
                (string)(
                    $result['message']
                    ?? $result['error']
                    ?? 'The connected terminal could not start payment.'
                )
            );
        }

        $status = strtolower(trim((string)($result['status'] ?? 'pending')));
        $paid = $status === 'paid' || !empty($result['payment_recorded']);

        return [
            'ok' => true,
            'paid' => $paid,
            'status' => $paid ? 'paid' : ($status ?: 'pending'),
            'attempt_id' => (int)($result['attempt_id'] ?? 0) ?: null,
            'provider_code' => $providerCode,
            'terminal_device_id' => $terminalDeviceId,
            'amount' => $remaining,
            'message' => (string)(
                $result['message']
                ?? ($paid
                    ? 'Payment approved.'
                    : 'Payment sent to the connected terminal.')
            ),
        ];
    }

    public function refreshTerminalPayment(
        Request $request,
        int $attemptId
    ): array {
        $device = $this->authenticate($request);
        $locationId = (int)$device->location_id;

        if ($attemptId < 1 || !Schema::hasTable('payment_attempts')) {
            abort(422, 'A valid terminal payment attempt is required.');
        }

        $attempt = DB::table('payment_attempts')
            ->where('id', $attemptId)
            ->first();

        if (!$attempt) {
            abort(404, 'Terminal payment attempt was not found.');
        }

        $orderId = (int)($attempt->order_id ?? 0);
        $order = $orderId > 0 && Schema::hasTable('orders')
            ? DB::table('orders')->where('order_id', $orderId)->first()
            : null;

        if (!$order) {
            abort(404, 'Payment order was not found.');
        }

        $orderLocationId = (int)($order->location_id ?? $locationId);
        if ($orderLocationId > 0 && $orderLocationId !== $locationId) {
            abort(403, 'This payment belongs to another restaurant location.');
        }

        $result = app(
            \App\Services\TerminalPayments\TerminalPaymentService::class
        )->refreshAttempt($attemptId);

        $status = strtolower(trim((string)($result['status'] ?? 'pending')));
        $paid = $status === 'paid' || !empty($result['payment_recorded']);
        $terminalFailure = in_array(
            $status,
            ['failed', 'cancelled', 'canceled', 'rejected', 'expired'],
            true
        );

        return [
            'ok' => (bool)($result['success'] ?? !$terminalFailure),
            'paid' => $paid,
            'failed' => $terminalFailure,
            'status' => $paid ? 'paid' : ($status ?: 'pending'),
            'attempt_id' => $attemptId,
            'order_id' => $orderId,
            'message' => (string)(
                $result['message']
                ?? $result['error']
                ?? ($paid ? 'Payment approved.' : 'Waiting for terminal.')
            ),
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
