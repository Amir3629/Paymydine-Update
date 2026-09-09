<?php

use App\Services\Platform\CountryPlatformProfileRegistry;
use App\Services\Platform\LocationPlatformContext;
use App\Services\Turkey\IsBankApiClient;
use App\Services\Turkey\IsBankPaymentFacilitatorService;
use App\Services\Turkey\IsBankRequestToPayService;
use App\Services\Turkey\IsBankSanalPosService;
use App\Services\Turkey\IsBankTrQrService;
use App\Services\Turkey\TurkeyEDocumentProviderClient;
use App\Services\Turkey\TurkeyIntegrationConfigurationService;
use App\Services\Turkey\TurkeyInvoiceRoutingService;
use App\Services\Turkey\TurkeyPaymentArchitectureService;
use App\Services\Turkey\TurkeyPaymentMethodService;
use App\Services\Turkey\TurkeyReadinessService;
use App\Services\Turkey\TurkeyTenantContext;
use App\Services\Turkey\TurkeyTenantProvisioningService;
use App\Services\Turkey\TurkeyTerminalRegistryService;
use App\Services\Turkey\TurkeyYnOkcAdapterService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use System\Libraries\Assets;

/**
 * PMD_TURKEY_INTEGRATIONS_R3
 *
 * R2 route names remain available for the already-deployed settings JS. R3 adds:
 * - separate UAT/Production İş Bankası credentials,
 * - per-API scope/security profiles,
 * - typed Request-to-Pay / Payment Facilitator / TR-QR façades,
 * - explicit Sanal POS boundary,
 * - provider-neutral e-document and YN ÖKC adapter boundaries,
 * - Türkiye VAT-inclusive consumer-price enforcement,
 * - R3 UI on the existing Payments & finance / Devices pages.
 */

// Add the R3 enhancer through the same Admin asset pipeline the controllers use.
Assets::registerCallback(function (Assets $manager) {
    try {
        $request = request();
        $adminUri = trim((string)config('system.adminUri', 'admin'), '/');
        if ($request && ($request->is($adminUri.'/pmdfinance*') || $request->is($adminUri.'/pmddevices*'))) {
            $manager->addJs('js/pmd-turkey-settings-r3.js');
        }
    } catch (\Throwable) {
    }
});

$enforceTurkeyVatInclusive = static function (): void {
    try {
        $state = app(LocationPlatformContext::class)->state();
        if (strtoupper((string)($state['country_code'] ?? '')) !== CountryPlatformProfileRegistry::TURKEY) return;

        // Türkiye consumer-facing menu prices are treated as VAT-inclusive.
        if (function_exists('setting')) {
            $current = (string)setting('tax_menu_price', '1');
            if ($current !== '0') {
                setting()->set('tax_menu_price', 0);
                setting()->save();
            }
        }

        // Keep the legacy direct settings read aligned too.
        if (Schema::hasTable('settings') && Schema::hasColumn('settings', 'item') && Schema::hasColumn('settings', 'value')) {
            $query = DB::table('settings')->where('item', 'tax_menu_price');
            if (Schema::hasColumn('settings', 'sort')) $query->where('sort', 'config');
            $row = $query->first();
            if ($row && (string)$row->value !== '0') {
                $update = ['value' => '0'];
                if (Schema::hasColumn('settings', 'serialized')) $update['serialized'] = 0;
                if (Schema::hasColumn('settings', 'updated_at')) $update['updated_at'] = now();
                $query->update($update);
            }
        }
    } catch (\Throwable $error) {
        try { logger()->warning('PMD Türkiye VAT-inclusive normalization failed', ['message' => $error->getMessage()]); } catch (\Throwable) {}
    }
};

App::before(function () use ($enforceTurkeyVatInclusive) {
    $enforceTurkeyVatInclusive();
});

