<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use App\Services\Payments\ProviderCapabilityRegistry;
use App\Services\Payments\ProviderConnectionService;

class PaymentProviders extends AdminController
{
    protected $requiredPermissions = 'Site.Settings';

    /**
     * The owner-facing provider UI lives inside Payments & finance.
     * Keep this route as a compatibility redirect for old bookmarks.
     */
    public function index()
    {
        return redirect(admin_url('pmdfinance').'#payment-providers');
    }

    public function state(
        ProviderCapabilityRegistry $registry,
        ProviderConnectionService $connections
    ) {
        $state = $connections->state();
        $connected = [];

        foreach ($state['providers'] ?? [] as $provider) {
            $connected[$provider['provider_code']] = $provider;
        }

        $providers = [];

        foreach ($registry->definitions() as $code => $definition) {
            $providers[] = array_merge([
                'provider_code' => $code,
                'connected' => isset($connected[$code]),
                'environments' => [],
            ], $definition, $connected[$code] ?? []);
        }

        return response()->json([
            'ok' => true,
            'schema_ready' => (bool)($state['schema_ready'] ?? false),
            'providers' => $providers,
        ]);
    }
}
