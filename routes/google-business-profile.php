<?php

use App\Http\Controllers\GoogleBusinessIntegrationController;
use Illuminate\Support\Facades\Route;

if (!defined('PMD_GOOGLE_BUSINESS_PROFILE_ROUTES_V2')) {
    define('PMD_GOOGLE_BUSINESS_PROFILE_ROUTES_V2', true);

    Route::get(
        '/integrations/google-business/callback',
        [GoogleBusinessIntegrationController::class, 'callback']
    )->name('pmd.google-business.callback');

    Route::post(
        '/integrations/google-business/pubsub',
        [GoogleBusinessIntegrationController::class, 'pubsub']
    )
        ->withoutMiddleware([
            \Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken::class,
        ])
        ->name('pmd.google-business.pubsub');
}
