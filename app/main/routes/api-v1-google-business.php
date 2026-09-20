<?php

use App\Http\Controllers\GoogleBusinessIntegrationController;
use Illuminate\Support\Facades\Route;

// PMD_GOOGLE_BUSINESS_ACTIVE_TENANT_ROUTES_V4
Route::get(
    '/integrations/google-business/callback',
    [GoogleBusinessIntegrationController::class, 'callback']
)->name('pmd.google-business.tenant-callback');

Route::post(
    '/integrations/google-business/pubsub',
    [GoogleBusinessIntegrationController::class, 'pubsub']
)
    ->withoutMiddleware([
        \Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken::class,
    ])
    ->name('pmd.google-business.tenant-pubsub');
