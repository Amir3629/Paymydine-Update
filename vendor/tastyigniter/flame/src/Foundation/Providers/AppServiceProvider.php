<?php

namespace Igniter\Flame\Foundation\Providers;

use Igniter\Flame\Support\Facades\File;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Config;

abstract class AppServiceProvider extends ServiceProvider
{
    /**
     * The application instance.
     *
     * @var \Igniter\Flame\Foundation\Application
     */
    protected $app;

    /**
     * @var bool Indicates if loading of the provider is deferred.
     */
    protected $defer = false;

    /**
     * Boot the service provider.
     * @return void
     */
    public function boot()
    {
        $host = Request::getHost();

        // Convert domain to a valid prefix
        $cachePrefix = 'tenant_' . str_replace(['.', ':'], '_', $host) . '_cache';
    
        // Dynamically set the cache prefix
        Config::set('cache.prefix', $cachePrefix);
        Config::set('cache.stores.file.path', storage_path("framework/cache/data/{$cachePrefix}"));
     

        if ($module = $this->getModule(func_get_args())) {
        }
    }

    /**
     * Register the service provider.
     * @return void
     */
    public function register()
    {
        if ($module = $this->getModule(func_get_args())) {
            // Register paths for: config, translator, view
            $modulePath = app_path($module);
            $this->loadTranslationsFrom($modulePath.DIRECTORY_SEPARATOR.'language', $module);
            $this->loadViewsFrom($modulePath.DIRECTORY_SEPARATOR.'views', $module);

            $routesFile = app_path($module.'/routes.php');
            if (File::isFile($routesFile))
                require $routesFile;
        }
    }

    public function getModule($args)
    {
        $module = (isset($args[0]) && is_string($args[0])) ? $args[0] : null;

        return $module;
    }

    /**
     * Registers a new console (artisan) command
     *
     * @param string $key The command name
     * @param string $class The command class
     *
     * @return void
     */
    public function registerConsoleCommand($key, $class)
    {
        $key = 'command.'.$key;
        $this->app->singleton($key, function () use ($class) {
            return new $class;
        });

        $this->commands($key);
    }

    /**
     * Get the services provided by the provider.
     * @return array
     */
    public function provides()
    {
        return [];
    }
}
