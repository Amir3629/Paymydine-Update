<?php

use Admin\Facades\AdminAuth;
use App\Http\Middleware\DetectTenant;
use App\Services\PmdKitchenEtaLifecycleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/**
 * PMD Kitchen Operations R1 read endpoint.
 *
 * Admin/KDS/Cashier use their authenticated admin session. Guest self-orders
 * must prove the existing guest_session ownership marker before any ETA state
 * is returned. Tenant selection remains owned by DetectTenant.
 */
Route::get('api/v1/pmd-kitchen/eta', function (Request $request) {
    $ids = collect(explode(',', (string)$request->query('order_ids', $request->query('order_id', ''))))
        ->map(fn ($value) => (int)trim((string)$value))
        ->filter(fn ($value) => $value > 0)
        ->unique()->take(50)->values();

    if ($ids->isEmpty()) {
        return response()->json(['success' => true, 'orders' => []]);
    }

    $adminUser = null;
    try { $adminUser = AdminAuth::getUser(); } catch (\Throwable $ignored) {}
    $allowedIds = $ids;

    if (!$adminUser) {
        $guestSessionId = trim((string)$request->query('guest_session_id', ''));
        if ($guestSessionId === '') abort(403);
        $needle = '[submitted_by:'.$guestSessionId.']';
        $allowedIds = DB::table('orders')
            ->whereIn('order_id', $ids->all())
            ->where('comment', 'like', '%[pmd_origin:guest_self]%')
            ->where('comment', 'like', '%'.$needle.'%')
            ->pluck('order_id')->map('intval')->values();
    }

    $service = app(PmdKitchenEtaLifecycleService::class);
    $states = [];
    foreach ($allowedIds as $orderId) {
        try {
            $state = $service->stateForOrder((int)$orderId, true);
            if (!empty($state['available'])) $states[(string)$orderId] = $state;
        } catch (\Throwable $error) {
            \Log::warning('PMD_KITCHEN_ETA_READ_FAILED', [
                'order_id' => (int)$orderId,
                'message' => $error->getMessage(),
            ]);
        }
    }

    return response()->json([
        'success' => true,
        'orders' => $states,
        'server_time' => now()->toIso8601String(),
    ])->header('Cache-Control', 'no-store, max-age=0');
})->middleware(['web', DetectTenant::class]);
