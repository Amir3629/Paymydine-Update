<?php

namespace App\Providers;

use App\Services\RestaurantGroups\Auth;
use App\Services\RestaurantGroups\Store;
use App\Services\RestaurantGroups\SupportMfaReset;
use App\Services\RestaurantGroups\Totp;
use Illuminate\Support\ServiceProvider;

final class RestaurantGroupsServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->mergeConfigFrom(base_path('config/pmd_groups.php'), 'pmd_groups');

        // Snapshot the landlord connection before tenant middleware can repoint
        // runtime connection state. Group control-plane reads always use this.
        if (!config('database.connections.pmd_groups_central')) {
            config([
                'database.connections.pmd_groups_central'
                    => config('database.connections.mysql'),
            ]);
        }

        config([
            'pmd_groups.tenant_template'
                => config('database.connections.tenant', config('database.connections.mysql')),
        ]);

        $this->app->singleton(Store::class);
        $this->app->singleton(Auth::class);

        // Existing Login.php and support flows continue calling the canonical
        // service classes; the group-aware wrappers fall back for legacy owners.
        $this->app->bind(\App\Services\PmdOwnerTotpService::class, Totp::class);
        $this->app->bind(
            \App\Services\PmdSuperAdminOwnerMfaResetService::class,
            SupportMfaReset::class
        );
    }

    public function boot()
    {
        $this->loadRoutesFrom(base_path('routes/pmd-groups.php'));
        $this->loadViewsFrom(resource_path('views/pmd-groups'), 'pmd-groups');

        if ($this->app->runningInConsole()) {
            $this->commands([
                \App\Console\Commands\RestaurantGroupsCommand::class,
            ]);
        }
    }
}
