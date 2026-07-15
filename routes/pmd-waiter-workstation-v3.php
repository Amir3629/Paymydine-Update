<?php

use Illuminate\Support\Facades\Route;

Route::middleware(['web'])->group(function () {
    Route::get('/admin/dashboardwaiterworkstation', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'workstation'])
        ->name('pmd.waiter-workstation-v3');
    Route::get('/admin/waiter-workstation', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'workstation'])
        ->name('pmd.waiter-workstation-v3-short');

    Route::get('/admin/pmd-waiter-workstation-v3/data/{tableId}', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'data'])
        ->where('tableId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/save/{tableId}', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'save'])
        ->where('tableId', '[0-9]+');

    Route::get('/admin/pmd-waiter-workstation-v3/payment-summary/{orderId}', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'paymentSummary'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/payment-coupon/{orderId}', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'validatePaymentCoupon'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/payment-settle/{orderId}', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'settlePayment'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/terminal-payment/{orderId}', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'terminalPayment'])
        ->where('orderId', '[0-9]+');

    Route::get('/admin/pmd-waiter-workstation-v3/operations/{orderId}', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'operationsSummaryV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/operations/{orderId}/transfer', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'transferOrderV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/operations/{orderId}/merge', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'mergeOrdersV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/operations/{orderId}/move-items', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'moveItemsV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/operations/{orderId}/item-service', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'itemServiceV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/operations/{orderId}/void-item', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'voidItemV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/operations/{orderId}/void-order', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'voidOrderV22'])
        ->where('orderId', '[0-9]+');
    Route::post('/admin/pmd-waiter-workstation-v3/operations/{orderId}/reopen', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'reopenOrderV22'])
        ->where('orderId', '[0-9]+');
    Route::get('/admin/pmd-waiter-workstation-v3/operations/{orderId}/print-links', [\Admin\Controllers\PmdWaiterWorkstationV3::class, 'printLinksV22'])
        ->where('orderId', '[0-9]+');
});
