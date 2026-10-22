<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdTableDisplayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_TABLE_DISPLAY_V1
 *
 * Operational POS transport that asks the physical table display to start
 * card/contactless payment. It deliberately does not mark an order paid; settlement remains
 * owned by the configured provider / canonical PayMyDine payment services.
 */
final class PmdTableDisplayPaymentController
{
    public function __invoke(Request $request, $order): JsonResponse
    {
        $user = $this->authorizedOperator();

        $orderId = (int)$order;
        if ($orderId < 1) {
            abort(422, 'Choose an order before requesting card payment.');
        }

        $locationId = null;
        try {
            $resolved = (int)AdminLocation::getId();
            if ($resolved > 0) $locationId = $resolved;
        } catch (\Throwable $ignored) {
        }

        $result = app(PmdTableDisplayService::class)->requestCardPayment(
            $orderId,
            (int)$user->getKey(),
            (int)($user->staff_id ?? 0) ?: null,
            $locationId
        );

        return response()->json($result);
    }

    /**
     * PMD_QPOS_TABLE_DEVICE_READINESS_V140
     * Read-only authoritative capability. Never initiates a bank transaction.
     * A table screen alone is NOT a card terminal: require live pairing with an
     * active bank-provider terminal belonging to this restaurant.
     */
    public function availability(Request $request, $order): JsonResponse
    {
        $this->authorizedOperator();
        $unavailable = static fn () => response()->json([
            'ok' => true,
            'available' => false,
        ]);

        $orderId = (int)$order;
        if ($orderId < 1 || !Schema::hasTable('orders')
            || !Schema::hasTable('terminal_devices')
            || !Schema::hasTable('pmd_site_access_devices')) {
            return $unavailable();
        }

        try {
            $locationId = (int)AdminLocation::getId();
        } catch (\Throwable $ignored) {
            return $unavailable();
        }
        if ($locationId < 1) return $unavailable();

        $check = DB::table('orders')
            ->where('order_id', $orderId)
            ->where('location_id', $locationId)->first();
        if (!$check) return $unavailable();
        $tableId = (int)($check->table_id ?? 0);
        if ($tableId < 1) return $unavailable();
        $total = (float)($check->order_total ?? 0);
        $settled = (float)($check->settled_amount ?? 0);
        if ($total <= 0.0001 || $settled > 0.0001) return $unavailable();

        try {
            $devices = DB::table('pmd_site_access_devices')
                ->where('location_id', $locationId)
                ->where('device_kind', 'table_display')
                ->whereNull('revoked_at')
                ->where('last_seen_at', '>=', now()->subSeconds(90))
                ->get();

            $allowed = array_keys(
                \Admin\Models\Terminal_devices_model::listProviderOptions()
            );
            $allowed = array_intersect(
                $allowed, ['sumup', 'worldline', 'square', 'vr_payment']
            );
            if (!$allowed) return $unavailable();

            foreach ($devices as $device) {
                $platform = json_decode((string)($device->platform_info ?? '{}'), true);
                if (!is_array($platform)
                    || (int)($platform['table_id'] ?? 0) !== $tableId) continue;

                $terminalId = (int)($platform['payment_terminal_device_id'] ?? 0);
                if ($terminalId < 1) continue;

                $terminal = DB::table('terminal_devices')
                    ->where('terminal_device_id', $terminalId)
                    ->where('is_active', 1)
                    ->whereIn('provider_code', $allowed)
                    ->where(function ($query) use ($locationId) {
                        $query->whereNull('location_id')
                            ->orWhere('location_id', $locationId);
                    })
                    ->first();
                if (!$terminal) continue;
                $reader = strtoupper(trim((string)($terminal->reader_id ?? '')));
                if ($reader === '' || str_starts_with($reader, 'PMD-VR-SIM-')) continue;

                $status = strtolower(trim((string)($terminal->terminal_status ?? '')));
                if (!in_array($status, ['online', 'connected', 'ready'], true)) continue;
                $pairing = strtolower(trim((string)($terminal->pairing_state ?? '')));
                if (in_array($pairing, ['unpaired', 'needs_attention'], true)) continue;

                return response()->json([
                    'ok' => true,
                    'available' => true,
                    'terminal_device_id' => $terminalId,
                ])->header('Cache-Control', 'no-store');
            }
        } catch (\Throwable $error) {
            report($error);
        }

        return $unavailable()->header('Cache-Control', 'no-store');
    }

    public function refresh(Request $request, $attempt): JsonResponse
    {
        $user = $this->authorizedOperator();

        $attemptId = (int)$attempt;
        if ($attemptId < 1) {
            abort(422, 'Payment attempt is invalid.');
        }
        if (
            !Schema::hasTable('payment_attempts')
            || !Schema::hasTable('orders')
        ) {
            abort(503, 'Payment attempt storage is unavailable.');
        }

        $attemptRow = DB::table('payment_attempts')
            ->where('id', $attemptId)
            ->first();
        if (!$attemptRow) {
            abort(404, 'Payment attempt was not found.');
        }

        $orderId = (int)($attemptRow->order_id ?? 0);
        $order = $orderId > 0
            ? DB::table('orders')->where('order_id', $orderId)->first()
            : null;
        if (!$order) {
            abort(404, 'Payment order was not found.');
        }

        try {
            $locationId = (int)AdminLocation::getId();
        } catch (\Throwable $ignored) {
            $locationId = 0;
        }

        if (
            $locationId > 0
            && isset($order->location_id)
            && (int)$order->location_id > 0
            && (int)$order->location_id !== $locationId
        ) {
            abort(403, 'This payment belongs to another restaurant location.');
        }

        $result = app(
            \App\Services\TerminalPayments\TerminalPaymentService::class
        )->refreshAttempt($attemptId);

        return response()->json([
            'ok' => (bool)($result['success'] ?? false),
            'attempt_id' => $attemptId,
            'order_id' => $orderId,
            'status' => strtolower(
                trim((string)($result['status'] ?? 'pending'))
            ),
            'message' => (string)(
                $result['message']
                ?? $result['error']
                ?? 'Payment terminal status updated.'
            ),
            'payment_recorded' => (bool)($result['payment_recorded'] ?? false),
            'simulated' => (bool)($result['simulated'] ?? false),
            'fake_success_disabled' => true,
        ]);
    }

    private function authorizedOperator()
    {
        try {
            $loggedIn = AdminAuth::isLogged();
            $user = $loggedIn ? AdminAuth::getUser() : null;
        } catch (\Throwable $ignored) {
            $loggedIn = false;
            $user = null;
        }

        if (!$loggedIn || !$user) {
            abort(401, 'Sign in to PayMyDine before requesting payment.');
        }

        $role = strtolower(trim((string)app(PmdDefaultStaffRoleService::class)
            ->roleCodeForUser($user)));

        if (!in_array($role, [
            PmdDefaultStaffRoleService::OWNER,
            PmdDefaultStaffRoleService::MANAGER,
            PmdDefaultStaffRoleService::CASHIER,
            PmdDefaultStaffRoleService::WAITER,
            'owner',
            'manager',
            'cashier',
            'waiter',
        ], true)) {
            abort(
                403,
                'This PayMyDine role cannot use table-device card payment.'
            );
        }

        return $user;
    }
}
