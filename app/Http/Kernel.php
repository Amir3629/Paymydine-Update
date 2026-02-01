<?php

namespace App\Http;

use Igniter\Flame\Foundation\Http\Kernel as FlameKernel;

class Kernel extends FlameKernel
{
    /**
     * The application's route middleware groups.
     * Same as Flame but use App tenant middleware so localhost uses default tenant.
     */
    protected $middlewareGroups = [
        'web' => [
            \Igniter\Flame\Foundation\Http\Middleware\EncryptCookies::class,
            \Illuminate\Cookie\Middleware\AddQueuedCookiesToResponse::class,
            \Illuminate\Session\Middleware\StartSession::class,
            \Illuminate\View\Middleware\ShareErrorsFromSession::class,
            \Illuminate\Routing\Middleware\SubstituteBindings::class,
            \Igniter\Flame\Translation\Middleware\Localization::class,
            \App\Http\Middleware\TenantDatabaseMiddleware::class, // localhost → first tenant
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
        'superadmin.auth' => \Igniter\Flame\Foundation\Http\Middleware\SuperAdminAuthMiddleware::class,
    ];
} 
