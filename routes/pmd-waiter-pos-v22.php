<?php

use App\Services\Financial\BillingGroupFreeTableService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// PMD Waiter Standard POS V2.2 — operational actions for the isolated waiter page.
Route::middleware(['web'])->group(function () {
    Route::get('/admin/pmd-waiter-pos-v22/operations/{orderId}', [\Admin\Controllers\PmdWaiterPosV1::class, 'operationsSummaryV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-pos-v22/operations/{orderId}/transfer', [\Admin\Controllers\PmdWaiterPosV1::class, 'transferOrderV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-pos-v22/operations/{orderId}/merge', [\Admin\Controllers\PmdWaiterPosV1::class, 'mergeOrdersV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-pos-v22/operations/{orderId}/move-items', [\Admin\Controllers\PmdWaiterPosV1::class, 'moveItemsV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-pos-v22/operations/{orderId}/item-service', [\Admin\Controllers\PmdWaiterPosV1::class, 'itemServiceV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-pos-v22/operations/{orderId}/void-item', [\Admin\Controllers\PmdWaiterPosV1::class, 'voidItemV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-pos-v22/operations/{orderId}/void-order', [\Admin\Controllers\PmdWaiterPosV1::class, 'voidOrderV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-pos-v22/operations/{orderId}/reopen', [\Admin\Controllers\PmdWaiterPosV1::class, 'reopenOrderV22'])
        ->where('orderId', '[0-9]+');
    Route::get('/admin/pmd-waiter-pos-v22/operations/{orderId}/print-links', [\Admin\Controllers\PmdWaiterPosV1::class, 'printLinksV22'])
        ->where('orderId', '[0-9]+');

    // PMD_CASHIER_MANUAL_TABLE_FREE_ROUTE_R45
    // PMD_R36_FREE_TABLE_OUTER_TRANSACTION
    // Keep the proven R45 implementation as the physical-table authority, but
    // surround it with the Billing Group guard so visit close, invoice finalization,
    // QR cleanup and table release either all commit or all roll back together.
    Route::post('/admin/pmd-waiter-pos-v22/tables/{tableId}/free', function ($tableId) {
        try {
            return DB::transaction(function () use ($tableId) {
                $guard = app(BillingGroupFreeTableService::class);
                $groups = $guard->preflight((int)$tableId);
                $controller = app(\Admin\Controllers\PmdWaiterPosV1::class);
                $response = $controller->markTableFreeV45($tableId);

                if (method_exists($response, 'getStatusCode') && $response->getStatusCode() >= 400) {
                    return $response;
                }

                $guard->closeAfterFree($groups);
                return $response;
            });
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'ok' => false,
                'message' => 'Table could not be set free. '.$e->getMessage(),
            ], 422);
        }
    })->where('tableId', '[0-9]+');
});
