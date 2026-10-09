<?php

use App\Http\Controllers\RestaurantGroups\AdminController;
use App\Http\Controllers\RestaurantGroups\DisplayController;
use App\Http\Controllers\RestaurantGroups\SuperAdminController;
use App\Http\Middleware\SuperAdminAuth;
use App\Http\Middleware\SuperAdminCanonicalHost;
use Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', SuperAdminCanonicalHost::class])
    ->withoutMiddleware([TenantDatabaseMiddleware::class])
    ->group(function () {
        // Restaurant Groups owns these three routes so they are available in
        // both the normal Admin HTTP bootstrap and the CLI health bootstrap.
        // The middleware is identical to the existing Super Admin R2 authority.
        Route::middleware(SuperAdminAuth::class)->group(function () {
            Route::get('/superadmin/groups', [
                'as' => 'pmd.superadmin.groups',
                'uses' => SuperAdminController::class.'@index',
            ]);
            Route::post('/superadmin/groups/store', [
                'as' => 'pmd.superadmin.groups.store',
                'uses' => SuperAdminController::class.'@store',
            ]);
            Route::post('/superadmin/groups/retry', [
                'as' => 'pmd.superadmin.groups.retry',
                'uses' => SuperAdminController::class.'@retry',
            ]);
        });

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
        Route::get('/group/context', [
            'as' => 'pmd.group.context',
            'uses' => AdminController::class.'@context',
        ]);
        Route::get('/group/snapshot', [
            'as' => 'pmd.group.snapshot',
            'uses' => AdminController::class.'@snapshot',
        ]);
        Route::get('/group/dashboard', [
            'as' => 'pmd.group.dashboard',
            'uses' => AdminController::class.'@dashboardScope',
        ]);
        Route::get('/group/menu', [
            'as' => 'pmd.group.menu',
            'uses' => AdminController::class.'@menuScope',
        ]);
        Route::get('/group/catalog', [
            'as' => 'pmd.group.catalog',
            'uses' => AdminController::class.'@catalog',
        ]);
        Route::post('/group/publish/preview', [
            'as' => 'pmd.group.publish.preview',
            'uses' => AdminController::class.'@preview',
        ]);
        Route::post('/group/publish/apply', [
            'as' => 'pmd.group.publish.apply',
            'uses' => AdminController::class.'@apply',
        ]);
        Route::post('/group/password', [AdminController::class, 'changePassword'])
            ->name('pmd.group.password');
        Route::post('/group/foodcourt/display', [AdminController::class, 'createDisplay'])
            ->name('pmd.group.foodcourt.display');
        Route::get('/group/operations', [AdminController::class, 'operations'])
            ->name('pmd.group.operations');
    });
