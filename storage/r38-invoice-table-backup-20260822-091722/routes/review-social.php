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


/*
|--------------------------------------------------------------------------
| PMD_REVIEW_SOCIAL_SAFE_SAVE_ROUTE_20260606
|--------------------------------------------------------------------------
| Direct save route for the safe Review & Social Links settings page.
|--------------------------------------------------------------------------
*/
\Illuminate\Support\Facades\Route::post('pmd-review-social-safe-save', function (\Illuminate\Http\Request $request) {
    $keys = [
        'pmd_review_share_prompt_enabled',
        'pmd_home_social_icons_enabled',

        'pmd_social_instagram_enabled',
        'pmd_social_instagram_url',

        'pmd_social_google_enabled',
        'pmd_social_google_url',

        'pmd_social_trustpilot_enabled',
        'pmd_social_trustpilot_url',

        'pmd_social_reviews_enabled',
        'pmd_social_reviews_url',

        'pmd_social_website_enabled',
        'pmd_social_website_url',
    ];

    if (!\Illuminate\Support\Facades\Schema::hasTable('settings')) {
        return redirect(admin_url('settings/edit/review_social'))
            ->with('error', 'settings table not found');
    }

    $cols = \Illuminate\Support\Facades\Schema::getColumnListing('settings');
    $keyCol = in_array('item', $cols, true) ? 'item' : (in_array('key', $cols, true) ? 'key' : null);
    $valueCol = in_array('value', $cols, true) ? 'value' : (in_array('data', $cols, true) ? 'data' : null);

    if (!$keyCol || !$valueCol) {
        return redirect(admin_url('settings/edit/review_social'))
            ->with('error', 'settings table columns not recognized');
    }

    foreach ($keys as $key) {
        $value = (string)$request->input($key, '');

        $payload = [$valueCol => $value];

        if (in_array('serialized', $cols, true)) {
            $payload['serialized'] = 0;
        }

        if (in_array('updated_at', $cols, true)) {
            $payload['updated_at'] = now();
        }

        $insert = $payload;
        if (in_array('created_at', $cols, true)) {
            $insert['created_at'] = now();
        }

        \Illuminate\Support\Facades\DB::table('settings')->updateOrInsert(
            [$keyCol => $key],
            $insert
        );
    }

    return redirect(admin_url('settings/edit/review_social'))
        ->with('success', 'Review & Social Links settings saved.');
});

