<?php

// PMD_TENANT_RUNTIME_GUARD_R2
// Loaded from the Admin route bootstrap. The guard is pushed into the web group
// and performs tenant work only after it can prove that TenantDatabaseMiddleware
// has selected the tenant connection. Its after-response hook also finalizes a
// newly-created Super Admin tenant after the legacy newtenantdb clone completes.
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
