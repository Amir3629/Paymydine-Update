<?php

use App\Http\Controllers\PmdShiftAttendanceLiveController;
use App\Http\Controllers\PmdStaffPortalController;
use Illuminate\Support\Facades\Route;

// PMD_SITE_ACCESS_ROUTE_LOADER_V1
require_once base_path('routes/pmd-site-access-v1.php');

/**
 * PMD_STAFF_PORTAL_V7_ROUTES
 *
 * Canonical Staff Portal authority is /admin/login?destination=staff ->
 * /admin/mywork. Public /staff is navigation compatibility only; it must never
 * remain a second authentication/write authority once Site Access can require
 * personal-device pairing.
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

        // PMD_SHIFT_ATTENDANCE_LIVE_ROUTE_V1
        // Read-only actual-presence overlay for the Owner/Manager Shifts board.
        Route::get($adminUri.'/_pmd/shifts/attendance-v1', PmdShiftAttendanceLiveController::class)
            ->middleware('throttle:60,1')
            ->name('pmd.shifts.attendance.live.v1');

        // PMD_PUBLIC_STAFF_AUTH_RETIRED_V1
        Route::get('/staff/login', function () use ($adminUri) {
            return redirect($adminUri.'/login?destination=staff');
        })->name('pmd.staff.login');

        Route::get('/staff', function () use ($adminUri) {
            return redirect($adminUri.'/mywork');
        })->name('pmd.staff.home');

        $retiredWrite = static function () {
            return response()->json([
                'ok' => false,
                'message' => 'This legacy Staff Portal endpoint is retired. Use /admin/login?destination=staff and /admin/mywork.',
            ], 410);
        };

        Route::post('/staff/login', $retiredWrite)->middleware('throttle:8,15')->name('pmd.staff.authenticate');
        Route::post('/staff/request', $retiredWrite)->name('pmd.staff.request');
        Route::post('/staff/request/handle', $retiredWrite)->name('pmd.staff.request.handle');
        Route::post('/staff/groups', $retiredWrite)->name('pmd.staff.groups.create');
        Route::post('/staff/chat/message', $retiredWrite)->name('pmd.staff.chat.message');
        Route::post('/staff/logout', $retiredWrite)->name('pmd.staff.logout');
    });
}
