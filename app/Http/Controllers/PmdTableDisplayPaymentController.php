<?php

namespace App\Http\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Services\PmdDefaultStaffRoleService;
use App\Services\PmdTableDisplayService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * PMD_TABLE_DISPLAY_V1
 *
 * Waiter-only transport that asks the physical table display to start card
 * payment. It deliberately does not mark an order paid; settlement remains
 * owned by the configured provider / canonical PayMyDine payment services.
 */
final class PmdTableDisplayPaymentController
{
    public function __invoke(Request $request, $order): JsonResponse
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

        if (!in_array($role, [PmdDefaultStaffRoleService::WAITER, 'waiter'], true)) {
            abort(403, 'Card payment on the table display is available to waiter access only.');
        }

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
}
