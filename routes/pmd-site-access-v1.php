<?php

use Admin\Controllers\Siteaccess;
use Illuminate\Support\Facades\Route;

/** PMD_SITE_ACCESS_ROUTES_V1 */
if (!defined('PMD_SITE_ACCESS_ROUTES_V1')) {
    define('PMD_SITE_ACCESS_ROUTES_V1', true);

    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        Route::get('siteaccess', [Siteaccess::class, 'index'])->name('pmd.siteaccess');
        Route::post('siteaccess/verify', [Siteaccess::class, 'verify'])->middleware('throttle:12,1')->name('pmd.siteaccess.verify');
        Route::post('siteaccess/finalize', [Siteaccess::class, 'finalize'])->middleware('throttle:30,1')->name('pmd.siteaccess.finalize');
        Route::get('siteaccess/status', [Siteaccess::class, 'status'])->middleware('throttle:60,1')->name('pmd.siteaccess.status');
        Route::get('siteaccess/qr', [Siteaccess::class, 'qr'])->middleware('throttle:20,1')->name('pmd.siteaccess.qr');
        Route::post('siteaccess/recovery', [Siteaccess::class, 'recovery'])->middleware('throttle:8,15')->name('pmd.siteaccess.recovery');

        Route::get('siteaccess/hub', [Siteaccess::class, 'hub'])->name('pmd.siteaccess.hub');
        Route::post('siteaccess/hub/activate', [Siteaccess::class, 'activatehub'])->middleware('throttle:10,5')->name('pmd.siteaccess.hub.activate');
        Route::post('siteaccess/hub/heartbeat', [Siteaccess::class, 'heartbeat'])->middleware('throttle:120,1')->name('pmd.siteaccess.hub.heartbeat');
        Route::get('siteaccess/hub/data', [Siteaccess::class, 'hubdata'])->middleware('throttle:120,1')->name('pmd.siteaccess.hub.data');
        Route::post('siteaccess/hub/approve', [Siteaccess::class, 'approve'])->middleware('throttle:60,1')->name('pmd.siteaccess.hub.approve');
        Route::post('siteaccess/hub/decline', [Siteaccess::class, 'decline'])->middleware('throttle:60,1')->name('pmd.siteaccess.hub.decline');
        Route::post('siteaccess/recovery-codes', [Siteaccess::class, 'recoverycodes'])->middleware('throttle:4,15')->name('pmd.siteaccess.recoverycodes');
        Route::post('siteaccess/device/revoke', [Siteaccess::class, 'revokedevice'])->middleware('throttle:20,1')->name('pmd.siteaccess.device.revoke');
    });
}
