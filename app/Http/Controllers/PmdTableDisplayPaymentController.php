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
