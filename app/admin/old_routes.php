<?php

use Admin\Controllers\QrRedirectController;
use Admin\Controllers\SuperAdminController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
App::before(function () {
    /*
     * Register Admin app routes
     *
     * The Admin app intercepts all URLs
     * prefixed with /admin.
     */
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        // Register Assets Combiner routes
        Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');

        // Other pages
        Route::any('{slug}', 'System\Classes\Controller@runAdmin')
            ->where('slug', '(.*)?');
    });

    // Admin entry point
    Route::any(config('system.adminUri', 'admin'), 'System\Classes\Controller@runAdmin');
    Route::get('/redirect/qr', [QrRedirectController::class, 'handleRedirect'])
    ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
 
    
    Route::get('/new', [SuperAdminController::class, 'showNewPage'])
        ->name('superadmin.new')
        ->middleware('superadmin.auth') // Protect this route
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    
        Route::get('/index', [SuperAdminController::class, 'showIndex'])
        ->name('superadmin.index')
        ->middleware('superadmin.auth') // Protect this route
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    
        Route::get('/settings', [SuperAdminController::class, 'settings'])
        ->name('superadmin.settings')
        ->middleware('superadmin.auth') // Protect this route
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    

        Route::match(['get', 'post'], '/new/store', [SuperAdminController::class, 'store'])
        ->name('superadmin.store')
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

        Route::match(['get', 'post'], '/tenants/update', [SuperAdminController::class, 'update'])
        ->name('tenants.update')
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    
        Route::get('/tenants/delete/{id}', [SuperAdminController::class, 'delete'])
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

        Route::get('/superadmin/login', [SuperAdminController::class, 'login'])
        ->name('login.new')
        ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    
        
Route::post('/superadmin/sign', [SuperAdminController::class, 'sign'])
->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

Route::get('/superadmin/signout', [SuperAdminController::class, 'signOut'])
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);

    Route::post('/superadmin/settings/update', [SuperAdminController::class, 'updateSettings'])->name('superadmin.update') 
    ->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
    Route::post('/tenant/update-status', function (Request $request) {
        $id = $request->input('id');
        $status = $request->input('status') === 'activate' ? 'active' : 'disabled';
    
        $updated = DB::connection('mysql')->table('tenants')->where('id', $id)->update(['status' => $status]);
    
        if ($updated) {
            return response()->json(['success' => true]);
        } else {
            return response()->json(['success' => false, 'error' => 'Failed to update']);
        }
    })->withoutMiddleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
});

// Frontend API Routes
Route::group([
    'prefix' => 'api/v1',
    'namespace' => 'Admin\Controllers\Api',
    'middleware' => ['api']
], function () {
	//Route::get('restaurant/{locationId}', 'RestaurantController@getRestaurantInfo');
	Route::get('restaurant/{locationId}', 'Admin\Controllers\Api\RestaurantController@getRestaurantInfo');

	//Route::get('restaurant/{locationId}/menu', 'RestaurantController@getMenu');
	Route::get('restaurant/{locationId}/menu', 'Admin\Controllers\Api\RestaurantController@getMenu');
    
    // Order endpoints
    Route::post('restaurant/{locationId}/order', 'OrderController@createOrder');
    Route::get('restaurant/{locationId}/order/{orderId}', 'OrderController@getOrderStatus');
    Route::post('restaurant/{locationId}/waiter', 'OrderController@requestWaiter');
});
