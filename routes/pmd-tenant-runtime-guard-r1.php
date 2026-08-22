<?php

// PMD_TENANT_RUNTIME_GUARD_R1
// Loaded from the Admin route bootstrap. Append the guard to the web group so
// tenant/session middleware has already established the current request context
// before Finance/KDS checks run, while still allowing response-time Cashier
// favicon normalization.
if (!defined('PMD_TENANT_RUNTIME_GUARD_R1_REGISTERED')) {
    define('PMD_TENANT_RUNTIME_GUARD_R1_REGISTERED', true);

    try {
        app('router')->pushMiddlewareToGroup(
            'web',
            \App\Http\Middleware\PmdTenantRuntimeGuardR1::class
        );
    } catch (\Throwable $error) {
        logger()->error('PMD tenant runtime guard registration failed', [
            'message' => $error->getMessage(),
        ]);
    }
}
