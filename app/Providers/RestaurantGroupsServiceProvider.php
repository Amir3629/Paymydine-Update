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
        // now and once more after every provider/module has fully booted.
        $this->bindSecurityServices();
        $this->app->booted(function () {
            $this->bindSecurityServices(true);
        });
        $this->loadRoutesFrom(base_path('routes/pmd-groups.php'));
        $this->loadViewsFrom(resource_path('views/pmd-groups'), 'pmd-groups');
        if ($this->app->runningInConsole()) {
            $this->commands([\App\Console\Commands\RestaurantGroupsCommand::class]);
        }
    }

    private function bindSecurityServices(bool $forgetResolved = false): void
    {
        $bindings = [
            \App\Services\PmdOwnerTotpService::class => Totp::class,
            \App\Services\PmdTrustedLoginDeviceService::class => TrustedLogin::class,
            \App\Services\PmdSuperAdminOwnerMfaResetService::class => SupportMfaReset::class,
        ];

        foreach ($bindings as $abstract => $implementation) {
            if ($forgetResolved) {
                $this->app->forgetInstance($abstract);
            }
            $this->app->singleton($abstract, $implementation);
        }
    }
}
