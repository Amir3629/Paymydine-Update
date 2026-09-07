<?php

use App\Services\Turkey\IsBankApiClient;
use App\Services\Turkey\TurkeyIntegrationConfigurationService;
use App\Services\Turkey\TurkeyInvoiceRoutingService;
use App\Services\Turkey\TurkeyPaymentArchitectureService;
use App\Services\Turkey\TurkeyPaymentMethodService;
use App\Services\Turkey\TurkeyReadinessService;
use App\Services\Turkey\TurkeyTenantContext;
use App\Services\Turkey\TurkeyTenantProvisioningService;
use App\Services\Turkey\TurkeyTerminalRegistryService;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Validator;

/**
 * PMD_TURKEY_INTEGRATIONS_R2
 *
 * Small authenticated JSON endpoints used by the existing Payments & finance /
 * Devices settings pages. No separate Türkiye settings page is introduced.
 */
App::before(function () {
    Route::group([
        'middleware' => ['web'],
        'prefix' => config('system.adminUri', 'admin'),
    ], function () {
        $guard = static function () {
            $auth = app('admin.auth');
            if (!$auth->isLogged()) {
                return response()->json(['ok' => false, 'message' => 'Authentication required.'], 401);
            }
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

        Route::get('_pmd/turkey/integrations-r2', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;

            $service = app(TurkeyIntegrationConfigurationService::class);
            $codes = [
                'isbank_api', 'acquirer', 'fast_request', 'tr_qr_fast', 'ispay',
                'yn_okc', 'gmoebys', 'e_document', 'yemeksepeti', 'iys', 'sms', 'whatsapp',
            ];
            $integrations = [];
            foreach ($codes as $code) {
                $integrations[$code] = [
                    'state' => $service->state($code, $locationId),
                    'config' => $service->configuration($code, $locationId),
                ];
            }

            $architecture = app(TurkeyPaymentArchitectureService::class);
            return response()->json([
                'ok' => true,
                'location_id' => $locationId ?: null,
                'integrations' => $integrations,
                'payment_methods' => app(TurkeyPaymentMethodService::class)->methods($locationId),
                'channels' => $architecture->channels(),
                'fiscal_modes' => $architecture->fiscalModes(),
                'isbank_capabilities' => $architecture->isBankCapabilities(),
                'invoice_types' => app(TurkeyInvoiceRoutingService::class)->documentTypes(),
                'readiness' => app(TurkeyReadinessService::class)->report($locationId),
                'terminals' => app(TurkeyTerminalRegistryService::class)->all($locationId),
                'isbank' => [
                    'sandbox_portal_is_documentation_only' => true,
                    'test_environment' => 'UAT',
                    'uat_host' => 'https://api.uat.isbank.com.tr',
                    'production_host' => 'https://api.isbank.com.tr',
                    'token_path' => '/api/isbank/v1/identity-provider/oauth2/token',
                ],
            ]);
        })->name('pmd.turkey.integrations.r2');

        Route::post('_pmd/turkey/integrations-r2', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;

            $all = (array)request()->input('integrations', []);
            $service = app(TurkeyIntegrationConfigurationService::class);

            $schemas = [
                'isbank_api' => [
                    'environment' => ['nullable', 'in:uat,production'],
                    'client_id' => ['nullable', 'string', 'max:255'],
                    'client_secret_reference' => ['nullable', 'string', 'max:500'],
                    'auth_mode' => ['nullable', 'in:client_credentials,s2s_password'],
                    'scope' => ['nullable', 'string', 'max:1000'],
                    'mtls_certificate_path' => ['nullable', 'string', 'max:1000'],
                    'mtls_private_key_reference' => ['nullable', 'string', 'max:500'],
                    'mtls_private_key_password_reference' => ['nullable', 'string', 'max:500'],
                    's2s_username' => ['nullable', 'string', 'max:255'],
                    's2s_password_reference' => ['nullable', 'string', 'max:500'],
                    'subscription_status' => ['nullable', 'string', 'max:120'],
                ],
                'acquirer' => [
                    'provider' => ['nullable', 'string', 'max:120'],
                    'merchant_id' => ['nullable', 'string', 'max:190'],
                    'environment' => ['nullable', 'in:uat,production'],
                    'provider_connection_code' => ['nullable', 'in:isbank_api'],
                    'contract_status' => ['nullable', 'string', 'max:100'],
                    'virtual_pos_status' => ['nullable', 'string', 'max:100'],
                ],
                'fast_request' => [
                    'provider' => ['nullable', 'string', 'max:120'],
                    'merchant_id' => ['nullable', 'string', 'max:190'],
                    'environment' => ['nullable', 'in:uat,production'],
                    'provider_connection_code' => ['nullable', 'in:isbank_api'],
                    'activation_status' => ['nullable', 'string', 'max:100'],
                ],
                'tr_qr_fast' => [
                    'provider' => ['nullable', 'string', 'max:120'],
                    'merchant_id' => ['nullable', 'string', 'max:190'],
                    'environment' => ['nullable', 'in:uat,production'],
                    'provider_connection_code' => ['nullable', 'in:isbank_api'],
                    'activation_status' => ['nullable', 'string', 'max:100'],
                ],
                'ispay' => [
                    'provider' => ['nullable', 'string', 'max:120'],
                    'merchant_id' => ['nullable', 'string', 'max:190'],
                    'environment' => ['nullable', 'in:uat,production'],
                    'provider_connection_code' => ['nullable', 'in:isbank_api'],
                    'activation_status' => ['nullable', 'string', 'max:100'],
                ],
                'gmoebys' => [
                    'provider' => ['nullable', 'string', 'max:120'],
                    'merchant_identifier' => ['nullable', 'string', 'max:190'],
                    'environment' => ['nullable', 'in:sandbox,uat,production'],
                    'credential_reference' => ['nullable', 'string', 'max:500'],
                    'activation_status' => ['nullable', 'string', 'max:100'],
                    'approval_reference' => ['nullable', 'string', 'max:500'],
                ],
                'e_document' => [
                    'provider' => ['nullable', 'string', 'max:120'],
                    'merchant_identifier' => ['nullable', 'string', 'max:190'],
                    'environment' => ['nullable', 'in:sandbox,uat,production'],
                    'credential_reference' => ['nullable', 'string', 'max:500'],
                    'activation_status' => ['nullable', 'string', 'max:100'],
                    'service_reference' => ['nullable', 'string', 'max:1000'],
                ],
            ];

            $saved = [];
            foreach ($schemas as $code => $rules) {
                if (!array_key_exists($code, $all)) continue;
                $values = (array)$all[$code];
                $validator = Validator::make($values, $rules);
                if ($validator->fails()) {
                    return response()->json([
                        'ok' => false,
                        'integration' => $code,
                        'message' => 'Validation failed.',
                        'errors' => $validator->errors(),
                    ], 422);
                }
                $clean = $validator->validated();
                foreach ($clean as $key => $value) {
                    if (is_string($value)) $clean[$key] = trim($value);
                }

                // Safe defaults reduce duplicate config while keeping activation fail-closed.
                if (in_array($code, ['acquirer', 'fast_request', 'tr_qr_fast', 'ispay'], true)) {
                    $clean['provider'] = $clean['provider'] ?: 'isbank';
                    $clean['provider_connection_code'] = 'isbank_api';
                    $clean['environment'] = $clean['environment'] ?: 'uat';
                }
                if ($code === 'isbank_api') {
                    $clean['environment'] = $clean['environment'] ?: 'uat';
                    $clean['auth_mode'] = $clean['auth_mode'] ?: 'client_credentials';
                }

                $saved[$code] = $service->configure($code, $clean, $locationId);
            }

            return response()->json(['ok' => true, 'saved' => $saved]);
        })->name('pmd.turkey.integrations.save.r2');

        Route::post('_pmd/turkey/isbank-test-r2', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;

            $service = app(TurkeyIntegrationConfigurationService::class);
            $config = $service->configuration('isbank_api', $locationId);

            try {
                $result = app(IsBankApiClient::class)->testConnection($config);
                $state = $service->recordTestResult('isbank_api', true, null, $locationId);
                return response()->json(['ok' => true, 'result' => $result, 'state' => $state]);
            } catch (\Throwable $error) {
                try { $service->recordTestResult('isbank_api', false, $error->getMessage(), $locationId); } catch (\Throwable) {}
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.isbank.test.r2');

        // Developer-only UAT operation tester. It is intentionally disabled for
        // production so a settings-page test can never trigger a live payment.
        Route::post('_pmd/turkey/isbank-operation-r2', function () use ($guard) {
            $locationId = $guard();
            if ($locationId instanceof \Symfony\Component\HttpFoundation\Response) return $locationId;

            $service = app(TurkeyIntegrationConfigurationService::class);
            $config = $service->configuration('isbank_api', $locationId);
            if (strtolower((string)($config['environment'] ?? 'uat')) === 'production') {
                return response()->json(['ok' => false, 'message' => 'Generic operation tester is UAT-only.'], 403);
            }

            $method = strtoupper(trim((string)request()->input('method', 'GET')));
            $path = trim((string)request()->input('path', ''));
            $payload = (array)request()->input('payload', []);
            if (!in_array($method, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], true)) {
                return response()->json(['ok' => false, 'message' => 'Unsupported HTTP method.'], 422);
            }
            if (!str_starts_with($path, '/api/isbank/')) {
                return response()->json(['ok' => false, 'message' => 'Only /api/isbank/... UAT paths from the subscribed portal spec are accepted.'], 422);
            }

            try {
                $result = app(IsBankApiClient::class)->request($config, $method, $path, $payload);
                return response()->json(['ok' => true, 'result' => $result]);
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.isbank.operation.r2');

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
            if ($validator->fails()) {
                return response()->json(['ok' => false, 'message' => 'Validation failed.', 'errors' => $validator->errors()], 422);
            }

            try {
                $terminal = app(TurkeyTerminalRegistryService::class)->save($validator->validated(), $locationId);
                return response()->json(['ok' => true, 'terminal' => $terminal]);
            } catch (\Throwable $error) {
                return response()->json(['ok' => false, 'message' => $error->getMessage()], 422);
            }
        })->name('pmd.turkey.terminal.save.r2');
    });
});
