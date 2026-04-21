<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Admin\Models\Menus_model;
use Admin\Helpers\PosMenuNormalizer;

class PosConfigs extends \Admin\Classes\AdminController
{
    private $urlPosAPI = 'https://pay-my-dine-api-pos.onrender.com';
    // private $urlPosAPI = 'https://6fbebe8a021d.ngrok-free.app';

    /* PMD_READY2ORDER_FIXED_HELPERS */
    private function pmdIsReady2order($config): bool
    {
        return strtolower((string) ($config->devices->code ?? '')) === 'ready2order';
    }

    private function pmdIsWorldline($config): bool
    {
        return strtolower((string) ($config->devices->code ?? '')) === 'worldline';
    }

    private function pmdWorldlineWebhookUrl(): string
    {
        return url('admin/worldline/webhook');
    }


    private function pmdR2oBaseUrl($config): string
    {
        return rtrim((string) ($config->url ?? 'https://api.ready2order.com/v1'), '/');
    }

    private function pmdR2oProductsUrl($config): string
    {
        return $this->pmdR2oBaseUrl($config) . '/products?page=1&limit=100';
    }

    private function pmdNormalizeReady2orderProducts(array $rawProducts): array
    {
        $items = [];

        foreach ($rawProducts as $row) {
            $name = trim((string) ($row['product_name'] ?? $row['name'] ?? ''));
            if ($name === '') {
                continue;
            }

            $items[] = [
                'name' => $name,
                'description' => trim((string) ($row['product_description'] ?? $row['description'] ?? '')),
                'price' => (float) ($row['product_price'] ?? $row['price'] ?? 0),
            ];
        }

        return $items;
    }

    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model'        => 'Admin\Models\Pos_configs_model',
            'title'        => 'lang:admin::lang.pos_configs.text_title',
            'emptyMessage' => 'lang:admin::lang.pos_configs.text_empty',
            'defaultSort'  => ['config_id', 'DESC'],
            'configFile'   => 'pos_configs_model',
        ],
    ];

    public $formConfig = [
        'name'    => 'lang:admin::lang.pos_configs.text_form_name',
        'model'   => 'Admin\Models\Pos_configs_model',
        'request' => 'Admin\Requests\PosConfigs',

        'create'  => [
            'title'         => 'lang:admin::lang.form.create_title',
            'redirect'      => 'pos_configs/edit/{config_id}',
            'redirectClose' => 'pos_configs',
            'redirectNew'   => 'pos_configs/create',
        ],

        'edit'    => [
            'title'         => 'lang:admin::lang.form.edit_title',
            'redirect'      => 'pos_configs',
            'redirectClose' => 'pos_configs',
            'redirectNew'   => 'pos_configs/create',
        ],

        'preview' => [
            'title'    => 'lang:admin::lang.form.preview_title',
            'redirect' => 'pos_configs',
        ],

        'delete'  => [
            'redirect' => 'pos_configs',
        ],

        'configFile' => 'pos_configs_model',
    ];

    protected $requiredPermissions = 'Admin.PosConfigs';

    public function __construct()
    {
        parent::__construct();

        // Set admin menu context for this controller
        AdminMenu::setContext('pos_configs', 'system');
    }

    public function listExtendQuery($query)
    {
        if (!AdminAuth::isSuperUser()) {
            $query->whereNotSuperUser();
        }
    }

    public function formExtendQuery($query)
    {
        if (!AdminAuth::isSuperUser()) {
            $query->whereNotSuperUser();
        }
    }

    public function formExtendFields($form)
    {
        $model = $form->model;
        $deviceCode = strtolower((string)optional($model->devices)->code);

        if ($deviceCode !== 'sumup') {
            return;
        }

        // SumUp terminal setup: POS owns terminal fields only; online credentials are provider-owned.
        foreach (['url', 'username', 'password', 'access_token', 'id_application'] as $fieldName) {
            if (method_exists($form, 'removeField')) {
                $form->removeField($fieldName);
            }
        }

        if (isset($this->formConfig['form']['toolbar']['buttons']['sync_menu'])) {
            unset($this->formConfig['form']['toolbar']['buttons']['sync_menu']);
        }
        if (isset($this->formConfig['form']['toolbar']['buttons']['register_webhook'])) {
            unset($this->formConfig['form']['toolbar']['buttons']['register_webhook']);
        }

        $provider = \Admin\Models\Payments_model::query()->where('code', 'sumup')->first();
        $providerData = is_array(optional($provider)->data) ? (array)$provider->data : [];
        $providerUrl = (string)($providerData['url'] ?? 'https://api.sumup.com');
        $providerMerchantCode = (string)($providerData['id_application'] ?? '');
        $providerTokenPresent = strlen((string)($providerData['access_token'] ?? '')) > 0 ? 'Yes' : 'No';
        $providerStatus = (bool)optional($provider)->status ? 'Enabled' : 'Disabled';

        $form->addFields([
            'sumup_terminal_setup_guide' => [
                'type' => 'section',
                'label' => 'SumUp POS / Terminal Setup',
                'comment' => 'This page is for in-person terminal readiness only. Online checkout credentials are managed in Payments > Providers > SumUp. Do not start terminal charges from this settings page; start them from order payment actions.',
            ],
            'sumup_provider_snapshot' => [
                'label' => 'Linked Provider Status',
                'type' => 'textarea',
                'span' => 'full',
                'attributes' => ['rows' => 4, 'readonly' => 'readonly'],
                'default' => "Provider status: {$providerStatus}\nAPI Base URL: {$providerUrl}\nMerchant Code: ".($providerMerchantCode !== '' ? $providerMerchantCode : '[auto-resolve]')."\nAccess Token configured: {$providerTokenPresent}",
                'comment' => 'Read-only snapshot from provider configuration.',
            ],
        ]);

        foreach (['sumup_affiliate_key', 'sumup_reader_id', 'sumup_pairing_code', 'sumup_pairing_state', 'sumup_reader_label'] as $fieldName) {
            if ($field = $form->getField($fieldName)) {
                $field->hidden = false;
            }
        }
    }

    public function onTestIntegration()
    {
        $segments = request()->segments();
        $configId = end($segments);

        $config = \Admin\Models\Pos_configs_model::with('devices')->find($configId);

        if (!$config) {
            return response()->json(['error' => 'Configuration not found'], 404);
        }

        if (strtolower($config->devices->code ?? '') === 'sumup') {
            try {
                $provider = \Admin\Models\Payments_model::query()->where('code', 'sumup')->first();
                $providerData = is_array(optional($provider)->data) ? (array)$provider->data : [];
                $baseUrl = rtrim((string)($providerData['url'] ?? 'https://api.sumup.com'), '/');
                $token = (string)($providerData['access_token'] ?? '');
                if ($token === '') {
                    return response()->json([
                        'provider' => 'sumup',
                        'integration_mode' => 'terminal_setup',
                        'error' => 'SumUp provider access token is missing. Configure it in Payments > Providers > SumUp.',
                    ], 422);
                }

                $response = Http::withToken($token)
                    ->acceptJson()
                    ->get($baseUrl.'/v0.1/me/merchant-profile');

                $json = $response->json();

                return response()->json([
                    'provider' => 'sumup',
                    'integration_mode' => 'terminal_setup',
                    'supported_features' => [
                        'readers',
                        'terminal_pairing_state',
                        'terminal_readiness',
                    ],
                    'merchant_code' => ($providerData['id_application'] ?? null) ?: ($json['merchant_code'] ?? null),
                    'reader_id' => $config->sumup_reader_id ?? null,
                    'pairing_state' => $config->sumup_pairing_state ?? null,
                    'reader_label' => $config->sumup_reader_label ?? null,
                    'sumup_status' => $response->status(),
                    'sumup_response' => $json,
                ], $response->status());
            } catch (\Throwable $e) {
                Log::error('Error while testing SumUp integration', [
                    'config_id' => $configId,
                    'message' => $e->getMessage(),
                ]);

                return response()->json([
                    'provider' => 'sumup',
                    'error' => $e->getMessage(),
                ], 500);
            }
        }

        try {
            $posCode = strtolower((string) $config->devices->code);

            if ($this->pmdIsWorldline($config)) {
                $baseUrl = rtrim((string) ($config->url ?? ''), '/');
                $apiKeyId = trim((string) ($config->username ?? ''));
                $secretApiKey = trim((string) ($config->access_token ?? ''));
                $merchantId = trim((string) ($config->id_application ?? ''));
                $webhookSecret = trim((string) ($config->password ?? ''));

                $errors = [];
                if ($baseUrl === '') $errors[] = 'API URL is empty';
                if ($apiKeyId === '') $errors[] = 'API Key ID is empty';
                if ($secretApiKey === '') $errors[] = 'Secret API Key is empty';
                if ($merchantId === '') $errors[] = 'Merchant ID is empty';
                if ($webhookSecret === '') $errors[] = 'Webhook secret is empty';

                $environment = 'custom';
                if (strpos($baseUrl, 'payment.preprod.direct.worldline-solutions.com') !== false) {
                    $environment = 'preprod';
                } elseif (strpos($baseUrl, 'payment.direct.worldline-solutions.com') !== false) {
                    $environment = 'live';
                }

                return response()->json([
                    'provider' => 'worldline',
                    'integration_type' => 'payment_platform_kept_in_pos_configs',
                    'environment' => $environment,
                    'base_url' => $baseUrl,
                    'merchant_id_present' => $merchantId !== '',
                    'api_key_id_present' => $apiKeyId !== '',
                    'secret_api_key_present' => $secretApiKey !== '',
                    'webhook_secret_present' => $webhookSecret !== '',
                    'webhook_url_to_configure_in_portal' => $this->pmdWorldlineWebhookUrl(),
                    'not_applicable_actions' => [
                        'sync_menu',
                        'sync_tables'
                    ],
                    'message' => empty($errors)
                        ? 'Worldline config is present. For a real transaction validation, next step is a hosted checkout / payment API test.'
                        : 'Worldline config is incomplete.',
                    'errors' => $errors,
                ], empty($errors) ? 200 : 422);
            }

            if ($this->pmdIsWorldline($config)) {
            return [
                'success' => true,
                'exists_webhook' => 0,
                'response' => [
                    'provider' => 'worldline',
                    'mode' => 'manual-portal-configuration',
                    'message' => 'Worldline webhook endpoints are configured in the Merchant Portal / Developer > Webhooks, not via the generic POS proxy.',
                    'webhook_url' => $this->pmdWorldlineWebhookUrl(),
                ],
            ];
        }

        if ($this->pmdIsReady2order($config)) {
                $url = $this->pmdR2oProductsUrl($config);
            } else {
                $baseUrl = $this->urlPosAPI . '/api/pos';
                $url = "{$baseUrl}/{$posCode}/products";

                if ($posCode === 'clover' && !empty($config->id_application)) {
                    $url .= '?merchantId=' . urlencode($config->id_application);
                }

                if ($posCode === 'lightspeed') {
                    $domainPrefix = $config->id_application ?? null;
                    if (!empty($domainPrefix)) {
                        $url .= '?domainPrefix=' . urlencode($domainPrefix);
                    }
                }
            }

            Log::info('Sending request to POS', [
                'PMD_R2O_TEST_FIXED' => $this->pmdIsReady2order($config),
                'PMD_R2O_RUNTIME_ENRICH_V1' => true,
                'config_id_runtime' => (string) ($configId ?? ($config->config_id ?? '')),
                'tenant_host' => request()->getHost(),
                'device_code_runtime' => strtolower((string) ($config->devices->code ?? '')),
                'db_default_connection' => \DB::getDefaultConnection(),
                'db_database' => \DB::connection()->getDatabaseName(),
                'token_len_raw' => strlen((string) ($config->access_token ?? '')),
                'token_len_trimmed' => strlen(trim((string) ($config->access_token ?? ''))),
                'trimmed_changed' => ((string) ($config->access_token ?? '')) !== trim((string) ($config->access_token ?? '')) ? 'yes' : 'no',
                'token_prefix10' => substr(trim((string) ($config->access_token ?? '')), 0, 10),
                'token_suffix10' => substr(trim((string) ($config->access_token ?? '')), -10),
                'url'          => $url,
                'posCode'      => $posCode,
                'merchantId'   => $config->id_application ?? null,
                'domainPrefix' => $config->id_application ?? null,
                'access_token' => substr((string) $config->access_token, 0, 4) . '***',
            ]);

            $response = Http::withToken($config->access_token)
                ->acceptJson()
                ->get($url);

            return response()->json($response->json(), $response->status());
        } catch (\Exception $e) {
            Log::error('Error while testing POS integration', [
                'config_id' => $configId,
                'message'   => $e->getMessage(),
            ]);

            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function onRegisterWebhook()
    {
        $configId = post('config_id');
        $config   = \Admin\Models\Pos_configs_model::with('devices')->find($configId);

        Log::info("Registering webhook for config ID: {$configId}", [$config]);

        if (!$config) {
            return ['error' => 'Configuration not found'];
        }

        if ($this->pmdIsWorldline($config)) {
            return [
                'success' => true,
                'exists_webhook' => 0,
                'response' => [
                    'provider' => 'worldline',
                    'mode' => 'manual-portal-configuration',
                    'message' => 'Worldline webhook endpoints are configured in the Merchant Portal / Developer > Webhooks, not via the generic POS proxy.',
                    'webhook_url' => $this->pmdWorldlineWebhookUrl(),
                ],
            ];
        }

        if ($this->pmdIsReady2order($config)) {
            Log::info('Skipping generic webhook registration for ready2order', [
                'config_id' => $configId,
                'provider' => 'ready2order',
            ]);

            return [
                'success' => true,
                'exists_webhook' => (int)($config->exists_webhook ?? 0),
                'response' => [
                    'provider' => 'ready2order',
                    'message' => 'ready2order direct mode active. Generic proxy webhook registration skipped.',
                ],
            ];
        }

        try {
            $posCode     = $config->devices->code;
            $accessToken = $config->access_token;

            $tenantHost = request()->getHost();

            $query = ['tenant' => $tenantHost];
            $lowerCode = strtolower($posCode);

            if ($lowerCode === 'sumup') {
                return [
                    'success' => true,
                    'exists_webhook' => 0,
                    'response' => [
                        'provider' => 'sumup',
                        'mode' => 'public-payments-api',
                        'message' => 'SumUp webhook handling is checkout-status based and verified per checkout event. No separate pre-registration endpoint is configured in this mode.',
                    ],
                ];
            }

            if ($lowerCode === 'clover' && !empty($config->id_application)) {
                $query['merchantId'] = $config->id_application;
            }

            if ($lowerCode === 'lightspeed' && !empty($config->id_application)) {
                $query['domainPrefix'] = $config->id_application;
            }

            $queryString     = http_build_query($query);
            $baseUrl         = $this->urlPosAPI . "/api/pos/{$posCode}/webhook?{$queryString}";
            $notificationUrl = $this->urlPosAPI . "/api/pos/{$posCode}/order?{$queryString}";

            Log::info('Registering webhook at POS', [
                'config_id'        => $configId,
                'pos_code'         => $posCode,
                'base_url'         => $baseUrl,
                'notification_url' => $notificationUrl,
                'query'            => $query,
            ]);

            $response = Http::withToken($accessToken)
                ->post($baseUrl, ['notification_url' => $notificationUrl]);

            $json = $response->json();

            if (!isset($json['error']) && ($json['status'] ?? 200) === 200) {
                $config->exists_webhook = 1;
                $config->save();

                return [
                    'success'        => true,
                    'exists_webhook' => 1,
                    'response'       => $json,
                ];
            }

            return [
                'success'        => false,
                'exists_webhook' => 0,
                'response'       => $json,
            ];
        } catch (\Exception $e) {
            Log::error('Exception while registering webhook', [
                'config_id' => $configId,
                'message'   => $e->getMessage(),
            ]);

            return ['error' => $e->getMessage()];
        }
    }

    public function onSyncMenu()
    {
        $configId = post('config_id');
        $config   = \Admin\Models\Pos_configs_model::with('devices')->find($configId);

        if (!$config) {
            Log::warning("Configuration not found for config_id: {$configId}");

            return [
                '#syncResultModal .modal-body' => '<div class="d-block alert-danger">Configuration not found.</div>',
            ];
        }

        try {
            Log::info("Starting bidirectional menu synchronization for config #{$configId}");

            $posCode     = strtolower((string) $config->devices->code);

            if ($posCode === 'worldline') {
                $html = '<h5 class="mb-3">Worldline detected</h5>';
                $html .= '<div class="alert alert-info d-block">';
                $html .= '<strong>Worldline is configured here only as a payment platform record.</strong><br>';
                $html .= 'Menu sync is not applicable for Worldline.<br>';
                $html .= 'Use this record for credentials, environment selection, webhook URL reference, and later payment-flow integration.';
                $html .= '</div>';

                return [
                    '#syncResultModal .modal-body' => $html,
                ];
            }

            if ($posCode === 'sumup') {
                $html = '<h5 class="mb-3">SumUp detected</h5>';
                $html .= '<div class="alert alert-info d-block">';
                $html .= '<strong>Public SumUp API mode active.</strong><br>';
                $html .= 'Menu / catalog sync is not enabled in this mode.<br>';
                $html .= 'Supported now: merchant profile, checkouts, transactions, refunds, readers, checkout-status webhook.';
                $html .= '</div>';

                return [
                    '#syncResultModal .modal-body' => $html,
                ];
            }

            $baseUrl     = $this->urlPosAPI . '/api/pos';
            $accessToken = $config->access_token;
            $merchantId  = $config->id_application;

            // 1) Fetch from POS
            if ($this->pmdIsWorldline($config)) {
            return [
                'success' => true,
                'exists_webhook' => 0,
                'response' => [
                    'provider' => 'worldline',
                    'mode' => 'manual-portal-configuration',
                    'message' => 'Worldline webhook endpoints are configured in the Merchant Portal / Developer > Webhooks, not via the generic POS proxy.',
                    'webhook_url' => $this->pmdWorldlineWebhookUrl(),
                ],
            ];
        }

        if ($this->pmdIsReady2order($config)) {
                $getUrl = $this->pmdR2oProductsUrl($config);
            } else {
                $getUrl = "{$baseUrl}/{$posCode}/products";

                if ($posCode === 'clover' && !empty($merchantId)) {
                    $getUrl .= '?merchantId=' . urlencode($merchantId);
                }

                if ($posCode === 'lightspeed' && !empty($merchantId)) {
                    $getUrl .= '?domainPrefix=' . urlencode($merchantId);
                }
            }

            Log::info('Fetching products from POS', [
                'PMD_R2O_SYNC_FIXED' => $this->pmdIsReady2order($config),
                'PMD_R2O_RUNTIME_ENRICH_V1' => true,
                'tenant_host' => request()->getHost(),
                'device_code_runtime' => strtolower((string) ($config->devices->code ?? '')),
                'db_default_connection' => \DB::getDefaultConnection(),
                'db_database' => \DB::connection()->getDatabaseName(),
                'token_len_raw' => strlen((string) ($config->access_token ?? '')),
                'token_len_trimmed' => strlen(trim((string) ($config->access_token ?? ''))),
                'trimmed_changed' => ((string) ($config->access_token ?? '')) !== trim((string) ($config->access_token ?? '')) ? 'yes' : 'no',
                'token_prefix10' => substr(trim((string) ($config->access_token ?? '')), 0, 10),
                'token_suffix10' => substr(trim((string) ($config->access_token ?? '')), -10),
                'config_id' => $configId,
                'pos'       => $posCode,
                'url'       => $getUrl,
            ]);

            $response = Http::withToken($accessToken)
                ->acceptJson()
                ->get($getUrl);

            if (!$response->successful()) {
                Log::error("Failed to fetch products from POS for config #{$configId}", [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);

                return [
                    '#syncResultModal .modal-body' => '<div class="d-block alert-danger">Failed to fetch products from POS.</div>',
                ];
            }

            $rawProducts = $response->json() ?? [];

            if ($posCode === 'ready2order') {
                $posProducts = $this->pmdNormalizeReady2orderProducts($rawProducts);
            } elseif ($posCode === 'clover') {
                $posProducts = PosMenuNormalizer::fromClover($rawProducts);
            } elseif ($posCode === 'lightspeed') {
                $posProducts = PosMenuNormalizer::fromLightspeed($rawProducts);
            } else {
                $posProducts = PosMenuNormalizer::fromSquare($rawProducts);
            }

            Log::info('Number of products fetched from POS (normalized): ' . count($posProducts));

            $createdLocal = [];
            $updatedLocal = [];
            $skippedLocal = [];

            // 1.1 POS -> Local
            foreach ($posProducts as $item) {
                $name        = trim($item['name'] ?? '');
                $description = trim($item['description'] ?? '');
                $price       = (float) ($item['price'] ?? 0);

                if ($name === '') {
                    continue;
                }

                $localMenu = Menus_model::whereRaw('LOWER(menu_name) = ?', [strtolower($name)])->first();

                if (!$localMenu) {
                    $localMenu                    = new Menus_model();
                    $localMenu->menu_name         = $name;
                    $localMenu->menu_description  = $description;
                    $localMenu->menu_price        = $price;
                    $localMenu->minimum_qty       = 1;
                    $localMenu->menu_status       = 1;
                    $localMenu->menu_priority     = 0;
                    $localMenu->order_restriction = null;
                    $localMenu->save();

                    Log::info('Created new local product', ['name' => $name]);
                    $createdLocal[] = $name;
                    continue;
                }

                $hasChanges = false;

                if ((float) $localMenu->menu_price !== $price) {
                    $localMenu->menu_price = $price;
                    $hasChanges = true;
                }

                if ($localMenu->menu_description !== $description) {
                    $localMenu->menu_description = $description;
                    $hasChanges = true;
                }

                if ($hasChanges) {
                    $localMenu->save();
                    $updatedLocal[] = $name;
                } else {
                    $skippedLocal[] = $name;
                }
            }

            // 2) Push local -> POS
            $localMenus = Menus_model::all();
            $createdPOS = [];
            $skippedPOS = [];

            foreach ($localMenus as $menu) {
                if ($posCode === 'ready2order') {
                    $skippedPOS[] = $menu->menu_name;
                    continue;
                }

                $payload = [
                    'name'           => $menu->menu_name,
                    'description'    => $menu->menu_description,
                    'price'          => $menu->menu_price,
                    'variation_name' => $menu->menu_name,
                    'currency'       => 'USD',
                ];

                $postUrl = "{$baseUrl}/{$posCode}/products";

                if ($posCode === 'clover' && !empty($merchantId)) {
                    $postUrl .= '?merchantId=' . urlencode($merchantId);
                }

                if ($posCode === 'lightspeed' && !empty($merchantId)) {
                    $postUrl .= '?domainPrefix=' . urlencode($merchantId);
                }

                try {
                    $response = Http::withToken($accessToken)->post($postUrl, $payload);

                    Log::info('Pushing product to POS', [
                        'link'    => $postUrl,
                        'pos'     => $posCode,
                        'name'    => $menu->menu_name,
                        'payload' => $payload,
                        'status'  => $response->status(),
                    ]);

                    if ($response->successful()) {
                        $createdPOS[] = $menu->menu_name;
                        Log::info('Created product on POS', ['name' => $menu->menu_name]);
                    } else {
                        $skippedPOS[] = $menu->menu_name;

                        Log::warning('Failed to create product on POS', [
                            'name'   => $menu->menu_name,
                            'status' => $response->status(),
                            'body'   => $response->body(),
                        ]);
                    }
                } catch (\Exception $e) {
                    $skippedPOS[] = $menu->menu_name;

                    Log::error('Exception creating product on POS', [
                        'name'  => $menu->menu_name,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            $html = '<h5 class="mb-3">Bidirectional synchronization complete!</h5>';

            if ($posCode === 'ready2order') {
                $html .= "<div class='d-block alert-info py-2 px-3 mb-2'><strong>Ready2order direct mode active.</strong><br>Import from POS to local completed. Push from local to ready2order is temporarily skipped to avoid invalid generic payloads.</div>";
            }

            if ($createdLocal) {
                $html .= "<div class='d-block py-2 px-3'><strong>Added locally:</strong><ul class='mb-0 mt-1'>";
                foreach ($createdLocal as $item) {
                    $html .= "<li>{$item}</li>";
                }
                $html .= "</ul></div>";
            }

            if ($updatedLocal) {
                $html .= "<div class='d-block alert-info py-2 px-3'><strong>Updated locally:</strong><ul class='mb-0 mt-1'>";
                foreach ($updatedLocal as $item) {
                    $html .= "<li>{$item}</li>";
                }
                $html .= "</ul></div>";
            }

            if ($skippedLocal) {
                $html .= "<div class='d-block alert-secondary py-2 px-3'><strong>Unchanged locally:</strong><ul class='mb-0 mt-1'>";
                foreach ($skippedLocal as $item) {
                    $html .= "<li>{$item}</li>";
                }
                $html .= "</ul></div>";
            }

            if ($createdPOS) {
                $html .= "<div class='d-block py-2 px-3 mt-2'><strong>Added to POS:</strong><ul class='mb-0 mt-1'>";
                foreach ($createdPOS as $item) {
                    $html .= "<li>{$item}</li>";
                }
                $html .= "</ul></div>";
            }

            if ($skippedPOS) {
                $html .= "<div class='d-block alert-warning py-2 px-3 mt-2'><strong>Skipped / Failed POS:</strong><ul class='mb-0 mt-1'>";
                foreach ($skippedPOS as $item) {
                    $html .= "<li>{$item}</li>";
                }
                $html .= "</ul></div>";
            }

            return [
                '#syncResultModal .modal-body' => $html,
            ];
        } catch (\Exception $e) {
            Log::error('Error in bidirectional menu synchronization', [
                'config_id' => $configId,
                'error'     => $e->getMessage(),
                'trace'     => $e->getTraceAsString(),
            ]);

            return [
                '#syncResultModal .modal-body' => '<div class="d-block alert-danger"><strong>Error:</strong> ' . e($e->getMessage()) . '</div>',
            ];
        }
    }
}