App::before(function () {
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        $guard = static function () {
            $auth = app('admin.auth');
            if (!$auth->isLogged()) return response()->json(['ok' => false, 'message' => 'Authentication required.'], 401);
            $user = $auth->user();
            if (!$user || !$user->hasPermission('Site.Settings')) {
                return response()->json(['ok' => false, 'message' => 'Settings permission required.'], 403);
            }
            try {
                $state = app(TurkeyTenantContext::class)->requireTurkey();
                $locationId = (int)($state['location_id'] ?? 0);
                app(TurkeyTenantProvisioningService::class)->ensure($locationId ?: null);
                return $locationId;
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        };

        $snapshot = static function (int $locationId): array {
            $service = app(TurkeyIntegrationConfigurationService::class);
            $codes = [
                'isbank_api', 'isbank_sanal_pos', 'acquirer', 'fast_request', 'tr_qr_fast', 'ispay',
                'yn_okc', 'gmoebys', 'e_document', 'yemeksepeti', 'iys', 'sms', 'whatsapp',
            ];
            $integrations = [];
            foreach ($codes as $code) {
                $integrations[$code] = [
                    'state' => $service->state($code, $locationId),
                    'config' => $service->configuration($code, $locationId),
                ];
            }
            return $integrations;
        };

        $uatOnly = static function (array $config) {
            if (strtolower(trim((string)($config['environment'] ?? 'uat'))) === 'production') {
                return response()->json(['ok' => false, 'message' => 'This developer operation is UAT-only.'], 403);
            }
            return null;
        };

        // -----------------------------------------------------------------
        // R2 compatibility endpoints used by the already-deployed shared JS.
        // -----------------------------------------------------------------
        Route::get('_pmd/turkey/integrations-r2', function () use ($guard, $snapshot) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $architecture = app(TurkeyPaymentArchitectureService::class);
            return response()->json([
                'ok' => true,
                'location_id' => $locationId ?: null,
                'integrations' => $snapshot($locationId),
                'payment_methods' => app(TurkeyPaymentMethodService::class)->methods($locationId),
                'channels' => $architecture->channels(),
                'fiscal_modes' => $architecture->fiscalModes(),
                'isbank_capabilities' => $architecture->isBankCapabilities(),
                'invoice_types' => app(TurkeyInvoiceRoutingService::class)->documentTypes(),
                'readiness' => app(TurkeyReadinessService::class)->report($locationId),
                'terminals' => app(TurkeyTerminalRegistryService::class)->all($locationId),
            ]);
        })->name('pmd.turkey.integrations.r2');

        Route::post('_pmd/turkey/integrations-r2', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $all = (array)request()->input('integrations', []);
            $service = app(TurkeyIntegrationConfigurationService::class);
            $allowed = ['isbank_api', 'acquirer', 'fast_request', 'tr_qr_fast', 'ispay', 'gmoebys', 'e_document'];
            $saved = [];
            foreach ($allowed as $code) {
                if (!array_key_exists($code, $all)) continue;
                $merged = array_replace_recursive($service->configuration($code, $locationId), (array)$all[$code]);
                $saved[$code] = $service->configure($code, $merged, $locationId);
            }
            return response()->json(['ok' => true, 'saved' => $saved]);
        })->name('pmd.turkey.integrations.save.r2');

        Route::post('_pmd/turkey/isbank-test-r2', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $service = app(TurkeyIntegrationConfigurationService::class);
            $config = $service->configuration('isbank_api', $locationId);
            try {
                $result = app(IsBankApiClient::class)->testConnection($config, null);
                $state = $service->recordTestResult('isbank_api', true, null, $locationId);
                return response()->json(['ok' => true, 'result' => $result, 'state' => $state]);
            } catch (\Throwable $error) {
                try { $service->recordTestResult('isbank_api', false, $error->getMessage(), $locationId); } catch (\Throwable) {}
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.isbank.test.r2');

        Route::post('_pmd/turkey/isbank-operation-r2', function () use ($guard, $uatOnly) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $config = app(TurkeyIntegrationConfigurationService::class)->configuration('isbank_api', $locationId);
            if ($blocked = $uatOnly($config)) return $blocked;
            $method = strtoupper(trim((string)request()->input('method', 'GET')));
            $path = trim((string)request()->input('path', ''));
            $payload = (array)request()->input('payload', []);
            try {
                return response()->json(['ok' => true, 'result' => app(IsBankApiClient::class)->request($config, $method, $path, $payload)]);
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.isbank.operation.r2');

        // -----------------------------------------------------------------
        // R3 source-of-truth endpoints.
        // -----------------------------------------------------------------
        Route::get('_pmd/turkey/integrations-r3', function () use ($guard, $snapshot) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $integrations = $snapshot($locationId);
            $bankConfig = (array)($integrations['isbank_api']['config'] ?? []);
            $sanalConfig = (array)($integrations['isbank_sanal_pos']['config'] ?? []);

            return response()->json([
                'ok' => true,
                'location_id' => $locationId ?: null,
                'integrations' => $integrations,
                'readiness' => app(TurkeyReadinessService::class)->report($locationId),
                'terminals' => app(TurkeyTerminalRegistryService::class)->all($locationId),
                'isbank_products' => [
                    'request_to_pay' => app(IsBankRequestToPayService::class)->readiness($bankConfig),
                    'payment_facilitator' => app(IsBankPaymentFacilitatorService::class)->readiness($bankConfig),
                    'tr_qr' => app(IsBankTrQrService::class)->readiness($bankConfig),
                    'sanal_pos' => app(IsBankSanalPosService::class)->readiness($sanalConfig),
                ],
                'tax_policy' => [
                    'consumer_price_vat_inclusive' => true,
                    'tax_menu_price' => 0,
                ],
            ]);
        })->name('pmd.turkey.integrations.r3');

        Route::post('_pmd/turkey/integrations-r3', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $all = (array)request()->input('integrations', []);
            $service = app(TurkeyIntegrationConfigurationService::class);
            $saved = [];

            $schemas = [
                'isbank_api' => [
                    'environment' => ['nullable', 'in:uat,production'],
                    'uat_client_id' => ['nullable', 'string', 'max:255'],
                    'uat_client_secret_reference' => ['nullable', 'string', 'max:500'],
                    'production_client_id' => ['nullable', 'string', 'max:255'],
                    'production_client_secret_reference' => ['nullable', 'string', 'max:500'],
                    'mtls_certificate_path' => ['nullable', 'string', 'max:1000'],
                    'mtls_private_key_reference' => ['nullable', 'string', 'max:500'],
                    'mtls_private_key_password_reference' => ['nullable', 'string', 'max:500'],
                    'products' => ['nullable', 'array'],
                    'products.request_to_pay' => ['nullable', 'array'],
                    'products.request_to_pay.scope' => ['nullable', 'string', 'max:1000'],
                    'products.request_to_pay.auth_mode' => ['nullable', 'in:client_credentials,s2s_password'],
                    'products.request_to_pay.s2s_username' => ['nullable', 'string', 'max:255'],
                    'products.request_to_pay.s2s_password_reference' => ['nullable', 'string', 'max:500'],
                    'products.request_to_pay.approval_reference' => ['nullable', 'string', 'max:500'],
                    'products.request_to_pay.send_method' => ['nullable', 'in:GET,POST,PUT,PATCH,DELETE'],
                    'products.request_to_pay.send_path' => ['nullable', 'string', 'max:1000'],
                    'products.request_to_pay.status_method' => ['nullable', 'in:GET,POST,PUT,PATCH,DELETE'],
                    'products.request_to_pay.status_path' => ['nullable', 'string', 'max:1000'],
                    'products.payment_facilitator' => ['nullable', 'array'],
                    'products.payment_facilitator.scope' => ['nullable', 'string', 'max:1000'],
                    'products.payment_facilitator.auth_mode' => ['nullable', 'in:client_credentials,s2s_password'],
                    'products.payment_facilitator.s2s_username' => ['nullable', 'string', 'max:255'],
                    'products.payment_facilitator.s2s_password_reference' => ['nullable', 'string', 'max:500'],
                    'products.payment_facilitator.approval_reference' => ['nullable', 'string', 'max:500'],
                    'products.payment_facilitator.operations' => ['nullable', 'array'],
                    'products.payment_facilitator.operations.*.method' => ['nullable', 'in:GET,POST,PUT,PATCH,DELETE'],
                    'products.payment_facilitator.operations.*.path' => ['nullable', 'string', 'max:1000'],
                    'products.tr_qr' => ['nullable', 'array'],
                    'products.tr_qr.scope' => ['nullable', 'string', 'max:1000'],
                    'products.tr_qr.auth_mode' => ['nullable', 'in:client_credentials,s2s_password'],
                    'products.tr_qr.s2s_username' => ['nullable', 'string', 'max:255'],
                    'products.tr_qr.s2s_password_reference' => ['nullable', 'string', 'max:500'],
                    'products.tr_qr.approval_reference' => ['nullable', 'string', 'max:500'],
                    'products.tr_qr.create_method' => ['nullable', 'in:GET,POST,PUT,PATCH,DELETE'],
                    'products.tr_qr.create_path' => ['nullable', 'string', 'max:1000'],
                    'products.tr_qr.status_method' => ['nullable', 'in:GET,POST,PUT,PATCH,DELETE'],
                    'products.tr_qr.status_path' => ['nullable', 'string', 'max:1000'],
                ],
                'isbank_sanal_pos' => [
                    'environment' => ['nullable', 'in:uat,production'],
                    'merchant_id' => ['nullable', 'string', 'max:190'],
                    'store_code' => ['nullable', 'string', 'max:190'],
                    'api_username' => ['nullable', 'string', 'max:190'],
                    'api_password_reference' => ['nullable', 'string', 'max:500'],
                    'store_key_reference' => ['nullable', 'string', 'max:500'],
                    'technical_spec_reference' => ['nullable', 'string', 'max:1000'],
                ],
                'e_document' => [
                    'provider' => ['nullable', 'string', 'max:120'],
                    'merchant_identifier' => ['nullable', 'string', 'max:190'],
                    'environment' => ['nullable', 'in:sandbox,uat,production'],
                    'service_reference' => ['nullable', 'string', 'max:1000'],
                    'username' => ['nullable', 'string', 'max:255'],
                    'password_reference' => ['nullable', 'string', 'max:500'],
                    'lookup_operation' => ['nullable', 'string', 'max:255'],
                    'lookup_tax_id_field' => ['nullable', 'string', 'max:255'],
                    'registration_result_path' => ['nullable', 'string', 'max:500'],
                    'create_operation' => ['nullable', 'string', 'max:255'],
                    'status_operation' => ['nullable', 'string', 'max:255'],
                ],
                'gmoebys' => [
                    'provider' => ['nullable', 'string', 'max:120'],
                    'merchant_identifier' => ['nullable', 'string', 'max:190'],
                    'environment' => ['nullable', 'in:sandbox,uat,production'],
                    'credential_reference' => ['nullable', 'string', 'max:500'],
                    'approval_reference' => ['nullable', 'string', 'max:500'],
                ],
                'yn_okc' => [
                    'vendor_driver' => ['nullable', 'string', 'max:190'],
                    'local_agent_url' => ['nullable', 'url', 'max:1000'],
                    'credential_reference' => ['nullable', 'string', 'max:500'],
                ],
            ];

            foreach ($schemas as $code => $rules) {
                if (!array_key_exists($code, $all)) continue;
                $submitted = (array)$all[$code];
                $validator = Validator::make($submitted, $rules);
                if ($validator->fails()) {
                    return response()->json(['ok' => false, 'integration' => $code, 'message' => 'Validation failed.', 'errors' => $validator->errors()], 422);
                }

                $clean = $validator->validated();
                $existing = $service->configuration($code, $locationId);
                $merged = array_replace_recursive($existing, $clean);

                if ($code === 'isbank_api') {
                    $merged['environment'] = strtolower(trim((string)($merged['environment'] ?? 'uat'))) === 'production' ? 'production' : 'uat';
                    $products = (array)($merged['products'] ?? []);
                    foreach (['request_to_pay', 'payment_facilitator', 'tr_qr'] as $productCode) {
                        $product = (array)($products[$productCode] ?? []);
                        $approvalRef = trim((string)($product['approval_reference'] ?? ''));
                        if ($approvalRef !== '') $product['subscription_status'] = 'approved';
                        elseif (trim((string)($product['subscription_status'] ?? '')) === '') $product['subscription_status'] = 'pending';
                        $products[$productCode] = $product;
                    }
                    $merged['products'] = $products;
                }
                if ($code === 'isbank_sanal_pos') $merged['activation_status'] = (string)($existing['activation_status'] ?? 'merchant_activation_required');
                if ($code === 'e_document') $merged['activation_status'] = (string)($existing['activation_status'] ?? 'provider_activation_required');
                if ($code === 'gmoebys') $merged['activation_status'] = (string)($existing['activation_status'] ?? 'provider_approval_required');

                $saved[$code] = $service->configure($code, $merged, $locationId);
            }

            return response()->json(['ok' => true, 'saved' => $saved]);
        })->name('pmd.turkey.integrations.save.r3');

        Route::post('_pmd/turkey/isbank-test-product-r3', function () use ($guard, $uatOnly) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $product = strtolower(trim((string)request()->input('product', '')));
            if (!in_array($product, ['request_to_pay', 'payment_facilitator', 'tr_qr'], true)) {
                return response()->json(['ok' => false, 'message' => 'Unknown İş Bankası product.'], 422);
            }
            $service = app(TurkeyIntegrationConfigurationService::class);
            $config = $service->configuration('isbank_api', $locationId);
            if ($blocked = $uatOnly($config)) return $blocked;
            try {
                $result = app(IsBankApiClient::class)->testConnection($config, $product);
                $service->recordTestResult('isbank_api', true, null, $locationId);
                return response()->json(['ok' => true, 'result' => $result]);
            } catch (\Throwable $error) {
                try { $service->recordTestResult('isbank_api', false, $error->getMessage(), $locationId); } catch (\Throwable) {}
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.isbank.test.product.r3');

        Route::post('_pmd/turkey/request-to-pay-r3', function () use ($guard, $uatOnly) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $config = app(TurkeyIntegrationConfigurationService::class)->configuration('isbank_api', $locationId);
            if ($blocked = $uatOnly($config)) return $blocked;
            $action = strtolower(trim((string)request()->input('action', 'send')));
            $payload = (array)request()->input('payload', []);
            try {
                $client = app(IsBankRequestToPayService::class);
                $result = $action === 'status'
                    ? $client->status($config, (string)request()->input('request_id', ''), $payload)
                    : $client->send($config, $payload);
                return response()->json(['ok' => true, 'result' => $result]);
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.request-to-pay.r3');

        Route::post('_pmd/turkey/payment-facilitator-r3', function () use ($guard, $uatOnly) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $config = app(TurkeyIntegrationConfigurationService::class)->configuration('isbank_api', $locationId);
            if ($blocked = $uatOnly($config)) return $blocked;
            try {
                $result = app(IsBankPaymentFacilitatorService::class)->call(
                    $config,
                    (string)request()->input('operation', ''),
                    (array)request()->input('payload', []),
                    (array)request()->input('path_parameters', [])
                );
                return response()->json(['ok' => true, 'result' => $result]);
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.payment-facilitator.r3');

        Route::post('_pmd/turkey/tr-qr-r3', function () use ($guard, $uatOnly) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $config = app(TurkeyIntegrationConfigurationService::class)->configuration('isbank_api', $locationId);
            if ($blocked = $uatOnly($config)) return $blocked;
            $action = strtolower(trim((string)request()->input('action', 'create')));
            try {
                $client = app(IsBankTrQrService::class);
                $result = $action === 'status'
                    ? $client->status($config, (string)request()->input('payment_id', ''), (array)request()->input('payload', []))
                    : $client->create($config, (array)request()->input('payload', []));
                return response()->json(['ok' => true, 'result' => $result]);
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.tr-qr.r3');

        Route::post('_pmd/turkey/sanal-pos-readiness-r3', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $config = app(TurkeyIntegrationConfigurationService::class)->configuration('isbank_sanal_pos', $locationId);
            return response()->json(['ok' => true, 'result' => app(IsBankSanalPosService::class)->readiness($config)]);
        })->name('pmd.turkey.sanal-pos.readiness.r3');

        Route::post('_pmd/turkey/e-document-r3', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $service = app(TurkeyIntegrationConfigurationService::class);
            $config = $service->configuration('e_document', $locationId);
            $state = $service->state('e_document', $locationId);
            if (strtolower((string)($config['environment'] ?? 'sandbox')) === 'production' && empty($state['production_ready'])) {
                return response()->json(['ok' => false, 'message' => 'Production e-document calls require verified provider activation.'], 403);
            }
            $action = strtolower(trim((string)request()->input('action', 'lookup')));
            try {
                $client = app(TurkeyEDocumentProviderClient::class);
                $result = match ($action) {
                    'lookup' => $client->lookupRecipient($config, (string)request()->input('tax_identifier', '')),
                    'create' => $client->createInvoice($config, (array)request()->input('payload', [])),
                    'status' => $client->invoiceStatus($config, (array)request()->input('payload', [])),
                    default => throw new \InvalidArgumentException('Unsupported e-document action.'),
                };
                return response()->json(['ok' => true, 'result' => $result]);
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.e-document.r3');

        Route::post('_pmd/turkey/yn-okc-r3', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $service = app(TurkeyIntegrationConfigurationService::class);
            $config = $service->configuration('yn_okc', $locationId);
            $state = $service->state('yn_okc', $locationId);
            if (empty($state['production_ready'])) {
                return response()->json(['ok' => false, 'message' => 'YN ÖKC calls require verified/certified device integration evidence.'], 403);
            }
            try {
                $result = app(TurkeyYnOkcAdapterService::class)->execute(
                    $config,
                    (string)request()->input('operation', 'status'),
                    (array)request()->input('payload', []),
                    (string)request()->input('idempotency_key', '')
                );
                return response()->json(['ok' => true, 'result' => $result]);
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.yn-okc.r3');

        Route::post('_pmd/turkey/terminal-r2', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $input = (array)request()->input('terminal', []);
            $validator = Validator::make($input, [
                'provider_code' => ['nullable', 'string', 'max:100'],
                'reader_id' => ['nullable', 'string', 'max:255'],
                'reader_label' => ['nullable', 'string', 'max:255'],
                'environment' => ['nullable', 'in:uat,production'],
                'provider_terminal_id' => ['nullable', 'string', 'max:255'],
                'serial_number' => ['nullable', 'string', 'max:255'],
                'hardware_manufacturer' => ['nullable', 'string', 'max:120'],
                'hardware_model' => ['nullable', 'string', 'max:120'],
                'acceptance_channel' => ['nullable', 'in:physical_terminal,softpos'],
                'fiscal_mode' => ['nullable', 'in:yn_okc,gmoebys'],
                'fiscal_device_serial' => ['nullable', 'string', 'max:255'],
                'provider_product' => ['nullable', 'string', 'max:150'],
                'note' => ['nullable', 'string', 'max:1000'],
            ]);
            if ($validator->fails()) return response()->json(['ok' => false, 'message' => 'Validation failed.', 'errors' => $validator->errors()], 422);
            try {
                return response()->json(['ok' => true, 'terminal' => app(TurkeyTerminalRegistryService::class)->save($validator->validated(), $locationId)]);
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.terminal.save.r2');

        Route::post('_pmd/turkey/terminal-verify-r3', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;
            $validator = Validator::make(request()->all(), [
                'terminal_device_id' => ['required', 'integer', 'min:1'],
                'verification_reference' => ['required', 'string', 'max:500'],
                'external_approval_status' => ['required', 'in:approved,active,certified'],
                'provider_terminal_id' => ['nullable', 'string', 'max:255'],
                'remote_sync_status' => ['nullable', 'string', 'max:100'],
            ]);
            if ($validator->fails()) return response()->json(['ok' => false, 'message' => 'Validation failed.', 'errors' => $validator->errors()], 422);
            try {
                $clean = $validator->validated();
                $terminal = app(TurkeyTerminalRegistryService::class)->markVerified((int)$clean['terminal_device_id'], $clean, $locationId);
                return response()->json(['ok' => true, 'terminal' => $terminal]);
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.terminal.verify.r3');
    });
});
