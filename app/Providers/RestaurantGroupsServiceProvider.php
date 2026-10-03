<?php

namespace App\Providers;

use App\Services\RestaurantGroups\Auth;
use App\Services\RestaurantGroups\Store;
use App\Services\RestaurantGroups\SupportMfaReset;
use App\Services\RestaurantGroups\Totp;
use App\Services\RestaurantGroups\TrustedLogin;
use Illuminate\Support\ServiceProvider;

final class RestaurantGroupsServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->mergeConfigFrom(base_path('config/pmd_groups.php'), 'pmd_groups');
        if (!config('database.connections.pmd_groups_central')) {
            config(['database.connections.pmd_groups_central' => config('database.connections.mysql')]);
        }
        config(['pmd_groups.tenant_template' => config('database.connections.tenant', config('database.connections.mysql'))]);
        $this->app->singleton(Store::class);
        $this->app->singleton(Auth::class);
        $this->bindSecurityServices();
    }

    public function boot()
    {
        // Module registration can replace the canonical service bindings. Bind
        // again after registration, preserving the request-local singleton cache.
        $this->bindSecurityServices();
        $this->loadRoutesFrom(base_path('routes/pmd-groups.php'));
        $this->loadViewsFrom(resource_path('views/pmd-groups'), 'pmd-groups');
        if ($this->app->runningInConsole()) {
            $this->commands([\App\Console\Commands\RestaurantGroupsCommand::class]);
        }
    }

    private function bindSecurityServices(): void
    {
        $this->app->singleton(\App\Services\PmdOwnerTotpService::class, Totp::class);
        $this->app->singleton(\App\Services\PmdTrustedLoginDeviceService::class, TrustedLogin::class);
        $this->app->singleton(\App\Services\PmdSuperAdminOwnerMfaResetService::class, SupportMfaReset::class);
    }
}
