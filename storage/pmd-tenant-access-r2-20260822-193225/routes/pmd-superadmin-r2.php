<?php

use Admin\Controllers\SuperAdminR2Controller;
use App\Http\Middleware\SuperAdminCanonicalHost;
use Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware;
use Illuminate\Support\Facades\Route;

/*
 * PMD_SUPERADMIN_R2_ROUTE_AUTHORITY
 *
 * One canonical route owner for the central PayMyDine control plane.
 * These routes must never select a tenant database and must only execute on
 * https://paymydine.com. Tenant hosts are redirected by Nginx and this
 * middleware is the application-level fallback.
 */
Route::middleware(['web', SuperAdminCanonicalHost::class])
    ->withoutMiddleware([TenantDatabaseMiddleware::class])
    ->group(function () {
        Route::get('/superadmin', function () {
            return redirect('/superadmin/login');
        })->name('pmd.superadmin.root');

        Route::get('/superadmin/login', [SuperAdminR2Controller::class, 'login'])
            ->name('pmd.superadmin.login');
        Route::post('/superadmin/sign', [SuperAdminR2Controller::class, 'sign'])
            ->name('pmd.superadmin.sign');

        Route::middleware('superadmin.auth')->group(function () {
            Route::get('/superadmin/index', [SuperAdminR2Controller::class, 'dashboard'])
                ->name('pmd.superadmin.dashboard');
            Route::get('/superadmin/new', [SuperAdminR2Controller::class, 'restaurants'])
                ->name('pmd.superadmin.restaurants');
            Route::post('/superadmin/new/store', [SuperAdminR2Controller::class, 'store'])
                ->name('pmd.superadmin.store');
            Route::get('/superadmin/tenants/{id}/edit', [SuperAdminR2Controller::class, 'edit'])
                ->whereNumber('id')
                ->name('pmd.superadmin.tenants.edit');
            Route::post('/superadmin/tenants/update', [SuperAdminR2Controller::class, 'update'])
                ->name('pmd.superadmin.tenants.update');
            Route::post('/superadmin/tenants/status', [SuperAdminR2Controller::class, 'status'])
                ->name('pmd.superadmin.tenants.status');
            Route::post('/superadmin/tenants/provision', [SuperAdminR2Controller::class, 'provision'])
                ->name('pmd.superadmin.tenants.provision');
            Route::get('/superadmin/health', [SuperAdminR2Controller::class, 'health'])
                ->name('pmd.superadmin.health');
            Route::get('/superadmin/settings', [SuperAdminR2Controller::class, 'settings'])
                ->name('pmd.superadmin.settings');

            // Deliberately avoid the legacy /superadmin/settings/update URI.
            // admin-app-before.php historically owns that path and can revive
            // SuperAdminController / the old UI on some route-order combinations.
            Route::post('/superadmin/settings/save', [SuperAdminR2Controller::class, 'updateSettings'])
                ->name('pmd.superadmin.settings.save');

            Route::get('/superadmin/location-requests', [SuperAdminR2Controller::class, 'locationRequests'])
                ->name('pmd.superadmin.location.requests');
            Route::get('/superadmin/signout', [SuperAdminR2Controller::class, 'signOut'])
                ->name('pmd.superadmin.signout');
        });
    });
