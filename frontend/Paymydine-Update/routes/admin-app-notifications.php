<?php

use Admin\Controllers\QrRedirectController;
use Admin\Controllers\SuperAdminController;
use Admin\Controllers\StaffAuthController;
use Admin\Controllers\Biometricdevices;
use Admin\Controllers\BiometricDevicesAPI;
use Admin\Controllers\Api\CashDrawerController;
use Admin\Controllers\Api\PosAgentController;
use App\Admin\Controllers\NotificationsApiController;
use App\Admin\Classes\TerminalDevicesPlatformController;
use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;
require_once base_path('app/system/helpers/r2o_outbound_dryrun_helper.php');
use Illuminate\Support\Facades\DB;


// Back-compat for admin bell widget (no api/v1 prefix)
Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/', [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
    Route::post('general-staff-note', [\Admin\Controllers\NotificationsApi::class, 'createGeneralStaffNote']);
    Route::get('note-suggestions', [\Admin\Controllers\NotificationsApi::class, 'getNoteSuggestions']);
});

Route::middleware(['web'])->prefix('admin/webhook/pos')->group(function () {
    Route::post('webhook/pos', [\Admin\Controllers\PosWebhookController::class, 'handle'])
        ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
});
