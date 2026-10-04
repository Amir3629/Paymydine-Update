<?php

use App\Http\Controllers\RestaurantGroups\AdminController;
use App\Http\Controllers\RestaurantGroups\DisplayController;
use App\Http\Middleware\SuperAdminCanonicalHost;
use Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', SuperAdminCanonicalHost::class])
    ->withoutMiddleware([TenantDatabaseMiddleware::class])
    ->group(function () {
        Route::get('/pmd-foodcourt/{token}', [DisplayController::class, 'page'])
            ->where('token', '[a-f0-9]{64}')
            ->name('pmd.foodcourt.display');

        Route::get('/pmd-foodcourt/{token}/feed', [DisplayController::class, 'feed'])
            ->where('token', '[a-f0-9]{64}')
            ->middleware('throttle:120,1')
            ->name('pmd.foodcourt.feed');
    });

Route::middleware(['web', 'tenant.database'])
    ->prefix(trim((string)config('system.adminUri', 'admin'), '/'))
    ->group(function () {
        Route::get('/group/context', [AdminController::class, 'context'])
            ->name('pmd.group.context');
        Route::get('/group/snapshot', [AdminController::class, 'snapshot'])
            ->name('pmd.group.snapshot');
        Route::get('/group/catalog', [AdminController::class, 'catalog'])
            ->name('pmd.group.catalog');
        Route::post('/group/publish/preview', [AdminController::class, 'preview'])
            ->name('pmd.group.publish.preview');
        Route::post('/group/publish/apply', [AdminController::class, 'apply'])
            ->name('pmd.group.publish.apply');
        Route::post('/group/password', [AdminController::class, 'changePassword'])
            ->name('pmd.group.password');
        Route::post('/group/foodcourt/display', [AdminController::class, 'createDisplay'])
            ->name('pmd.group.foodcourt.display');
        Route::get('/group/operations', [AdminController::class, 'operations'])
            ->name('pmd.group.operations');
    });
