<?php

use App\Http\Controllers\PmdStaffPortalController;
use App\Http\Controllers\PmdStaffPortalV5Controller;
use Illuminate\Support\Facades\Route;

// PMD_SITE_ACCESS_ROUTE_LOADER_V1
// app/admin/routes.php already requires this compact auth module before the
// legacy Admin catch-all. Keep Site Access in its own route file/authority while
// reusing that known-good early loader rather than adding another catch-all hack.
require_once base_path('routes/pmd-site-access-v1.php');

/**
 * PMD_STAFF_PORTAL_V5_ROUTES
 *
 * Public /staff remains only as backward compatibility. Canonical Staff Portal
 * navigation is /admin/mywork. The explicit avatar route avoids relying on the
 * dynamic Admin controller/action resolver for binary image requests.
 */
if (!defined('PMD_STAFF_PORTAL_ROUTES_V3')) {
    define('PMD_STAFF_PORTAL_ROUTES_V3', true);

    Route::group(['middleware' => ['web']], function () {
        $adminUri = '/'.trim((string)config('system.adminUri', 'admin'), '/');

        // PMD_STAFF_AVATAR_BINARY_RESPONSE_V2
        Route::get($adminUri.'/mywork/avatar/{person}', function ($person) {
            request()->query->set('person', max(1, (int)$person));
            $response = app(PmdStaffPortalController::class)->avatar(request());
            $response->setPrivate();
            $response->setMaxAge(86400);
            return $response;
        })->where('person', '[1-9][0-9]*')->name('pmd.staff.avatar.v5');

        Route::get('/staff/login', [PmdStaffPortalController::class, 'login'])->name('pmd.staff.login');
        Route::post('/staff/login', [PmdStaffPortalController::class, 'authenticate'])->middleware('throttle:8,15')->name('pmd.staff.authenticate');
        Route::get('/staff', [PmdStaffPortalController::class, 'index'])->name('pmd.staff.home');
        Route::post('/staff/request', [PmdStaffPortalController::class, 'saveRequest'])->middleware('throttle:30,1')->name('pmd.staff.request');
        Route::post('/staff/request/handle', [PmdStaffPortalController::class, 'handleRequest'])->middleware('throttle:60,1')->name('pmd.staff.request.handle');
        Route::post('/staff/groups', [PmdStaffPortalController::class, 'createGroup'])->middleware('throttle:20,1')->name('pmd.staff.groups.create');
        Route::post('/staff/chat/message', [PmdStaffPortalController::class, 'sendChatMessage'])->middleware('throttle:120,1')->name('pmd.staff.chat.message');
        Route::post('/staff/logout', [PmdStaffPortalController::class, 'logout'])->name('pmd.staff.logout');
    });
}
