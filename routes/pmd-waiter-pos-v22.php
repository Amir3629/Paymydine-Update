<?php

use App\Services\Financial\BillingGroupFiscalService;
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
    // PMD_R36_SIGN_DE_AFTER_COMMIT
    // Financial/table state commits first. SIGN DE is then called with the durable
    // Billing Group transaction id; a remote outage never rewinds captured money.
    Route::post('/admin/pmd-waiter-pos-v22/tables/{tableId}/free', function ($tableId) {
        try {
            $guard = app(BillingGroupFreeTableService::class);
            $result = DB::transaction(function () use ($tableId, $guard) {
                $groups = $guard->preflight((int)$tableId);
                $controller = app(\Admin\Controllers\PmdWaiterPosV1::class);
                $response = $controller->markTableFreeV45($tableId);

                if (method_exists($response, 'getStatusCode') && $response->getStatusCode() >= 400) {
                    return ['response' => $response, 'groups' => [], 'skip_fiscal' => true];
                }

                $guard->closeAfterFree($groups);
                return ['response' => $response, 'groups' => $groups, 'skip_fiscal' => false];
            });

            $response = $result['response'];
            if (empty($result['skip_fiscal']) && !empty($result['groups'])) {
                $fiscal = $guard->fiscalizeAfterCommit($result['groups']);
                if (method_exists($response, 'getData') && method_exists($response, 'setData')) {
                    $data = (array)$response->getData(true);
                    $data['r36_fiscalization'] = $fiscal;
                    $response->setData($data);
                }
            }

            return $response;
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'ok' => false,
                'message' => 'Table could not be set free. '.$e->getMessage(),
            ], 422);
        }
    })->where('tableId', '[0-9]+');

    // Staff-only retry for a closed Final Bill whose SIGN DE call was blocked or failed.
    Route::post('/admin/pmd-waiter-pos-v22/billing-groups/{publicId}/fiscalize', function ($publicId) {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Orders')) abort(403);

        try {
            return response()->json([
                'ok' => true,
                'fiscalization' => app(BillingGroupFiscalService::class)->finalizePublicId((string)$publicId),
            ]);
        } catch (\Throwable $e) {
            report($e);
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
    })->where('publicId', '[0-9a-fA-F-]{36}');
});
