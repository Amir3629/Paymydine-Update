<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
    /**
     * The application's route middleware groups.
     * 
     * CRITICAL FIX: Override to enable CSRF protection.
     * TastyIgniter's Flame Kernel has CSRF commented out (vendor/tastyigniter/flame/src/Foundation/Http/Kernel.php:56)
     * This causes "random logout" issues when CSRF tokens expire/mismatch.
     *
     * @var array
     */
    protected $middlewareGroups = [
        'web' => [
            \Igniter\Flame\Foundation\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Igniter\Flame\Foundation\Http\Middleware\VerifyCsrfToken::class,  // FIX: Enable CSRF middleware
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            \Igniter\Flame\Translation\Middleware\Localization::class,
        ],

        'api' => [
            'throttle:api',
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
        ],
    ];

    /**
     * The application's route middleware.
     *
     * These middleware may be assigned to groups or used individually.
     *
     * @var array
     */
    protected $routeMiddleware = [
        'auth' => \App\Http\Middleware\Authenticate::class,
        'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
        'bindings' => \Illuminate\Routing\Middleware\SubstituteBindings::class,
        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
        'can' => \Illuminate\Auth\Middleware\Authorize::class,
        'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
        'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
        'signed' => \Illuminate\Routing\Middleware\ValidateSignature::class,
        'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
        'verified' => \Illuminate\Auth\Middleware\EnsureEmailIsVerified::class,
	'detect.tenant' => \App\Http\Middleware\DetectTenant::class,
	'tenant.database' => \App\Http\Middleware\TenantDatabaseMiddleware::class,
        'cors' => \App\Http\Middleware\CorsMiddleware::class,
    ];
} 
