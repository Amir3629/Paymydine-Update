<?php

use Admin\Controllers\SuperAdminR2Controller;
use Admin\Controllers\SuperAdminR2DashboardController;
use App\Http\Middleware\ApplySuperAdminTenantCountryProfile;
use App\Http\Middleware\SuperAdminAuth;
use App\Http\Middleware\SuperAdminCanonicalHost;
use Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

/*
 * PMD_TENANT_ACCESS_GATE_R2
 *
 * Internal Nginx auth_request endpoint. This deliberately lives OUTSIDE the
 * canonical Super Admin host middleware because tenant vhosts call it before
 * Laravel/Next is allowed to serve any tenant content.
 *
 * It is not a public API. Nginx supplies the internal header and the original
 * tenant hostname. Unknown, disabled, removed, not-yet-started and expired
 * tenants all fail closed with 403 so Nginx can redirect the browser to the
 * PayMyDine landing page.
 */
Route::get('/__pmd/tenant-access', function (Request $request) {
    if ((string)$request->header('X-PMD-Tenant-Access-Internal') !== '1') {
        abort(404);
    }

    $host = strtolower(trim((string)$request->header('X-PMD-Tenant-Host', '')));
    if (!preg_match('/^[a-z0-9-]+\.paymydine\.com$/', $host)) {
        return response('', 403)->header('X-PMD-Tenant-Gate', 'invalid-host');
    }

    $tenant = DB::connection('mysql')
        ->table('tenants')
        ->whereRaw('LOWER(domain) = ?', [$host])
        ->first();

    if (!$tenant) {
        return response('', 403)->header('X-PMD-Tenant-Gate', 'not-found');
    }

    if (strtolower(trim((string)($tenant->status ?? ''))) !== 'active') {
        return response('', 403)->header('X-PMD-Tenant-Gate', 'not-active');
    }

    try {
        $today = now()->startOfDay();
        if (!empty($tenant->start) && \Carbon\Carbon::parse($tenant->start)->startOfDay()->gt($today)) {
            return response('', 403)->header('X-PMD-Tenant-Gate', 'not-started');
        }
        if (!empty($tenant->end) && \Carbon\Carbon::parse($tenant->end)->endOfDay()->lt(now())) {
            return response('', 403)->header('X-PMD-Tenant-Gate', 'expired');
        }
    } catch (\Throwable $e) {
        return response('', 403)->header('X-PMD-Tenant-Gate', 'invalid-period');
    }

    return response('', 204)->header('X-PMD-Tenant-Gate', 'active');
})->withoutMiddleware([TenantDatabaseMiddleware::class])
  ->name('pmd.tenant.access.internal');

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

        Route::middleware(SuperAdminAuth::class)->group(function () {
            Route::get('/superadmin/index', [SuperAdminR2DashboardController::class, 'dashboard'])
                ->name('pmd.superadmin.dashboard');
            Route::get('/superadmin/new', [SuperAdminR2Controller::class, 'restaurants'])
                ->name('pmd.superadmin.restaurants');
            Route::post('/superadmin/new/store', [SuperAdminR2Controller::class, 'store'])
                ->middleware(ApplySuperAdminTenantCountryProfile::class)
                ->name('pmd.superadmin.store');
            Route::get('/superadmin/tenants/{id}/edit', [SuperAdminR2Controller::class, 'edit'])
                ->whereNumber('id')
                ->name('pmd.superadmin.tenants.edit');
            Route::post('/superadmin/tenants/update', [SuperAdminR2Controller::class, 'update'])
                ->middleware(ApplySuperAdminTenantCountryProfile::class)
                ->name('pmd.superadmin.tenants.update');
            Route::post('/superadmin/tenants/status', [SuperAdminR2Controller::class, 'status'])
                ->name('pmd.superadmin.tenants.status');
            Route::post('/superadmin/tenants/provision', [SuperAdminR2Controller::class, 'provision'])
                ->name('pmd.superadmin.tenants.provision');

            // Safe Remove is intentionally reversible. We do NOT DROP the
            // database and we keep TLS/vhost so old URLs can redirect cleanly.
            Route::post('/superadmin/tenants/remove', function (Request $request) {
                $request->validate(['id' => 'required|integer']);
                $tenant = DB::connection('mysql')->table('tenants')->where('id', (int)$request->input('id'))->first();

                if (!$tenant) {
                    return redirect('/superadmin/new')->withErrors(['tenant' => 'Restaurant not found.']);
                }
                if (strtolower((string)$tenant->status) === 'active') {
                    return redirect('/superadmin/new')->with('warning', 'Disable '.$tenant->name.' before removing it.');
                }

                DB::connection('mysql')->table('tenants')->where('id', $tenant->id)->update([
                    'status' => 'removed',
                    'updated_at' => now(),
                ]);

                return redirect('/superadmin/new')->with('success', $tenant->name.' was removed from service. Its database is retained for recovery.');
            })->name('pmd.superadmin.tenants.remove');

            Route::post('/superadmin/tenants/restore', function (Request $request) {
                $request->validate(['id' => 'required|integer']);
                $tenant = DB::connection('mysql')->table('tenants')->where('id', (int)$request->input('id'))->first();

                if (!$tenant) {
                    return redirect('/superadmin/new')->withErrors(['tenant' => 'Restaurant not found.']);
                }
                if (strtolower((string)$tenant->status) !== 'removed') {
                    return redirect('/superadmin/new')->with('warning', 'Only removed restaurants can be restored.');
                }

                DB::connection('mysql')->table('tenants')->where('id', $tenant->id)->update([
                    'status' => 'disabled',
                    'updated_at' => now(),
                ]);

                return redirect('/superadmin/new')->with('success', $tenant->name.' was restored as disabled. Verify health before activating it.');
            })->name('pmd.superadmin.tenants.restore');

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
