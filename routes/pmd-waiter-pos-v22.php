<?php

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
});
