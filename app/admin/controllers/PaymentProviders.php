<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use App\Services\Payments\ProviderCapabilityRegistry;
use App\Services\Payments\ProviderConnectionService;
use App\Services\Platform\LocationPlatformContext;

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

    /**
     * PMD_PAYMENT_PROVIDER_MARKET_FILTER_R4
     *
     * The old endpoint returned the full global capability catalogue, which made
     * an Oman restaurant display Germany providers. LocationPlatformContext is
     * now the filter authority: connection state is still tenant-specific, but
     * only providers eligible for the current location market are returned.
     */
    public function state(
        ProviderCapabilityRegistry $registry,
        ProviderConnectionService $connections,
        LocationPlatformContext $marketContext
    ) {
        $state = $connections->state();
        $market = $marketContext->state();
        $profile = (array)($market['profile'] ?? []);
        $marketProviders = array_keys((array)($profile['payments']['providers'] ?? []));
        $connected = [];

        foreach ($state['providers'] ?? [] as $provider) {
            $connected[$provider['provider_code']] = $provider;
        }

        $providers = [];
        foreach ($registry->definitions() as $code => $definition) {
            if ($marketProviders && !in_array($code, $marketProviders, true)) continue;

            $providers[] = array_merge([
                'provider_code' => $code,
                'connected' => isset($connected[$code]),
                'environments' => [],
                'market_country' => $market['country_code'] ?? null,
            ], $definition, $connected[$code] ?? []);
        }

        return response()->json([
            'ok' => true,
            'schema_ready' => (bool)($state['schema_ready'] ?? false),
            'market_resolved' => (bool)($market['resolved'] ?? false),
            'country_code' => $market['country_code'] ?? null,
            'providers' => $providers,
        ]);
    }
}
